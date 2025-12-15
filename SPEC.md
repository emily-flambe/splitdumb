# SplitDumb - Expense Splitting Web Application Specification

## Overview

SplitDumb is a web application that replicates the basic functionality of Splitwise, allowing users to track shared expenses and settle debts within groups. The application is deployed using Cloudflare Workers with a Python backend and TypeScript frontend.

## Architecture

### Technology Stack

- **Backend**: Python with Cloudflare Workers (using Python Workers runtime)
- **Frontend**: TypeScript (compiled to JavaScript)
- **Database**: Cloudflare D1 (SQLite-based serverless database)
- **Storage**: Cloudflare KV (for session management)
- **Deployment**: Cloudflare Workers

### High-Level Architecture

```
┌─────────────┐
│   Browser   │
│ (TypeScript)│
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────┐
│ Cloudflare Workers  │
│   (Python API)      │
└──────┬──────────────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌──────────┐   ┌─────────┐
│ D1 DB    │   │ KV Store│
│ (SQLite) │   │(Sessions)│
└──────────┘   └─────────┘
```

## Core Features

### 1. User Management
- User registration and authentication
- User profiles with name, email, and avatar
- Password-based authentication
- Session management

### 2. Group Management
- Create groups with a name and description
- Add/remove members to/from groups
- View list of all groups a user belongs to
- Leave a group
- Delete a group (creator only)

### 3. Expense Tracking
- Add expenses with:
  - Description
  - Amount
  - Date
  - Payer (who paid)
  - Split method (equal, exact amounts, percentages, shares)
  - Category (optional: food, transport, utilities, entertainment, etc.)
- Edit expenses
- Delete expenses
- View expense history for a group
- Filter expenses by date, category, or user

### 4. Balance Calculation
- Calculate who owes whom within a group
- Simplify debts (minimize number of transactions)
- View overall balance summary per user
- View detailed breakdown of individual balances

### 5. Settlement
- Record payments between users
- Mark debts as settled
- View payment history

### 6. Dashboard & Reports
- User dashboard showing:
  - Total amount owed
  - Total amount owed to user
  - Recent expenses
  - Recent settlements
- Group dashboard showing:
  - Group balance summary
  - Recent activities
  - Top spenders

## Data Models

### User
```python
{
    "id": "uuid",
    "email": "string (unique)",
    "name": "string",
    "password_hash": "string",
    "avatar_url": "string (optional)",
    "created_at": "timestamp",
    "updated_at": "timestamp"
}
```

### Group
```python
{
    "id": "uuid",
    "name": "string",
    "description": "string (optional)",
    "creator_id": "uuid (foreign key -> User)",
    "created_at": "timestamp",
    "updated_at": "timestamp"
}
```

### GroupMember
```python
{
    "id": "uuid",
    "group_id": "uuid (foreign key -> Group)",
    "user_id": "uuid (foreign key -> User)",
    "joined_at": "timestamp"
}
```

### Expense
```python
{
    "id": "uuid",
    "group_id": "uuid (foreign key -> Group)",
    "description": "string",
    "amount": "float",  # Stored as REAL in SQLite
    "currency": "string (default: USD)",
    "payer_id": "uuid (foreign key -> User)",
    "category": "string (optional)",
    "date": "date",
    "created_by": "uuid (foreign key -> User)",
    "created_at": "timestamp",
    "updated_at": "timestamp"
}
```

### ExpenseSplit
```python
{
    "id": "uuid",
    "expense_id": "uuid (foreign key -> Expense)",
    "user_id": "uuid (foreign key -> User)",
    "amount": "float",  # Stored as REAL in SQLite
    "percentage": "float (optional)",  # Stored as REAL in SQLite
    "shares": "integer (optional)"
}
```

### Payment
```python
{
    "id": "uuid",
    "group_id": "uuid (foreign key -> Group)",
    "payer_id": "uuid (foreign key -> User)",
    "payee_id": "uuid (foreign key -> User)",
    "amount": "float",  # Stored as REAL in SQLite
    "currency": "string (default: USD)",
    "notes": "string (optional)",
    "date": "date",
    "created_at": "timestamp"
}
```

### Session
```python
{
    "session_id": "uuid",
    "user_id": "uuid",
    "expires_at": "timestamp"
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and create session
- `POST /api/auth/logout` - Logout and destroy session
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/search?q=<query>` - Search users by name or email

### Groups
- `POST /api/groups` - Create a new group
- `GET /api/groups` - Get all groups for current user
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group details
- `DELETE /api/groups/:id` - Delete a group
- `POST /api/groups/:id/members` - Add member to group
- `DELETE /api/groups/:id/members/:user_id` - Remove member from group
- `GET /api/groups/:id/members` - Get all members of a group

### Expenses
- `POST /api/groups/:group_id/expenses` - Create a new expense
- `GET /api/groups/:group_id/expenses` - Get all expenses for a group
- `GET /api/expenses/:id` - Get expense details
- `PUT /api/expenses/:id` - Update an expense
- `DELETE /api/expenses/:id` - Delete an expense

### Balances
- `GET /api/groups/:id/balances` - Get balance summary for a group
- `GET /api/groups/:id/balances/simplified` - Get simplified debts for a group
- `GET /api/users/balances` - Get balance summary across all groups for current user

### Payments
- `POST /api/groups/:group_id/payments` - Record a payment
- `GET /api/groups/:group_id/payments` - Get all payments for a group
- `DELETE /api/payments/:id` - Delete a payment

### Dashboard
- `GET /api/dashboard` - Get user dashboard data
- `GET /api/groups/:id/dashboard` - Get group dashboard data

## Request/Response Examples

### Create Expense
**Request:**
```json
POST /api/groups/abc-123/expenses
Content-Type: application/json

{
    "description": "Dinner at Restaurant",
    "amount": 120.00,
    "currency": "USD",
    "payer_id": "user-456",
    "category": "food",
    "date": "2025-12-15",
    "split_method": "equal",
    "participants": ["user-456", "user-789", "user-012"]
}
```

**Response:**
```json
{
    "id": "expense-xyz",
    "group_id": "abc-123",
    "description": "Dinner at Restaurant",
    "amount": 120.00,
    "currency": "USD",
    "payer_id": "user-456",
    "category": "food",
    "date": "2025-12-15",
    "created_by": "user-456",
    "splits": [
        {
            "user_id": "user-456",
            "amount": 40.00
        },
        {
            "user_id": "user-789",
            "amount": 40.00
        },
        {
            "user_id": "user-012",
            "amount": 40.00
        }
    ],
    "created_at": "2025-12-15T14:30:00Z",
    "updated_at": "2025-12-15T14:30:00Z"
}
```

### Get Group Balances
**Request:**
```
GET /api/groups/abc-123/balances
```

**Response:**
```json
{
    "group_id": "abc-123",
    "balances": [
        {
            "user_id": "user-456",
            "user_name": "Alice",
            "balance": 80.00,
            "owes": [],
            "owed_by": [
                {
                    "user_id": "user-789",
                    "user_name": "Bob",
                    "amount": 40.00
                },
                {
                    "user_id": "user-012",
                    "user_name": "Charlie",
                    "amount": 40.00
                }
            ]
        },
        {
            "user_id": "user-789",
            "user_name": "Bob",
            "balance": -40.00,
            "owes": [
                {
                    "user_id": "user-456",
                    "user_name": "Alice",
                    "amount": 40.00
                }
            ],
            "owed_by": []
        },
        {
            "user_id": "user-012",
            "user_name": "Charlie",
            "balance": -40.00,
            "owes": [
                {
                    "user_id": "user-456",
                    "user_name": "Alice",
                    "amount": 40.00
                }
            ],
            "owed_by": []
        }
    ]
}
```

## Database Schema (D1/SQLite)

```sql
-- Users table
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

-- Groups table
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

-- Group members table
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

-- Expenses table
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

-- Expense splits table
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

-- Payments table
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
    FOREIGN KEY (payee_id) REFERENCES users(id)
);

CREATE INDEX idx_payments_group ON payments(group_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_payee ON payments(payee_id);
CREATE INDEX idx_payments_date ON payments(date);
```

## Backend Implementation (Python)

### Project Structure
```
splitdumb/
├── backend/
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py              # Cloudflare Worker entry point
│   │   ├── config.py            # Configuration
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # Authentication routes
│   │   │   ├── users.py         # User routes
│   │   │   ├── groups.py        # Group routes
│   │   │   ├── expenses.py      # Expense routes
│   │   │   ├── payments.py      # Payment routes
│   │   │   └── dashboard.py     # Dashboard routes
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── group.py
│   │   │   ├── expense.py
│   │   │   └── payment.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── group_service.py
│   │   │   ├── expense_service.py
│   │   │   ├── balance_service.py # Balance calculation logic
│   │   │   └── payment_service.py
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   ├── auth_middleware.py
│   │   │   └── error_handler.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── db.py            # Database utilities
│   │       └── helpers.py       # Helper functions
│   ├── requirements.txt
│   └── wrangler.toml            # Cloudflare Workers config
└── ...
```

### Key Components

#### Main Entry Point (main.py)
```python
from js import Response
import json

async def on_fetch(request, env):
    """
    Main entry point for Cloudflare Worker.
    Routes incoming requests to appropriate handlers.
    """
    url = request.url
    method = request.method
    
    # CORS headers
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    
    # Handle CORS preflight
    if method == "OPTIONS":
        return Response.new(None, {
            "status": 204,
            "headers": cors_headers
        })
    
    # Route the request
    # ... routing logic ...
    
    return Response.new(
        json.dumps({"message": "Not Found"}),
        {
            "status": 404,
            "headers": {**cors_headers, "Content-Type": "application/json"}
        }
    )
```

#### Balance Calculation Service
```python
class BalanceService:
    """
    Service for calculating balances and simplifying debts.
    """
    
    @staticmethod
    def calculate_balances(group_id: str, db) -> dict:
        """
        Calculate net balances for all users in a group.
        Returns a dictionary of user_id -> net_balance.
        """
        # Get all expenses and splits for the group
        # Calculate how much each person paid vs. how much they owe
        # Return net balances
        pass
    
    @staticmethod
    def simplify_debts(balances: dict) -> list:
        """
        Simplify debts to minimize number of transactions.
        Uses a greedy algorithm to match debtors with creditors.
        
        Returns a list of transactions: [{from: user_id, to: user_id, amount: float}]
        """
        # Separate users into debtors (negative balance) and creditors (positive balance)
        # Sort both lists by absolute amount
        # Match largest debtor with largest creditor
        # Continue until all debts are settled
        pass
```

### Authentication & Security

- **Password Hashing**: Use bcrypt or argon2 for password hashing
- **Session Management**: Store session tokens in Cloudflare KV with expiration
- **JWT Tokens**: Use JWT for stateless authentication (alternative to sessions)
- **Authorization**: Verify user membership in groups before allowing operations
- **Input Validation**: Validate all inputs on the backend
- **Rate Limiting**: Implement rate limiting using Cloudflare Workers rate limiting API

### Error Handling

Standard error response format:
```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error message",
        "details": {}
    }
}
```

Common error codes:
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `BAD_REQUEST` (400)
- `CONFLICT` (409)
- `INTERNAL_SERVER_ERROR` (500)

## Frontend Implementation (TypeScript)

### Project Structure
```
splitdumb/
├── frontend/
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── app.ts               # Main app component
│   │   ├── router.ts            # Client-side routing
│   │   ├── api/
│   │   │   ├── client.ts        # API client
│   │   │   ├── auth.ts          # Auth API calls
│   │   │   ├── groups.ts        # Group API calls
│   │   │   ├── expenses.ts      # Expense API calls
│   │   │   └── payments.ts      # Payment API calls
│   │   ├── components/
│   │   │   ├── Header.ts
│   │   │   ├── GroupList.ts
│   │   │   ├── ExpenseList.ts
│   │   │   ├── ExpenseForm.ts
│   │   │   ├── BalanceSummary.ts
│   │   │   └── PaymentForm.ts
│   │   ├── pages/
│   │   │   ├── LoginPage.ts
│   │   │   ├── RegisterPage.ts
│   │   │   ├── DashboardPage.ts
│   │   │   ├── GroupPage.ts
│   │   │   └── SettingsPage.ts
│   │   ├── stores/
│   │   │   ├── auth.ts          # Auth state management
│   │   │   ├── groups.ts        # Groups state
│   │   │   └── expenses.ts      # Expenses state
│   │   ├── utils/
│   │   │   ├── formatters.ts    # Date, currency formatters
│   │   │   └── validators.ts    # Input validators
│   │   └── types/
│   │       ├── User.ts
│   │       ├── Group.ts
│   │       ├── Expense.ts
│   │       └── Payment.ts
│   ├── public/
│   │   ├── index.html
│   │   └── styles.css
│   ├── package.json
│   ├── tsconfig.json
│   └── webpack.config.js
└── ...
```

### Key Features

#### API Client
```typescript
class ApiClient {
    private baseUrl: string;
    private authToken: string | null;
    
    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.authToken = localStorage.getItem('auth_token');
    }
    
    async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    setAuthToken(token: string) {
        this.authToken = token;
        localStorage.setItem('auth_token', token);
    }
    
    clearAuthToken() {
        this.authToken = null;
        localStorage.removeItem('auth_token');
    }
}
```

#### Type Definitions
```typescript
interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    created_at: string;
}

interface Group {
    id: string;
    name: string;
    description?: string;
    creator_id: string;
    members: User[];
    created_at: string;
}

interface Expense {
    id: string;
    group_id: string;
    description: string;
    amount: number;
    currency: string;
    payer_id: string;
    payer_name: string;
    category?: string;
    date: string;
    splits: ExpenseSplit[];
    created_at: string;
}

interface ExpenseSplit {
    user_id: string;
    user_name: string;
    amount: number;
}

interface Payment {
    id: string;
    group_id: string;
    payer_id: string;
    payer_name: string;
    payee_id: string;
    payee_name: string;
    amount: number;
    currency: string;
    notes?: string;
    date: string;
    created_at: string;
}

interface Balance {
    user_id: string;
    user_name: string;
    balance: number;
    owes: BalanceDetail[];
    owed_by: BalanceDetail[];
}

interface BalanceDetail {
    user_id: string;
    user_name: string;
    amount: number;
}
```

### UI/UX Features

1. **Responsive Design**: Mobile-first design that works on all devices
2. **Real-time Updates**: Optional WebSocket support for real-time balance updates
3. **Offline Support**: Service worker for offline functionality
4. **Progressive Web App**: Installable as a PWA
5. **Accessibility**: WCAG 2.1 AA compliant
6. **Dark Mode**: Support for dark mode

### Pages

1. **Login/Register Page**: User authentication
2. **Dashboard**: Overview of all groups, balances, and recent activity
3. **Group Page**: 
   - Group details and members
   - List of expenses
   - Balance summary
   - Add expense form
   - Record payment form
4. **Settings Page**: User profile management

## Deployment

### Cloudflare Workers Configuration (wrangler.toml)

```toml
name = "splitdumb"
main = "backend/src/main.py"
compatibility_date = "2025-12-15"
workers_dev = true

[build]
command = "pip install -r backend/requirements.txt"

[[d1_databases]]
binding = "DB"
database_name = "splitdumb_db"
database_id = "<database-id>"

[[kv_namespaces]]
binding = "SESSIONS"
id = "<kv-namespace-id>"

[vars]
ENVIRONMENT = "production"
```

### Deployment Steps

1. **Setup Cloudflare Account**
   - Create Cloudflare account
   - Install Wrangler CLI: `npm install -g wrangler`
   - Login: `wrangler login`

2. **Create D1 Database**
   ```bash
   wrangler d1 create splitdumb_db
   wrangler d1 execute splitdumb_db --file=schema.sql
   ```

3. **Create KV Namespace**
   ```bash
   wrangler kv:namespace create "SESSIONS"
   ```

4. **Deploy Backend**
   ```bash
   cd backend
   wrangler deploy
   ```

5. **Build and Deploy Frontend**
   ```bash
   cd frontend
   npm run build
   wrangler pages deploy dist
   ```

### Environment Variables

- `JWT_SECRET`: Secret key for JWT token signing
- `SESSION_DURATION`: Session duration in seconds (default: 86400)
- `ENVIRONMENT`: Environment name (development, staging, production)

## Testing Strategy

### Backend Tests
- **Unit Tests**: Test individual functions and services
- **Integration Tests**: Test API endpoints
- **Database Tests**: Test database operations
- Use `pytest` for Python testing

### Frontend Tests
- **Unit Tests**: Test components and utilities
- **Integration Tests**: Test API client and state management
- **E2E Tests**: Test user flows with Playwright or Cypress
- Use `Jest` for TypeScript testing

### Test Coverage Goals
- Backend: >80% code coverage
- Frontend: >70% code coverage

## Security Considerations

1. **SQL Injection**: Use parameterized queries
2. **XSS**: Sanitize all user inputs
3. **CSRF**: Implement CSRF tokens
4. **Authentication**: Secure password storage with bcrypt
5. **Authorization**: Verify user permissions for all operations
6. **Rate Limiting**: Prevent abuse with rate limiting
7. **HTTPS Only**: Enforce HTTPS for all connections
8. **Session Security**: Secure session cookies with HttpOnly and Secure flags
9. **Input Validation**: Validate all inputs on both client and server
10. **Secrets Management**: Use Cloudflare secrets for sensitive data

## Performance Considerations

1. **Database Indexing**: Create indexes on frequently queried columns
2. **Caching**: Use Cloudflare KV for caching frequently accessed data
3. **Lazy Loading**: Load data on-demand
4. **Pagination**: Implement pagination for large lists
5. **Debouncing**: Debounce search and filter operations
6. **Code Splitting**: Split frontend code by route
7. **Asset Optimization**: Minify and compress assets

## Future Enhancements

1. **Multi-currency Support**: Support multiple currencies with exchange rates
2. **Recurring Expenses**: Support for recurring expenses
3. **Receipt Uploads**: Allow users to upload receipt images
4. **Email Notifications**: Send email notifications for new expenses and settlements
5. **Mobile Apps**: Native iOS and Android apps
6. **Export Data**: Export expenses and balances to CSV/PDF
7. **Itemized Expenses**: Split expenses by items (e.g., restaurant bill by item)
8. **Expense Categories Analytics**: Visualize spending by category
9. **Group Chat**: In-app messaging for group members
10. **Social Features**: Share expenses on social media

## Limitations

1. **No Real-time Collaboration**: Changes are not synced in real-time (unless WebSockets are implemented)
2. **Single Currency per Expense**: Each expense uses one currency
3. **No Offline Editing**: Expenses cannot be created offline (without service worker)
4. **Basic Balance Simplification**: Uses greedy algorithm (not always optimal)
5. **No Dispute Resolution**: No built-in mechanism for handling disputes

## License

MIT License

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Splitwise API Documentation](https://dev.splitwise.com/)
