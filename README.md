# Vault Frontend

Vault is a personal finance app where you can track expenses and income, manage multiple accounts, set savings goals, and use AI for summaries and chat insights.

This repository is the frontend application.

## What You Can Do In Vault

- See your financial snapshot on the dashboard (net worth, cash flow, category trends)
- Track expenses by category, account, and month
- Track income entries by category and account
- Manage accounts (checking, savings, investment) with calculated and manual balances
- Create goals and add contributions over time
- Use Vault AI chat and weekly AI summaries

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

## Quick Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a file named `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Use the URL where your backend is running.

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

## Typical Usage Flow

1. Create one or more accounts
2. Add income entries and expense entries linked to accounts
3. Review dashboard metrics and monthly breakdowns
4. Set goals and contribute toward them
5. Ask Vault AI questions about your spending and income trends

## Main Pages

- Dashboard: net worth, spending trends, cash flow, goals snapshot, weekly summary
- Accounts: account balances, manual snapshots, investment checkpoints
- Expenses: create/edit/delete expenses and filter by month/category/account
- Income: create/edit/delete income and filter by month/account
- Goals: create goals and contribute progress
- Chat: ask AI about your financial data
- AI Settings: pick provider and model for chat and summary tasks

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Troubleshooting

### Frontend starts but no data loads

- Check that backend is running
- Check `.env.local` has the correct `NEXT_PUBLIC_API_URL`
- Confirm backend allows requests from your frontend origin

### App keeps redirecting to login

- Session cookie may be expired or invalid
- Log in again with your vault password
- Ensure backend and frontend URLs match your environment setup

### Setup/Login returns too many attempts

- Backend applies rate limiting on auth endpoints
- Wait and try again

## Notes

- This project is frontend-focused by design
- For backend architecture and endpoint details, see `ARCHITECTURE.md`
