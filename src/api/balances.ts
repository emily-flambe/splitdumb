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
