// src/db/queries.ts
import type {
  Trip,
  Participant,
  Expense,
  ExpenseSplit,
  EventLog,
  CreateTripRequest,
  UpdateTripRequest,
  TripWithParticipants,
  SimplifiedDebt,
  Balance
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
  const isTest = data.is_test ? 1 : 0;

  const result = await db.prepare(
    'INSERT INTO trips (slug, name, password_hash, is_test, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(slug, data.name, passwordHash, isTest, now, now).run();

  if (!result.success) {
    throw new Error('Failed to create trip');
  }

  const trip: Trip = {
    id: result.meta.last_row_id as number,
    slug,
    name: data.name,
    password_hash: passwordHash,
    is_test: isTest,
    created_at: now,
    updated_at: now
  };

  return { trip, password };
}

export async function getAllTrips(db: D1Database, includeTest = false): Promise<Trip[]> {
  const query = includeTest
    ? 'SELECT * FROM trips ORDER BY created_at DESC'
    : 'SELECT * FROM trips WHERE is_test = 0 OR is_test IS NULL ORDER BY created_at DESC';
  const result = await db.prepare(query).all<Trip>();
  return result.results || [];
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

// ============================================================================
// DEBT SIMPLIFICATION
// ============================================================================

/**
 * Simplifies debts using a greedy algorithm to minimize the number of transactions.
 * Takes balances and returns a list of payments that need to be made.
 */
export async function getSimplifiedDebts(db: D1Database, tripId: number): Promise<SimplifiedDebt[]> {
  const balances = await getBalances(db, tripId);

  // Separate creditors (people who get money back) and debtors (people who owe)
  const creditors = balances
    .filter(b => b.net > 0.01) // Use 0.01 threshold to handle rounding
    .map(b => ({ ...b }))
    .sort((a, b) => b.net - a.net); // Sort descending by amount owed to them

  const debtors = balances
    .filter(b => b.net < -0.01) // Use 0.01 threshold to handle rounding
    .map(b => ({ ...b, net: Math.abs(b.net) })) // Convert to positive for easier math
    .sort((a, b) => b.net - a.net); // Sort descending by amount they owe

  const simplifiedDebts: SimplifiedDebt[] = [];

  // Greedy algorithm: match largest debtor with largest creditor
  let i = 0; // creditors index
  let j = 0; // debtors index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    // Determine payment amount (minimum of what creditor is owed and what debtor owes)
    const paymentAmount = Math.min(creditor.net, debtor.net);

    // Round to 2 decimal places to avoid floating point issues
    const roundedAmount = Math.round(paymentAmount * 100) / 100;

    if (roundedAmount > 0.01) { // Only add if amount is significant
      simplifiedDebts.push({
        from_participant_id: debtor.participant_id,
        from_participant_name: debtor.participant_name,
        to_participant_id: creditor.participant_id,
        to_participant_name: creditor.participant_name,
        amount: roundedAmount
      });
    }

    // Update remaining amounts
    creditor.net -= paymentAmount;
    debtor.net -= paymentAmount;

    // Move to next creditor or debtor if current one is settled
    if (creditor.net < 0.01) i++;
    if (debtor.net < 0.01) j++;
  }

  return simplifiedDebts;
}

// ============================================================================
// EVENT LOGS
// ============================================================================

export async function createEventLog(
  db: D1Database,
  tripId: number,
  action: string,
  description: string
): Promise<EventLog> {
  const now = Math.floor(Date.now() / 1000);
  const result = await db.prepare(
    'INSERT INTO event_logs (trip_id, action, description, created_at) VALUES (?, ?, ?, ?)'
  ).bind(tripId, action, description, now).run();

  return {
    id: result.meta.last_row_id as number,
    trip_id: tripId,
    action,
    description,
    created_at: now
  };
}

export async function getEventLogsByTrip(db: D1Database, tripId: number): Promise<EventLog[]> {
  const result = await db.prepare(
    'SELECT * FROM event_logs WHERE trip_id = ? ORDER BY created_at DESC'
  ).bind(tripId).all<EventLog>();
  return result.results || [];
}
