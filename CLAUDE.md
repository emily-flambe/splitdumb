# SplitDumb

Simple expense splitter for friend trips. Users create trips, add participants, log expenses with custom splits, record payments, and view simplified "who owes whom" balances.

## Tech Stack

- **Runtime**: Cloudflare Workers (edge)
- **Framework**: Hono (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla TypeScript with Vite
- **Mobile**: Capacitor (Android APK)
- **Testing**: Vitest (unit), Playwright (e2e)

## Project Structure

```
src/
├── index.ts           # Worker entry point, mounts all routes
├── types.ts           # Shared TypeScript interfaces
├── api/               # Hono route handlers (trips, expenses, payments, etc.)
├── db/
│   ├── schema.sql     # D1 table definitions
│   └── queries.ts     # Database query functions
├── lib/               # Utilities (password hashing, rate limiting, slug generation)
└── frontend/          # Static frontend assets
    ├── index.html     # SPA entry point
    ├── app.ts         # Main app logic and UI rendering
    ├── api.ts         # Frontend API client
    └── styles.css     # All styles

e2e/                   # Playwright e2e tests
android/               # Capacitor Android project
```

## Essential Commands

```bash
# Development
npm run dev              # Build frontend + start local worker (port 8787)
npm run build:frontend   # Build frontend only

# Database
npm run db:init          # Initialize local D1 database
npm run db:init:remote   # Initialize production D1 database

# Testing
npm test                 # Run unit tests (Vitest)
npm run test:e2e         # Run e2e tests (Playwright)

# Deployment
npm run deploy           # Build + deploy to Cloudflare Workers

# Android
npm run cap:sync         # Build frontend + sync to Android
npm run cap:open         # Open Android project in Android Studio
```

## Development Workflow

1. Start local dev server: `npm run dev`
2. App runs at http://localhost:8787
3. Database is initialized automatically on first run

## Architecture Notes

### Authentication
- Trips are password-protected (hashed with bcrypt-like algorithm)
- Frontend stores credentials in localStorage
- API routes use `X-Trip-Password` header for auth
- Admin routes use `X-Admin-Password` header

### API Structure
All trip-specific routes are nested under `/api/trips/:slug/`:
- `POST /api/trips` - Create trip
- `POST /api/trips/:slug/auth` - Verify password
- `GET /api/trips/:slug` - Get trip with participants
- `POST /api/trips/:slug/participants` - Add participant
- `POST /api/trips/:slug/expenses` - Add expense
- `GET /api/trips/:slug/balances` - Get balances and simplified debts

### Offline Support
Frontend queues mutations when offline using IndexedDB. Syncs automatically when online.

### Test Trips
E2E tests use `?test=true` URL param to mark trips as test data. Admin can bulk-delete test trips.

## Testing Notes

- Unit tests use `@cloudflare/vitest-pool-workers` for D1 mocking
- E2E tests run against local worker (`wrangler dev`)
- CI runs both unit and e2e tests on every PR

## Deployment

Production URL: https://splitdumb.emilycogsdill.com

Deploys via `wrangler deploy`. CI auto-deploys main branch to production.
