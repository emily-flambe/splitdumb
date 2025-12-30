// src/frontend/api.ts
import type {
  TripWithParticipants,
  Participant,
  ExpenseWithSplits,
  Balance,
  SimplifiedDebt,
  PaymentWithNames,
  EventLog,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  CreatePaymentRequest,
  UpdatePaymentRequest,
} from '../types';

import {
  isOnline,
  queueMutation,
  getPendingMutations,
  clearMutation,
  cacheTrip,
  getCachedTrip,
  cacheExpenses,
  getCachedExpenses,
  cachePayments,
  getCachedPayments,
  cacheBalances,
  getCachedBalances,
  cacheDebts,
  getCachedDebts,
  cacheEvents,
  getCachedEvents,
  onConnectionChange,
  type MutationType,
} from './offline';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public isOffline = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Credentials storage
interface Credentials {
  slug: string;
  password: string;
}

const CREDENTIALS_KEY = 'splitdumb_credentials';

export function saveCredentials(slug: string, password: string): void {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ slug, password }));
}

export function getCredentials(): Credentials | null {
  const stored = localStorage.getItem(CREDENTIALS_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  localStorage.removeItem(CREDENTIALS_KEY);
}

// Sync status tracking
type SyncCallback = (syncing: boolean, pendingCount: number) => void;
const syncCallbacks: Set<SyncCallback> = new Set();
let isSyncing = false;

export function onSyncStatusChange(callback: SyncCallback): () => void {
  syncCallbacks.add(callback);
  return () => syncCallbacks.delete(callback);
}

function notifySyncStatus(syncing: boolean, pendingCount: number): void {
  syncCallbacks.forEach((cb) => cb(syncing, pendingCount));
}

// Base fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = false
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authentication header if required
  if (requiresAuth) {
    const credentials = getCredentials();
    if (credentials) {
      headers['X-Trip-Password'] = credentials.password;
    }
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    // Handle 401 - clear credentials and throw
    if (response.status === 401) {
      clearCredentials();
      throw new ApiError(401, 'Unauthorized - please log in again');
    }

    // Handle other error status codes
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If JSON parsing fails, use default error message
      }
      throw new ApiError(response.status, errorMessage);
    }

    // Parse and return JSON response
    return await response.json();
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiError(0, 'Network error - please check your connection', true);
    }
    // Handle other errors
    throw new ApiError(500, 'An unexpected error occurred');
  }
}

// Sync pending mutations when back online
export async function syncPendingMutations(): Promise<{ success: number; failed: number }> {
  if (isSyncing) return { success: 0, failed: 0 };
  if (!isOnline()) return { success: 0, failed: 0 };

  const mutations = await getPendingMutations();
  if (mutations.length === 0) return { success: 0, failed: 0 };

  isSyncing = true;
  notifySyncStatus(true, mutations.length);

  let success = 0;
  let failed = 0;

  for (const mutation of mutations) {
    try {
      const credentials = getCredentials();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (credentials) {
        headers['X-Trip-Password'] = credentials.password;
      }

      const response = await fetch(mutation.endpoint, {
        method: mutation.method,
        headers,
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      });

      if (response.ok) {
        await clearMutation(mutation.id);
        success++;
      } else {
        // If it's a 4xx error (client error), remove it from queue
        // as retrying won't help (e.g., deleting something already deleted)
        if (response.status >= 400 && response.status < 500) {
          await clearMutation(mutation.id);
        }
        failed++;
      }
    } catch {
      // Network error - keep in queue for retry
      failed++;
    }
  }

  isSyncing = false;
  const remaining = await getPendingMutations();
  notifySyncStatus(false, remaining.length);

  return { success, failed };
}

// Auto-sync when coming back online
onConnectionChange(async (online) => {
  if (online) {
    await syncPendingMutations();
  }
});

// Trip Operations

export async function createTrip(
  name: string,
  isTest = false
): Promise<{ slug: string; password: string; name: string }> {
  // Trip creation requires network - can't create trips offline
  const result = await apiFetch<{ slug: string; password: string; name: string }>(
    '/api/trips',
    {
      method: 'POST',
      body: JSON.stringify({ name, is_test: isTest }),
    }
  );
  // Automatically save credentials after creating a trip
  saveCredentials(result.slug, result.password);
  return result;
}

export async function authTrip(
  slug: string,
  password: string
): Promise<{ success: true; name: string }> {
  // Auth requires network - can't auth offline
  const result = await apiFetch<{ success: true; name: string }>(
    `/api/trips/${slug}/auth`,
    {
      method: 'POST',
      body: JSON.stringify({ password }),
    }
  );
  // Save credentials on successful auth
  saveCredentials(slug, password);
  return result;
}

export async function getTrip(slug: string): Promise<TripWithParticipants> {
  try {
    const trip = await apiFetch<TripWithParticipants>(`/api/trips/${slug}`, {}, true);
    // Cache the trip data
    await cacheTrip(slug, trip);
    return trip;
  } catch (error) {
    // If offline or network error, try cache
    if (error instanceof ApiError && (error.isOffline || error.status === 0)) {
      const cached = await getCachedTrip(slug);
      if (cached) return cached;
    }
    throw error;
  }
}

export async function updateTrip(
  slug: string,
  updates: { name?: string; password?: string }
): Promise<Omit<TripWithParticipants, 'participants'>> {
  const result = await apiFetch<Omit<TripWithParticipants, 'participants'>>(
    `/api/trips/${slug}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    },
    true
  );

  // If password was changed, update stored credentials
  if (updates.password) {
    const credentials = getCredentials();
    if (credentials && credentials.slug === slug) {
      saveCredentials(slug, updates.password);
    }
  }

  return result;
}

export async function deleteTrip(slug: string): Promise<{ success: true; message: string }> {
  const result = await apiFetch<{ success: true; message: string }>(
    `/api/trips/${slug}`,
    {
      method: 'DELETE',
    },
    true
  );
  // Clear credentials after deleting trip
  clearCredentials();
  return result;
}

// Participant Operations

export async function addParticipant(slug: string, name: string): Promise<Participant> {
  if (!isOnline()) {
    // Queue for later sync
    await queueMutation({
      type: 'addParticipant' as MutationType,
      slug,
      endpoint: `/api/trips/${slug}/participants`,
      method: 'POST',
      body: { name },
    });
    // Return a placeholder participant (will be synced later)
    const pending = await getPendingMutations();
    notifySyncStatus(false, pending.length);
    return {
      id: -Date.now(), // Negative ID indicates pending
      trip_id: 0,
      name,
      created_at: Date.now(),
    };
  }

  return apiFetch<Participant>(
    `/api/trips/${slug}/participants`,
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    },
    true
  );
}

export async function deleteParticipant(
  slug: string,
  participantId: number
): Promise<{ success: true; message: string }> {
  if (!isOnline()) {
    await queueMutation({
      type: 'deleteParticipant' as MutationType,
      slug,
      endpoint: `/api/trips/${slug}/participants/${participantId}`,
      method: 'DELETE',
    });
    const pending = await getPendingMutations();
    notifySyncStatus(false, pending.length);
    return { success: true, message: 'Queued for sync' };
  }

  return apiFetch<{ success: true; message: string }>(
    `/api/trips/${slug}/participants/${participantId}`,
    {
      method: 'DELETE',
    },
    true
  );
}

// Expense Operations

export async function getExpenses(slug: string): Promise<ExpenseWithSplits[]> {
  try {
    const expenses = await apiFetch<ExpenseWithSplits[]>(`/api/trips/${slug}/expenses`, {}, true);
    await cacheExpenses(slug, expenses);
    return expenses;
  } catch (error) {
    if (error instanceof ApiError && (error.isOffline || error.status === 0)) {
      const cached = await getCachedExpenses(slug);
      if (cached) return cached;
    }
    throw error;
  }
}

export async function createExpense(
  slug: string,
  expense: CreateExpenseRequest
): Promise<ExpenseWithSplits> {
  if (!isOnline()) {
    await queueMutation({
      type: 'createExpense' as MutationType,
      slug,
      endpoint: `/api/trips/${slug}/expenses`,
      method: 'POST',
      body: expense,
    });
    const pending = await getPendingMutations();
    notifySyncStatus(false, pending.length);
    // Return a placeholder expense
    return {
      id: -Date.now(),
      trip_id: 0,
      description: expense.description,
      amount: expense.amount,
      paid_by: expense.paid_by,
      expense_date: expense.expense_date ?? null,
      created_at: Date.now(),
      updated_at: Date.now(),
      splits: expense.splits.map((s, i) => ({
        id: -Date.now() - i,
        expense_id: -Date.now(),
        participant_id: s.participant_id,
        amount: s.amount,
      })),
      payer_name: 'Pending sync...',
      split_participant_names: [],
    };
  }

  return apiFetch<ExpenseWithSplits>(
    `/api/trips/${slug}/expenses`,
    {
      method: 'POST',
      body: JSON.stringify(expense),
    },
    true
  );
}

export async function updateExpense(
  slug: string,
  expenseId: number,
  expense: UpdateExpenseRequest
): Promise<ExpenseWithSplits> {
  if (!isOnline()) {
    await queueMutation({
      type: 'updateExpense' as MutationType,
      slug,
      endpoint: `/api/trips/${slug}/expenses/${expenseId}`,
      method: 'PUT',
      body: expense,
    });
    const pending = await getPendingMutations();
    notifySyncStatus(false, pending.length);
    // Return placeholder
    return {
      id: expenseId,
      trip_id: 0,
      description: expense.description ?? '',
      amount: expense.amount ?? 0,
      paid_by: expense.paid_by ?? 0,
      expense_date: expense.expense_date ?? null,
      created_at: Date.now(),
      updated_at: Date.now(),
      splits: [],
      payer_name: 'Pending sync...',
      split_participant_names: [],
    };
  }

  return apiFetch<ExpenseWithSplits>(
    `/api/trips/${slug}/expenses/${expenseId}`,
    {
      method: 'PUT',
      body: JSON.stringify(expense),
    },
    true
  );
}

export async function deleteExpense(
  slug: string,
  expenseId: number
): Promise<{ success: true; message: string }> {
  if (!isOnline()) {
    await queueMutation({
      type: 'deleteExpense' as MutationType,
      slug,
      endpoint: `/api/trips/${slug}/expenses/${expenseId}`,
      method: 'DELETE',
    });
    const pending = await getPendingMutations();
    notifySyncStatus(false, pending.length);
    return { success: true, message: 'Queued for sync' };
  }

  return apiFetch<{ success: true; message: string }>(
    `/api/trips/${slug}/expenses/${expenseId}`,
    {
      method: 'DELETE',
    },
    true
  );
}

// Payment Operations

export async function getPayments(slug: string): Promise<PaymentWithNames[]> {
  try {
    const payments = await apiFetch<PaymentWithNames[]>(`/api/trips/${slug}/payments`, {}, true);
    await cachePayments(slug, payments);
    return payments;
  } catch (error) {
    if (error instanceof ApiError && (error.isOffline || error.status === 0)) {
      const cached = await getCachedPayments(slug);
      if (cached) return cached;
    }
    throw error;
  }
}

export async function createPayment(
  slug: string,
  payment: CreatePaymentRequest
): Promise<PaymentWithNames> {
  if (!isOnline()) {
    await queueMutation({
      type: 'createPayment' as MutationType,
      slug,
      endpoint: `/api/trips/${slug}/payments`,
      method: 'POST',
      body: payment,
    });
    const pending = await getPendingMutations();
    notifySyncStatus(false, pending.length);
    return {
      id: -Date.now(),
      trip_id: 0,
      from_participant_id: payment.from_participant_id,
      to_participant_id: payment.to_participant_id,
      amount: payment.amount,
      created_at: Date.now(),
      from_participant_name: 'Pending sync...',
      to_participant_name: 'Pending sync...',
    };
  }

  return apiFetch<PaymentWithNames>(
    `/api/trips/${slug}/payments`,
    {
      method: 'POST',
      body: JSON.stringify(payment),
    },
    true
  );
}

export async function updatePayment(
  slug: string,
  paymentId: number,
  payment: UpdatePaymentRequest
): Promise<PaymentWithNames> {
  if (!isOnline()) {
    await queueMutation({
      type: 'updatePayment' as MutationType,
      slug,
      endpoint: `/api/trips/${slug}/payments/${paymentId}`,
      method: 'PUT',
      body: payment,
    });
    const pending = await getPendingMutations();
    notifySyncStatus(false, pending.length);
    return {
      id: paymentId,
      trip_id: 0,
      from_participant_id: 0,
      to_participant_id: 0,
      amount: payment.amount,
      created_at: Date.now(),
      from_participant_name: 'Pending sync...',
      to_participant_name: 'Pending sync...',
    };
  }

  return apiFetch<PaymentWithNames>(
    `/api/trips/${slug}/payments/${paymentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payment),
    },
    true
  );
}

export async function deletePayment(
  slug: string,
  paymentId: number
): Promise<{ success: true; message: string }> {
  if (!isOnline()) {
    await queueMutation({
      type: 'deletePayment' as MutationType,
      slug,
      endpoint: `/api/trips/${slug}/payments/${paymentId}`,
      method: 'DELETE',
    });
    const pending = await getPendingMutations();
    notifySyncStatus(false, pending.length);
    return { success: true, message: 'Queued for sync' };
  }

  return apiFetch<{ success: true; message: string }>(
    `/api/trips/${slug}/payments/${paymentId}`,
    {
      method: 'DELETE',
    },
    true
  );
}

// Balance Operations

export async function getBalances(slug: string): Promise<Balance[]> {
  try {
    const balances = await apiFetch<Balance[]>(`/api/trips/${slug}/balances`, {}, true);
    await cacheBalances(slug, balances);
    return balances;
  } catch (error) {
    if (error instanceof ApiError && (error.isOffline || error.status === 0)) {
      const cached = await getCachedBalances(slug);
      if (cached) return cached;
    }
    throw error;
  }
}

export async function getSimplifiedDebts(slug: string): Promise<SimplifiedDebt[]> {
  try {
    const debts = await apiFetch<SimplifiedDebt[]>(`/api/trips/${slug}/balances/simplified`, {}, true);
    await cacheDebts(slug, debts);
    return debts;
  } catch (error) {
    if (error instanceof ApiError && (error.isOffline || error.status === 0)) {
      const cached = await getCachedDebts(slug);
      if (cached) return cached;
    }
    throw error;
  }
}

// Event Log Operations

export async function getEvents(slug: string): Promise<EventLog[]> {
  try {
    const events = await apiFetch<EventLog[]>(`/api/trips/${slug}/events`, {}, true);
    await cacheEvents(slug, events);
    return events;
  } catch (error) {
    if (error instanceof ApiError && (error.isOffline || error.status === 0)) {
      const cached = await getCachedEvents(slug);
      if (cached) return cached;
    }
    throw error;
  }
}

// Export Operations

export interface TripExportData {
  exportedAt: string;
  trip: {
    name: string;
    slug: string;
    createdAt: string;
  };
  participants: Array<{
    id: number;
    name: string;
    createdAt: string;
  }>;
  expenses: Array<{
    id: number;
    description: string;
    amount: number;
    paidBy: { id: number; name: string };
    expenseDate: string | null;
    createdAt: string;
    splits: Array<{ participantId: number; amount: number }>;
  }>;
  payments: Array<{
    id: number;
    from: { id: number; name: string };
    to: { id: number; name: string };
    amount: number;
    createdAt: string;
  }>;
  balances: Array<{
    participantId: number;
    participantName: string;
    paid: number;
    owes: number;
    net: number;
  }>;
  simplifiedDebts: Array<{
    from: { id: number; name: string };
    to: { id: number; name: string };
    amount: number;
  }>;
}

export async function exportTripData(slug: string): Promise<TripExportData> {
  return apiFetch<TripExportData>(`/api/trips/${slug}/export`, {}, true);
}
