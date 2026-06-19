# Vault — Personal Finance Assistant with Password-Gate Auth
### Architecture, Authentication, DB Schema, API Endpoints & Implementation Guide

> **Repository scope:** This file lives in `vault-frontend` and documents the full Vault system. Backend sections describe the Spring Boot API this frontend consumes. For frontend-only setup, see [`README.md`](README.md).

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Frontend Behavior Notes (June 2026)](#frontend-behavior-notes-june-2026)
3. [Authentication Architecture](#authentication-architecture)
4. [System Architecture Overview](#system-architecture-overview)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [AI Integration](#ai-integration)
9. [Implementation Phases](#implementation-phases)

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
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Frontend data | TanStack Query v5, Axios, Recharts |
| Frontend build | npm (`output: "standalone"`) |
| Backend build | Maven |

---

## Frontend Behavior Notes (June 2026)

These notes capture current frontend behavior in **this repository** (`vault-frontend`). The backend is a separate Spring Boot service; this repo is frontend-only.

### Navigation & pages

| Route | In sidebar | Notes |
|---|---|---|
| `/dashboard` | Yes | Net worth, account strip, MoM stats, category focus, 6-month trend, latest summary card |
| `/expenses` | Yes | Month/category/account filters, text search, duplicate entry |
| `/income` | Yes | Month/account filters, text search, duplicate entry |
| `/accounts` | Yes | **Accounts** tab + **Transfer** tab (transfers are not a separate nav item) |
| `/accounts/[id]` | No | Investment detail, checkpoints chart, transfer history (read-only) |
| `/goals` | Yes | Create/edit, link accounts, progress from linked balances |
| `/chat` | Yes | Suggested prompts, provider badge |
| `/ai/summaries` | Yes | Generate, expand, delete with double-confirm |
| `/settings/ai` | Yes (Settings group) | Separate provider/model for chat vs summary |
| `/login`, `/setup`, `/reset-password`, `/starting` | No | Auth shell only — no sidebar |

### Accounts & transfers

- Account cards use a two-tier action layout: primary **Update Balance**, secondary row **Edit / Details / Delete**.
- Accounts grid is responsive at `1/2/3` columns (`base/sm/xl`).
- **Transfer** tab on `/accounts`: create transfers, pick account for history, revert normal transfers only.
- `isRevertTransfer()` in `src/lib/transfers.ts` hides revert for reversal records (checks `isRevert`, `isReversal`, reversal IDs, or transfer type).
- Stale manual balances (>7 days) show a warning banner on the accounts list.
- Investment detail page shows platform, instrument, asset type, checkpoints, and return metrics when available.

### Dashboard

- Category insight is centralized in a single **Category focus** card (donut + top category share); not duplicated in stat cards.
- `useDashboard` composes `GET /dashboard` with six months of expense/income summaries for the trend chart.
- Dashboard query is prefetched on sidebar logo/link hover.

### Goals

- Progress is **derived from linked account balances**, not manual contributions.
- `GoalForm` accepts optional `accountIds` on create/update; `ManageAccountsModal` links/unlinks after creation.
- Deactivate uses double-confirm via `useConfirmDelete`.

### Expenses & income

- Both pages use `TransactionSearch`, `MonthNavigator`, and a duplicate action that pre-fills a new form with today's date.
- Expenses filter by category; income filters by account only (category is on the form).

### Auth & resilience

- Hybrid auth: Bearer token in `localStorage` (`vault_token` key) for API calls; HttpOnly `vault_token` cookie for page gating.
- Login/setup call `completeAuthSession()`: store token → `POST /api/auth/refresh-cookie` → redirect to `/dashboard`.
- `TokenRefresher` runs on authenticated pages to refresh token + cookie on load.
- Page guard in `src/proxy.ts` probes `GET /api/auth/status` (~2.5s timeout) and redirects to `/starting`, `/setup`, or `/login` as appropriate.
- `fetchWithTimeout` enforces predictable timeouts on server-side proxy calls.
- Auth proxies forward `X-Forwarded-For` / `X-Real-IP` and preserve all `Set-Cookie` headers from the backend.
- Axios client retries 502/503/504 once; `apiFetch` retries GET/HEAD on 503 up to 4 times with exponential backoff.
- Login/setup forms read `Retry-After` on 429 responses.

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

- **HttpOnly cookie (`vault_token`)**: used by the page guard (`src/proxy.ts`) and server-side API route proxies to gate navigation. Set via backend `Set-Cookie` (preserved by auth proxies) or via `POST /api/auth/refresh-cookie` after login.
- **Bearer token (`localStorage`, key `vault_token`)**: the Axios client and `apiFetch` attach `Authorization: Bearer <token>` on every browser request. Independent of cookie behavior for SPA fetches and retry logic.

Notes:
- On login/setup success, the backend may return `{ "token": "..." }` in the JSON body **and** set the HttpOnly cookie. `completeAuthSession()` in `src/lib/auth-forms.ts` stores the token, syncs the cookie via `/api/auth/refresh-cookie`, then redirects to `/dashboard`.
- On app load, `TokenRefresher` calls `POST /api/auth/refresh` with the Bearer token, updates `localStorage`, and re-syncs the cookie.
- On 401/403 from API calls, `handleAuthFailure()` clears localStorage, POSTs logout, and redirects to `/login?reason=expired`.
- For cross-origin deployments, ensure CORS is configured with `allowCredentials=true` and `Secure` cookies in production.

### Frontend proxy & timeout details

The frontend exposes two proxy layers:

1. **Auth proxies** — `/api/auth/*` → `${API_URL}/api/v1/auth/*`
2. **Data proxy** — `/api/v1/[...path]` → `${API_URL}/api/v1/*` (forwards Bearer header and cookie)

Auth proxy routes:

| Frontend route | Backend target | Timeout |
|---|---|---|
| `GET /api/auth/status` | `GET /api/v1/auth/status` | 3s |
| `POST /api/auth/login` | `POST /api/v1/auth/login` | 8s |
| `POST /api/auth/setup` | `POST /api/v1/auth/setup` | 8s |
| `POST /api/auth/logout` | `POST /api/v1/auth/logout` | 8s |
| `POST /api/auth/refresh` | `POST /api/v1/auth/refresh` | 8s |
| `POST /api/auth/reset-password` | `POST /api/v1/auth/reset-password` | 8s |
| `POST /api/auth/refresh-cookie` | *(local only — sets HttpOnly cookie)* | — |

Implementation details:

- The page guard in `src/proxy.ts` probes `GET /api/auth/status` with a ~2.5s timeout. Non-OK or network errors → redirect to `/starting`. `{ configured: false }` → `/setup`. Missing cookie on protected routes → `/login`.
- Auth mutation proxies forward client IP headers and preserve all `Set-Cookie` headers using `getSetCookie()` with fallback to `get('set-cookie')`.
- `/starting` polls status every 3s (max 30 attempts) then routes to `/login` or `/setup`.
- The Axios client (`src/lib/api.ts`, base `/api/v1`) retries 502/503/504 once with 1s backoff. `apiFetch` retries GET/HEAD on 503 up to 4 attempts (200ms → 400ms → 800ms).
- `/api/auth/refresh-cookie` sets `vault_token` with `httpOnly`, `sameSite: strict`, `secure` in production, 24h max-age.


---

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (this repo)                 │
│  /login │ /setup │ /starting │ /reset-password                   │
│  /dashboard │ /expenses │ /income │ /accounts │ /goals           │
│  /chat │ /ai/summaries │ /settings/ai                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Page guard (src/proxy.ts)                                  │ │
│  │  • GET /api/auth/status → configured? cookie?              │ │
│  │  • Redirect: /starting │ /setup │ /login │ /dashboard      │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Auth flow (browser)                                        │ │
│  │ 1. POST /api/auth/setup or /api/auth/login                │ │
│  │ 2. Receive { token } + Set-Cookie from backend             │ │
│  │ 3. Store token in localStorage                             │ │
│  │ 4. POST /api/auth/refresh-cookie (sync HttpOnly cookie)   │ │
│  │ 5. All API calls: Authorization Bearer + /api/v1 proxy   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Data layer: TanStack Query hooks → src/lib/api.ts (Axios) │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS / REST / JSON (via /api/v1 proxy)
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

## Frontend Architecture

> This section describes the **vault-frontend** repository. Backend sections below document the API this app consumes.

### Request flow

```
Browser
  │
  ├─ Page navigation ──► src/proxy.ts (page guard)
  │                         └─ GET /api/auth/status
  │
  ├─ Auth forms ────────► /api/auth/* routes ──► backend /api/v1/auth/*
  │
  └─ Data mutations ────► Axios (/api/v1/*) ──► /api/v1/[...path] route ──► backend
         ▲                      │
         └─ Bearer token ───────┘ (from localStorage)
            Cookie forwarded server-side when present
```

### Layout & routing

- `src/app/layout.tsx` — root layout, Space Grotesk font, `Providers` (React Query).
- `src/components/AppLayout.tsx` — sidebar + main content for authenticated routes; auth routes render children only.
- `src/app/page.tsx` — redirects `/` → `/dashboard`.
- `src/proxy.ts` — page guard with matcher excluding `_next`, `api/`, static files.

### State management

TanStack Query v5 wraps all server state. Hooks live in `src/lib/hooks/` and use keys from `src/lib/queryKeys.ts`. Mutations invalidate related query keys (e.g. transfer revert invalidates accounts + dashboard).

| Domain | Read hooks | Mutation hooks |
|---|---|---|
| Dashboard | `useDashboard`, `useLatestSummary` | — |
| Accounts | `useAccounts`, `useAccount`, `useAccountTransfers`, `useCheckpoints`, `useInvestmentMetricsMap` | `useAccountMutations`, `useCheckpointMutations` |
| Expenses | `useExpenses`, `useCategories` | `useExpenseMutations` |
| Income | `useIncome`, `useIncomeCategories` | `useIncomeMutations` |
| Goals | `useGoals` | `useGoalMutations` |
| AI | `useAiSettings`, `useSummaries`, `useGenerateSummary` | `useSummaryMutations` |

### Typed API client

`src/lib/api.ts` exports typed functions for every backend resource. The Axios instance uses `baseURL: "/api/v1"` and attaches the Bearer token via a request interceptor. Response interceptor handles 401/403 logout and transient gateway retries.

`src/types/index.ts` and `src/types/dashboard.ts` define shared interfaces consumed by pages and components.

### Component organization

```
src/components/
├── accounts/       AccountCard, AccountForm, ManualBalanceModal, TransferForm
├── auth/           AuthPageShell
├── chat/           ChatBubble, ChatInput, TypingIndicator
├── dashboard/      WeeklySummaryCard, StatsBar, CategoryChart
├── expenses/       ExpenseForm, ExpenseList, ExpenseFilters
├── goals/          GoalCard, GoalForm, ManageAccountsModal
├── income/         IncomeForm, IncomeList, IncomeFilters
├── layout/         PageTransition
├── settings/       AiProviderCard, ModelDropdown, ConnectivityIndicator
├── transfers/      TransferRow
└── ui/             Modal, Toast, Skeleton, EmptyState, MonthNavigator, …
```

### Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `API_URL` | Server routes | Backend base URL for proxies |
| `NEXT_PUBLIC_APP_URL` | Page guard | Origin for auth status probe |
| `NEXT_PUBLIC_API_URL` | Client (optional) | Public backend URL |
| `PASSWORD_RESET_TOKEN` | Reset proxy | Self-hosted reset validation |
| `API_ADMIN_TOKEN` | Reset proxy | Optional admin bearer for backend reset |

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
| POST | `/auth/reset-password` | Yes* | No | Reset password (self-hosted; requires admin token or reset token) |
| GET | `/auth/verify` | No | No | Verify JWT is valid |
| POST | `/auth/refresh` | No | No | Issue new JWT token |
| POST | `/auth/logout` | No | No | Clear authentication cookie |

\* Reset endpoint authorization depends on backend configuration (`API_ADMIN_TOKEN` or `x-reset-token` forwarded by frontend proxy).

**Request/Response Examples:**

```json
GET /api/v1/auth/status
→ { "configured": true }

POST /api/v1/auth/setup
← { "password": "my-password" }
→ { "message": "Vault configured successfully", "token": "eyJ..." }
Set-Cookie: vault_token=JWT...; HttpOnly; Secure; SameSite=...

POST /api/v1/auth/login
← { "password": "my-password" }
→ { "message": "Login successful", "token": "eyJ..." }
Set-Cookie: vault_token=JWT...; HttpOnly; Secure; SameSite=...
```

> The frontend stores `token` from the JSON body in `localStorage` and syncs the HttpOnly cookie via `POST /api/auth/refresh-cookie`.

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

- Middleware / page guard behavior: `src/proxy.ts` queries `/api/auth/status` and interprets responses as:
  - 200 + `{ configured: false }` → redirect unauthenticated users to `/setup` (app not configured)
  - non-OK (e.g., 503) or network error → treat backend as unreachable and redirect to `/starting` (lightweight holding page)
  - 200 + `{ configured: true }` → normal auth gating using `vault_token` cookie

  This prevents accidental redirect-to-setup during transient backend unavailability.

- Caching suggestion: to reduce repeated calls from middleware during heavy traffic or rapid reloads, implement a short in-memory TTL (1-2s) for the `/auth/status` result on the backend or use your hosting platform's short-lived cache.

---

### Protected Endpoints

All endpoints below require a valid JWT — sent as `Authorization: Bearer <token>` by the frontend Axios client and/or via the `vault_token` HttpOnly cookie forwarded by the `/api/v1` proxy.

#### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dashboard` | Aggregated snapshot: net worth, accounts, cash flow, MoM %, top category |

Used by `fetchDashboard()` and composed in `useDashboard` with monthly expense/income summaries for trend charts.

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
  "manualBalance": 215.00,
  "alsoSetAsOpeningBalance": true
}
```

> `alsoSetAsOpeningBalance` is optional. When `true`, the frontend sends it via `updateManualBalance()` to reset the opening baseline.

**POST /accounts/{id}/checkpoints — request body:**
```json
{
  "value": 210.00,
  "note": "S&P up this week"
}
```

---

#### Transfers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transfers` | Create a transfer between two accounts |
| `GET` | `/accounts/{id}/transfers` | List transfer history for an account |
| `POST` | `/transfers/{id}/revert` | Revert a transfer (creates a reversal entry) |

**POST /transfers — request body:**
```json
{
  "fromAccountId": "uuid",
  "toAccountId": "uuid",
  "amount": 500.00,
  "transferDate": "2025-06-01",
  "note": "Move to savings"
}
```

Frontend: create via Transfer tab on `/accounts`; history + revert on the same tab. Read-only history also shown on `/accounts/[id]`.

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
| `GET` | `/goals` | List all active goals with linked accounts and derived progress |
| `POST` | `/goals` | Create a new goal (optional `accountIds` array) |
| `PUT` | `/goals/{id}` | Update a goal |
| `DELETE` | `/goals/{id}` | Deactivate a goal (soft delete) |
| `POST` | `/goals/{id}/accounts` | Link an account to a goal |
| `DELETE` | `/goals/{id}/accounts/{accountId}` | Unlink an account from a goal |

**POST /goals — request body:**
```json
{
  "name": "Trip to Japan",
  "description": "Flight + hotel for 10 days",
  "targetAmount": 2500.00,
  "goalType": "LONG_TERM",
  "deadline": "2025-12-01",
  "accountIds": ["uuid-checking", "uuid-savings"]
}
```

> Goal `savedAmount` and `progressPercentage` are **derived from linked account balances**, not manual contributions. The frontend manages links via `GoalForm` (initial `accountIds`) and `ManageAccountsModal` (link/unlink after creation).

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
| `DELETE` | `/ai/summaries/{id}` | Delete a weekly summary |
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

Next.js App Router with dashboard, expenses, goals, accounts, and income pages. Typed API client (`src/lib/api.ts`), TanStack Query hooks, and hybrid auth (Bearer + cookie).

---

### ✅ Phase 2.5 — Accounts & Income

**Status:** Implemented

Multi-account support (Checking, Savings, Investment) with derived balance calculations. Income tracking by category. Investment checkpoints for return tracking. Manual balance overrides. All linked to accounts with proper referential integrity.

**Migrations:** V5–V11 (accounts, investment details, checkpoints, income categories, income)

---

### ✅ Phase 2.6 — Transfers, Goals & Account Linking

**Status:** Implemented (frontend)

**Features:**
- Transfer creation and per-account history on `/accounts` Transfer tab
- Transfer revert with reversal detection (`isRevertTransfer`)
- Account detail page at `/accounts/[id]` with investment chart and checkpoints
- Goals linked to accounts; progress derived from linked balances
- Expense/income search, duplicate, and month navigation
- Dashboard category focus card and 6-month cash-flow trend

**Frontend routes:** `/accounts` (tabs), `/accounts/[id]`, enhanced `/goals`, `/expenses`, `/income`, `/dashboard`

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
- 7 auth endpoints: `/auth/status`, `/auth/setup`, `/auth/login`, `/auth/reset-password`, `/auth/verify`, `/auth/refresh`, `/auth/logout`
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
- Frontend: Chat UI with suggested prompts, AI settings panel (`/settings/ai`) with separate chat/summary provider config, LM Studio connectivity indicator, weekly summaries page (`/ai/summaries`), summary card on dashboard

**Deliverable:** Full chat interface that reasons over real expense, income, account, and goal data with user-controlled provider/model selection per task.

---

### ✅ Phase 4 — Weekly Summary Automation

**Status:** Implemented

**Features:**
- `WeeklyDataSnapshot` builder aggregating income, net cash flow, accounts, expenses, and goals
- Scheduled job: `@Scheduled(cron = "0 0 8 * * MON")` running every Monday at 8am via `LlmProviderRouter.getClientForTask(TaskType.SUMMARY)`
- Manual trigger: `POST /ai/summaries/generate` for on-demand summary generation
- Delete: `DELETE /ai/summaries/{id}` with double-confirm in UI
- Summaries saved with provider and model metadata for audit trail
- Frontend: Summary card on dashboard, full history at `/ai/summaries` with expand/truncate and delete

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

### This repository (`vault-frontend`)

```
vault-frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # redirect → /dashboard
│   │   ├── layout.tsx                  # root layout + Providers
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── setup/page.tsx
│   │   ├── starting/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── expenses/page.tsx
│   │   ├── income/page.tsx
│   │   ├── accounts/
│   │   │   ├── page.tsx                # accounts + transfer tabs
│   │   │   └── [id]/page.tsx           # investment detail
│   │   ├── goals/page.tsx
│   │   ├── chat/page.tsx
│   │   ├── ai/summaries/page.tsx
│   │   ├── settings/ai/page.tsx
│   │   └── api/
│   │       ├── auth/                   # login, setup, logout, refresh, status, reset-password, refresh-cookie
│   │       └── v1/[...path]/route.ts   # catch-all backend proxy
│   ├── components/                     # domain + ui components (see Frontend Architecture)
│   ├── lib/
│   │   ├── api.ts                      # typed Axios client
│   │   ├── auth.ts                     # localStorage token helpers
│   │   ├── auth-forms.ts               # login/setup session completion
│   │   ├── fetch-with-timeout.ts
│   │   ├── queryClient.ts
│   │   ├── queryKeys.ts
│   │   ├── transfers.ts                # isRevertTransfer helper
│   │   ├── investmentMetrics.ts
│   │   ├── summaryFormatting.ts
│   │   ├── utils.ts
│   │   └── hooks/                      # TanStack Query hooks (24 files)
│   ├── types/
│   │   ├── index.ts
│   │   └── dashboard.ts
│   └── proxy.ts                        # page guard (auth redirects)
├── public/                             # vault-logo.svg, app icons
├── next.config.ts                      # output: "standalone"
├── tailwind.config.ts
├── package.json
├── .env.example
├── README.md
└── ARCHITECTURE.md
```

### Backend (separate repository)

The Spring Boot API is not in this repo. Expected layout:

```
vault-backend/
├── src/main/java/com/vfa/vault/
│   ├── config/                         # Security, Spring AI beans
│   ├── controller/                     # REST controllers
│   ├── service/                        # Business logic
│   ├── repository/                     # JPA repositories
│   ├── entity/                         # JPA entities
│   ├── dto/                            # Request/response DTOs
│   ├── ai/                             # FinanceTools, LlmProviderRouter
│   └── scheduler/                      # WeeklySummaryScheduler
├── src/main/resources/
│   ├── application.yaml
│   └── db/migration/                   # Flyway V1–V14+
└── pom.xml
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
   PASSWORD_RESET_TOKEN=<optional, for self-hosted reset>
   ```
3. **Build Command:** `npm run build`
4. **Start Command:** `npm run start` (standalone output)

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
1. Start Postgres (or use hosted Supabase)
2. Start Backend: `./mvnw spring-boot:run` (in backend repo)
3. Start Frontend: `npm install && npm run dev` (in this repo)
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
| Frontend stuck on `/starting` | Backend cold start or `API_URL` misconfigured | Wait for backend; verify `API_URL` in `.env.local` |
| Login fails with 401 | Check if vault is configured: `GET /auth/status` | Call `/auth/setup` first |
| 429 Too Many Requests | Rate limit hit on `/auth/login` or `/auth/setup` | Wait 15 minutes or check client IP |
| Cookie not sent cross-origin | `SameSite=Strict` in non-HTTPS environment | Set `VAULT_COOKIE_SAME_SITE=None` + HTTPS |
| Database migration fails on startup | Schema mismatch or missing migration file | Check Flyway history table in Supabase |
| JWT validation error in logs | Token expired or signature mismatch | User should refresh with `/auth/refresh` endpoint |