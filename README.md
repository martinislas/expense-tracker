# Ledger — Personal Expense Tracker

A single-user expense tracker and budgeting app: React frontend, Node/Express API,
MongoDB storage. Tracks USD. Includes a statement importer for ABA Bank CSV/Excel
exports (see the note on bank linking below).

## Project structure

```
expense-tracker/
  backend/     Express API + MongoDB models
  frontend/    React app (Vite)
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a connection string to Atlas/other hosted Mongo)

## 1. Set up the backend

```bash
cd backend
npm install
cp .env.example .env      # edit MONGODB_URI if needed
npm run seed               # creates default categories (Groceries, Rent, etc.)
npm run dev                 # starts API on http://localhost:4000
```

## 2. Set up the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev                 # starts app on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` requests to the
backend on port 4000, so both need to be running.

## Features

- **Dashboard** — income, expenses, net for the current month, spending by category
- **Transactions** — manual entry, list, delete, category assignment
- **Budgets** — set an overall monthly budget and per-category budgets
- **Import** — upload a CSV/XLSX bank statement export; duplicate rows (matched by
  date + description + amount) are skipped automatically, so re-uploading an
  overlapping statement is safe

## On linking directly to ABA Bank

ABA Bank's public API (PayWay) is built for merchants accepting payments — it
doesn't offer a personal "read my transaction history" feed the way Plaid does for
US banks, and Cambodia has no open-banking mandate requiring one. The practical
alternative used here: export your statement from the ABA Mobile app (Account →
Statement → Export) or ABA Internet Banking, and upload it on the Import page.
The importer looks for common column headers (Date, Description, Debit/Credit or
Amount) — if your export uses different headers, adjust `HEADER_MAP` in
`backend/utils/parseStatement.js`.

## Extending

- Deploy MongoDB Atlas + backend (Render/Railway/Fly.io) + frontend (Vercel/Netlify)
  for access from your phone
- Add recurring-transaction detection
- Add multi-currency support (KHR) if needed later
