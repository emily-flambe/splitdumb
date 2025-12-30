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

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
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
      throw new ApiError(0, 'Network error - please check your connection');
    }
    // Handle other errors
    throw new ApiError(500, 'An unexpected error occurred');
  }
}

// Trip Operations

export async function createTrip(
  name: string,
  isTest = false
): Promise<{ slug: string; password: string; name: string }> {
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
  return apiFetch<TripWithParticipants>(`/api/trips/${slug}`, {}, true);
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
  return apiFetch<ExpenseWithSplits[]>(`/api/trips/${slug}/expenses`, {}, true);
}

export async function createExpense(
  slug: string,
  expense: CreateExpenseRequest
): Promise<ExpenseWithSplits> {
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
  return apiFetch<PaymentWithNames[]>(`/api/trips/${slug}/payments`, {}, true);
}

export async function createPayment(
  slug: string,
  payment: CreatePaymentRequest
): Promise<PaymentWithNames> {
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
  return apiFetch<Balance[]>(`/api/trips/${slug}/balances`, {}, true);
}

export async function getSimplifiedDebts(slug: string): Promise<SimplifiedDebt[]> {
  return apiFetch<SimplifiedDebt[]>(`/api/trips/${slug}/balances/simplified`, {}, true);
}

// Event Log Operations

export async function getEvents(slug: string): Promise<EventLog[]> {
  return apiFetch<EventLog[]>(`/api/trips/${slug}/events`, {}, true);
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
