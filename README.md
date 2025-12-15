# SplitDumb 💸

A simple, lightweight expense splitting web application inspired by Splitwise. SplitDumb helps you track shared expenses and settle debts within groups, deployed using Cloudflare Workers with a Python backend and TypeScript frontend.

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![D1 Database](https://img.shields.io/badge/D1-Database-F38020)](https://developers.cloudflare.com/d1/)

## ✨ Features

### Core Functionality
- 👥 **User Management**: Registration, authentication, and profile management
- 👪 **Group Management**: Create and manage expense groups
- 💰 **Expense Tracking**: Add, edit, and delete shared expenses
- 📊 **Balance Calculation**: Automatic calculation of who owes whom
- 💸 **Debt Simplification**: Minimize the number of transactions needed
- 💳 **Payment Recording**: Track settlements between users
- 📈 **Dashboard**: Overview of balances and recent activity

### Split Methods
- **Equal Split**: Divide expenses equally among participants
- **Exact Amounts**: Specify exact amounts for each person
- **Percentages**: Split by percentage
- **Shares**: Split by shares

### Additional Features
- 🏷️ **Expense Categories**: Organize expenses (food, transport, utilities, etc.)
- 🔍 **Search & Filter**: Filter expenses by date, category, or user
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔒 **Secure**: Password hashing, session management, and authorization
- ⚡ **Fast**: Serverless architecture with global edge deployment

## 📚 Documentation

- **[SPEC.md](SPEC.md)** - Complete technical specification
- **[API.md](API.md)** - API documentation with examples
- **[DATABASE.md](DATABASE.md)** - Database schema and design
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development guide

## 🏗️ Architecture

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

### Technology Stack

- **Backend**: Python with Cloudflare Workers
- **Frontend**: TypeScript (compiled to JavaScript)
- **Database**: Cloudflare D1 (serverless SQLite)
- **Storage**: Cloudflare KV (session management)
- **Deployment**: Cloudflare Workers & Pages

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Cloudflare account (free tier works)
- Wrangler CLI: `npm install -g wrangler`

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/emily-flambe/splitdumb.git
   cd splitdumb
   ```

2. **Setup Backend**
   ```bash
   cd backend
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Create local database
   wrangler d1 create splitdumb_db_local
   wrangler d1 execute splitdumb_db_local --local --file=schema.sql
   
   # Set up environment variables
   echo "JWT_SECRET=your-secret-key" > .dev.vars
   
   # Start development server
   wrangler dev --local --persist
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Create environment file
   echo "VITE_API_BASE_URL=http://localhost:8787" > .env.local
   
   # Start development server
   npm run dev
   ```

4. **Open in browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8787

## 📖 Usage Examples

### Create a Group

```bash
POST /api/groups
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Roommates",
  "description": "Apartment expenses"
}
```

### Add an Expense

```bash
POST /api/groups/{group_id}/expenses
Content-Type: application/json
Authorization: Bearer <token>

{
  "description": "Groceries",
  "amount": 120.00,
  "payer_id": "user-123",
  "split_method": "equal",
  "participants": ["user-123", "user-456", "user-789"]
}
```

### Get Balances

```bash
GET /api/groups/{group_id}/balances
Authorization: Bearer <token>
```

See [API.md](API.md) for complete API documentation.

## 🧪 Testing

### Backend Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📦 Deployment

### Deploy to Cloudflare

1. **Create D1 Database**
   ```bash
   wrangler d1 create splitdumb_db
   wrangler d1 execute splitdumb_db --file=backend/schema.sql
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   wrangler deploy
   ```

3. **Deploy Frontend**
   ```bash
   cd frontend
   npm run build
   wrangler pages deploy dist --project-name=splitdumb
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🔐 Security

- **Password Security**: Bcrypt password hashing
- **Authentication**: JWT-based authentication
- **Authorization**: Group membership verification
- **SQL Injection**: Parameterized queries
- **XSS Protection**: Input sanitization
- **HTTPS Only**: All traffic encrypted

## 🛠️ Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for:
- Development environment setup
- Coding standards
- Testing guidelines
- Debugging tips
- Contribution guidelines

## 📊 Database Schema

Key tables:
- **users**: User accounts
- **groups**: Expense groups
- **group_members**: Group membership
- **expenses**: Expense records
- **expense_splits**: How expenses are split
- **payments**: Settlement records

See [DATABASE.md](DATABASE.md) for complete schema documentation.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [DEVELOPMENT.md](DEVELOPMENT.md) for coding standards and guidelines.

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Groups
- `POST /api/groups` - Create group
- `GET /api/groups` - List groups
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Expenses
- `POST /api/groups/:id/expenses` - Create expense
- `GET /api/groups/:id/expenses` - List expenses
- `GET /api/expenses/:id` - Get expense details
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Balances
- `GET /api/groups/:id/balances` - Get group balances
- `GET /api/groups/:id/balances/simplified` - Get simplified debts

See [API.md](API.md) for complete API documentation with examples.

## 🎯 Roadmap

- [ ] Multi-currency support
- [ ] Recurring expenses
- [ ] Receipt uploads
- [ ] Email notifications
- [ ] Mobile apps (iOS/Android)
- [ ] Export to CSV/PDF
- [ ] Itemized expenses
- [ ] Spending analytics
- [ ] Group chat

## 🐛 Known Limitations

1. Single currency per expense
2. No real-time collaboration (unless WebSockets added)
3. Basic debt simplification (greedy algorithm)
4. No offline editing without service worker

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Inspired by [Splitwise](https://www.splitwise.com/)
- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Powered by [Cloudflare D1](https://developers.cloudflare.com/d1/)

## 💬 Support

- 📧 Email: support@splitdumb.com
- 💬 Discord: [Join our server](https://discord.gg/splitdumb)
- 🐛 Issues: [GitHub Issues](https://github.com/emily-flambe/splitdumb/issues)
- 📖 Docs: [Full Documentation](https://docs.splitdumb.com)

## 📈 Status

This project is currently in **specification/planning phase**. All documentation describes the intended implementation. Development is not yet complete.

---

Made with ❤️ using Cloudflare Workers