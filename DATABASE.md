# Database Schema Documentation

## Overview

SplitDumb uses Cloudflare D1, a serverless SQLite database. This document describes the complete database schema including tables, relationships, indexes, and constraints.

## Entity Relationship Diagram

```
┌──────────┐         ┌─────────────┐         ┌──────────┐
│  Users   │────────▶│GroupMembers │◀────────│  Groups  │
└────┬─────┘         └──────┬──────┘         └────┬─────┘
     │                      │                      │
     │                      │                      │
     │                      ▼                      │
     │              ┌──────────────┐               │
     └─────────────▶│   Expenses   │◀──────────────┘
     │              └──────┬───────┘
     │                     │
     │                     ▼
     │              ┌──────────────┐
     └─────────────▶│ExpenseSplits │
     │              └──────────────┘
     │
     │              ┌──────────────┐
     └─────────────▶│   Payments   │
                    └──────────────┘
```

## Table Definitions

### users

Stores user account information.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**Columns:**
- `id` (TEXT): Unique identifier (UUID)
- `email` (TEXT): User's email address, must be unique
- `name` (TEXT): User's display name
- `password_hash` (TEXT): Hashed password (bcrypt/argon2)
- `avatar_url` (TEXT): Optional URL to user's avatar image
- `created_at` (DATETIME): Account creation timestamp
- `updated_at` (DATETIME): Last update timestamp

**Indexes:**
- `idx_users_email`: For fast email lookups during authentication
- `idx_users_created_at`: For sorting/filtering by registration date

**Constraints:**
- `email` must be unique
- `email`, `name`, `password_hash` cannot be NULL

### groups

Stores group information.

```sql
CREATE TABLE groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE INDEX idx_groups_creator ON groups(creator_id);
CREATE INDEX idx_groups_created_at ON groups(created_at);
```

**Columns:**
- `id` (TEXT): Unique identifier (UUID)
- `name` (TEXT): Group name
- `description` (TEXT): Optional group description
- `creator_id` (TEXT): User ID of the group creator
- `created_at` (DATETIME): Group creation timestamp
- `updated_at` (DATETIME): Last update timestamp

**Indexes:**
- `idx_groups_creator`: For finding groups created by a user
- `idx_groups_created_at`: For sorting/filtering by creation date

**Relationships:**
- `creator_id` references `users(id)`

### group_members

Junction table for many-to-many relationship between users and groups.

```sql
CREATE TABLE group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_joined_at ON group_members(joined_at);
```

**Columns:**
- `id` (TEXT): Unique identifier (UUID)
- `group_id` (TEXT): Reference to group
- `user_id` (TEXT): Reference to user
- `joined_at` (DATETIME): When user joined the group

**Indexes:**
- `idx_group_members_group`: For finding all members of a group
- `idx_group_members_user`: For finding all groups a user belongs to
- `idx_group_members_joined_at`: For sorting by join date

**Constraints:**
- Composite unique constraint on `(group_id, user_id)` prevents duplicate memberships
- Cascading delete: When group or user is deleted, memberships are removed

### expenses

Stores expense records.

```sql
CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    payer_id TEXT NOT NULL,
    category TEXT,
    date DATE NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (payer_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expenses_payer ON expenses(payer_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);
CREATE INDEX idx_expenses_group_date ON expenses(group_id, date);
```

**Columns:**
- `id` (TEXT): Unique identifier (UUID)
- `group_id` (TEXT): Reference to group
- `description` (TEXT): Expense description
- `amount` (REAL): Total expense amount
- `currency` (TEXT): Currency code (ISO 4217, e.g., USD, EUR)
- `payer_id` (TEXT): User who paid for the expense
- `category` (TEXT): Optional category (food, transport, utilities, etc.)
- `date` (DATE): Date of the expense
- `created_by` (TEXT): User who created the expense record
- `created_at` (DATETIME): Record creation timestamp
- `updated_at` (DATETIME): Last update timestamp

**Indexes:**
- `idx_expenses_group`: For finding all expenses in a group
- `idx_expenses_payer`: For finding expenses paid by a user
- `idx_expenses_date`: For date-based filtering
- `idx_expenses_category`: For category-based filtering
- `idx_expenses_created_at`: For sorting by creation date
- `idx_expenses_group_date`: Composite index for efficient group + date queries

**Constraints:**
- `amount` must be positive (enforced at application level)
- Cascading delete: When group is deleted, expenses are removed

**Categories:**
Common categories include:
- `food` - Meals, groceries
- `transport` - Gas, taxi, public transport
- `utilities` - Rent, electricity, water, internet
- `entertainment` - Movies, concerts, games
- `shopping` - General shopping
- `healthcare` - Medical expenses
- `travel` - Hotels, flights
- `other` - Miscellaneous

### expense_splits

Stores how an expense is split among group members.

```sql
CREATE TABLE expense_splits (
    id TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    percentage REAL,
    shares INTEGER,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_expense_splits_expense_user ON expense_splits(expense_id, user_id);
```

**Columns:**
- `id` (TEXT): Unique identifier (UUID)
- `expense_id` (TEXT): Reference to expense
- `user_id` (TEXT): User who owes this portion
- `amount` (REAL): Amount this user owes
- `percentage` (REAL): Optional percentage (for percentage-based splits)
- `shares` (INTEGER): Optional number of shares (for share-based splits)

**Indexes:**
- `idx_expense_splits_expense`: For finding all splits of an expense
- `idx_expense_splits_user`: For finding all splits involving a user
- `idx_expense_splits_expense_user`: Composite index for efficient expense + user queries

**Constraints:**
- Sum of all `amount` values for an expense should equal the expense amount
- `amount` must be positive
- Cascading delete: When expense is deleted, splits are removed

**Split Methods:**
1. **Equal Split**: `amount = expense.amount / num_participants`
2. **Exact Amount**: Each user's `amount` is explicitly specified
3. **Percentage**: `amount = expense.amount * (percentage / 100)`
4. **Shares**: `amount = expense.amount * (shares / total_shares)`

### payments

Stores settlement payments between users.

```sql
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    payer_id TEXT NOT NULL,
    payee_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (payer_id) REFERENCES users(id),
    FOREIGN KEY (payee_id) REFERENCES users(id),
    CHECK (payer_id != payee_id)
);

CREATE INDEX idx_payments_group ON payments(group_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_payee ON payments(payee_id);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_group_date ON payments(group_id, date);
```

**Columns:**
- `id` (TEXT): Unique identifier (UUID)
- `group_id` (TEXT): Reference to group
- `payer_id` (TEXT): User who made the payment
- `payee_id` (TEXT): User who received the payment
- `amount` (REAL): Payment amount
- `currency` (TEXT): Currency code
- `notes` (TEXT): Optional payment notes
- `date` (DATE): Payment date
- `created_at` (DATETIME): Record creation timestamp

**Indexes:**
- `idx_payments_group`: For finding all payments in a group
- `idx_payments_payer`: For finding payments made by a user
- `idx_payments_payee`: For finding payments received by a user
- `idx_payments_date`: For date-based filtering
- `idx_payments_created_at`: For sorting by creation date
- `idx_payments_group_date`: Composite index for efficient group + date queries

**Constraints:**
- `payer_id` and `payee_id` must be different
- `amount` must be positive
- Cascading delete: When group is deleted, payments are removed

## Database Initialization Script

```sql
-- schema.sql
-- SplitDumb Database Schema

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_joined_at ON group_members(joined_at);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    payer_id TEXT NOT NULL,
    category TEXT,
    date DATE NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (payer_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer ON expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_group_date ON expenses(group_id, date);

-- Expense splits table
CREATE TABLE IF NOT EXISTS expense_splits (
    id TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    percentage REAL,
    shares INTEGER,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_user ON expense_splits(expense_id, user_id);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    payer_id TEXT NOT NULL,
    payee_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (payer_id) REFERENCES users(id),
    FOREIGN KEY (payee_id) REFERENCES users(id),
    CHECK (payer_id != payee_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_group ON payments(group_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee ON payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_group_date ON payments(group_id, date);
```

## Common Queries

### Get User's Groups
```sql
SELECT g.* 
FROM groups g
INNER JOIN group_members gm ON g.id = gm.group_id
WHERE gm.user_id = ?
ORDER BY g.name;
```

### Get Group Expenses with Payer Names
```sql
SELECT e.*, u.name as payer_name
FROM expenses e
INNER JOIN users u ON e.payer_id = u.id
WHERE e.group_id = ?
ORDER BY e.date DESC, e.created_at DESC;
```

### Get Expense Splits with User Names
```sql
SELECT es.*, u.name as user_name
FROM expense_splits es
INNER JOIN users u ON es.user_id = u.id
WHERE es.expense_id = ?;
```

### Calculate User Balance in Group
```sql
-- Amount user paid
SELECT COALESCE(SUM(e.amount), 0) as total_paid
FROM expenses e
WHERE e.group_id = ? AND e.payer_id = ?;

-- Amount user owes
SELECT COALESCE(SUM(es.amount), 0) as total_owed
FROM expense_splits es
INNER JOIN expenses e ON es.expense_id = e.id
WHERE e.group_id = ? AND es.user_id = ?;

-- Payments made by user
SELECT COALESCE(SUM(p.amount), 0) as payments_made
FROM payments p
WHERE p.group_id = ? AND p.payer_id = ?;

-- Payments received by user
SELECT COALESCE(SUM(p.amount), 0) as payments_received
FROM payments p
WHERE p.group_id = ? AND p.payee_id = ?;

-- Net balance = total_paid + payments_received - total_owed - payments_made
```

### Get All Balances in Group
```sql
WITH user_expenses AS (
    SELECT 
        payer_id as user_id,
        SUM(amount) as total_paid
    FROM expenses
    WHERE group_id = ?
    GROUP BY payer_id
),
user_splits AS (
    SELECT 
        es.user_id,
        SUM(es.amount) as total_owed
    FROM expense_splits es
    INNER JOIN expenses e ON es.expense_id = e.id
    WHERE e.group_id = ?
    GROUP BY es.user_id
),
user_payments_made AS (
    SELECT 
        payer_id as user_id,
        SUM(amount) as payments_made
    FROM payments
    WHERE group_id = ?
    GROUP BY payer_id
),
user_payments_received AS (
    SELECT 
        payee_id as user_id,
        SUM(amount) as payments_received
    FROM payments
    WHERE group_id = ?
    GROUP BY payee_id
)
SELECT 
    u.id,
    u.name,
    COALESCE(ue.total_paid, 0) + COALESCE(upr.payments_received, 0) - 
    COALESCE(us.total_owed, 0) - COALESCE(upm.payments_made, 0) as balance
FROM users u
INNER JOIN group_members gm ON u.id = gm.user_id
LEFT JOIN user_expenses ue ON u.id = ue.user_id
LEFT JOIN user_splits us ON u.id = us.user_id
LEFT JOIN user_payments_made upm ON u.id = upm.user_id
LEFT JOIN user_payments_received upr ON u.id = upr.user_id
WHERE gm.group_id = ?
ORDER BY u.name;
```

### Get Recent Activity for Group
```sql
SELECT 
    'expense' as type,
    e.id,
    e.description,
    e.amount,
    u.name as user_name,
    e.created_at
FROM expenses e
INNER JOIN users u ON e.created_by = u.id
WHERE e.group_id = ?

UNION ALL

SELECT 
    'payment' as type,
    p.id,
    p.notes as description,
    p.amount,
    u.name as user_name,
    p.created_at
FROM payments p
INNER JOIN users u ON p.payer_id = u.id
WHERE p.group_id = ?

ORDER BY created_at DESC
LIMIT 20;
```

## Data Integrity

### Triggers for Updated Timestamp

**Note**: These triggers are optional enhancements. The main schema includes `DEFAULT CURRENT_TIMESTAMP` for `updated_at` fields, which covers inserts. These triggers automatically update the timestamp on record updates. Add them to your schema if you want automatic timestamp updates.

```sql
-- Trigger to update users.updated_at
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update groups.updated_at
CREATE TRIGGER IF NOT EXISTS update_groups_timestamp 
AFTER UPDATE ON groups
BEGIN
    UPDATE groups SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update expenses.updated_at
CREATE TRIGGER IF NOT EXISTS update_expenses_timestamp 
AFTER UPDATE ON expenses
BEGIN
    UPDATE expenses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### Constraints Validation

Application-level validations:
1. Expense amount must be positive
2. Sum of expense splits must equal expense amount
3. Payment amount must be positive
4. Payer and payee must be different
5. All users in expense splits must be members of the group
6. Payer must be a member of the group
7. Category must be from predefined list (if not null)

## Migrations

For database migrations, use versioned SQL files:

```
migrations/
├── 001_initial_schema.sql
├── 002_add_category_index.sql
└── 003_add_payment_triggers.sql
```

Each migration should be idempotent and include both `UP` and `DOWN` scripts.

## Backup Strategy

1. **Automatic Backups**: Cloudflare D1 provides automatic backups
2. **Export**: Use `wrangler d1 export` to create manual backups
3. **Frequency**: Daily automated exports to Cloudflare R2 storage
4. **Retention**: Keep 30 days of daily backups

## Performance Considerations

1. **Indexes**: All foreign keys are indexed
2. **Composite Indexes**: Used for common multi-column queries
3. **Query Optimization**: Use EXPLAIN QUERY PLAN to optimize slow queries
4. **Connection Pooling**: Handled by Cloudflare Workers platform
5. **Pagination**: Implement pagination for large result sets
6. **Caching**: Cache frequently accessed data in Cloudflare KV

## Security

1. **SQL Injection**: Always use parameterized queries
2. **Access Control**: Verify user permissions at application level
3. **Encryption**: Data encrypted at rest by Cloudflare D1
4. **TLS**: All connections use TLS encryption
5. **Sensitive Data**: Password hashes only, never plain text passwords
