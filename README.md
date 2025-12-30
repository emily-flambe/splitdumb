# splitdumb

Simple expense splitter for friend trips. Create a trip, add participants, log expenses, and see who owes what.

## Install the Android App

1. Download the latest APK from [GitHub Releases](https://github.com/emily-flambe/splitdumb/releases/latest)
2. On your Android device, enable "Install from unknown sources" in Settings > Security (or when prompted)
3. Open the downloaded APK file to install
4. Launch SplitDumb from your app drawer

You can also use the web app at [splitdumb.emilycogsdill.com](https://splitdumb.emilycogsdill.com)

## Tech Stack

- **Backend**: Hono on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JS with Vite build
- **Testing**: Vitest (unit), Playwright (e2e)

## Prerequisites

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)
- Cloudflare account (for deployment)

## Local Development

```bash
# Install dependencies
npm install

# Initialize local database
npm run db:init

# Start dev server (builds frontend + runs worker)
npm run dev
```

The app runs at `http://localhost:8787`.

## Database Setup

### Local
```bash
npm run db:init
```

### Production
First, create a D1 database in your Cloudflare dashboard or via CLI:
```bash
wrangler d1 create splitdumb-db
```

Update `wrangler.toml` with the returned `database_id`, then initialize the schema:
```bash
npm run db:init:remote
```

## Deployment

### First-time Setup

1. Log in to Cloudflare:
   ```bash
   wrangler login
   ```

2. Create the D1 database:
   ```bash
   wrangler d1 create splitdumb-db
   ```

3. Copy the `database_id` from the output into `wrangler.toml`

4. Initialize the production database:
   ```bash
   npm run db:init:remote
   ```

5. (Optional) Configure custom domain in `wrangler.toml`:
   ```toml
   [[routes]]
   pattern = "your-domain.com"
   custom_domain = true
   ```

### Deploy

```bash
npm run deploy
```

This builds the frontend and deploys the worker to Cloudflare.

## Testing

```bash
# Unit tests
npm test

# E2E tests (requires app running or uses production URL)
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

## Project Structure

```
src/
├── api/        # Hono API routes
├── db/         # Database schema and queries
├── frontend/   # Static frontend (HTML, CSS, JS)
├── lib/        # Shared utilities
├── index.ts    # Worker entry point
└── types.ts    # TypeScript types
```
