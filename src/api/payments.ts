// src/api/payments.ts
import { Hono } from 'hono';
import type { Env, CreatePaymentRequest, UpdatePaymentRequest, Trip } from '../types';
import * as db from '../db/queries';
import { verifyTripAccess } from './trips';

const app = new Hono<{ Bindings: Env; Variables: { trip: Trip } }>();

// All routes require trip auth
app.use('*', verifyTripAccess);

// GET /api/trips/:slug/payments - List payments
app.get('/', async (c) => {
  try {
    const trip = c.get('trip');
    const payments = await db.getPaymentsWithNames(c.env.DB, trip.id);
    return c.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return c.json({ error: 'Failed to fetch payments' }, 500);
  }
});

// POST /api/trips/:slug/payments - Create payment
app.post('/', async (c) => {
  try {
    const trip = c.get('trip');
    const body = await c.req.json<CreatePaymentRequest>();

    // Validate required fields
    if (typeof body.from_participant_id !== 'number') {
      return c.json({ error: 'from_participant_id is required' }, 400);
    }
    if (typeof body.to_participant_id !== 'number') {
      return c.json({ error: 'to_participant_id is required' }, 400);
    }
    if (body.from_participant_id === body.to_participant_id) {
      return c.json({ error: 'Payer and payee must be different' }, 400);
    }
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return c.json({ error: 'Amount must be a positive number' }, 400);
    }

    const payment = await db.createPayment(c.env.DB, trip.id, body);

    // Get payment with names for response
    const fromParticipant = await db.getParticipantById(c.env.DB, payment.from_participant_id);
    const toParticipant = await db.getParticipantById(c.env.DB, payment.to_participant_id);

    return c.json({
      ...payment,
      from_participant_name: fromParticipant?.name || 'Unknown',
      to_participant_name: toParticipant?.name || 'Unknown'
    }, 201);
  } catch (error) {
    console.error('Error creating payment:', error);
    return c.json({ error: 'Failed to create payment' }, 500);
  }
});

// PUT /api/trips/:slug/payments/:id - Update payment
app.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid payment ID' }, 400);
    }

    const body = await c.req.json<UpdatePaymentRequest>();

    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return c.json({ error: 'Amount must be a positive number' }, 400);
    }

    const payment = await db.updatePayment(c.env.DB, id, body);
    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    // Get payment with names for response
    const fromParticipant = await db.getParticipantById(c.env.DB, payment.from_participant_id);
    const toParticipant = await db.getParticipantById(c.env.DB, payment.to_participant_id);

    return c.json({
      ...payment,
      from_participant_name: fromParticipant?.name || 'Unknown',
      to_participant_name: toParticipant?.name || 'Unknown'
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return c.json({ error: 'Failed to update payment' }, 500);
  }
});

// DELETE /api/trips/:slug/payments/:id - Delete payment
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid payment ID' }, 400);
    }

    const deleted = await db.deletePayment(c.env.DB, id);
    if (!deleted) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    return c.json({ success: true, message: 'Payment deleted' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return c.json({ error: 'Failed to delete payment' }, 500);
  }
});

export default app;
