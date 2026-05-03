# Vault — Personal Finance Dashboard

A personal finance web app built with Next.js. Track expenses, manage savings goals, and visualize spending habits across categories.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP | Axios |
| Font | Inter (Google Fonts) |

## Features

- **Dashboard** — Weekly summary, spending stats, and category breakdown chart
- **Expenses** — Create, edit, delete, and filter expenses by month and category
- **Goals** — Create short-term and long-term savings goals with progress tracking and contributions

## Project Structure

```
src/
├── app/
│   ├── dashboard/      # Dashboard page
│   ├── expenses/       # Expenses page
│   └── goals/          # Goals page
├── components/
│   ├── dashboard/      # StatsBar, WeeklySummaryCard, CategoryChart
│   ├── expenses/       # ExpenseForm, ExpenseList, ExpenseFilters
│   ├── goals/          # GoalCard, GoalForm, ContributeModal
│   ├── layout/         # Sidebar, TopBar
│   └── ui/             # Badge, Modal, Toast, Skeleton, ErrorMessage
├── lib/
│   ├── api.ts          # Axios API client and all API functions
│   └── utils.ts        # Shared utility helpers
└── types/
    └── index.ts        # Shared TypeScript interfaces
```

## Getting Started

### Prerequisites

- Node.js 18+
- A running backend API (see [Environment Variables](#environment-variables))

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

The API client calls `{NEXT_PUBLIC_API_URL}/api/v1`. This variable is **required** in development — the app will throw an error at startup if it is missing.

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

## API Overview

All API calls are defined in `src/lib/api.ts` and hit the following endpoints:

| Resource | Endpoints |
|---|---|
| Categories | `GET /categories` |
| Expenses | `GET /expenses`, `POST /expenses`, `PUT /expenses/:id`, `DELETE /expenses/:id` |
| Expense Stats | `GET /expenses/stats`, `GET /expenses/summary` |
| Goals | `GET /goals`, `POST /goals`, `PUT /goals/:id`, `DELETE /goals/:id` |
| Goal Contributions | `POST /goals/:id/contribute` |
| Weekly Summary | `GET /expenses/weekly-summary` |
