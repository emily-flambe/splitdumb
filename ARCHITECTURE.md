# Architecture Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Devices                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Desktop  │  │  Mobile  │  │  Tablet  │  │  Other   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                          │ HTTPS
                          ▼
        ┌──────────────────────────────────────┐
        │     Cloudflare Edge Network          │
        │  (CDN, DDoS Protection, SSL/TLS)     │
        └──────────────┬───────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
    ┌─────────────┐         ┌─────────────┐
    │  Frontend   │         │   Backend   │
    │ (CF Pages)  │         │ (CF Worker) │
    │ TypeScript  │◀───────▶│   Python    │
    └─────────────┘         └──────┬──────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
            ┌──────────────┐            ┌──────────────┐
            │  D1 Database │            │   KV Store   │
            │   (SQLite)   │            │  (Sessions)  │
            └──────────────┘            └──────────────┘
```

## Request Flow

```
1. User Action
   └─▶ Browser (TypeScript)

2. API Request
   └─▶ HTTPS → Cloudflare Edge

3. Routing
   └─▶ Worker (Python)
      ├─▶ Authentication Check (KV)
      └─▶ Authorization Check (D1)

4. Business Logic
   └─▶ Service Layer
      ├─▶ Validation
      ├─▶ Processing
      └─▶ Data Access

5. Data Layer
   ├─▶ D1 Database (Read/Write)
   └─▶ KV Store (Session/Cache)

6. Response
   └─▶ JSON → Cloudflare Edge → Browser

7. UI Update
   └─▶ State Management → Component Re-render
```

## Data Flow - Create Expense

```
┌──────────┐
│  User    │
│  Action  │
└────┬─────┘
     │
     ▼
┌──────────────────────┐
│  Frontend            │
│  ExpenseForm.ts      │
│  - Validate Input    │
│  - Format Data       │
└────┬─────────────────┘
     │ POST /api/groups/{id}/expenses
     ▼
┌──────────────────────┐
│  Backend Router      │
│  routes/expenses.py  │
│  - Parse Request     │
│  - Extract Auth      │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│  Auth Middleware     │
│  - Verify Token      │
│  - Get User ID       │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│  Expense Service     │
│  - Verify Group      │
│  - Check Member      │
│  - Calculate Splits  │
└────┬─────────────────┘
     │
     ├─▶ Query: Check group exists
     ├─▶ Query: Check user is member
     ├─▶ Query: Insert expense
     └─▶ Query: Insert splits
     │
     ▼
┌──────────────────────┐
│  D1 Database         │
│  - expenses table    │
│  - expense_splits    │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│  Response            │
│  - Expense Object    │
│  - With Splits       │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│  Frontend Update     │
│  - Update State      │
│  - Refresh List      │
│  - Show Success      │
└──────────────────────┘
```

## Balance Calculation Flow

```
┌──────────────────────┐
│  Get Group Balances  │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│  1. Fetch All Expenses               │
│     - Get expenses for group         │
│     - Include splits for each        │
└────┬─────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│  2. Fetch All Payments               │
│     - Get payments for group         │
└────┬─────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│  3. Calculate Net for Each User      │
│     For each user:                   │
│     - Total Paid (sum of expenses)   │
│     - Total Owed (sum of splits)     │
│     - Payments Made                  │
│     - Payments Received              │
│     Net = Paid + Received - Owed - Made │
└────┬─────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│  4. Build Debt Graph                 │
│     - Creditors (positive balance)   │
│     - Debtors (negative balance)     │
└────┬─────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│  5. Simplify Debts (Optional)        │
│     - Sort creditors by amount DESC  │
│     - Sort debtors by amount DESC    │
│     - Match largest with largest     │
│     - Minimize transactions          │
└────┬─────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│  6. Format Response                  │
│     - User balances                  │
│     - Who owes whom                  │
│     - Transaction list               │
└──────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────────┐
│  User Login  │
└──────┬───────┘
       │
       ▼
┌────────────────────────┐
│  POST /api/auth/login  │
│  - Email               │
│  - Password            │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Auth Service          │
│  1. Find User          │
│     Query: users table │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  2. Verify Password    │
│     bcrypt.compare()   │
└────────┬───────────────┘
         │
         ├─ Invalid ──▶ Return 401 Error
         │
         ▼ Valid
┌────────────────────────┐
│  3. Generate Token     │
│     JWT.sign()         │
│     - user_id          │
│     - email            │
│     - exp: 24h         │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  4. Store Session      │
│     KV.put()           │
│     - session_id       │
│     - user_id          │
│     - TTL: 24h         │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  5. Return Response    │
│     - user object      │
│     - token            │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Frontend              │
│  - Store token         │
│  - Redirect to dash    │
└────────────────────────┘


┌─────────────────────────┐
│  Authenticated Request  │
└────────┬────────────────┘
         │
         ▼
┌────────────────────────┐
│  Authorization Header  │
│  Bearer <token>        │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  Auth Middleware       │
│  1. Extract Token      │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  2. Verify JWT         │
│     JWT.verify()       │
└────────┬───────────────┘
         │
         ├─ Invalid ──▶ Return 401 Error
         │
         ▼ Valid
┌────────────────────────┐
│  3. Check Session      │
│     KV.get()           │
└────────┬───────────────┘
         │
         ├─ Expired ──▶ Return 401 Error
         │
         ▼ Valid
┌────────────────────────┐
│  4. Attach User        │
│     request.user = ... │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│  5. Continue           │
│     Next Handler       │
└────────────────────────┘
```

## Database Entity Relationships

```
┌─────────────┐
│   Users     │
│             │
│ - id (PK)   │
│ - email     │
│ - name      │
│ - password  │
└──────┬──────┘
       │
       │ 1:N
       │
       ▼
┌──────────────────┐         ┌─────────────┐
│  Group_Members   │◀───N:1──│   Groups    │
│                  │         │             │
│ - group_id (FK)  │         │ - id (PK)   │
│ - user_id (FK)   │         │ - name      │
└──────┬───────────┘         │ - creator   │
       │                     └──────┬──────┘
       │                            │
       │                            │ 1:N
       │                            │
       │                            ▼
       │                     ┌──────────────┐
       │                     │   Expenses   │
       │                     │              │
       │                     │ - id (PK)    │
       │            ┌────────│ - group_id   │
       │            │        │ - payer_id   │
       │            │        │ - amount     │
       │            │        └──────┬───────┘
       │            │               │
       │            │               │ 1:N
       │            │               │
       │            │               ▼
       │            │        ┌─────────────────┐
       │            │        │  Expense_Splits │
       │            │        │                 │
       │            │        │ - expense_id    │
       │            └───────▶│ - user_id (FK)  │
       │                     │ - amount        │
       │                     └─────────────────┘
       │
       │                     ┌─────────────┐
       │                     │  Payments   │
       │                     │             │
       └────────────────────▶│ - payer_id  │
                            │ - payee_id  │
                            │ - amount    │
                            └─────────────┘
```

## Deployment Pipeline

```
┌─────────────┐
│ Git Push    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ GitHub Actions  │
│ Workflow Start  │
└──────┬──────────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│  Lint    │      │  Test    │      │  Build   │
│          │      │          │      │          │
│ - Black  │      │ - Pytest │      │ - Python │
│ - ESLint │      │ - Jest   │      │ - NPM    │
└──────┬───┘      └────┬─────┘      └────┬─────┘
       │               │                  │
       └───────────────┴──────────────────┘
                       │
                       ▼
            ┌──────────────────┐
            │   All Pass?      │
            └────┬────────┬────┘
                 │        │
           No ◀──┘        └──▶ Yes
           │                   │
           ▼                   ▼
    ┌───────────┐      ┌──────────────┐
    │  Fail &   │      │  Deploy to   │
    │  Notify   │      │  Cloudflare  │
    └───────────┘      └──────┬───────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │   Backend    │    │   Frontend   │
            │  (Workers)   │    │   (Pages)    │
            └──────┬───────┘    └──────┬───────┘
                   │                   │
                   └─────────┬─────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  Health Check    │
                   └────┬────────┬────┘
                        │        │
                  Pass ◀┘        └──▶ Fail
                   │                  │
                   ▼                  ▼
            ┌──────────┐       ┌──────────┐
            │ Success  │       │ Rollback │
            │ Notify   │       │ & Alert  │
            └──────────┘       └──────────┘
```
