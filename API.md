# SplitDumb API Documentation

## Base URL
```
https://api.splitdumb.workers.dev
```

## Authentication

All authenticated endpoints require an `Authorization` header with a Bearer token:
```
Authorization: Bearer <token>
```

Tokens are obtained through the `/api/auth/login` endpoint and are valid for 24 hours by default.

## Response Format

### Success Response
```json
{
    "data": { ... },
    "meta": {
        "timestamp": "2025-12-15T14:30:00Z"
    }
}
```

### Error Response
```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error message",
        "details": {},
        "timestamp": "2025-12-15T14:30:00Z"
    }
}
```

### Pagination
Paginated endpoints return:
```json
{
    "data": [...],
    "meta": {
        "page": 1,
        "per_page": 20,
        "total": 100,
        "total_pages": 5
    }
}
```

## Authentication Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "SecurePassword123!"
}
```

**Response (201 Created):**
```json
{
    "data": {
        "user": {
            "id": "user-uuid",
            "email": "user@example.com",
            "name": "John Doe",
            "created_at": "2025-12-15T14:30:00Z"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
    "data": {
        "user": {
            "id": "user-uuid",
            "email": "user@example.com",
            "name": "John Doe"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response (204 No Content)**

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "avatar_url": "https://example.com/avatar.jpg",
        "created_at": "2025-12-15T14:30:00Z"
    }
}
```

## User Endpoints

### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": {
        "id": "user-uuid",
        "name": "John Doe",
        "email": "user@example.com",
        "avatar_url": "https://example.com/avatar.jpg"
    }
}
```

### Update User Profile
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "John Smith",
    "avatar_url": "https://example.com/new-avatar.jpg"
}
```

**Response (200 OK):**
```json
{
    "data": {
        "id": "user-uuid",
        "name": "John Smith",
        "email": "user@example.com",
        "avatar_url": "https://example.com/new-avatar.jpg",
        "updated_at": "2025-12-15T15:00:00Z"
    }
}
```

### Search Users
```http
GET /api/users/search?q=john
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": [
        {
            "id": "user-1",
            "name": "John Doe",
            "email": "john.doe@example.com"
        },
        {
            "id": "user-2",
            "name": "Johnny Smith",
            "email": "johnny.smith@example.com"
        }
    ]
}
```

## Group Endpoints

### Create Group
```http
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "Roommates",
    "description": "Apartment expenses"
}
```

**Response (201 Created):**
```json
{
    "data": {
        "id": "group-uuid",
        "name": "Roommates",
        "description": "Apartment expenses",
        "creator_id": "user-uuid",
        "members": [
            {
                "id": "user-uuid",
                "name": "John Doe",
                "email": "user@example.com"
            }
        ],
        "created_at": "2025-12-15T14:30:00Z"
    }
}
```

### Get All Groups
```http
GET /api/groups
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": [
        {
            "id": "group-1",
            "name": "Roommates",
            "description": "Apartment expenses",
            "member_count": 3,
            "balance": 45.50
        },
        {
            "id": "group-2",
            "name": "Trip to Hawaii",
            "description": "Summer vacation",
            "member_count": 5,
            "balance": -120.00
        }
    ]
}
```

### Get Group Details
```http
GET /api/groups/:id
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": {
        "id": "group-uuid",
        "name": "Roommates",
        "description": "Apartment expenses",
        "creator_id": "user-uuid",
        "members": [
            {
                "id": "user-1",
                "name": "John Doe",
                "email": "john@example.com",
                "joined_at": "2025-12-01T10:00:00Z"
            },
            {
                "id": "user-2",
                "name": "Jane Smith",
                "email": "jane@example.com",
                "joined_at": "2025-12-02T11:00:00Z"
            }
        ],
        "created_at": "2025-12-01T10:00:00Z",
        "updated_at": "2025-12-01T10:00:00Z"
    }
}
```

### Update Group
```http
PUT /api/groups/:id
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "Updated Roommates",
    "description": "New apartment expenses"
}
```

**Response (200 OK):**
```json
{
    "data": {
        "id": "group-uuid",
        "name": "Updated Roommates",
        "description": "New apartment expenses",
        "updated_at": "2025-12-15T15:00:00Z"
    }
}
```

### Delete Group
```http
DELETE /api/groups/:id
Authorization: Bearer <token>
```

**Response (204 No Content)**

### Add Member to Group
```http
POST /api/groups/:id/members
Authorization: Bearer <token>
Content-Type: application/json

{
    "user_id": "user-uuid"
}
```

**Response (201 Created):**
```json
{
    "data": {
        "group_id": "group-uuid",
        "user_id": "user-uuid",
        "user_name": "Alice Johnson",
        "joined_at": "2025-12-15T14:30:00Z"
    }
}
```

### Remove Member from Group
```http
DELETE /api/groups/:id/members/:user_id
Authorization: Bearer <token>
```

**Response (204 No Content)**

### Get Group Members
```http
GET /api/groups/:id/members
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": [
        {
            "id": "user-1",
            "name": "John Doe",
            "email": "john@example.com",
            "joined_at": "2025-12-01T10:00:00Z"
        },
        {
            "id": "user-2",
            "name": "Jane Smith",
            "email": "jane@example.com",
            "joined_at": "2025-12-02T11:00:00Z"
        }
    ]
}
```

## Expense Endpoints

### Create Expense
```http
POST /api/groups/:group_id/expenses
Authorization: Bearer <token>
Content-Type: application/json

{
    "description": "Groceries",
    "amount": 85.50,
    "currency": "USD",
    "payer_id": "user-1",
    "category": "food",
    "date": "2025-12-15",
    "split_method": "equal",
    "participants": ["user-1", "user-2", "user-3"]
}
```

**Split Methods:**
- `equal`: Split equally among participants
- `exact`: Specify exact amounts for each participant
- `percentage`: Specify percentages for each participant
- `shares`: Specify shares for each participant

**For exact amounts:**
```json
{
    "split_method": "exact",
    "splits": [
        {"user_id": "user-1", "amount": 30.00},
        {"user_id": "user-2", "amount": 25.50},
        {"user_id": "user-3", "amount": 30.00}
    ]
}
```

**Response (201 Created):**
```json
{
    "data": {
        "id": "expense-uuid",
        "group_id": "group-uuid",
        "description": "Groceries",
        "amount": 85.50,
        "currency": "USD",
        "payer_id": "user-1",
        "payer_name": "John Doe",
        "category": "food",
        "date": "2025-12-15",
        "splits": [
            {"user_id": "user-1", "user_name": "John Doe", "amount": 28.50},
            {"user_id": "user-2", "user_name": "Jane Smith", "amount": 28.50},
            {"user_id": "user-3", "user_name": "Bob Johnson", "amount": 28.50}
        ],
        "created_at": "2025-12-15T14:30:00Z"
    }
}
```

### Get Expenses for Group
```http
GET /api/groups/:group_id/expenses?page=1&per_page=20&category=food&from_date=2025-12-01&to_date=2025-12-31
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)
- `category`: Filter by category
- `from_date`: Filter by start date (ISO 8601)
- `to_date`: Filter by end date (ISO 8601)
- `user_id`: Filter by user (payer or participant)

**Response (200 OK):**
```json
{
    "data": [
        {
            "id": "expense-1",
            "description": "Groceries",
            "amount": 85.50,
            "currency": "USD",
            "payer_id": "user-1",
            "payer_name": "John Doe",
            "category": "food",
            "date": "2025-12-15",
            "created_at": "2025-12-15T14:30:00Z"
        }
    ],
    "meta": {
        "page": 1,
        "per_page": 20,
        "total": 45,
        "total_pages": 3
    }
}
```

### Get Expense Details
```http
GET /api/expenses/:id
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": {
        "id": "expense-uuid",
        "group_id": "group-uuid",
        "group_name": "Roommates",
        "description": "Groceries",
        "amount": 85.50,
        "currency": "USD",
        "payer_id": "user-1",
        "payer_name": "John Doe",
        "category": "food",
        "date": "2025-12-15",
        "splits": [
            {
                "user_id": "user-1",
                "user_name": "John Doe",
                "amount": 28.50
            },
            {
                "user_id": "user-2",
                "user_name": "Jane Smith",
                "amount": 28.50
            },
            {
                "user_id": "user-3",
                "user_name": "Bob Johnson",
                "amount": 28.50
            }
        ],
        "created_by": "user-1",
        "created_at": "2025-12-15T14:30:00Z",
        "updated_at": "2025-12-15T14:30:00Z"
    }
}
```

### Update Expense
```http
PUT /api/expenses/:id
Authorization: Bearer <token>
Content-Type: application/json

{
    "description": "Grocery Shopping",
    "amount": 90.00,
    "category": "food"
}
```

**Response (200 OK):**
```json
{
    "data": {
        "id": "expense-uuid",
        "description": "Grocery Shopping",
        "amount": 90.00,
        "updated_at": "2025-12-15T15:00:00Z"
    }
}
```

### Delete Expense
```http
DELETE /api/expenses/:id
Authorization: Bearer <token>
```

**Response (204 No Content)**

## Balance Endpoints

### Get Group Balances
```http
GET /api/groups/:id/balances
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": {
        "group_id": "group-uuid",
        "group_name": "Roommates",
        "balances": [
            {
                "user_id": "user-1",
                "user_name": "John Doe",
                "balance": 50.00,
                "total_paid": 200.00,
                "total_owed": 150.00,
                "owes": [],
                "owed_by": [
                    {
                        "user_id": "user-2",
                        "user_name": "Jane Smith",
                        "amount": 25.00
                    },
                    {
                        "user_id": "user-3",
                        "user_name": "Bob Johnson",
                        "amount": 25.00
                    }
                ]
            },
            {
                "user_id": "user-2",
                "user_name": "Jane Smith",
                "balance": -25.00,
                "total_paid": 75.00,
                "total_owed": 100.00,
                "owes": [
                    {
                        "user_id": "user-1",
                        "user_name": "John Doe",
                        "amount": 25.00
                    }
                ],
                "owed_by": []
            }
        ]
    }
}
```

### Get Simplified Debts
```http
GET /api/groups/:id/balances/simplified
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": {
        "group_id": "group-uuid",
        "transactions": [
            {
                "from_user_id": "user-2",
                "from_user_name": "Jane Smith",
                "to_user_id": "user-1",
                "to_user_name": "John Doe",
                "amount": 25.00,
                "currency": "USD"
            },
            {
                "from_user_id": "user-3",
                "from_user_name": "Bob Johnson",
                "to_user_id": "user-1",
                "to_user_name": "John Doe",
                "amount": 25.00,
                "currency": "USD"
            }
        ]
    }
}
```

### Get User Balances (All Groups)
```http
GET /api/users/balances
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": {
        "user_id": "user-1",
        "total_balance": 75.00,
        "total_owed": 100.00,
        "total_owing": 25.00,
        "groups": [
            {
                "group_id": "group-1",
                "group_name": "Roommates",
                "balance": 50.00
            },
            {
                "group_id": "group-2",
                "group_name": "Trip to Hawaii",
                "balance": 25.00
            }
        ]
    }
}
```

## Payment Endpoints

### Record Payment
```http
POST /api/groups/:group_id/payments
Authorization: Bearer <token>
Content-Type: application/json

{
    "payer_id": "user-2",
    "payee_id": "user-1",
    "amount": 25.00,
    "currency": "USD",
    "notes": "Settling up for groceries",
    "date": "2025-12-15"
}
```

**Response (201 Created):**
```json
{
    "data": {
        "id": "payment-uuid",
        "group_id": "group-uuid",
        "payer_id": "user-2",
        "payer_name": "Jane Smith",
        "payee_id": "user-1",
        "payee_name": "John Doe",
        "amount": 25.00,
        "currency": "USD",
        "notes": "Settling up for groceries",
        "date": "2025-12-15",
        "created_at": "2025-12-15T14:30:00Z"
    }
}
```

### Get Payments for Group
```http
GET /api/groups/:group_id/payments?page=1&per_page=20
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": [
        {
            "id": "payment-1",
            "payer_id": "user-2",
            "payer_name": "Jane Smith",
            "payee_id": "user-1",
            "payee_name": "John Doe",
            "amount": 25.00,
            "currency": "USD",
            "notes": "Settling up for groceries",
            "date": "2025-12-15",
            "created_at": "2025-12-15T14:30:00Z"
        }
    ],
    "meta": {
        "page": 1,
        "per_page": 20,
        "total": 5,
        "total_pages": 1
    }
}
```

### Delete Payment
```http
DELETE /api/payments/:id
Authorization: Bearer <token>
```

**Response (204 No Content)**

## Dashboard Endpoints

### Get User Dashboard
```http
GET /api/dashboard
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": {
        "summary": {
            "total_balance": 75.00,
            "total_owed_to_user": 100.00,
            "total_user_owes": 25.00,
            "active_groups": 3
        },
        "recent_expenses": [
            {
                "id": "expense-1",
                "group_name": "Roommates",
                "description": "Groceries",
                "amount": 85.50,
                "payer_name": "John Doe",
                "date": "2025-12-15"
            }
        ],
        "recent_payments": [
            {
                "id": "payment-1",
                "group_name": "Roommates",
                "payer_name": "Jane Smith",
                "payee_name": "John Doe",
                "amount": 25.00,
                "date": "2025-12-14"
            }
        ],
        "groups_summary": [
            {
                "group_id": "group-1",
                "group_name": "Roommates",
                "balance": 50.00,
                "member_count": 3
            }
        ]
    }
}
```

### Get Group Dashboard
```http
GET /api/groups/:id/dashboard
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
    "data": {
        "group": {
            "id": "group-uuid",
            "name": "Roommates",
            "member_count": 3
        },
        "summary": {
            "total_expenses": 450.00,
            "expense_count": 15,
            "payment_count": 5,
            "settled_amount": 200.00
        },
        "top_spenders": [
            {
                "user_id": "user-1",
                "user_name": "John Doe",
                "total_paid": 200.00
            },
            {
                "user_id": "user-2",
                "user_name": "Jane Smith",
                "total_paid": 150.00
            }
        ],
        "category_breakdown": [
            {
                "category": "food",
                "total": 250.00,
                "percentage": 55.6
            },
            {
                "category": "utilities",
                "total": 150.00,
                "percentage": 33.3
            },
            {
                "category": "entertainment",
                "total": 50.00,
                "percentage": 11.1
            }
        ],
        "recent_activity": [
            {
                "type": "expense",
                "id": "expense-1",
                "description": "Groceries",
                "amount": 85.50,
                "user_name": "John Doe",
                "created_at": "2025-12-15T14:30:00Z"
            },
            {
                "type": "payment",
                "id": "payment-1",
                "payer_name": "Jane Smith",
                "payee_name": "John Doe",
                "amount": 25.00,
                "created_at": "2025-12-14T10:00:00Z"
            }
        ]
    }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required or invalid token |
| `FORBIDDEN` | 403 | User doesn't have permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate email) |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute per IP
- **Standard endpoints**: 100 requests per minute per user
- **Heavy endpoints** (dashboard, reports): 20 requests per minute per user

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702656000
```

## Versioning

The API uses URL versioning. Current version: `v1`

Base URL: `https://api.splitdumb.workers.dev/v1`

## CORS

CORS is enabled for all origins in development. In production, only whitelisted origins are allowed.

## Webhooks (Future Enhancement)

Future versions may support webhooks for:
- New expenses created
- Payments recorded
- Balance changes
- Group membership changes
