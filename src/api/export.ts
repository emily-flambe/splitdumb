// src/api/export.ts
import { Hono } from 'hono';
import type { Env, Trip } from '../types';
import * as db from '../db/queries';
import { verifyTripAccess } from './trips';

const app = new Hono<{ Bindings: Env; Variables: { trip: Trip } }>();

app.use('*', verifyTripAccess);

// GET /api/trips/:slug/export - Export all trip data as JSON
app.get('/', async (c) => {
  try {
    const trip = c.get('trip');

    // Fetch all trip data in parallel
    const [tripWithParticipants, expenses, payments, balances, simplifiedDebts] = await Promise.all([
      db.getTripWithParticipants(c.env.DB, trip.slug),
      db.getExpensesWithSplits(c.env.DB, trip.id),
      db.getPaymentsWithNames(c.env.DB, trip.id),
      db.getBalances(c.env.DB, trip.id),
      db.getSimplifiedDebts(c.env.DB, trip.id),
    ]);

    if (!tripWithParticipants) {
      return c.json({ error: 'Trip not found' }, 404);
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      trip: {
        name: tripWithParticipants.name,
        slug: tripWithParticipants.slug,
        createdAt: new Date(tripWithParticipants.created_at * 1000).toISOString(),
      },
      participants: tripWithParticipants.participants.map(p => ({
        id: p.id,
        name: p.name,
        createdAt: new Date(p.created_at * 1000).toISOString(),
      })),
      expenses: expenses.map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        paidBy: {
          id: e.paid_by,
          name: e.payer_name,
        },
        expenseDate: e.expense_date ? new Date(e.expense_date * 1000).toISOString() : null,
        createdAt: new Date(e.created_at * 1000).toISOString(),
        splits: e.splits.map(s => ({
          participantId: s.participant_id,
          amount: s.amount,
        })),
      })),
      payments: payments.map(p => ({
        id: p.id,
        from: {
          id: p.from_participant_id,
          name: p.from_participant_name,
        },
        to: {
          id: p.to_participant_id,
          name: p.to_participant_name,
        },
        amount: p.amount,
        createdAt: new Date(p.created_at * 1000).toISOString(),
      })),
      balances: balances.map(b => ({
        participantId: b.participant_id,
        participantName: b.participant_name,
        paid: b.paid,
        owes: b.owes,
        net: b.net,
      })),
      simplifiedDebts: simplifiedDebts.map(d => ({
        from: {
          id: d.from_participant_id,
          name: d.from_participant_name,
        },
        to: {
          id: d.to_participant_id,
          name: d.to_participant_name,
        },
        amount: d.amount,
      })),
    };

    return c.json(exportData);
  } catch (error) {
    console.error('Error exporting trip data:', error);
    return c.json({ error: 'Failed to export trip data' }, 500);
  }
});

export default app;
