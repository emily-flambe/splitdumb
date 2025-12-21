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

    // Validate splits sum equals amount (within 0.01 tolerance for rounding)
    const splitsTotal = body.splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitsTotal - body.amount) > 0.01) {
      return c.json({ error: 'Splits must sum to total amount' }, 400);
    }

    const expense = await db.createExpense(c.env.DB, trip.id, body);
    await db.createEventLog(c.env.DB, trip.id, 'EXPENSE_ADDED', `"${body.description}" ($${body.amount.toFixed(2)}) was added`);
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
    const trip = c.get('trip');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid expense ID' }, 400);
    }

    const body = await c.req.json<UpdateExpenseRequest>();

    // Validate splits if provided (within 0.01 tolerance for rounding)
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

    await db.createEventLog(c.env.DB, trip.id, 'EXPENSE_MODIFIED', `"${expense.description}" was modified`);
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
    const trip = c.get('trip');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid expense ID' }, 400);
    }

    // Get expense description before deletion for event log
    const expense = await db.getExpenseById(c.env.DB, id);
    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    const deleted = await db.deleteExpense(c.env.DB, id);
    if (!deleted) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    await db.createEventLog(c.env.DB, trip.id, 'EXPENSE_DELETED', `"${expense.description}" was deleted`);
    return c.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return c.json({ error: 'Failed to delete expense' }, 500);
  }
});

export default app;
