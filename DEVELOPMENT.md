# SplitDumb Development Guide

## Overview

This guide provides information for developers working on SplitDumb, including setup, coding standards, testing, and contribution guidelines.

## Development Environment Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Git**
- **VS Code** (recommended) or your preferred IDE
- **Wrangler CLI**: `npm install -g wrangler`

### Project Structure

```
splitdumb/
├── backend/                    # Python backend
│   ├── src/
│   │   ├── main.py            # Worker entry point
│   │   ├── config.py          # Configuration
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── groups.py
│   │   │   ├── expenses.py
│   │   │   ├── payments.py
│   │   │   └── dashboard.py
│   │   ├── models/            # Data models
│   │   │   ├── user.py
│   │   │   ├── group.py
│   │   │   ├── expense.py
│   │   │   └── payment.py
│   │   ├── services/          # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── group_service.py
│   │   │   ├── expense_service.py
│   │   │   ├── balance_service.py
│   │   │   └── payment_service.py
│   │   ├── middleware/        # Middleware
│   │   │   ├── auth_middleware.py
│   │   │   └── error_handler.py
│   │   └── utils/            # Utilities
│   │       ├── db.py
│   │       └── helpers.py
│   ├── tests/                # Backend tests
│   │   ├── test_auth.py
│   │   ├── test_groups.py
│   │   ├── test_expenses.py
│   │   └── test_balances.py
│   ├── schema.sql            # Database schema
│   ├── requirements.txt      # Python dependencies
│   ├── requirements-dev.txt  # Development dependencies
│   └── wrangler.toml        # Cloudflare config
├── frontend/                 # TypeScript frontend
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   ├── app.ts           # Main app
│   │   ├── router.ts        # Client routing
│   │   ├── api/             # API client
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── groups.ts
│   │   │   ├── expenses.ts
│   │   │   └── payments.ts
│   │   ├── components/      # UI components
│   │   │   ├── Header.ts
│   │   │   ├── GroupList.ts
│   │   │   ├── ExpenseList.ts
│   │   │   └── ...
│   │   ├── pages/           # Page components
│   │   │   ├── LoginPage.ts
│   │   │   ├── DashboardPage.ts
│   │   │   └── ...
│   │   ├── stores/          # State management
│   │   │   ├── auth.ts
│   │   │   └── ...
│   │   ├── utils/           # Utilities
│   │   │   └── formatters.ts
│   │   └── types/           # TypeScript types
│   │       ├── User.ts
│   │       └── ...
│   ├── public/              # Static assets
│   │   ├── index.html
│   │   └── styles.css
│   ├── tests/               # Frontend tests
│   ├── package.json
│   ├── tsconfig.json
│   └── webpack.config.js
├── docs/                    # Additional documentation
├── SPEC.md                  # Technical specification
├── API.md                   # API documentation
├── DATABASE.md              # Database documentation
├── DEPLOYMENT.md            # Deployment guide
├── DEVELOPMENT.md           # This file
└── README.md               # Project overview
```

### Local Setup

#### 1. Clone Repository

```bash
git clone https://github.com/emily-flambe/splitdumb.git
cd splitdumb
```

#### 2. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Create local database
wrangler d1 create splitdumb_db_local

# Initialize schema
wrangler d1 execute splitdumb_db_local --local --file=schema.sql

# Create .dev.vars file for local secrets
cat > .dev.vars << EOF
JWT_SECRET=your-dev-secret-key-here
ENVIRONMENT=development
EOF

# Start development server
wrangler dev --local --persist
```

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:8787
EOF

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173` and will connect to the backend at `http://localhost:8787`.

## Coding Standards

### Python (Backend)

#### Style Guide

Follow [PEP 8](https://pep8.org/) with these specifics:
- Line length: 100 characters
- Indentation: 4 spaces
- Use type hints
- Docstrings for all public functions/classes

#### Example

```python
from typing import Dict, List, Optional

class UserService:
    """Service for managing user operations."""
    
    def __init__(self, db):
        """Initialize user service.
        
        Args:
            db: Database connection
        """
        self.db = db
    
    async def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user by ID.
        
        Args:
            user_id: The user's unique identifier
            
        Returns:
            User dictionary if found, None otherwise
            
        Raises:
            DatabaseError: If database query fails
        """
        query = "SELECT * FROM users WHERE id = ?"
        result = await self.db.query(query, [user_id])
        return result.first() if result else None
```

#### Tools

```bash
# Format code
black src/

# Lint code
flake8 src/

# Type checking
mypy src/

# Sort imports
isort src/
```

Add to `requirements-dev.txt`:
```
black==23.12.0
flake8==7.0.0
mypy==1.8.0
isort==5.13.0
pytest==7.4.3
pytest-asyncio==0.23.2
```

### TypeScript (Frontend)

#### Style Guide

- Use ESLint with Airbnb config
- Indentation: 2 spaces
- Use interfaces over types
- Prefer const over let
- Use async/await over promises

#### Example

```typescript
interface User {
  id: string;
  email: string;
  name: string;
}

class AuthService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Login user with email and password
   * @param email User's email
   * @param password User's password
   * @returns User object and auth token
   */
  async login(email: string, password: string): Promise<{
    user: User;
    token: string;
  }> {
    const response = await this.apiClient.post('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  }
}
```

#### Tools

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type checking
npm run type-check
```

Add to `package.json`:
```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.ts\"",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "eslint-config-airbnb-typescript": "^17.1.0",
    "prettier": "^3.1.1"
  }
}
```

## Testing

### Backend Tests

#### Unit Tests

```python
# tests/test_balance_service.py
import pytest
from src.services.balance_service import BalanceService

@pytest.fixture
def balance_service():
    return BalanceService()

def test_calculate_balances(balance_service):
    """Test balance calculation."""
    expenses = [
        {"payer_id": "user1", "amount": 100, "splits": [
            {"user_id": "user1", "amount": 50},
            {"user_id": "user2", "amount": 50}
        ]}
    ]
    
    balances = balance_service.calculate_balances(expenses, [])
    
    assert balances["user1"] == 50  # Paid 100, owes 50
    assert balances["user2"] == -50  # Paid 0, owes 50

def test_simplify_debts(balance_service):
    """Test debt simplification."""
    balances = {
        "user1": 50,
        "user2": -30,
        "user3": -20
    }
    
    transactions = balance_service.simplify_debts(balances)
    
    assert len(transactions) == 2
    assert sum(t["amount"] for t in transactions) == 50
```

#### Integration Tests

```python
# tests/test_api_auth.py
import pytest
from src.main import app

@pytest.mark.asyncio
async def test_register_user():
    """Test user registration endpoint."""
    response = await app.fetch("/api/auth/register", {
        "method": "POST",
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "email": "test@example.com",
            "name": "Test User",
            "password": "SecurePass123!"
        })
    })
    
    assert response.status == 201
    data = await response.json()
    assert "token" in data
    assert data["user"]["email"] == "test@example.com"
```

#### Run Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

### Frontend Tests

#### Unit Tests

```typescript
// tests/services/AuthService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '../src/api/auth';
import { ApiClient } from '../src/api/client';

describe('AuthService', () => {
  it('should login successfully', async () => {
    const mockClient = {
      post: vi.fn().mockResolvedValue({
        data: {
          user: { id: '1', email: 'test@example.com', name: 'Test' },
          token: 'mock-token',
        },
      }),
    } as unknown as ApiClient;

    const authService = new AuthService(mockClient);
    const result = await authService.login('test@example.com', 'password');

    expect(result.user.email).toBe('test@example.com');
    expect(result.token).toBe('mock-token');
  });
});
```

#### E2E Tests

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'password');
  await page.click('[data-testid="login-button"]');
  
  await expect(page).toHaveURL('http://localhost:5173/dashboard');
  await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
});
```

#### Run Tests

```bash
cd frontend

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui
```

## Debugging

### Backend Debugging

```python
# Use print statements (visible in wrangler dev logs)
print(f"Debug: user_id={user_id}")

# Or use logging
import logging
logger = logging.getLogger(__name__)
logger.debug(f"Processing request: {request.url}")
```

### Frontend Debugging

```typescript
// Use console.log
console.log('Debug:', data);

// Use debugger statement
debugger;

// Use browser DevTools
```

### Remote Debugging

```bash
# Backend
wrangler dev --debug --remote

# View logs
wrangler tail --debug
```

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/doc-name` - Documentation updates
- `refactor/description` - Code refactoring
- `test/test-name` - Test additions/updates

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Examples:
```
feat(auth): add password reset functionality

fix(balance): correct debt simplification algorithm

docs(api): update authentication endpoints
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes and commit
3. Push branch and create PR
4. Request review
5. Address feedback
6. Merge after approval

### Code Review Checklist

- [ ] Code follows style guide
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Error handling implemented
- [ ] Edge cases handled

## Performance Optimization

### Backend

1. **Database Queries**
   - Use indexes
   - Avoid N+1 queries
   - Use pagination
   - Cache results in KV

2. **CPU Time**
   - Keep processing under 10ms per request
   - Use async operations
   - Avoid expensive computations

3. **Memory**
   - Keep memory usage low
   - Avoid large objects
   - Stream large responses

### Frontend

1. **Bundle Size**
   - Code splitting
   - Tree shaking
   - Lazy loading

2. **Rendering**
   - Virtual scrolling for large lists
   - Debounce expensive operations
   - Optimize re-renders

3. **Network**
   - Cache API responses
   - Optimize images
   - Use service workers

## Security

### Backend Security

1. **Input Validation**
   ```python
   def validate_email(email: str) -> bool:
       pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
       return re.match(pattern, email) is not None
   ```

2. **SQL Injection Prevention**
   ```python
   # Always use parameterized queries
   query = "SELECT * FROM users WHERE id = ?"
   await db.execute(query, [user_id])
   ```

3. **Password Security**
   ```python
   import bcrypt
   
   def hash_password(password: str) -> str:
       return bcrypt.hashpw(password.encode(), bcrypt.gensalt())
   
   def verify_password(password: str, hash: str) -> bool:
       return bcrypt.checkpw(password.encode(), hash.encode())
   ```

### Frontend Security

1. **XSS Prevention**
   ```typescript
   // Sanitize user input
   const sanitize = (text: string): string => {
     const div = document.createElement('div');
     div.textContent = text;
     return div.innerHTML;
   };
   ```

2. **CSRF Protection**
   ```typescript
   // Include CSRF token in requests
   headers: {
     'X-CSRF-Token': csrfToken,
   }
   ```

## Troubleshooting

### Common Issues

**Issue: Database locked**
```bash
# Solution: Ensure no other processes are accessing the database
wrangler dev --local --persist
```

**Issue: Module not found**
```bash
# Solution: Reinstall dependencies
npm clean-install  # or pip install -r requirements.txt
```

**Issue: CORS errors**
```python
# Solution: Add CORS headers
headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}
```

## Useful Commands

### Backend

```bash
# Format code
black src/

# Run tests
pytest

# Check types
mypy src/

# Start dev server
wrangler dev --local

# View logs
wrangler tail
```

### Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Resources

### Documentation
- [Cloudflare Workers Python](https://developers.cloudflare.com/workers/languages/python/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Tools
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/) - API testing
- [DB Browser for SQLite](https://sqlitebrowser.org/)

### Community
- [Cloudflare Discord](https://discord.gg/cloudflaredev)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/cloudflare-workers)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
