# SplitDumb MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a trip-based expense splitter deployed to splitdumb.emilycogsdill.com

**Architecture:** Cloudflare Workers with Hono framework serving both API and static frontend. D1 database for persistence. Vanilla TypeScript SPA with client-side routing. Trip access via slug + password (no user accounts).

**Tech Stack:** TypeScript, Hono, Cloudflare Workers, D1, Vite, Vitest

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `wrangler.toml`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`

**Step 1: Initialize package.json**

```json
{
  "name": "splitdumb",
  "version": "1.0.0",
  "description": "Simple expense splitter for friend trips",
  "type": "module",
  "scripts": {
    "dev": "npm run build:frontend && wrangler dev",
    "deploy": "npm run build:frontend && wrangler deploy",
    "build:frontend": "vite build",
    "db:init": "wrangler d1 execute splitdumb-db --local --file=./src/db/schema.sql",
    "db:init:remote": "wrangler d1 execute splitdumb-db --remote --file=./src/db/schema.sql",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "hono": "^4.6.0"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.10.15",
    "@cloudflare/workers-types": "^4.20251213.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "~3.2.0",
    "wrangler": "^4.54.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/frontend"]
}
```

**Step 3: Create wrangler.toml**

```toml
name = "splitdumb"
main = "src/index.ts"
compatibility_date = "2025-12-15"

[[routes]]
pattern = "splitdumb.emilycogsdill.com/*"
zone_name = "emilycogsdill.com"

[assets]
directory = "./dist"
not_found_handling = "single-page-application"

[[d1_databases]]
binding = "DB"
database_name = "splitdumb-db"
database_id = "placeholder-will-be-replaced"

[dev]
port = 8787
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/frontend',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/frontend/index.html'
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});
```

**Step 5: Create vitest.config.ts**

```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});
```

**Step 6: Create .gitignore**

```
node_modules/
dist/
.wrangler/
.dev.vars
*.log
.DS_Store
```

**Step 7: Install dependencies**

Run: `npm install`
Expected: Dependencies installed, package-lock.json created

**Step 8: Commit**

```bash
git add package.json tsconfig.json wrangler.toml vite.config.ts vitest.config.ts .gitignore package-lock.json
git commit -m "chore: initialize project with wrangler, vite, vitest"
```

---

## Task 2: Database Schema

**Files:**
- Create: `src/db/schema.sql`

**Step 1: Write schema**

```sql
-- SplitDumb Database Schema
-- Trip-based expense splitting

-- Trips table (top-level container)
CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Participants belong to a trip
CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  UNIQUE(trip_id, name)
);

-- Expenses belong to a trip
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  paid_by INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES participants(id)
);

-- Who owes what per expense
CREATE TABLE IF NOT EXISTS expense_splits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  participant_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  UNIQUE(expense_id, participant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_trip ON participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_trips_slug ON trips(slug);
```

**Step 2: Create D1 database**

Run: `wrangler d1 create splitdumb-db`
Expected: Database created, copy the database_id

**Step 3: Update wrangler.toml with real database_id**

Replace `placeholder-will-be-replaced` with the actual database_id from step 2.

**Step 4: Initialize local database**

Run: `npm run db:init`
Expected: Schema applied to local D1

**Step 5: Commit**

```bash
git add src/db/schema.sql wrangler.toml
git commit -m "feat: add database schema for trips, participants, expenses"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `src/types.ts`

**Step 1: Write types**

```typescript
// Data models

export interface Trip {
  id: number;
  slug: string;
  name: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
}

export interface Participant {
  id: number;
  trip_id: number;
  name: string;
  created_at: number;
}

export interface Expense {
  id: number;
  trip_id: number;
  description: string;
  amount: number;
  paid_by: number;
  created_at: number;
  updated_at: number;
}

export interface ExpenseSplit {
  id: number;
  expense_id: number;
  participant_id: number;
  amount: number;
}

// API request types

export interface CreateTripRequest {
  name: string;
  password?: string;
}

export interface UpdateTripRequest {
  name?: string;
  password?: string;
}

export interface CreateParticipantRequest {
  name: string;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  paid_by: number;
  splits: { participant_id: number; amount: number }[];
}

export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  paid_by?: number;
  splits?: { participant_id: number; amount: number }[];
}

// API response types

export interface TripWithParticipants extends Omit<Trip, 'password_hash'> {
  participants: Participant[];
}

export interface ExpenseWithSplits extends Expense {
  splits: ExpenseSplit[];
  payer_name: string;
}

export interface Balance {
  participant_id: number;
  participant_name: string;
  paid: number;
  owes: number;
  net: number;
}

// Cloudflare bindings

export interface Env {
  DB: D1Database;
}
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TypeScript types for data models and API"
```

---

## Task 4: Slug Generator

**Files:**
- Create: `src/lib/slug.ts`
- Create: `src/lib/slug.test.ts`

**Step 1: Write failing test**

```typescript
// src/lib/slug.test.ts
import { describe, it, expect } from 'vitest';
import { generateSlug, ADJECTIVES, ANIMALS, NOUNS } from './slug';

describe('generateSlug', () => {
  it('returns a string with three words separated by hyphens', () => {
    const slug = generateSlug();
    const parts = slug.split('-');
    expect(parts).toHaveLength(3);
  });

  it('uses valid adjective, animal, noun', () => {
    const slug = generateSlug();
    const [adj, animal, noun] = slug.split('-');
    expect(ADJECTIVES).toContain(adj);
    expect(ANIMALS).toContain(animal);
    expect(NOUNS).toContain(noun);
  });

  it('generates different slugs on multiple calls', () => {
    const slugs = new Set(Array.from({ length: 10 }, () => generateSlug()));
    expect(slugs.size).toBeGreaterThan(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/slug.test.ts`
Expected: FAIL with "Cannot find module './slug'"

**Step 3: Write implementation**

```typescript
// src/lib/slug.ts
export const ADJECTIVES = [
  'happy', 'brave', 'quick', 'calm', 'bright',
  'clever', 'gentle', 'kind', 'proud', 'swift',
  'warm', 'wild', 'bold', 'cool', 'eager',
  'fair', 'grand', 'jolly', 'keen', 'lucky'
];

export const ANIMALS = [
  'fox', 'owl', 'bear', 'wolf', 'deer',
  'hawk', 'lion', 'tiger', 'eagle', 'otter',
  'panda', 'koala', 'raven', 'shark', 'whale',
  'zebra', 'moose', 'lynx', 'crane', 'heron'
];

export const NOUNS = [
  'river', 'mountain', 'forest', 'meadow', 'canyon',
  'valley', 'island', 'sunset', 'thunder', 'crystal',
  'summit', 'rapids', 'glacier', 'prairie', 'harbor',
  'ridge', 'creek', 'grove', 'trail', 'peak'
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSlug(): string {
  return `${randomItem(ADJECTIVES)}-${randomItem(ANIMALS)}-${randomItem(NOUNS)}`;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/slug.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/slug.ts src/lib/slug.test.ts
git commit -m "feat: add slug generator for human-readable trip IDs"
```

---

## Task 5: Password Hashing

**Files:**
- Create: `src/lib/password.ts`
- Create: `src/lib/password.test.ts`

**Step 1: Write failing test**

```typescript
// src/lib/password.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generatePassword } from './password';

describe('password utilities', () => {
  describe('generatePassword', () => {
    it('generates a password with default length', () => {
      const password = generatePassword();
      expect(password.length).toBe(12);
    });

    it('generates different passwords each time', () => {
      const passwords = new Set(Array.from({ length: 10 }, () => generatePassword()));
      expect(passwords.size).toBeGreaterThan(1);
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('verifies correct password', async () => {
      const password = 'test-password-123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('rejects incorrect password', async () => {
      const hash = await hashPassword('correct-password');
      const isValid = await verifyPassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });

    it('produces different hashes for same password', async () => {
      const password = 'same-password';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/password.test.ts`
Expected: FAIL with "Cannot find module './password'"

**Step 3: Write implementation**

Note: Using Web Crypto API (available in Workers) with PBKDF2 for password hashing.

```typescript
// src/lib/password.ts
const CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generatePassword(length = 12): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => CHARSET[byte % CHARSET.length]).join('');
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(hash);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const originalHash = combined.slice(16);

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const newHash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    const newHashArray = new Uint8Array(newHash);

    if (originalHash.length !== newHashArray.length) return false;
    let result = 0;
    for (let i = 0; i < originalHash.length; i++) {
      result |= originalHash[i] ^ newHashArray[i];
    }
    return result === 0;
  } catch {
    return false;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/password.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/password.ts src/lib/password.test.ts
git commit -m "feat: add password hashing with PBKDF2"
```

---

## Task 6: Database Queries - Trips

**Files:**
- Create: `src/db/queries.ts`

**Step 1: Write trip query functions**

```typescript
// src/db/queries.ts
import type {
  Trip,
  Participant,
  Expense,
  ExpenseSplit,
  CreateTripRequest,
  UpdateTripRequest,
  TripWithParticipants
} from '../types';
import { hashPassword } from '../lib/password';
import { generateSlug } from '../lib/slug';
import { generatePassword } from '../lib/password';

// ============================================================================
// TRIPS
// ============================================================================

export async function createTrip(
  db: D1Database,
  data: CreateTripRequest
): Promise<{ trip: Trip; password: string }> {
  const slug = generateSlug();
  const password = data.password || generatePassword();
  const passwordHash = await hashPassword(password);
  const now = Math.floor(Date.now() / 1000);

  const result = await db.prepare(
    'INSERT INTO trips (slug, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(slug, data.name, passwordHash, now, now).run();

  if (!result.success) {
    throw new Error('Failed to create trip');
  }

  const trip: Trip = {
    id: result.meta.last_row_id as number,
    slug,
    name: data.name,
    password_hash: passwordHash,
    created_at: now,
    updated_at: now
  };

  return { trip, password };
}

export async function getTripBySlug(db: D1Database, slug: string): Promise<Trip | null> {
  return db.prepare('SELECT * FROM trips WHERE slug = ?').bind(slug).first<Trip>();
}

export async function getTripWithParticipants(
  db: D1Database,
  slug: string
): Promise<TripWithParticipants | null> {
  const trip = await getTripBySlug(db, slug);
  if (!trip) return null;

  const participants = await getParticipantsByTrip(db, trip.id);
  const { password_hash, ...tripWithoutHash } = trip;

  return { ...tripWithoutHash, participants };
}

export async function updateTrip(
  db: D1Database,
  slug: string,
  data: UpdateTripRequest
): Promise<Trip | null> {
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }

  if (data.password !== undefined) {
    updates.push('password_hash = ?');
    values.push(await hashPassword(data.password));
  }

  if (updates.length === 0) {
    return getTripBySlug(db, slug);
  }

  updates.push('updated_at = ?');
  values.push(Math.floor(Date.now() / 1000));
  values.push(slug);

  const result = await db.prepare(
    `UPDATE trips SET ${updates.join(', ')} WHERE slug = ?`
  ).bind(...values).run();

  if (result.meta.changes === 0) return null;
  return getTripBySlug(db, slug);
}

export async function deleteTrip(db: D1Database, slug: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM trips WHERE slug = ?').bind(slug).run();
  return result.success && (result.meta.changes || 0) > 0;
}

// ============================================================================
// PARTICIPANTS
// ============================================================================

export async function getParticipantsByTrip(db: D1Database, tripId: number): Promise<Participant[]> {
  const result = await db.prepare(
    'SELECT * FROM participants WHERE trip_id = ? ORDER BY name COLLATE NOCASE ASC'
  ).bind(tripId).all<Participant>();
  return result.results || [];
}

export async function getParticipantById(db: D1Database, id: number): Promise<Participant | null> {
  return db.prepare('SELECT * FROM participants WHERE id = ?').bind(id).first<Participant>();
}

export async function createParticipant(
  db: D1Database,
  tripId: number,
  name: string
): Promise<Participant> {
  const now = Math.floor(Date.now() / 1000);
  const result = await db.prepare(
    'INSERT INTO participants (trip_id, name, created_at) VALUES (?, ?, ?)'
  ).bind(tripId, name, now).run();

  if (!result.success) {
    throw new Error('Failed to create participant');
  }

  return {
    id: result.meta.last_row_id as number,
    trip_id: tripId,
    name,
    created_at: now
  };
}

export async function deleteParticipant(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare('DELETE FROM participants WHERE id = ?').bind(id).run();
  return result.success && (result.meta.changes || 0) > 0;
}

// ============================================================================
// EXPENSES
// ============================================================================

export async function getExpensesByTrip(db: D1Database, tripId: number): Promise<Expense[]> {
  const result = await db.prepare(
    'SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at DESC'
  ).bind(tripId).all<Expense>();
  return result.results || [];
}

export async function getExpenseById(db: D1Database, id: number): Promise<Expense | null> {
  return db.prepare('SELECT * FROM expenses WHERE id = ?').bind(id).first<Expense>();
}

export async function getExpenseWithSplits(db: D1Database, id: number) {
  const expense = await getExpenseById(db, id);
  if (!expense) return null;

  const splits = await db.prepare(
    'SELECT * FROM expense_splits WHERE expense_id = ?'
  ).bind(id).all<ExpenseSplit>();

  const payer = await getParticipantById(db, expense.paid_by);

  return {
    ...expense,
    splits: splits.results || [],
    payer_name: payer?.name || 'Unknown'
  };
}

export async function getExpensesWithSplits(db: D1Database, tripId: number) {
  const expenses = await getExpensesByTrip(db, tripId);
  const result = [];

  for (const expense of expenses) {
    const splits = await db.prepare(
      'SELECT * FROM expense_splits WHERE expense_id = ?'
    ).bind(expense.id).all<ExpenseSplit>();

    const payer = await getParticipantById(db, expense.paid_by);

    result.push({
      ...expense,
      splits: splits.results || [],
      payer_name: payer?.name || 'Unknown'
    });
  }

  return result;
}

export async function createExpense(
  db: D1Database,
  tripId: number,
  data: { description: string; amount: number; paid_by: number; splits: { participant_id: number; amount: number }[] }
): Promise<Expense> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db.prepare(
    'INSERT INTO expenses (trip_id, description, amount, paid_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(tripId, data.description, data.amount, data.paid_by, now, now).run();

  if (!result.success) {
    throw new Error('Failed to create expense');
  }

  const expenseId = result.meta.last_row_id as number;

  // Insert splits
  for (const split of data.splits) {
    await db.prepare(
      'INSERT INTO expense_splits (expense_id, participant_id, amount) VALUES (?, ?, ?)'
    ).bind(expenseId, split.participant_id, split.amount).run();
  }

  return {
    id: expenseId,
    trip_id: tripId,
    description: data.description,
    amount: data.amount,
    paid_by: data.paid_by,
    created_at: now,
    updated_at: now
  };
}

export async function updateExpense(
  db: D1Database,
  id: number,
  data: { description?: string; amount?: number; paid_by?: number; splits?: { participant_id: number; amount: number }[] }
): Promise<Expense | null> {
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }

  if (data.amount !== undefined) {
    updates.push('amount = ?');
    values.push(data.amount);
  }

  if (data.paid_by !== undefined) {
    updates.push('paid_by = ?');
    values.push(data.paid_by);
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));
    values.push(id);

    const result = await db.prepare(
      `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    if (result.meta.changes === 0) return null;
  }

  // Update splits if provided
  if (data.splits !== undefined) {
    await db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').bind(id).run();
    for (const split of data.splits) {
      await db.prepare(
        'INSERT INTO expense_splits (expense_id, participant_id, amount) VALUES (?, ?, ?)'
      ).bind(id, split.participant_id, split.amount).run();
    }
  }

  return getExpenseById(db, id);
}

export async function deleteExpense(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run();
  return result.success && (result.meta.changes || 0) > 0;
}

// ============================================================================
// BALANCES
// ============================================================================

export async function getBalances(db: D1Database, tripId: number) {
  const participants = await getParticipantsByTrip(db, tripId);
  const expenses = await getExpensesByTrip(db, tripId);

  const balances: Record<number, { paid: number; owes: number }> = {};

  // Initialize all participants
  for (const p of participants) {
    balances[p.id] = { paid: 0, owes: 0 };
  }

  // Calculate paid and owes
  for (const expense of expenses) {
    // Add to payer's paid total
    if (balances[expense.paid_by]) {
      balances[expense.paid_by].paid += expense.amount;
    }

    // Get splits for this expense
    const splits = await db.prepare(
      'SELECT * FROM expense_splits WHERE expense_id = ?'
    ).bind(expense.id).all<ExpenseSplit>();

    for (const split of splits.results || []) {
      if (balances[split.participant_id]) {
        balances[split.participant_id].owes += split.amount;
      }
    }
  }

  return participants.map(p => ({
    participant_id: p.id,
    participant_name: p.name,
    paid: balances[p.id]?.paid || 0,
    owes: balances[p.id]?.owes || 0,
    net: (balances[p.id]?.paid || 0) - (balances[p.id]?.owes || 0)
  }));
}
```

**Step 2: Commit**

```bash
git add src/db/queries.ts
git commit -m "feat: add database query functions"
```

---

## Task 7: API Routes - Trips

**Files:**
- Create: `src/api/trips.ts`
- Create: `src/index.ts`

**Step 1: Write trips API routes**

```typescript
// src/api/trips.ts
import { Hono } from 'hono';
import type { Env, CreateTripRequest, UpdateTripRequest } from '../types';
import * as db from '../db/queries';
import { verifyPassword } from '../lib/password';

const app = new Hono<{ Bindings: Env }>();

// POST /api/trips - Create a new trip
app.post('/', async (c) => {
  try {
    const body = await c.req.json<CreateTripRequest>();

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return c.json({ error: 'Trip name is required' }, 400);
    }

    const { trip, password } = await db.createTrip(c.env.DB, {
      name: body.name.trim(),
      password: body.password
    });

    return c.json({
      slug: trip.slug,
      name: trip.name,
      password
    }, 201);
  } catch (error) {
    console.error('Error creating trip:', error);
    return c.json({ error: 'Failed to create trip' }, 500);
  }
});

// POST /api/trips/:slug/auth - Verify trip password
app.post('/:slug/auth', async (c) => {
  try {
    const slug = c.req.param('slug');
    const body = await c.req.json<{ password: string }>();

    if (!body.password) {
      return c.json({ error: 'Password is required' }, 400);
    }

    const trip = await db.getTripBySlug(c.env.DB, slug);
    if (!trip) {
      return c.json({ error: 'Trip not found' }, 404);
    }

    const isValid = await verifyPassword(body.password, trip.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid password' }, 401);
    }

    return c.json({ success: true, name: trip.name });
  } catch (error) {
    console.error('Error authenticating:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// Middleware: verify trip password for all other routes
async function verifyTripAccess(c: any, next: () => Promise<void>) {
  const slug = c.req.param('slug');
  const password = c.req.header('X-Trip-Password');

  if (!password) {
    return c.json({ error: 'Password required' }, 401);
  }

  const trip = await db.getTripBySlug(c.env.DB, slug);
  if (!trip) {
    return c.json({ error: 'Trip not found' }, 404);
  }

  const isValid = await verifyPassword(password, trip.password_hash);
  if (!isValid) {
    return c.json({ error: 'Invalid password' }, 401);
  }

  c.set('trip', trip);
  await next();
}

// GET /api/trips/:slug - Get trip details
app.get('/:slug', verifyTripAccess, async (c) => {
  try {
    const slug = c.req.param('slug');
    const tripWithParticipants = await db.getTripWithParticipants(c.env.DB, slug);

    if (!tripWithParticipants) {
      return c.json({ error: 'Trip not found' }, 404);
    }

    return c.json(tripWithParticipants);
  } catch (error) {
    console.error('Error fetching trip:', error);
    return c.json({ error: 'Failed to fetch trip' }, 500);
  }
});

// PUT /api/trips/:slug - Update trip
app.put('/:slug', verifyTripAccess, async (c) => {
  try {
    const slug = c.req.param('slug');
    const body = await c.req.json<UpdateTripRequest>();

    const trip = await db.updateTrip(c.env.DB, slug, body);
    if (!trip) {
      return c.json({ error: 'Trip not found' }, 404);
    }

    const { password_hash, ...tripWithoutHash } = trip;
    return c.json(tripWithoutHash);
  } catch (error) {
    console.error('Error updating trip:', error);
    return c.json({ error: 'Failed to update trip' }, 500);
  }
});

// DELETE /api/trips/:slug - Delete trip
app.delete('/:slug', verifyTripAccess, async (c) => {
  try {
    const slug = c.req.param('slug');
    const deleted = await db.deleteTrip(c.env.DB, slug);

    if (!deleted) {
      return c.json({ error: 'Trip not found' }, 404);
    }

    return c.json({ success: true, message: 'Trip deleted' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    return c.json({ error: 'Failed to delete trip' }, 500);
  }
});

export default app;
export { verifyTripAccess };
```

**Step 2: Write main entry point**

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

import trips from './api/trips';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: '*',
  credentials: true,
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'SplitDumb API is running'
  });
});

// Mount API routes
app.route('/api/trips', trips);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
```

**Step 3: Verify local dev works**

Run: `npm run dev`
Expected: Server starts on port 8787

**Step 4: Test health endpoint**

Run: `curl http://localhost:8787/api/health`
Expected: `{"status":"ok",...}`

**Step 5: Commit**

```bash
git add src/api/trips.ts src/index.ts
git commit -m "feat: add trips API routes with auth"
```

---

## Task 8: API Routes - Participants

**Files:**
- Create: `src/api/participants.ts`
- Modify: `src/index.ts`

**Step 1: Write participants API routes**

```typescript
// src/api/participants.ts
import { Hono } from 'hono';
import type { Env, CreateParticipantRequest, Trip } from '../types';
import * as db from '../db/queries';
import { verifyTripAccess } from './trips';

const app = new Hono<{ Bindings: Env; Variables: { trip: Trip } }>();

// All routes require trip auth
app.use('*', verifyTripAccess);

// POST /api/trips/:slug/participants - Add participant
app.post('/', async (c) => {
  try {
    const trip = c.get('trip');
    const body = await c.req.json<CreateParticipantRequest>();

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return c.json({ error: 'Participant name is required' }, 400);
    }

    const participant = await db.createParticipant(c.env.DB, trip.id, body.name.trim());
    return c.json(participant, 201);
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return c.json({ error: 'Participant already exists' }, 409);
    }
    console.error('Error creating participant:', error);
    return c.json({ error: 'Failed to create participant' }, 500);
  }
});

// DELETE /api/trips/:slug/participants/:id - Remove participant
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid participant ID' }, 400);
    }

    const deleted = await db.deleteParticipant(c.env.DB, id);
    if (!deleted) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    return c.json({ success: true, message: 'Participant deleted' });
  } catch (error) {
    console.error('Error deleting participant:', error);
    return c.json({ error: 'Failed to delete participant' }, 500);
  }
});

export default app;
```

**Step 2: Update index.ts to mount participants**

Add to `src/index.ts` after trips import:

```typescript
import participants from './api/participants';
```

Add after trips route mount:

```typescript
app.route('/api/trips/:slug/participants', participants);
```

**Step 3: Commit**

```bash
git add src/api/participants.ts src/index.ts
git commit -m "feat: add participants API routes"
```

---

## Task 9: API Routes - Expenses

**Files:**
- Create: `src/api/expenses.ts`
- Modify: `src/index.ts`

**Step 1: Write expenses API routes**

```typescript
// src/api/expenses.ts
import { Hono } from 'hono';
import type { Env, CreateExpenseRequest, UpdateExpenseRequest, Trip } from '../types';
import * as db from '../db/queries';
import { verifyTripAccess } from './trips';

const app = new Hono<{ Bindings: Env; Variables: { trip: Trip } }>();

// All routes require trip auth
app.use('*', verifyTripAccess);

// GET /api/trips/:slug/expenses - List expenses
app.get('/', async (c) => {
  try {
    const trip = c.get('trip');
    const expenses = await db.getExpensesWithSplits(c.env.DB, trip.id);
    return c.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return c.json({ error: 'Failed to fetch expenses' }, 500);
  }
});

// POST /api/trips/:slug/expenses - Create expense
app.post('/', async (c) => {
  try {
    const trip = c.get('trip');
    const body = await c.req.json<CreateExpenseRequest>();

    // Validate required fields
    if (!body.description || typeof body.description !== 'string') {
      return c.json({ error: 'Description is required' }, 400);
    }
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return c.json({ error: 'Amount must be a positive number' }, 400);
    }
    if (typeof body.paid_by !== 'number') {
      return c.json({ error: 'paid_by is required' }, 400);
    }
    if (!Array.isArray(body.splits) || body.splits.length === 0) {
      return c.json({ error: 'At least one split is required' }, 400);
    }

    // Validate splits sum equals amount
    const splitsTotal = body.splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitsTotal - body.amount) > 0.01) {
      return c.json({ error: 'Splits must sum to total amount' }, 400);
    }

    const expense = await db.createExpense(c.env.DB, trip.id, body);
    const expenseWithSplits = await db.getExpenseWithSplits(c.env.DB, expense.id);
    return c.json(expenseWithSplits, 201);
  } catch (error) {
    console.error('Error creating expense:', error);
    return c.json({ error: 'Failed to create expense' }, 500);
  }
});

// PUT /api/trips/:slug/expenses/:id - Update expense
app.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid expense ID' }, 400);
    }

    const body = await c.req.json<UpdateExpenseRequest>();

    // Validate splits if provided
    if (body.splits !== undefined && body.amount !== undefined) {
      const splitsTotal = body.splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(splitsTotal - body.amount) > 0.01) {
        return c.json({ error: 'Splits must sum to total amount' }, 400);
      }
    }

    const expense = await db.updateExpense(c.env.DB, id, body);
    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    const expenseWithSplits = await db.getExpenseWithSplits(c.env.DB, expense.id);
    return c.json(expenseWithSplits);
  } catch (error) {
    console.error('Error updating expense:', error);
    return c.json({ error: 'Failed to update expense' }, 500);
  }
});

// DELETE /api/trips/:slug/expenses/:id - Delete expense
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid expense ID' }, 400);
    }

    const deleted = await db.deleteExpense(c.env.DB, id);
    if (!deleted) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    return c.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return c.json({ error: 'Failed to delete expense' }, 500);
  }
});

export default app;
```

**Step 2: Update index.ts to mount expenses**

Add to `src/index.ts`:

```typescript
import expenses from './api/expenses';
```

Add route mount:

```typescript
app.route('/api/trips/:slug/expenses', expenses);
```

**Step 3: Commit**

```bash
git add src/api/expenses.ts src/index.ts
git commit -m "feat: add expenses API routes"
```

---

## Task 10: API Routes - Balances

**Files:**
- Create: `src/api/balances.ts`
- Modify: `src/index.ts`

**Step 1: Write balances API route**

```typescript
// src/api/balances.ts
import { Hono } from 'hono';
import type { Env, Trip } from '../types';
import * as db from '../db/queries';
import { verifyTripAccess } from './trips';

const app = new Hono<{ Bindings: Env; Variables: { trip: Trip } }>();

app.use('*', verifyTripAccess);

// GET /api/trips/:slug/balances - Get balances
app.get('/', async (c) => {
  try {
    const trip = c.get('trip');
    const balances = await db.getBalances(c.env.DB, trip.id);
    return c.json(balances);
  } catch (error) {
    console.error('Error fetching balances:', error);
    return c.json({ error: 'Failed to fetch balances' }, 500);
  }
});

export default app;
```

**Step 2: Update index.ts to mount balances**

Add to `src/index.ts`:

```typescript
import balances from './api/balances';
```

Add route mount:

```typescript
app.route('/api/trips/:slug/balances', balances);
```

**Step 3: Commit**

```bash
git add src/api/balances.ts src/index.ts
git commit -m "feat: add balances API route"
```

---

## Task 11: Frontend - HTML Shell

**Files:**
- Create: `src/frontend/index.html`
- Create: `src/frontend/styles.css`

**Step 1: Create HTML**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SplitDumb</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/app.js"></script>
</body>
</html>
```

**Step 2: Create base styles**

```css
/* src/frontend/styles.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #0f0f0f;
  --surface: #1a1a1a;
  --surface-hover: #252525;
  --border: #333;
  --text: #e0e0e0;
  --text-muted: #888;
  --primary: #4f9eff;
  --primary-hover: #3d8ae6;
  --success: #4ade80;
  --danger: #f87171;
  --warning: #fbbf24;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  line-height: 1.5;
}

#app {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

/* Typography */
h1 { font-size: 2rem; font-weight: 700; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.25rem; font-weight: 600; }

/* Buttons */
button {
  font-family: inherit;
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--surface-hover);
}

.btn-danger {
  background: var(--danger);
  color: white;
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

/* Forms */
input, select {
  font-family: inherit;
  font-size: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  width: 100%;
}

input:focus, select:focus {
  outline: none;
  border-color: var(--primary);
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group {
  margin-bottom: 1rem;
}

/* Cards */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

/* Lists */
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.list-item:hover {
  background: var(--surface-hover);
}

/* Landing page */
.landing {
  text-align: center;
  padding: 3rem 1rem;
}

.landing h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.landing .tagline {
  color: var(--text-muted);
  margin-bottom: 2rem;
}

.landing .actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 300px;
  margin: 0 auto;
}

/* Trip header */
.trip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.trip-header h1 {
  font-size: 1.5rem;
}

/* Balances */
.balance {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 6px;
}

.balance.positive {
  background: rgba(74, 222, 128, 0.1);
}

.balance.negative {
  background: rgba(248, 113, 113, 0.1);
}

.balance-amount {
  font-weight: 600;
}

.balance-amount.positive { color: var(--success); }
.balance-amount.negative { color: var(--danger); }

/* Section headers */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1.5rem 0 1rem;
}

/* Expense item */
.expense-item {
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.expense-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.expense-description {
  font-weight: 500;
}

.expense-amount {
  font-weight: 600;
  color: var(--primary);
}

.expense-meta {
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* Participants chips */
.participants-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.participant-chip {
  background: var(--surface-hover);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.875rem;
}

/* Checkbox grid */
.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-item input[type="checkbox"] {
  width: auto;
}

/* Modal */
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal.active {
  display: flex;
}

.modal-content {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
}

/* Share message */
.share-box {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  font-family: monospace;
  white-space: pre-wrap;
  margin: 1rem 0;
}

/* Utility */
.hidden { display: none !important; }
.text-center { text-align: center; }
.text-muted { color: var(--text-muted); }
.mt-1 { margin-top: 1rem; }
.mb-1 { margin-bottom: 1rem; }
.flex { display: flex; }
.gap-1 { gap: 1rem; }
```

**Step 3: Commit**

```bash
git add src/frontend/index.html src/frontend/styles.css
git commit -m "feat: add frontend HTML shell and styles"
```

---

## Task 12: Frontend - API Client

**Files:**
- Create: `src/frontend/api.ts`

**Step 1: Write API client**

```typescript
// src/frontend/api.ts

interface TripCredentials {
  slug: string;
  password: string;
}

function getCredentials(): TripCredentials | null {
  const stored = localStorage.getItem('splitdumb_trip');
  return stored ? JSON.parse(stored) : null;
}

function setCredentials(creds: TripCredentials): void {
  localStorage.setItem('splitdumb_trip', JSON.stringify(creds));
}

function clearCredentials(): void {
  localStorage.removeItem('splitdumb_trip');
}

async function api(path: string, options: RequestInit = {}): Promise<any> {
  const creds = getCredentials();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (creds?.password) {
    headers['X-Trip-Password'] = creds.password;
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Trips
export async function createTrip(name: string, password?: string) {
  const data = await api('/trips', {
    method: 'POST',
    body: JSON.stringify({ name, password })
  });
  setCredentials({ slug: data.slug, password: data.password });
  return data;
}

export async function authenticateTrip(slug: string, password: string) {
  const data = await api(`/trips/${slug}/auth`, {
    method: 'POST',
    body: JSON.stringify({ password })
  });
  setCredentials({ slug, password });
  return data;
}

export async function getTrip(slug: string) {
  return api(`/trips/${slug}`);
}

export async function updateTrip(slug: string, updates: { name?: string; password?: string }) {
  return api(`/trips/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteTrip(slug: string) {
  const result = await api(`/trips/${slug}`, { method: 'DELETE' });
  clearCredentials();
  return result;
}

// Participants
export async function addParticipant(slug: string, name: string) {
  return api(`/trips/${slug}/participants`, {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export async function removeParticipant(slug: string, id: number) {
  return api(`/trips/${slug}/participants/${id}`, { method: 'DELETE' });
}

// Expenses
export async function getExpenses(slug: string) {
  return api(`/trips/${slug}/expenses`);
}

export async function createExpense(slug: string, expense: {
  description: string;
  amount: number;
  paid_by: number;
  splits: { participant_id: number; amount: number }[];
}) {
  return api(`/trips/${slug}/expenses`, {
    method: 'POST',
    body: JSON.stringify(expense)
  });
}

export async function updateExpense(slug: string, id: number, updates: any) {
  return api(`/trips/${slug}/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteExpense(slug: string, id: number) {
  return api(`/trips/${slug}/expenses/${id}`, { method: 'DELETE' });
}

// Balances
export async function getBalances(slug: string) {
  return api(`/trips/${slug}/balances`);
}

// Session
export { getCredentials, setCredentials, clearCredentials };
```

**Step 2: Commit**

```bash
git add src/frontend/api.ts
git commit -m "feat: add frontend API client"
```

---

## Task 13: Frontend - Main App

**Files:**
- Create: `src/frontend/app.ts`

**Step 1: Write main app**

```typescript
// src/frontend/app.ts
import * as api from './api.js';

// State
let currentTrip: any = null;
let expenses: any[] = [];
let balances: any[] = [];

// Router
function getRoute(): { page: string; slug?: string } {
  const path = window.location.pathname;
  if (path === '/' || path === '') {
    return { page: 'landing' };
  }
  const match = path.match(/^\/trip\/([a-z]+-[a-z]+-[a-z]+)$/);
  if (match) {
    return { page: 'trip', slug: match[1] };
  }
  return { page: 'landing' };
}

function navigate(path: string) {
  window.history.pushState({}, '', path);
  render();
}

// Render
async function render() {
  const app = document.getElementById('app')!;
  const route = getRoute();

  if (route.page === 'landing') {
    app.innerHTML = renderLanding();
    setupLandingEvents();
  } else if (route.page === 'trip' && route.slug) {
    const creds = api.getCredentials();
    if (!creds || creds.slug !== route.slug) {
      app.innerHTML = renderLogin(route.slug);
      setupLoginEvents(route.slug);
    } else {
      try {
        currentTrip = await api.getTrip(route.slug);
        expenses = await api.getExpenses(route.slug);
        balances = await api.getBalances(route.slug);
        app.innerHTML = renderTrip();
        setupTripEvents();
      } catch (e: any) {
        if (e.message === 'Invalid password') {
          api.clearCredentials();
          app.innerHTML = renderLogin(route.slug);
          setupLoginEvents(route.slug);
        } else {
          app.innerHTML = `<div class="card"><p>Error: ${e.message}</p><button onclick="location.href='/'">Back</button></div>`;
        }
      }
    }
  }
}

// Landing page
function renderLanding(): string {
  return `
    <div class="landing">
      <h1>SplitDumb</h1>
      <p class="tagline">Split expenses with friends. No accounts required.</p>
      <div class="actions">
        <button class="btn-primary" id="create-trip-btn">Create New Trip</button>
        <div class="form-group">
          <input type="text" id="join-slug" placeholder="Enter trip code (e.g., happy-fox-river)">
        </div>
        <button class="btn-secondary" id="join-trip-btn">Join Trip</button>
      </div>
    </div>

    <div class="modal" id="create-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create Trip</h3>
          <button class="modal-close" id="close-create">&times;</button>
        </div>
        <div class="form-group">
          <label>Trip Name</label>
          <input type="text" id="trip-name" placeholder="e.g., Ski Trip 2025">
        </div>
        <div class="form-group">
          <label>Password (optional - one will be generated)</label>
          <input type="password" id="trip-password" placeholder="Leave blank for auto-generated">
        </div>
        <button class="btn-primary" style="width:100%" id="submit-create">Create Trip</button>
      </div>
    </div>
  `;
}

function setupLandingEvents() {
  document.getElementById('create-trip-btn')?.addEventListener('click', () => {
    document.getElementById('create-modal')?.classList.add('active');
  });

  document.getElementById('close-create')?.addEventListener('click', () => {
    document.getElementById('create-modal')?.classList.remove('active');
  });

  document.getElementById('submit-create')?.addEventListener('click', async () => {
    const name = (document.getElementById('trip-name') as HTMLInputElement).value.trim();
    const password = (document.getElementById('trip-password') as HTMLInputElement).value || undefined;

    if (!name) {
      alert('Please enter a trip name');
      return;
    }

    try {
      const trip = await api.createTrip(name, password);
      navigate(`/trip/${trip.slug}`);
    } catch (e: any) {
      alert(e.message);
    }
  });

  document.getElementById('join-trip-btn')?.addEventListener('click', () => {
    const slug = (document.getElementById('join-slug') as HTMLInputElement).value.trim().toLowerCase();
    if (!slug) {
      alert('Please enter a trip code');
      return;
    }
    navigate(`/trip/${slug}`);
  });
}

// Login page
function renderLogin(slug: string): string {
  return `
    <div class="card text-center">
      <h2>Enter Trip Password</h2>
      <p class="text-muted mb-1">Trip: ${slug}</p>
      <div class="form-group">
        <input type="password" id="login-password" placeholder="Password">
      </div>
      <button class="btn-primary" style="width:100%" id="login-btn">Enter Trip</button>
      <p class="mt-1"><a href="/" style="color: var(--primary)">Back to home</a></p>
    </div>
  `;
}

function setupLoginEvents(slug: string) {
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const password = (document.getElementById('login-password') as HTMLInputElement).value;
    if (!password) {
      alert('Please enter the password');
      return;
    }
    try {
      await api.authenticateTrip(slug, password);
      render();
    } catch (e: any) {
      alert(e.message);
    }
  });

  document.getElementById('login-password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('login-btn')?.click();
    }
  });
}

// Trip page
function renderTrip(): string {
  const creds = api.getCredentials()!;

  return `
    <div class="trip-header">
      <h1>${currentTrip.name}</h1>
      <button class="btn-secondary btn-small" id="share-btn">Share</button>
    </div>

    <!-- Balances -->
    <div class="card">
      <h3>Balances</h3>
      ${balances.length === 0 ? '<p class="text-muted">No expenses yet</p>' : balances.map(b => `
        <div class="balance ${b.net >= 0 ? 'positive' : 'negative'}">
          <span>${b.participant_name}</span>
          <span class="balance-amount ${b.net >= 0 ? 'positive' : 'negative'}">
            ${b.net >= 0 ? '+' : ''}$${b.net.toFixed(2)}
          </span>
        </div>
      `).join('')}
    </div>

    <!-- Participants -->
    <div class="section-header">
      <h3>Participants (${currentTrip.participants.length})</h3>
      <button class="btn-secondary btn-small" id="add-participant-btn">+ Add</button>
    </div>
    <div class="participants-list">
      ${currentTrip.participants.map((p: any) => `
        <span class="participant-chip">${p.name}</span>
      `).join('')}
    </div>

    <!-- Add Expense -->
    ${currentTrip.participants.length > 0 ? `
    <div class="section-header">
      <h3>Add Expense</h3>
    </div>
    <div class="card">
      <div class="form-group">
        <label>Description</label>
        <input type="text" id="expense-desc" placeholder="e.g., Dinner">
      </div>
      <div class="form-group">
        <label>Amount ($)</label>
        <input type="number" id="expense-amount" step="0.01" min="0" placeholder="0.00">
      </div>
      <div class="form-group">
        <label>Who Paid?</label>
        <select id="expense-payer">
          ${currentTrip.participants.map((p: any) => `
            <option value="${p.id}">${p.name}</option>
          `).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Split Between</label>
        <div class="checkbox-grid">
          ${currentTrip.participants.map((p: any) => `
            <label class="checkbox-item">
              <input type="checkbox" name="split-participant" value="${p.id}" checked>
              ${p.name}
            </label>
          `).join('')}
        </div>
      </div>
      <button class="btn-primary" style="width:100%" id="add-expense-btn">Add Expense</button>
    </div>
    ` : '<p class="text-muted">Add participants to start tracking expenses</p>'}

    <!-- Expenses List -->
    <div class="section-header">
      <h3>Expenses (${expenses.length})</h3>
    </div>
    ${expenses.length === 0 ? '<p class="text-muted">No expenses yet</p>' : expenses.map(e => `
      <div class="expense-item">
        <div class="expense-header">
          <span class="expense-description">${e.description}</span>
          <span class="expense-amount">$${e.amount.toFixed(2)}</span>
        </div>
        <div class="expense-meta">
          Paid by ${e.payer_name} &bull; Split ${e.splits.length} ways
        </div>
        <button class="btn-danger btn-small mt-1" data-delete-expense="${e.id}">Delete</button>
      </div>
    `).join('')}

    <!-- Modals -->
    <div class="modal" id="share-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Share Trip</h3>
          <button class="modal-close" id="close-share">&times;</button>
        </div>
        <div class="share-box">Join my trip on SplitDumb!

${window.location.origin}/trip/${creds.slug}
Password: ${creds.password}

(it's super secure don't worry)</div>
        <button class="btn-primary" style="width:100%" id="copy-share">Copy to Clipboard</button>
      </div>
    </div>

    <div class="modal" id="add-participant-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add Participant</h3>
          <button class="modal-close" id="close-participant">&times;</button>
        </div>
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="participant-name" placeholder="e.g., Alice">
        </div>
        <button class="btn-primary" style="width:100%" id="submit-participant">Add</button>
      </div>
    </div>
  `;
}

function setupTripEvents() {
  const creds = api.getCredentials()!;

  // Share modal
  document.getElementById('share-btn')?.addEventListener('click', () => {
    document.getElementById('share-modal')?.classList.add('active');
  });

  document.getElementById('close-share')?.addEventListener('click', () => {
    document.getElementById('share-modal')?.classList.remove('active');
  });

  document.getElementById('copy-share')?.addEventListener('click', () => {
    const text = `Join my trip on SplitDumb!\n\n${window.location.origin}/trip/${creds.slug}\nPassword: ${creds.password}\n\n(it's super secure don't worry)`;
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  });

  // Add participant modal
  document.getElementById('add-participant-btn')?.addEventListener('click', () => {
    document.getElementById('add-participant-modal')?.classList.add('active');
  });

  document.getElementById('close-participant')?.addEventListener('click', () => {
    document.getElementById('add-participant-modal')?.classList.remove('active');
  });

  document.getElementById('submit-participant')?.addEventListener('click', async () => {
    const name = (document.getElementById('participant-name') as HTMLInputElement).value.trim();
    if (!name) {
      alert('Please enter a name');
      return;
    }
    try {
      await api.addParticipant(creds.slug, name);
      render();
    } catch (e: any) {
      alert(e.message);
    }
  });

  // Add expense
  document.getElementById('add-expense-btn')?.addEventListener('click', async () => {
    const description = (document.getElementById('expense-desc') as HTMLInputElement).value.trim();
    const amount = parseFloat((document.getElementById('expense-amount') as HTMLInputElement).value);
    const paid_by = parseInt((document.getElementById('expense-payer') as HTMLSelectElement).value);
    const checkedBoxes = document.querySelectorAll('input[name="split-participant"]:checked');
    const participantIds = Array.from(checkedBoxes).map(cb => parseInt((cb as HTMLInputElement).value));

    if (!description) {
      alert('Please enter a description');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (participantIds.length === 0) {
      alert('Please select at least one participant');
      return;
    }

    const splitAmount = amount / participantIds.length;
    const splits = participantIds.map(id => ({
      participant_id: id,
      amount: Math.round(splitAmount * 100) / 100
    }));

    // Adjust for rounding errors
    const total = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(total - amount) > 0.001) {
      splits[0].amount += amount - total;
    }

    try {
      await api.createExpense(creds.slug, { description, amount, paid_by, splits });
      render();
    } catch (e: any) {
      alert(e.message);
    }
  });

  // Delete expense buttons
  document.querySelectorAll('[data-delete-expense]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.deleteExpense!);
      if (confirm('Delete this expense?')) {
        try {
          await api.deleteExpense(creds.slug, id);
          render();
        } catch (e: any) {
          alert(e.message);
        }
      }
    });
  });
}

// Initialize
window.addEventListener('popstate', render);
render();
```

**Step 2: Commit**

```bash
git add src/frontend/app.ts
git commit -m "feat: add frontend app with all views"
```

---

## Task 14: Build and Test Locally

**Step 1: Build frontend**

Run: `npm run build:frontend`
Expected: dist/ folder created with index.html, app.js, styles.css

**Step 2: Start dev server**

Run: `npm run dev`
Expected: Server running on localhost:8787

**Step 3: Test the flow**

1. Open http://localhost:8787
2. Create a trip
3. Add participants
4. Add expenses
5. Verify balances update
6. Test share button
7. Open in another browser/incognito and join with the code

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve any issues found in local testing"
```

---

## Task 15: Deploy to Production

**Step 1: Initialize remote database**

Run: `npm run db:init:remote`
Expected: Schema applied to remote D1

**Step 2: Deploy**

Run: `npm run deploy`
Expected: Deployed to splitdumb.emilycogsdill.com

**Step 3: Test production**

Open https://splitdumb.emilycogsdill.com and verify everything works

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: production deployment verified"
git push origin main
```

---

## Summary

**Total tasks:** 15
**Estimated implementation time:** Complete in one session

**Files created:**
- `package.json`, `tsconfig.json`, `wrangler.toml`, `vite.config.ts`, `vitest.config.ts`, `.gitignore`
- `src/db/schema.sql`
- `src/types.ts`
- `src/lib/slug.ts`, `src/lib/slug.test.ts`
- `src/lib/password.ts`, `src/lib/password.test.ts`
- `src/db/queries.ts`
- `src/api/trips.ts`, `src/api/participants.ts`, `src/api/expenses.ts`, `src/api/balances.ts`
- `src/index.ts`
- `src/frontend/index.html`, `src/frontend/styles.css`, `src/frontend/api.ts`, `src/frontend/app.ts`

**Key features:**
- Trip-based access with shareable codes
- Human-readable slugs (happy-fox-river)
- Password protection with PBKDF2 hashing
- Equal split default with custom amounts
- Real-time balance calculation
- Mobile-first responsive design
- One-click share with copy-paste message
