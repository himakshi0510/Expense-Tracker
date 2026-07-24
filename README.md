# Ledger — Real-Time Shared Expense Tracker

A full-stack expense-splitting platform for groups (roommates, families, trip
crews) with real-time balance sync, automatic debt simplification, AI-generated
spending insights, and a personal recurring-bills tracker.

Built as a Week 6 capstone project.

---

## The Problem

Groups sharing recurring expenses — roommates, families, trip groups — struggle
to track who paid for what and who owes whom. Manual tracking (notebooks,
WhatsApp, memory) leads to disputes, forgotten debts, and unnecessary
back-and-forth payments. Ledger solves this with real-time balance tracking and
an algorithm that reduces a tangled web of IOUs into the minimum number of
payments needed to settle up.

---

## Core Features

- **Auth** — JWT-based signup/login, with show/hide password
- **Groups** — create, join via invite code or shareable link, leave (blocked
  if you have an unsettled balance, so debts can't silently disappear)
- **Expenses** — add, edit, delete; equal, custom, or percentage splits;
  optional receipt image upload
- **Real-time sync** — Socket.io broadcasts balance updates to every group
  member instantly, no refresh needed
- **Debt simplification algorithm** — a greedy algorithm that reduces N-way
  group debts into the minimum number of settle-up transactions (see below)
- **Settle up** — record payments, live-updated for everyone
- **Dashboard** — aggregate view across all your groups: total owed to you,
  total you owe, this month's spend, recurring bills total, and a per-group
  balance chart
- **Personal recurring bills** — track rent, subscriptions, and EMIs
  separately from any group
- **AI spending insights** — Google Gemini (free tier) analyzes real
  transaction data to surface spending spikes and likely-recurring expenses
- **Currency per group** — label any group in INR, USD, EUR, or GBP
  (labeling only — no live exchange-rate conversion, see Limitations)
- **PDF export** — download a full group report (balances, settle-up plan,
  expense history)
- **4 color themes** (Classic, Midnight, Sepia, Slate) × dark/light mode
- **Search & filter** expenses by description, member, or category

---

## The Debt-Simplification Algorithm

This is the core technical piece of the project.

**Problem:** if A owes B ₹500, B owes C ₹300, and C owes A ₹200, naively
that's 3 separate payments. Simplified, it can be done in fewer transactions.

**Approach — greedy matching:**
1. Calculate each person's **net balance** (total paid − total owed).
2. Split people into creditors (positive balance) and debtors (negative
   balance).
3. Repeatedly match the largest creditor with the largest debtor, settle the
   smaller of the two amounts between them, and reduce both balances
   accordingly.
4. Repeat until every balance is ~0.

This is a well-known greedy heuristic (O(n log n) with sorting) for this class
of problem. It does not guarantee the mathematically optimal minimum in every
edge case (that variant is NP-hard in general), but performs very close to
optimal in practice.

**Design decision:** the server is the single source of truth for balances.
Clients never calculate balances locally — they only render what the server
broadcasts via Socket.io. This avoids state drift if multiple people modify a
group at the same time.

The algorithm is covered by unit tests in
`backend/utils/debtSimplifier.test.js`, including circular debts, multiple
creditors/debtors, decimal precision, and floating-point edge cases.

---

## Tech Stack

**Frontend:** React (Vite), React Router, Tailwind CSS, Recharts, Socket.io
client

**Backend:** Node.js, Express, MySQL (mysql2), Socket.io, JWT, bcrypt, pdfkit,
multer

**AI:** Google Gemini API (free tier)

**Deployment:** Vercel (frontend), Render (backend), aviom (sql)

---

## Project Structure

```
expense-tracker/
├── backend/
│   ├── config/          # DB connection
│   ├── controllers/     # Business logic per resource
│   ├── middleware/       # JWT auth middleware
│   ├── routes/          # Express route definitions
│   ├── sockets/         # Socket.io connection handling
│   ├── utils/           # Debt simplification algorithm + tests
│   ├── schema.sql       # Full database schema
│   └── server.js
└── frontend/
    └── src/
        ├── components/  # Reusable UI pieces
        ├── context/     # Auth, Theme, Socket contexts
        ├── lib/         # API client, currency helpers
        └── pages/       # Route-level pages
```

---

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your DB credentials, JWT secret, Gemini API key
```

Run `schema.sql` in MySQL Workbench (or your MySQL client of choice) to create
the database and tables.

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # defaults work if backend runs on port 5000
npm run dev
```

Open `http://localhost:5173`.

### Running tests

```bash
cd backend
npx jest utils/debtSimplifier.test.js
```

---

## Known Limitations

Being upfront about these, since a real system would need to address them:

- **Currency is label-only** — no live exchange-rate conversion between
  groups in different currencies. The dashboard's aggregate totals only
  include INR groups for this reason.
- **Location/GPS features are not present** — this app doesn't do geospatial
  matching or live location tracking (that was scoped out of an earlier
  concept for this project).
- **No payment gateway integration** — "settle up" records that a payment
  happened; it doesn't move real money.
- **AI insights depend on the Gemini free tier**, which has rate limits — not
  meant for high-frequency production use.
- **Small-scale only** — tested with a handful of concurrent users, not
  load-tested at scale.

---

## Author

Built by Himakshi as part of a full-stack development internship capstone
project series.
