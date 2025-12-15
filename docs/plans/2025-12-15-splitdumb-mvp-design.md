# SplitDumb MVP Design

A simple expense splitter for friend trips. No accounts, just shareable trip codes.

## Overview

**Problem**: Splitwise is overkill for a week-long trip with friends. You just need to track who paid for what and see who owes whom at the end.

**Solution**: A lightweight web app where you create a trip, share the code + password with friends, and everyone can add expenses. Balances calculated automatically.

**Stack**:
- Cloudflare Workers + Hono (API)
- D1 database (SQLite)
- Vite + vanilla TypeScript (frontend)
- Deploy to `splitdumb.emilycogsdill.com`

## Access Model

No user accounts. Trip-based access:

1. **Create trip** → generates human-readable slug (`quick-fox-river`) + password
2. **Share with friends** → copy-paste message with URL + password
3. **Join trip** → enter slug + password → stored in localStorage
4. **All actions scoped to trip** → password validated on each request

## Database Schema

```sql
-- Trips (the top-level container)
CREATE TABLE trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,        -- "happy-tiger-mountain"
  name TEXT NOT NULL,               -- "Ski Trip 2025"
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Participants belong to a trip
CREATE TABLE participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  UNIQUE(trip_id, name)
);

-- Expenses belong to a trip
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  paid_by INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES participants(id)
);

-- Who owes what per expense
CREATE TABLE expense_splits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  UNIQUE(expense_id, participant_id)
);
```

## API Design

### Public Endpoints (no auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/trips` | Create trip → returns `{slug, password}` |
| `POST` | `/api/trips/:slug/auth` | Verify password → returns success/fail |

### Trip-Scoped Endpoints (require `X-Trip-Password` header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/trips/:slug` | Get trip details + participants |
| `PUT` | `/api/trips/:slug` | Update trip name or password |
| `DELETE` | `/api/trips/:slug` | Delete entire trip |

### Participants

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/trips/:slug/participants` | Add participant |
| `DELETE` | `/api/trips/:slug/participants/:id` | Remove participant |

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/trips/:slug/expenses` | List expenses with splits |
| `POST` | `/api/trips/:slug/expenses` | Create expense |
| `PUT` | `/api/trips/:slug/expenses/:id` | Update expense |
| `DELETE` | `/api/trips/:slug/expenses/:id` | Delete expense |

### Balances

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/trips/:slug/balances` | Computed balances |

### Expense Payload

```json
{
  "description": "Dinner at Thai place",
  "amount": 75.00,
  "paid_by": 1,
  "splits": [
    {"participant_id": 1, "amount": 25.00},
    {"participant_id": 2, "amount": 25.00},
    {"participant_id": 3, "amount": 25.00}
  ]
}
```

Default behavior: equal split among selected participants. Custom amounts optional.

## Frontend UI

### Views

1. **Landing page** (`/`)
   - "Create new trip" button
   - "Join existing trip" form (slug + password)

2. **Trip view** (`/:slug`)
   - Header: Trip name, share button, settings
   - Participants list with add button
   - Add expense form (description, amount, payer, participants, optional custom splits)
   - Expense list (click to edit, delete button)
   - Balances summary ("Alice owes Bob $47")

### Share Button

Copies to clipboard:
```
Join my trip on SplitDumb!

splitdumb.emilycogsdill.com/trip/quick-fox-river
Password: banana7castle

(it's super secure don't worry)
```

### Technical Approach

- Vanilla TypeScript + HTML/CSS (no framework)
- Single-page app with client-side routing
- localStorage stores current trip credentials
- Fetch API with password header
- Mobile-first design (expense entry happens on phones)

## Project Structure

```
splitdumb/
├── src/
│   ├── index.ts              # Hono app entry
│   ├── api/
│   │   ├── trips.ts          # Trip CRUD + auth
│   │   ├── participants.ts
│   │   ├── expenses.ts
│   │   └── balances.ts
│   ├── db/
│   │   └── schema.sql
│   ├── lib/
│   │   ├── slug.ts           # Word list + generator
│   │   └── password.ts       # Hash/verify helpers
│   └── types.ts
├── frontend/
│   ├── index.html
│   ├── app.ts                # SPA routing + state
│   ├── api.ts                # Fetch wrapper
│   └── styles.css
├── wrangler.toml
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Implementation Order

1. Project scaffolding (wrangler, vite, hono)
2. Database schema + D1 setup
3. Trip API (create, auth, CRUD)
4. Participants API
5. Expenses API with splits
6. Balances calculation
7. Frontend: landing + trip view
8. Share button
9. Deploy + test

## Explicitly Out of Scope

- User accounts / login
- Email notifications
- Expense categories
- Receipt photo uploads
- Currency conversion
- Debt simplification algorithm
- Edit history / audit log
- Multiple currencies per trip
- Recurring expenses
