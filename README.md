# Vault Frontend

> A personal finance app to track expenses and income, manage multiple accounts, set savings goals, and use AI for summaries and chat insights.

#### 🔐 Login
<img src="screenshots/login.png" width="75%"/>

#### 📊 Dashboard
<img src="screenshots/dashboard.png" width="75%"/>

#### 💸 Expenses
<img src="screenshots/expenses.png" width="75%"/>

#### 💰 Income
<img src="screenshots/income.png" width="75%"/>

#### 🏦 Accounts
<img src="screenshots/accounts.png" width="75%"/>

#### 🔁 Transfers
<img src="screenshots/transfers.png" width="75%"/>

#### 🤖 AI Chat
<img src="screenshots/chat.png" width="75%"/>

#### 📋 Weekly Summaries
<img src="screenshots/summaries.png" width="75%"/>

---

## What You Can Do In Vault

- See your financial snapshot on the dashboard (net worth, cash flow, category focus, monthly comparisons)
- Track expenses by category, account, and month
- Track income entries by category and account
- Manage accounts (checking, savings, investment) with calculated and manual balances
- Update account balances quickly from a primary card action, with compact secondary actions (edit/details/delete)
- Review transfer history per account and revert transfers (revert action is hidden for entries that are already reverts)
- Create goals and add contributions over time
- Use Vault AI chat and weekly AI summaries

---

## Before You Start

You need two things running:

1. Vault backend API (Spring Boot)
2. This frontend (Next.js)

The frontend talks to the backend for all data and authentication.

From the backend architecture:

- Auth is password-gated (single vault password)
- JWT is stored in HttpOnly cookie
- First-time users must run setup and create a vault password
- Regular users log in with that password

---

## Quick Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a file named `.env.local` in the project root:

```env
API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8080
PASSWORD_RESET_TOKEN=your-reset-token-here
```

Adjust the URLs to match where your backend is running. `PASSWORD_RESET_TOKEN` is only needed for self-hosted deployments without email — see [Password reset](#password-reset-self-hosted).

### 3. Start the frontend

```bash
npm run dev
```

Open http://localhost:3000

### 4. First run flow

When you open the app:

1. If the backend is not configured yet, you will be sent to Setup
2. Create your vault password once
3. You are redirected into the app
4. Later visits go through Login using the same password

---

## Typical Usage Flow

1. Create one or more accounts
2. Add income entries and expense entries linked to accounts
3. Review dashboard metrics and monthly breakdowns
4. Set goals and contribute toward them
5. Ask Vault AI questions about your spending and income trends

---

## Main Pages

- **Dashboard** — net worth, account strip, income/expense trends, category focus, weekly summary
- **Accounts** — account balances, manual snapshots, transfer history with revert flow, investment checkpoints
- **Expenses** — create/edit/delete expenses and filter by month/category/account
- **Income** — create/edit/delete income and filter by month/account
- **Goals** — create goals and contribute progress
- **Chat** — ask AI about your financial data
- **AI Settings** — pick provider and model for chat and summary tasks

---

## Operational Notes

- **Cold-start handling** — when the backend is unreachable (cold start or redeploy) the app shows a lightweight `/starting` page instead of mounting full pages or redirecting to `/setup`. This reduces noisy API calls and avoids accidental setup lockouts.
- **Resilient auth flows** — the auth proxy routes (`/api/auth/login`, `/api/auth/setup`) and client fetch helpers implement short retry/backoff for transient 502/503/504 errors during backend startup.
- **Self-hosted password reset** — for single-instance/self-hosted deployments without email, a `reset-password` flow exists. The frontend proxies reset requests to the backend and may forward an `API_ADMIN_TOKEN` or an `x-reset-token` header — configure these via environment variables.
- **UI simplification** — the previous Security settings tab was removed; a `Reset password` link is available on the login page. The `reset-password` and `/starting` pages are minimal and do not render the main app sidebar.
- **Dashboard deduplication** — category details are centralized in the Category focus card instead of repeating the same "top category" logic in multiple places.
- **Investment details** — show Asset Type when it exists for that account.

---

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

---

## Troubleshooting

### Frontend starts but no data loads

- Check that backend is running
- Check `.env.local` has the correct `NEXT_PUBLIC_API_URL`
- Confirm backend allows requests from your frontend origin
- During backend redeploy/cold-start you may be redirected to `/starting`. This page polls backend status and avoids mounting heavy pages while the backend warms up. If the backend is fully up and you still land on `/setup`, check the backend `/api/v1/auth/status` response.

### App keeps redirecting to login

- Session cookie may be expired or invalid
- Log in again with your vault password
- Ensure backend and frontend URLs match your environment setup

### Password reset (self-hosted)

- For single-instance/self-hosted deployments without email, set a reset token or admin token in your environment (see `.env.example`): `PASSWORD_RESET_TOKEN` and optionally `API_ADMIN_TOKEN`.
- The frontend exposes `/reset-password` which posts to `/api/auth/reset-password` and will set the `vault_token` cookie on success.

### Setup/Login returns too many attempts

- Backend applies rate limiting on auth endpoints
- Wait and try again

---

## Notes

- This project is frontend-focused by design
- For backend architecture and endpoint details, see `ARCHITECTURE.md`