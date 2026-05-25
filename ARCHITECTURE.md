# Vault — Personal Finance Assistant with Password-Gate Auth
### Architecture, Authentication, DB Schema, API Endpoints & Implementation Guide

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Frontend Behavior Notes (May 2026)](#frontend-behavior-notes-may-2026)
3. [Authentication Architecture](#authentication-architecture)
4. [System Architecture Overview](#system-architecture-overview)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [AI Integration](#ai-integration)
8. [Implementation Phases](#implementation-phases)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot 4.x |
| Authentication | JWT (JJWT 0.12.6), BCrypt, Spring Security 7.0.5 |
| Rate Limiting | Bucket4j 8.10.1 (5 attempts per 15 min per IP) |
| AI Framework | Spring AI |
| Local LLM | LM Studio (OpenAI-compatible local server) |
| Cloud LLM | Groq API (llama3-70b-8192 — free tier) |
| Database | PostgreSQL 17 |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Build | Maven |

---

## Frontend Behavior Notes (May 2026)

These notes capture current frontend behavior so product docs and architecture stay aligned.

- Accounts card actions use a two-tier layout for responsive stability:
  - Primary full-width `Update Balance` action
  - Secondary three-button row: `Edit`, `Details`, `Delete`
- Accounts grid is responsive at `1/2/3` columns for `base/sm/xl` breakpoints.
- Transfer history revert behavior:
  - `Revert` is shown only for normal transfers.
  - If a transfer entry is itself a revert/reversal record, the UI hides the revert action.
- Investment account details page displays `Asset Type` when available.
- Dashboard category insight is de-duplicated:
  - Category details are centralized in a single `Category focus` block.
  - The older duplicated top-category presentation was removed from secondary metric cards.

  - Network and auth utilities:
    - A shared `fetchWithTimeout` helper is used for server-side and client-side calls to enforce predictable timeouts for backend requests.
    - Auth proxy routes under `/api/auth/*` exist in the frontend and proxy requests to the backend. The proxy forwards client IP headers (`X-Forwarded-For`, `X-Real-IP`) and correctly forwards all `Set-Cookie` headers (including multiple cookies) so browser cookies set by the backend are preserved.
    - The frontend uses a hybrid auth strategy: the SPA API client uses a Bearer token stored in `localStorage` for API calls, while the Next.js middleware and some proxy routes rely on an HttpOnly `vault_token` cookie for page gating and server-side auth checks.

---

## Authentication Architecture

### Model

Vault uses **single-password protection** — one shared password guards all data. No user registration, no multi-user support.

### Security Filter Chain

```
HTTP Request
     │
     ▼
[CorsFilter]
│  └─ Allow requests from FRONTEND_URL with credentials
│
▼
[RateLimitFilter]
│  └─ Only for /auth/setup & /auth/login
│  └─ 5 tokens per 15 minutes per IP
│  └─ Proxy-aware (X-Forwarded-For, X-Real-IP)
│  └─ Return 429 if limit exceeded
│
▼
[JwtFilter]
│  └─ Extract JWT from HttpOnly cookie
│  └─ Validate signature & expiry with HMAC SHA-256
│  └─ Populate SecurityContext if valid
│  └─ Otherwise, leave anonymous (endpoints decide who can proceed)
│
▼
[Spring Security Authorization]
│  ├─ GET  /api/v1/auth/status    → ALLOW (public)
│  ├─ POST /api/v1/auth/setup     → ALLOW (public, rate limited)
│  ├─ POST /api/v1/auth/login     → ALLOW (public, rate limited)
│  └─ All other endpoints         → REQUIRE Authentication
│
▼
Controller Endpoint
```

### Cookie vs. Bearer Token

Vault uses a hybrid approach in the frontend:

- **HttpOnly cookie (`vault_token`)**: used by Next.js middleware and server-side proxy routes to gate pages and for backend checks. The backend may set this cookie via `Set-Cookie` and the frontend proxy preserves and forwards those headers. The cookie is set with `httpOnly` and `secure` in production and currently uses `SameSite=Strict` when the proxy sets it.
- **Bearer token (localStorage)**: the client-side API client stores a session token in `localStorage` and sends it as an `Authorization: Bearer <token>` header for API calls. This makes client API calls independent of cookie behavior (useful for SPA fetches and retry logic).

Notes:
- The app keeps both in sync via a `TokenRefresher` client component: it calls the backend refresh endpoint (using the bearer token), receives a fresh token, stores it in `localStorage`, and posts it to `/api/auth/refresh-cookie` to set the HttpOnly cookie for middleware-protected navigation.
- For cross-origin deployments, ensure CORS is configured with `allowCredentials=true` and `Secure` cookies in production.

### Frontend proxy & timeout details

- The frontend exposes auth proxy endpoints under `/api/auth/*` which forward requests to `${API_URL}/api/v1/auth/*` on the backend. Reasons:
  - Keep browser same-origin with frontend so HttpOnly cookies (set by backend) are processed by the browser when proxied through the frontend.
  - Allow the frontend to inject and forward client IP headers (`X-Forwarded-For`, `X-Real-IP`) so backend rate-limiting operates by client IP rather than the hosting platform IP.

  - Implementation details:
    - The Next.js middleware probes the frontend proxy `GET /api/auth/status` with a ~2.5s timeout (used in `src/proxy.ts`). The proxy itself calls the backend `GET /api/v1/auth/status` with a 3s timeout (`src/app/api/auth/status/route.ts`) — non-OK or network errors are treated as "backend starting" and users are redirected to `/starting`.
    - Auth mutation proxies (`/api/auth/login`, `/api/auth/setup`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/reset-password`) forward requests to the backend with an 8s timeout to tolerate cold starts while surfacing real failures as 503.
    - The frontend proxy preserves and forwards all `Set-Cookie` headers from the backend (including multiple cookies) by using `getSetCookie()` when available and falling back to `get('set-cookie')`.
    - The SPA API client (`src/lib/api.ts`) uses a bearer token from `localStorage` and implements retry/backoff for idempotent requests: GET/HEAD requests will retry up to 4 attempts on 503, and axios-based calls retry transient 502/503/504 once with a short backoff.
    - Client forms (setup/login) read `Retry-After` on 429 responses to present a friendly wait message.
    - A client-side `TokenRefresher` component periodically exchanges the stored bearer token for a fresh session token and posts it to `/api/auth/refresh-cookie` so the proxy/middleware can set an HttpOnly `vault_token` cookie (the proxy sets this cookie with `SameSite=Strict` in the current implementation).


---

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                          │
│  [Setup] │ Login │ Dashboard │ Accounts │ Expenses │ Chat │      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Authentication Flow (in browser)                           │ │
│  │ 1. GET /auth/status (check if configured)                 │ │
│  │ 2. Show setup form (first time) or login form             │ │
│  │ 3. POST /setup or /login                                 │ │
  │  │ 4. Receive JWT in HttpOnly cookie (automatic)            │ │
  │  │ 5. Cookie auto-included in all subsequent requests       │ │
  │  │    (additionally, the SPA stores a bearer token in `localStorage` and uses it
  │  │     for client-side API requests where appropriate)     │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS / REST / JSON
┌───────────────────────────▼──────────────────────────────────────┐
│                     Spring Boot Backend                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Security Layer (Filters & Configuration)                │   │
│  │ ┌──────────────┐   ┌────────────────┐   ┌──────────────┐│   │
│  │ │ CORS Config  │──>│RateLimitFilter │──>│  JwtFilter   ││   │
│  │ │ credentials  │   │ 5/15min per IP │   │ Validates    ││   │
│  │ │ true         │   │ proxy-aware    │   │ JWT & cookie ││   │
│  │ └──────────────┘   └────────────────┘   └──────────────┘│   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                       │
│  ┌──────────────────────▼─────────────────────────────────────┐ │
│  │                    REST Controllers                        │ │
│  │  ┌─────────────┐   ┌────────────┐   ┌───────────────────┐ │ │
│  │  │AuthController│  │API Endpoints│  │     AI Service    │ │ │
│  │  │/auth/*     │  │/expenses*  │  │   (protected)     │ │ │
│  │  │(public)    │  │/accounts*  │  │   /ai/chat        │ │ │
│  │  │            │  │/goals*     │  │   /ai/config      │ │ │
│  │  │JWT in cookie│  │            │  │   /ai/summaries   │ │ │
│  │  └─────────────┘  └────────────┘  └───────────────────┘ │ │
│  │         │               │                    │            │ │
│  └─────────┼───────────────┼────────────────────┼────────────┘ │
│            │               │                    │               │
│  ┌─────────▼───────────────▼────────────────────▼────────────┐ │
│  │              Service Layer                               │ │
│  │  AccountService │ ExpenseService │ GoalService │ etc.    │ │
│  └──────────────────────────────────────────────────────────┘ │
│            │                                                   │
│  ┌─────────▼──────────────────────────────────────────────────┐ │
│  │         LLM Provider Router (for AI)                      │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Task = CHAT       → chat_provider & chat_model       │ │ │
│  │  │ Task = SUMMARY    → summary_provider & summary_model │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │         ↓                                    ↓             │ │
│  │    [LM Studio]                         [Groq API]         │ │
│  │  localhost:1234                    https://api.groq.com   │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                         PostgreSQL                               │
│                      (Supabase hosted)                           │
│                                                                  │
│  app_config (V14)                 accounts │ goals              │
│  ├─ key: "vault_password_hash"     investments │ checkpoints   │
│  └─ value: "$2a$10$BCRYPT..."     expenses │ categories         │
│                                   income │ summaries            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

> Migrations are managed by Flyway. Files live in `src/main/resources/db/migration/`.
> Never modify an already-applied migration — always create a new versioned file.

---

### V1 — `categories` (seeded, not user-editable)

```sql
CREATE TABLE categories (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(10)
);

INSERT INTO categories (name, icon) VALUES
    ('Food',          '🍔'),
    ('Transport',     '🚗'),
    ('Housing',       '🏠'),
    ('Entertainment', '🎮'),
    ('Health',        '💊'),
    ('Shopping',      '🛍️'),
    ('Travel',        '✈️'),
    ('Other',         '📦');
```

---

### V2 — `expenses`

```sql
CREATE TABLE expenses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount       NUMERIC(10,2) NOT NULL,
    note         VARCHAR(255),
    category_id  INT           NOT NULL REFERENCES categories(id),
    account_id   UUID          NOT NULL REFERENCES accounts(id),   -- added V11
    expense_date DATE          NOT NULL DEFAULT CURRENT_DATE,
    created_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_date     ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
```

> `account_id` was added in V11 as a NOT NULL FK after all existing rows were
> migrated to the default account created in V10.

---

### V3 — `goals`

```sql
CREATE TYPE goal_type AS ENUM ('SHORT_TERM', 'LONG_TERM');

CREATE TABLE goals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100)   NOT NULL,
    description   VARCHAR(255),
    target_amount NUMERIC(10,2)  NOT NULL,
    saved_amount  NUMERIC(10,2)  NOT NULL DEFAULT 0,
    goal_type     goal_type      NOT NULL,
    deadline      DATE,
    created_at    TIMESTAMP      NOT NULL DEFAULT NOW(),
    is_active     BOOLEAN        NOT NULL DEFAULT TRUE
);
```

---

### V4 — `weekly_summaries` + `llm_provider_config`

```sql
CREATE TABLE weekly_summaries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start   DATE          NOT NULL,
    week_end     DATE          NOT NULL,
    summary_text TEXT          NOT NULL,
    total_spent  NUMERIC(10,2),
    generated_at TIMESTAMP     NOT NULL DEFAULT NOW(),
    provider     VARCHAR(20),
    model        VARCHAR(100)   -- records the exact model used
);

CREATE TABLE llm_provider_config (
    id                    INT PRIMARY KEY DEFAULT 1,
    -- Per-task provider preferences
    chat_provider         VARCHAR(20)  NOT NULL DEFAULT 'lmstudio',  -- 'lmstudio' | 'groq'
    chat_model            VARCHAR(100) NOT NULL DEFAULT 'mistral-7b-instruct',
    summary_provider      VARCHAR(20)  NOT NULL DEFAULT 'groq',      -- always groq by default
    summary_model         VARCHAR(100) NOT NULL DEFAULT 'llama3-70b-8192',
    -- Available model lists (JSON arrays, refreshed from each provider)
    lmstudio_models       TEXT,        -- JSON: ["mistral-7b-instruct", "llama-3-8b-instruct", ...]
    groq_models           TEXT,        -- JSON: ["llama3-70b-8192", "mixtral-8x7b-32768", ...]
    updated_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO llm_provider_config (chat_provider, chat_model, summary_provider, summary_model)
VALUES ('lmstudio', 'mistral-7b-instruct', 'groq', 'llama3-70b-8192');
```

**Provider + model config explained:**

| Column | Default | Description |
|---|---|---|
| `chat_provider` | `lmstudio` | Provider used for the interactive chat (`/ai/chat`) |
| `chat_model` | `mistral-7b-instruct` | Model used for chat — must match what is loaded in LM Studio or available on Groq |
| `summary_provider` | `groq` | Provider used for weekly summary generation — defaults to Groq for quality |
| `summary_model` | `llama3-70b-8192` | Model used for weekly summaries |
| `lmstudio_models` | null | JSON array of models currently available in LM Studio, refreshed on demand |
| `groq_models` | null | JSON array of Groq models available to the user, refreshed on demand |

---

### V5 — `accounts`

```sql
CREATE TYPE account_type AS ENUM ('CHECKING', 'SAVINGS', 'INVESTMENT');

CREATE TABLE accounts (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                      VARCHAR(100)   NOT NULL,
    account_type              account_type   NOT NULL,
    opening_balance           NUMERIC(10,2)  NOT NULL DEFAULT 0,
    manual_balance            NUMERIC(10,2),
    manual_balance_updated_at TIMESTAMP,
    created_at                TIMESTAMP      NOT NULL DEFAULT NOW(),
    is_active                 BOOLEAN        NOT NULL DEFAULT TRUE
);
```

**Balance fields explained:**

| Field | Type | Description |
|---|---|---|
| `opening_balance` | stored | Seed value entered at account creation. Never changes. |
| `manual_balance` | stored | User-entered snapshot. Updated on demand. Nullable until first update. |
| `calculated_balance` | **derived** | `opening_balance + SUM(income) - SUM(expenses)`. Never stored. |

---

### V6 — `investment_details`

Stores investment-specific metadata. Only one row per account. Optional even for INVESTMENT accounts — only created when at least one field is provided.

```sql
CREATE TABLE investment_details (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL UNIQUE REFERENCES accounts(id),
    platform   VARCHAR(100),   -- e.g. "Revolut"
    instrument VARCHAR(100),   -- e.g. "VUAA"
    asset_type VARCHAR(50)     -- e.g. "ETF", "Stock", "Crypto"
);
```

---

### V7 — `investment_checkpoints`

Each row is a user-entered snapshot of the current market value of an investment account. Used to calculate actual return vs. contributed amount.

```sql
CREATE TABLE investment_checkpoints (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID          NOT NULL REFERENCES accounts(id),
    value       NUMERIC(10,2) NOT NULL,
    recorded_at TIMESTAMP     NOT NULL DEFAULT NOW(),
    note        VARCHAR(255)
);

CREATE INDEX idx_checkpoints_account ON investment_checkpoints(account_id);
CREATE INDEX idx_checkpoints_date    ON investment_checkpoints(recorded_at);
```

**Investment balance calculations (all derived, never stored):**

| Field | Formula |
|---|---|
| `contributed_amount` | `opening_balance + SUM(income) - SUM(expenses)` |
| `current_value` | Latest checkpoint `value`, or `contributed_amount` if no checkpoints exist |
| `return_amount` | `current_value - contributed_amount` |
| `return_percentage` | `(return_amount / contributed_amount) * 100` |

---

### V8 — `income_categories` (seeded, not user-editable)

```sql
CREATE TABLE income_categories (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(10)
);

INSERT INTO income_categories (name, icon) VALUES
    ('Salary',    '💼'),
    ('Freelance', '💻'),
    ('Dividend',  '📈'),
    ('Gift',      '🎁'),
    ('Refund',    '↩️'),
    ('Other',     '📦');
```

---

### V9 — `income`

Mirrors the `expenses` table. Every income entry must be linked to an account.

```sql
CREATE TABLE income (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount             NUMERIC(10,2) NOT NULL,
    note               VARCHAR(255),
    income_category_id INT           NOT NULL REFERENCES income_categories(id),
    account_id         UUID          NOT NULL REFERENCES accounts(id),
    income_date        DATE          NOT NULL DEFAULT CURRENT_DATE,
    created_at         TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_income_date     ON income(income_date);
CREATE INDEX idx_income_category ON income(income_category_id);
CREATE INDEX idx_income_account  ON income(account_id);
```

---

### V10 — default account seed

```sql
INSERT INTO accounts (id, name, account_type, opening_balance)
VALUES ('00000000-0000-0000-0000-000000000001', 'Main Account', 'CHECKING', 0);
```

---

### V11 — add `account_id` to `expenses`

```sql
ALTER TABLE expenses ADD COLUMN account_id UUID REFERENCES accounts(id);

UPDATE expenses
SET account_id = '00000000-0000-0000-0000-000000000001'
WHERE account_id IS NULL;

ALTER TABLE expenses ALTER COLUMN account_id SET NOT NULL;
```

---

### V14 — `app_config`

Stores application configuration as key-value pairs. Used to persist the vault password hash on first setup.

```sql
CREATE TABLE app_config (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO app_config (key, value)
VALUES ('vault_password_hash', '$2a$10$BCRYPT_ENCODED_HASH_HERE');
```

**Usage:**
- `AuthController.status()` checks if this table contains the `vault_password_hash` key
- `AuthController.setup()` stores the BCrypt-hashed password in this table
- `AuthController.login()` retrieves the hash for password verification
- Future expansions can store other config (branding, feature flags, etc.) as additional rows

**Security Notes:**
- The value is a BCrypt hash, never plain text
- BCrypt includes salt, so same password always produces different hashes
- No indexes needed — single row per key lookup is negligible

---

## API Endpoints

Base URL: `http://localhost:8080/api/v1`

### Authentication

| Method | Endpoint | Public | Rate Limited | Description |
|--------|----------|--------|--------------|-------------|
| GET | `/auth/status` | Yes | No | Check if vault is configured |
| POST | `/auth/setup` | Yes | Yes (5/15m) | Configure vault with password |
| POST | `/auth/login` | Yes | Yes (5/15m) | Authenticate with password |
| GET | `/auth/verify` | No | No | Verify JWT is valid |
| POST | `/auth/refresh` | No | No | Issue new JWT token |
| POST | `/auth/logout` | No | No | Clear authentication cookie |

**Request/Response Examples:**

```json
GET /api/v1/auth/status
→ { "configured": true }

POST /api/v1/auth/setup
← { "password": "my-password" }
→ { "message": "Vault configured successfully" }
Set-Cookie: vault_token=JWT...; HttpOnly; Secure; SameSite=...

POST /api/v1/auth/login
← { "password": "my-password" }
→ { "message": "Login successful" }
Set-Cookie: vault_token=JWT...; HttpOnly; Secure; SameSite=...

GET /api/v1/auth/verify
→ { "valid": true }

POST /api/v1/auth/refresh
→ { "message": "Token refreshed" }
Set-Cookie: vault_token=JWT...; HttpOnly; Secure; SameSite=...

POST /api/v1/auth/logout
→ { "message": "Logged out" }
Set-Cookie: vault_token=; Max-Age=0
```

#### Operational notes — status and reset behavior

- `/auth/status`: implementers should return HTTP 200 with `{ configured: true|false }` when the backend application and its dependencies (DB, config) are healthy. If the service is temporarily unable to determine configuration (cold start, failing downstream), return a non-OK status (503) so frontends and proxies can treat the service as "starting" rather than "not configured". The frontend middleware treats non-OK as unreachable and shows a lightweight `/starting` page to avoid mounting heavy pages during backend warm-up.

- `/auth/reset-password` (optional admin/reset endpoint): for single-instance/self-hosted deployments without email, provide an endpoint that accepts `{ "newPassword": "..." }` and authorizes the request by one of two server-side mechanisms forwarded by the frontend proxy:
  - `Authorization: Bearer <API_ADMIN_TOKEN>` — a long-lived admin token set as an environment variable on the frontend and backend. The frontend proxy will attach this header to reset requests when `API_ADMIN_TOKEN` is set.
  - `x-reset-token: <PASSWORD_RESET_TOKEN>` — a short, pre-shared reset token configured in `.env` and validated server-side. The backend should compare this value using a timing-safe comparison and invalidate or rotate the token after use where appropriate.

  On success, the endpoint should issue the same `Set-Cookie: vault_token=...; HttpOnly; Secure; SameSite=...` used by login/setup so the frontend becomes authenticated automatically. Note: the frontend proxy includes a small helper endpoint (`/api/auth/refresh-cookie`) that sets the cookie using `SameSite=Strict` in the local proxy; when deploying cross-origin (Render + Vercel) ensure your backend sets `SameSite=None` and `Secure=true` and configure CORS with `allowCredentials=true`.

- Retrying behavior: frontend proxies for `POST /auth/login` and `POST /auth/setup` implement a small retry/backoff loop (3 attempts with short waits) to reduce 502/503/504 surface area during backend cold starts. Client fetch helpers also use retries for idempotent GET/HEAD calls, and the client Axios instance retries some transient server errors once with a short delay.

- Middleware behavior: the Next.js middleware queries `/api/auth/status` and interprets responses as:
  - 200 + `{ configured: false }` → redirect unauthenticated users to `/setup` (app not configured)
  - non-OK (e.g., 503) or network error → treat backend as unreachable and redirect to `/starting` (lightweight holding page)
  - 200 + `{ configured: true }` → normal auth gating using `vault_token` cookie

  This prevents accidental redirect-to-setup during transient backend unavailability.

- Caching suggestion: to reduce repeated calls from middleware during heavy traffic or rapid reloads, implement a short in-memory TTL (1-2s) for the `/auth/status` result on the backend or use your hosting platform's short-lived cache.

---

### Protected Endpoints

All endpoints below require a valid JWT in the `vault_token` HttpOnly cookie.

#### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounts` | List all active accounts |
| `GET` | `/accounts/{id}` | Get account with all calculated balances |
| `POST` | `/accounts` | Create account |
| `PUT` | `/accounts/{id}` | Update account metadata |
| `DELETE` | `/accounts/{id}` | Soft delete (sets `is_active = false`) |
| `PATCH` | `/accounts/{id}/manual-balance` | Update manual balance snapshot |
| `GET` | `/accounts/{id}/checkpoints` | List all investment checkpoints |
| `POST` | `/accounts/{id}/checkpoints` | Add a new investment checkpoint |

**POST /accounts — request body:**
```json
{
  "name": "Revolut Investment",
  "accountType": "INVESTMENT",
  "openingBalance": 0.00,
  "platform": "Revolut",
  "instrument": "VUAA",
  "assetType": "ETF"
}
```

**GET /accounts/{id} — response (investment account):**
```json
{
  "id": "uuid",
  "name": "Revolut Investment",
  "accountType": "INVESTMENT",
  "openingBalance": 0.00,
  "manualBalance": 210.00,
  "manualBalanceUpdatedAt": "2025-04-01T10:00:00",
  "calculatedBalance": 200.00,
  "totalIncome": 200.00,
  "totalExpenses": 0.00,
  "contributedAmount": 200.00,
  "currentValue": 210.00,
  "returnAmount": 10.00,
  "returnPercentage": 5.00,
  "platform": "Revolut",
  "instrument": "VUAA",
  "assetType": "ETF"
}
```

**PATCH /accounts/{id}/manual-balance — request body:**
```json
{
  "manualBalance": 215.00
}
```

**POST /accounts/{id}/checkpoints — request body:**
```json
{
  "value": 210.00,
  "note": "S&P up this week"
}
```

---

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/expenses` | List expenses (`?month=YYYY-MM&categoryId=`) |
| `POST` | `/expenses` | Create expense |
| `PUT` | `/expenses/{id}` | Update expense |
| `DELETE` | `/expenses/{id}` | Delete expense |
| `GET` | `/expenses/summary` | Monthly totals grouped by category (`?month=`) |
| `GET` | `/expenses/stats` | Total this month, avg per day, top category |

**POST /expenses — request body:**
```json
{
  "amount": 12.50,
  "note": "Lunch at work",
  "categoryId": 1,
  "accountId": "uuid",
  "expenseDate": "2025-01-15"
}
```

> `accountId` is **required** as of Phase 2.5.

---

### Income

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/income` | List income (`?month=YYYY-MM&accountId=`) |
| `POST` | `/income` | Create income entry |
| `PUT` | `/income/{id}` | Update income entry |
| `DELETE` | `/income/{id}` | Delete income entry |
| `GET` | `/income/summary` | Monthly totals by income category (`?month=`) |
| `GET` | `/income-categories` | List all income categories |

**POST /income — request body:**
```json
{
  "amount": 1500.00,
  "note": "March salary",
  "incomeCategoryId": 1,
  "accountId": "uuid",
  "incomeDate": "2025-03-31"
}
```

---

### Goals

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/goals` | List all active goals |
| `POST` | `/goals` | Create a new goal |
| `PUT` | `/goals/{id}` | Update a goal |
| `DELETE` | `/goals/{id}` | Deactivate a goal (soft delete) |
| `POST` | `/goals/{id}/contribute` | Add amount toward a goal |
| `GET` | `/goals/{id}/progress` | Goal progress as percentage + days remaining |

**POST /goals — request body:**
```json
{
  "name": "Trip to Japan",
  "description": "Flight + hotel for 10 days",
  "targetAmount": 2500.00,
  "goalType": "LONG_TERM",
  "deadline": "2025-12-01"
}
```

---

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/categories` | List all expense categories |
| `GET` | `/income-categories` | List all income categories |

---

### AI / Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai/chat` | Send a message, get an AI response |
| `GET` | `/ai/summaries` | List all weekly summaries |
| `GET` | `/ai/summaries/latest` | Get the most recent weekly summary |
| `POST` | `/ai/summaries/generate` | Manually trigger a summary generation |
| `GET` | `/ai/config` | Get full provider config (providers, models, current selections) |
| `PATCH` | `/ai/config` | Update provider/model selection for chat or summary task |
| `GET` | `/ai/models/lmstudio` | Fetch available models from the local LM Studio server |
| `GET` | `/ai/models/groq` | Fetch available models from the Groq API |

**POST /ai/chat — request body:**
```json
{
  "message": "Can I afford a PS5 this month?",
  "conversationId": "optional-uuid-for-context"
}
```

**POST /ai/chat — response:**
```json
{
  "reply": "Based on your current spending, you've used €320 of your estimated €500 budget...",
  "provider": "lmstudio",
  "model": "mistral-7b-instruct",
  "functionCallsUsed": ["getMonthlyExpenses", "getBudgetStatus"]
}
```

**GET /ai/config — response:**
```json
{
  "chat": {
    "provider": "lmstudio",
    "model": "mistral-7b-instruct"
  },
  "summary": {
    "provider": "groq",
    "model": "llama3-70b-8192"
  },
  "availableModels": {
    "lmstudio": ["mistral-7b-instruct", "llama-3-8b-instruct"],
    "groq": ["llama3-70b-8192", "mixtral-8x7b-32768", "llama3-8b-8192"]
  }
}
```

**PATCH /ai/config — request body:**
```json
{
  "task": "chat",
  "provider": "groq",
  "model": "mixtral-8x7b-32768"
}
```

> `task` is either `"chat"` or `"summary"`. Provider and model are validated
> against the available model lists before saving.

---

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register user |
| `POST` | `/auth/login` | Login, returns JWT |
| `POST` | `/auth/refresh` | Refresh JWT token |

---

## AI Integration

### Provider Strategy

Vault uses two providers — **LM Studio** for local inference and **Groq** for cloud inference. Both expose an OpenAI-compatible API, so Spring AI's `OpenAiChatModel` is used for both. The router selects which provider and model to use based on the **task type**, with separate configurations for chat and weekly summaries.

**Default routing:**

| Task | Default Provider | Default Model | Reason |
|---|---|---|---|
| Interactive chat (`/ai/chat`) | LM Studio | user's loaded model | Fast, private, free for quick Q&A |
| Weekly summary generation | Groq | `llama3-70b-8192` | Requires stronger reasoning for analysis |

The user can override both defaults at any time from the AI settings panel in the frontend.

```
User action (chat or summary trigger)
        │
        ▼
  LLM Provider Router
        │
        ├── task = CHAT
        │     └── reads chat_provider + chat_model from llm_provider_config
        │           ├── lmstudio → OpenAiChatModel (http://localhost:1234/v1)
        │           └── groq    → OpenAiChatModel (https://api.groq.com/openai/v1)
        │
        └── task = SUMMARY
              └── reads summary_provider + summary_model from llm_provider_config
                    ├── groq    → OpenAiChatModel (default, stronger model)
                    └── lmstudio → OpenAiChatModel (if user overrides)
```

> Both LM Studio and Groq are OpenAI API-compatible. Spring AI's `OpenAiChatModel`
> works with both — the only difference is the `base-url` and `api-key`.
> LM Studio accepts any non-empty string as the API key.

---

### Spring AI Configuration

**`application.yml`**
```yaml
spring:
  ai:
    openai:
      # LM Studio (local)
      lmstudio:
        base-url: http://localhost:1234/v1
        api-key: lm-studio          # LM Studio ignores this, but Spring AI requires it
        chat:
          model: mistral-7b-instruct  # must match the model loaded in LM Studio
          options:
            temperature: 0.3

      # Groq (cloud)
      groq:
        base-url: https://api.groq.com/openai/v1
        api-key: ${GROQ_API_KEY}
        chat:
          model: llama3-70b-8192
          options:
            temperature: 0.3

vault:
  ai:
    system-prompt: |
      You are Vault, a personal finance assistant. You have access to the
      user's real expense, income, account, and goal data through function calls.
      Always base your answers on the actual data. Be concise, practical, and
      friendly. When currency amounts are shown, use the € symbol.
```

> Define two separate `OpenAiChatModel` beans in a `@Configuration` class,
> one pointing to LM Studio and one to Groq, qualified with `@Qualifier("lmStudioModel")`
> and `@Qualifier("groqModel")` respectively. The router injects both and selects
> at call time.

---

### LLM Provider Router

```java
@Service
public class LlmProviderRouter {

    @Qualifier("lmStudioModel")
    private final OpenAiChatModel lmStudioModel;

    @Qualifier("groqModel")
    private final OpenAiChatModel groqModel;

    private final LlmProviderConfigRepository configRepo;
    private final FinanceTools financeTools;

    public enum TaskType { CHAT, SUMMARY }

    public ChatClient getClientForTask(TaskType task) {
        LlmProviderConfig config = configRepo.findById(1).orElseThrow();

        String provider = task == TaskType.SUMMARY
            ? config.getSummaryProvider()
            : config.getChatProvider();

        String model = task == TaskType.SUMMARY
            ? config.getSummaryModel()
            : config.getChatModel();

        OpenAiChatModel baseModel = switch (provider) {
            case "groq"     -> groqModel;
            default         -> lmStudioModel;   // lmstudio is the local default
        };

        // Override the model name at call time if it differs from the bean default
        ChatOptions options = OpenAiChatOptions.builder()
            .withModel(model)
            .withTemperature(0.3f)
            .build();

        return ChatClient.builder(baseModel)
            .defaultSystem(systemPrompt)
            .defaultTools(financeTools)
            .defaultOptions(options)
            .build();
    }
}
```

---

### Model Discovery

When the user opens the AI settings panel, the frontend calls the model discovery endpoints to populate the model dropdowns with live options rather than hardcoded lists.

**LM Studio** — `GET /ai/models/lmstudio` hits `http://localhost:1234/v1/models` and returns whatever is currently loaded. The response is cached in `lmstudio_models` in `llm_provider_config`.

**Groq** — `GET /ai/models/groq` hits the Groq models endpoint using the configured API key and returns the available model list. Cached in `groq_models`.

```java
// LM Studio model discovery
public List<String> getLmStudioModels() {
    // GET http://localhost:1234/v1/models
    // Returns whatever models are currently loaded in LM Studio
    // Falls back to cached list if server is unreachable
}

// Groq model discovery
public List<String> getGroqModels() {
    // GET https://api.groq.com/openai/v1/models
    // Filtered to chat-capable models only
}
```

---

### Function Calling Tools

These are Java methods annotated with `@Tool` that Spring AI automatically
makes available to the LLM during a conversation.

```java
@Component
public class FinanceTools {

    @Tool(description = "Get total expenses by category for a given month. " +
                        "Month format: YYYY-MM")
    public Map<String, Double> getExpensesByCategory(String month) {
        return expenseRepository.sumByCategoryForMonth(month);
    }

    @Tool(description = "Get the current month's total spending and " +
                        "how it compares to the previous month")
    public BudgetStatus getBudgetStatus() {
        return expenseService.getCurrentMonthStatus();
    }

    @Tool(description = "Get progress for all active goals: name, " +
                        "target, saved, percentage, and days remaining")
    public List<GoalProgress> getGoalProgress() {
        return goalService.getAllProgress();
    }

    @Tool(description = "Get daily spending for the last N days. " +
                        "Useful for trend questions.")
    public List<DailySpend> getDailySpending(int days) {
        return expenseRepository.getDailyTotals(days);
    }

    @Tool(description = "Get total spending for a specific category " +
                        "over the last N months")
    public Map<String, Double> getCategoryTrend(String category, int months) {
        return expenseRepository.getCategoryTrend(category, months);
    }

    @Tool(description = "Get all accounts with their calculated and manual balances. " +
                        "For investment accounts, includes return amount and percentage.")
    public List<AccountSummary> getAccountSummaries() {
        return accountService.getAllAccountSummaries();
    }

    @Tool(description = "Get total income by category for a given month. " +
                        "Month format: YYYY-MM")
    public Map<String, Double> getIncomeByCategory(String month) {
        return incomeRepository.sumByCategoryForMonth(month);
    }

    @Tool(description = "Get net cash flow (income minus expenses) for a given month.")
    public Double getNetCashFlow(String month) {
        return incomeService.getNetCashFlow(month);
    }
}
```

---

### Weekly Summary Generation

The scheduler runs every Monday at 8:00 AM using the **summary provider** (Groq by default). The model used is recorded in the `weekly_summaries` table alongside the generated text.

```java
@Scheduled(cron = "0 0 8 * * MON")
public void generateWeeklySummary() {
    WeeklyDataSnapshot snapshot = buildSnapshot();

    String prompt = """
        Here is the user's financial data for the past week (%s to %s):

        Total spent: €%.2f
        Total income: €%.2f
        Net cash flow: €%.2f
        Spending by category: %s
        Income by category: %s
        Goal progress: %s
        Account balances: %s

        Write a short, friendly weekly summary (3-5 sentences). Include:
        - Where most money went
        - A comparison to last week if notable
        - One practical tip based on the data
        - Progress toward any active goals
        - Any notable investment account performance if applicable
        """.formatted(
            snapshot.weekStart(), snapshot.weekEnd(),
            snapshot.totalSpent(), snapshot.totalIncome(),
            snapshot.netCashFlow(), snapshot.byCategory(),
            snapshot.incomeByCategory(), snapshot.goals(),
            snapshot.accountSummaries()
        );

    LlmProviderConfig config = configRepo.findById(1).orElseThrow();
    ChatClient client = llmProviderRouter.getClientForTask(TaskType.SUMMARY);

    String summary = client.prompt(prompt).call().content();

    summaryRepository.save(new WeeklySummary(
        snapshot, summary,
        config.getSummaryProvider(),
        config.getSummaryModel()
    ));
}
```

---

## Implementation Phases

---

### ✅ Phase 1 — Core Data Layer

**Status:** Implemented

Spring Boot 4.x backend with PostgreSQL and Flyway managing 14 migrations. Entities for expenses, categories, goals, accounts, income, and summaries. Full service layer with business logic and REST controllers.

---

### ✅ Phase 2 — Next.js Frontend (Basic)

**Status:** Implemented

Next.js App Router with dashboard, expenses, goals, accounts, and income pages. Typed API client with authentication support.

---

### ✅ Phase 2.5 — Accounts & Income

**Status:** Implemented

Multi-account support (Checking, Savings, Investment) with derived balance calculations. Income tracking by category. Investment checkpoints for return tracking. Manual balance overrides. All linked to accounts with proper referential integrity.

**Migrations:** V5–V11 (accounts, investment details, checkpoints, income categories, income)

---

### ✅ Phase 5 — Authentication & Security (Reordered)

**Status:** Implemented

**Features:**
- Single-password protection (no user registration)
- BCrypt password hashing with automatic salt
- JWT tokens with 24-hour expiry (HMAC SHA-256)
- HttpOnly cookies for XSS protection
- Rate limiting: 5 attempts per 15 minutes per IP
- Proxy-aware IP detection (X-Forwarded-For, X-Real-IP)
- CORS with credentials support for Render + Vercel
- 6 auth endpoints: `/auth/status`, `/auth/setup`, `/auth/login`, `/auth/verify`, `/auth/refresh`, `/auth/logout`
- AppConfig table (V14) for storing vault password hash

**Migration:** V14 (`app_config` table)

**Components:** SecurityConfig, JwtUtil, JwtFilter, RateLimitFilter, CookieUtil, AuthController

---

### ✅ Phase 3 — AI Integration

**Status:** Implemented

**Features:**
- Spring AI integration with dual OpenAiChatModel beans (LM Studio + Groq)
- `FinanceTools` with `@Tool` methods for financial data queries:
  - getExpensesByCategory, getBudgetStatus, getGoalProgress
  - getDailySpending, getCategoryTrend, getAccountSummaries
  - getIncomeByCategory, getNetCashFlow
- `LlmProviderRouter` with TaskType enum (CHAT, SUMMARY) and per-task model routing
- Model discovery endpoints: `GET /ai/models/lmstudio`, `GET /ai/models/groq`
- Config endpoints: `GET /ai/config`, `PATCH /ai/config` for user-controlled provider/model selection
- Chat endpoint: `POST /ai/chat` with conversation context support
- Frontend: Chat UI, AI settings panel with provider/model toggles, LM Studio connectivity indicator

**Deliverable:** Full chat interface that reasons over real expense, income, account, and goal data with user-controlled provider/model selection per task.

---

### ✅ Phase 4 — Weekly Summary Automation

**Status:** Implemented

**Features:**
- `WeeklyDataSnapshot` builder aggregating income, net cash flow, accounts, expenses, and goals
- Scheduled job: `@Scheduled(cron = "0 0 8 * * MON")` running every Monday at 8am via `LlmProviderRouter.getClientForTask(TaskType.SUMMARY)`
- Manual trigger: `POST /ai/summaries/generate` for on-demand summary generation
- Summaries saved with provider and model metadata for audit trail
- Frontend: Summary card on dashboard with provider/model badge, full summary history page

**Deliverable:** Automated weekly AI-generated reports every Monday covering spending, income, net cash flow, and investment performance. Users can also trigger manual summaries on demand.

---

## Suggested Models

| Provider | Model | Best for | Notes |
|---|---|---|---|
| LM Studio | `mistral-7b-instruct` | Chat | Fast, good function calling, runs on 8GB VRAM |
| LM Studio | `llama-3-8b-instruct` | Chat | Slightly better reasoning, still lightweight |
| LM Studio | `llama-3.2-3b-instruct` | Chat | Very fast on low-end hardware |
| Groq | `llama3-70b-8192` | Weekly summaries | Free tier, very fast inference, best quality |
| Groq | `mixtral-8x7b-32768` | Weekly summaries | Good alternative on Groq free tier |
| Groq | `llama3-8b-8192` | Chat (cloud fallback) | Lightweight Groq option if LM Studio is unavailable |

> **Recommended setup:** Use LM Studio with Mistral 7B Instruct for daily chat
> (private, free, no latency). Keep Groq's `llama3-70b-8192` as the default
> for weekly summaries — it produces noticeably better financial analysis.
> If LM Studio is unreachable (e.g. you're on a different machine), switch
> the chat provider to Groq from the AI settings panel.

---

## Project Structure

```
vault/
├── backend/                              # Spring Boot
│   ├── src/main/java/com/vfa/vault/
│   │   ├── config/                       # Security, Spring AI beans
│   │   ├── controller/
│   │   │   ├── AccountController.java
│   │   │   ├── CategoryController.java
│   │   │   ├── ExpenseController.java
│   │   │   ├── GoalController.java
│   │   │   ├── IncomeCategoryController.java
│   │   │   ├── IncomeController.java
│   │   │   └── WeeklySummaryController.java
│   │   ├── service/
│   │   │   ├── AccountService.java
│   │   │   ├── CategoryService.java
│   │   │   ├── ExpenseService.java
│   │   │   ├── GoalService.java
│   │   │   ├── IncomeCategoryService.java
│   │   │   ├── IncomeService.java
│   │   │   ├── InvestmentCheckpointService.java
│   │   │   └── WeeklySummaryService.java
│   │   ├── repository/
│   │   │   ├── AccountRepository.java
│   │   │   ├── CategoryRepository.java
│   │   │   ├── ExpenseRepository.java
│   │   │   ├── GoalRepository.java
│   │   │   ├── IncomeCategoryRepository.java
│   │   │   ├── IncomeRepository.java
│   │   │   ├── InvestmentCheckpointRepository.java
│   │   │   ├── InvestmentDetailRepository.java
│   │   │   └── WeeklySummaryRepository.java
│   │   ├── entity/
│   │   │   ├── Account.java
│   │   │   ├── Category.java
│   │   │   ├── Expense.java
│   │   │   ├── Goal.java
│   │   │   ├── Income.java
│   │   │   ├── IncomeCategory.java
│   │   │   ├── InvestmentCheckpoint.java
│   │   │   ├── InvestmentDetail.java
│   │   │   └── WeeklySummary.java
│   │   ├── dto/
│   │   │   ├── AccountDTO.java
│   │   │   ├── AccountResponseDTO.java
│   │   │   ├── CategoryDTO.java
│   │   │   ├── ExpenseDTO.java
│   │   │   ├── GoalDTO.java
│   │   │   ├── IncomeCategoryDTO.java
│   │   │   ├── IncomeDTO.java
│   │   │   ├── IncomeResponseDTO.java
│   │   │   ├── InvestmentCheckpointDTO.java
│   │   │   ├── InvestmentCheckpointResponseDTO.java
│   │   │   └── ManualBalanceDTO.java
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java
│   │   │   └── ResourceNotFoundException.java
│   │   ├── ai/                           # Phase 3+
│   │   │   ├── AiConfig.java             # defines lmStudioModel + groqModel beans
│   │   │   ├── FinanceTools.java
│   │   │   └── LlmProviderRouter.java    # TaskType-aware routing
│   │   └── scheduler/                    # Phase 4+
│   │       └── WeeklySummaryScheduler.java
│   ├── src/main/resources/
│   │   ├── application.yaml
│   │   └── db/migration/
│   │       ├── V1__create_categories.sql
│   │       ├── V2__create_expenses.sql
│   │       ├── V3__create_goals.sql
│   │       ├── V4__create_summaries_and_config.sql
│   │       ├── V5__create_accounts.sql
│   │       ├── V6__create_investment_details.sql
│   │       ├── V7__create_investment_checkpoints.sql
│   │       ├── V8__create_income_categories.sql
│   │       ├── V9__create_income.sql
│   │       ├── V10__add_default_account.sql
│   │       └── V11__add_account_to_expenses.sql
│   └── pom.xml
│
└── frontend/                             # Next.js
    ├── app/
    │   ├── accounts/
    │   │   ├── page.tsx                  # accounts list
    │   │   └── [id]/page.tsx             # investment detail
    │   ├── dashboard/
    │   ├── expenses/
    │   ├── goals/
    │   ├── income/
    │   │   └── page.tsx
    │   └── chat/                         # Phase 3+
│   │   └── page.tsx
│   └── settings/
│       └── ai/page.tsx               # Phase 3+ provider/model config panel
    ├── components/
    │   ├── accounts/
    │   │   ├── AccountForm.tsx
    │   │   └── ManualBalanceModal.tsx
    │   └── income/
    │       └── IncomeForm.tsx
    ├── lib/
    │   ├── api.ts                        # typed API client
    │   └── types.ts                      # shared TypeScript types
    └── package.json
```

---

## Deployment & Security Guide

### Production Deployment (Render + Vercel)

#### Backend (Render)

1. **Create Render Web Service** pointing to this repository
2. **Set Environment Variables:**
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/vault_db
   VAULT_JWT_SECRET=<use `openssl rand -base64 32`>
   VAULT_COOKIE_SECURE=true
   VAULT_COOKIE_SAME_SITE=None
  FRONTEND_URL=https://vault-frontend-lake.vercel.app/
   GROQ_API_KEY=<your-groq-api-key>
   ```
3. **Build Command:** `mvn clean package -DskipTests`
4. **Start Command:** `java -jar target/vault-api.jar`
5. **Health Check:** `GET /actuator/health` (Spring Boot default endpoint)

#### Frontend (Vercel)

1. **Deploy Next.js to Vercel** (connect GitHub repo)
2. **Set Environment Variables:**
   ```
  API_URL=https://vault-api-0uue.onrender.com
  NEXT_PUBLIC_API_URL=https://vault-api-0uue.onrender.com
  NEXT_PUBLIC_APP_URL=https://vault-frontend-lake.vercel.app/
   ```
3. **Vercel will auto-detect Next.js** and build/deploy on push

### Security Checklist

- ✅ **JWT Secret**: At least 32 random characters, never hardcoded, stored in Render environment variables
- ✅ **HTTPS Enforced**: Both Render and Vercel enforce HTTPS by default
- ✅ **Cookies Secure**: `Secure=true` flag set in production, only sent over HTTPS
- ✅ **CORS Configured**: Limited to frontend domain only, `allowCredentials=true`
- ✅ **Rate Limiting**: 5 attempts per 15 minutes per IP on auth endpoints
- ✅ **Password Hashing**: BCrypt with automatic salt, never plain text
- ✅ **Proxy Awareness**: IP detection checks `X-Forwarded-For` and `X-Real-IP` headers
- ✅ **No Default Users**: No hardcoded credentials, password gate only
- ✅ **Database Backups**: Enable automated backups in Supabase dashboard
- ✅ **Stateless Sessions**: JWT in cookies, no server-side session store required

### Local Development

**Environment variables for `.env`:**
```properties
DB_PASSWORD=postgres
VAULT_JWT_SECRET=local-dev-secret-change-in-prod
VAULT_COOKIE_SECURE=false
VAULT_COOKIE_SAME_SITE=Strict
FRONTEND_URL=http://localhost:3000
```

**Start Stack:**
1. Start Postgres: `docker-compose up -d postgres` (or use local instance)
2. Start Backend: `./mvnw spring-boot:run`
3. Start Frontend: `cd frontend && npm run dev`
4. Visit: `http://localhost:3000`

### Monitoring & Logs

**Render Console:**
- View deployment logs in real-time
- Check for startup errors or migration failures
- Monitor application performance metrics

**Application Logs in Production:**
- JWT validation failures
- Rate limit hits (HTTP 429)
- Database migration errors at startup
- Authentication failures

**Recommended Setup:**
- Enable Render's log drain to external logging service (DataDog, LogRocket, etc.)
- Set up alerts for repeated 401/403 responses (possible brute-force attempts)
- Monitor database connection pool usage

### Disaster Recovery

1. **Database Backups**: Supabase provides point-in-time recovery
2. **Source Code**: GitHub is the source of truth for all code
3. **Secrets**: Render environment variables are encrypted, no secrets in code
4. **Deployment**: Redeploy from git push to Render at any time

### Scaling Considerations

- **Stateless**: Each request is independent, scales horizontally
- **Database**: Supabase handles connection pooling and scaling
- **Rate Limiting**: Per-IP in-memory buckets; for multi-instance, consider Redis-backed storage
- **JWT Expiry**: 24 hours is reasonable; no token revocation list required since tokens are ephemeral

### Troubleshooting

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| Login fails with 401 | Check if vault is configured: `GET /auth/status` | Call `/auth/setup` first |
| 429 Too Many Requests | Rate limit hit on `/auth/login` or `/auth/setup` | Wait 15 minutes or check client IP |
| Cookie not sent cross-origin | `SameSite=Strict` in non-HTTPS environment | Set `VAULT_COOKIE_SAME_SITE=None` + HTTPS |
| Database migration fails on startup | Schema mismatch or missing migration file | Check Flyway history table in Supabase |
| JWT validation error in logs | Token expired or signature mismatch | User should refresh with `/auth/refresh` endpoint |