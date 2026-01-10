---
allowed-tools:
  - Bash
---

# Start Development Server

Initialize database and start local development server.

## Steps

1. Initialize the local D1 database:
   ```bash
   npm run db:init
   ```

2. Build frontend and start dev server:
   ```bash
   npm run dev
   ```

The app will be available at http://localhost:8787

Note: The server runs in the foreground. Press Ctrl+C to stop.
