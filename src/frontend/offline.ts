// src/frontend/offline.ts
// IndexedDB wrapper for offline storage and mutation queue

import type {
  TripWithParticipants,
  ExpenseWithSplits,
  PaymentWithNames,
  Balance,
  SimplifiedDebt,
  EventLog,
} from '../types';

const DB_NAME = 'splitdumb-offline';
const DB_VERSION = 1;

// Store names
const STORES = {
  TRIPS: 'trips',
  EXPENSES: 'expenses',
  PAYMENTS: 'payments',
  BALANCES: 'balances',
  DEBTS: 'debts',
  EVENTS: 'events',
  MUTATIONS: 'mutations',
} as const;

// Mutation types that can be queued
export type MutationType =
  | 'createExpense'
  | 'updateExpense'
  | 'deleteExpense'
  | 'createPayment'
  | 'updatePayment'
  | 'deletePayment'
  | 'addParticipant'
  | 'deleteParticipant';

export interface QueuedMutation {
  id: string;
  type: MutationType;
  slug: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timestamp: number;
}

// Cached data structure for a trip
export interface CachedTripData {
  trip: TripWithParticipants;
  expenses: ExpenseWithSplits[];
  payments: PaymentWithNames[];
  balances: Balance[];
  debts: SimplifiedDebt[];
  events: EventLog[];
  cachedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Trip data store - keyed by slug
      if (!db.objectStoreNames.contains(STORES.TRIPS)) {
        db.createObjectStore(STORES.TRIPS, { keyPath: 'slug' });
      }

      // Expenses store - keyed by slug
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        db.createObjectStore(STORES.EXPENSES, { keyPath: 'slug' });
      }

      // Payments store - keyed by slug
      if (!db.objectStoreNames.contains(STORES.PAYMENTS)) {
        db.createObjectStore(STORES.PAYMENTS, { keyPath: 'slug' });
      }

      // Balances store - keyed by slug
      if (!db.objectStoreNames.contains(STORES.BALANCES)) {
        db.createObjectStore(STORES.BALANCES, { keyPath: 'slug' });
      }

      // Debts store - keyed by slug
      if (!db.objectStoreNames.contains(STORES.DEBTS)) {
        db.createObjectStore(STORES.DEBTS, { keyPath: 'slug' });
      }

      // Events store - keyed by slug
      if (!db.objectStoreNames.contains(STORES.EVENTS)) {
        db.createObjectStore(STORES.EVENTS, { keyPath: 'slug' });
      }

      // Mutation queue - keyed by id
      if (!db.objectStoreNames.contains(STORES.MUTATIONS)) {
        const mutationStore = db.createObjectStore(STORES.MUTATIONS, { keyPath: 'id' });
        mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });

  return dbPromise;
}

// Generic store operations
async function putItem<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getItem<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? null);
  });
}

async function deleteItem(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getAllItems<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Trip data caching
export async function cacheTrip(slug: string, trip: TripWithParticipants): Promise<void> {
  await putItem(STORES.TRIPS, { slug, data: trip, cachedAt: Date.now() });
}

export async function getCachedTrip(slug: string): Promise<TripWithParticipants | null> {
  const result = await getItem<{ slug: string; data: TripWithParticipants }>(STORES.TRIPS, slug);
  return result?.data ?? null;
}

export async function cacheExpenses(slug: string, expenses: ExpenseWithSplits[]): Promise<void> {
  await putItem(STORES.EXPENSES, { slug, data: expenses, cachedAt: Date.now() });
}

export async function getCachedExpenses(slug: string): Promise<ExpenseWithSplits[] | null> {
  const result = await getItem<{ slug: string; data: ExpenseWithSplits[] }>(STORES.EXPENSES, slug);
  return result?.data ?? null;
}

export async function cachePayments(slug: string, payments: PaymentWithNames[]): Promise<void> {
  await putItem(STORES.PAYMENTS, { slug, data: payments, cachedAt: Date.now() });
}

export async function getCachedPayments(slug: string): Promise<PaymentWithNames[] | null> {
  const result = await getItem<{ slug: string; data: PaymentWithNames[] }>(STORES.PAYMENTS, slug);
  return result?.data ?? null;
}

export async function cacheBalances(slug: string, balances: Balance[]): Promise<void> {
  await putItem(STORES.BALANCES, { slug, data: balances, cachedAt: Date.now() });
}

export async function getCachedBalances(slug: string): Promise<Balance[] | null> {
  const result = await getItem<{ slug: string; data: Balance[] }>(STORES.BALANCES, slug);
  return result?.data ?? null;
}

export async function cacheDebts(slug: string, debts: SimplifiedDebt[]): Promise<void> {
  await putItem(STORES.DEBTS, { slug, data: debts, cachedAt: Date.now() });
}

export async function getCachedDebts(slug: string): Promise<SimplifiedDebt[] | null> {
  const result = await getItem<{ slug: string; data: SimplifiedDebt[] }>(STORES.DEBTS, slug);
  return result?.data ?? null;
}

export async function cacheEvents(slug: string, events: EventLog[]): Promise<void> {
  await putItem(STORES.EVENTS, { slug, data: events, cachedAt: Date.now() });
}

export async function getCachedEvents(slug: string): Promise<EventLog[] | null> {
  const result = await getItem<{ slug: string; data: EventLog[] }>(STORES.EVENTS, slug);
  return result?.data ?? null;
}

// Clear all cached data for a trip
export async function clearTripCache(slug: string): Promise<void> {
  await Promise.all([
    deleteItem(STORES.TRIPS, slug),
    deleteItem(STORES.EXPENSES, slug),
    deleteItem(STORES.PAYMENTS, slug),
    deleteItem(STORES.BALANCES, slug),
    deleteItem(STORES.DEBTS, slug),
    deleteItem(STORES.EVENTS, slug),
  ]);
}

// Mutation queue operations
export async function queueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const queuedMutation: QueuedMutation = {
    ...mutation,
    id,
    timestamp: Date.now(),
  };
  await putItem(STORES.MUTATIONS, queuedMutation);
  return id;
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const mutations = await getAllItems<QueuedMutation>(STORES.MUTATIONS);
  // Sort by timestamp (oldest first)
  return mutations.sort((a, b) => a.timestamp - b.timestamp);
}

export async function clearMutation(id: string): Promise<void> {
  await deleteItem(STORES.MUTATIONS, id);
}

export async function clearAllMutations(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MUTATIONS, 'readwrite');
    const store = tx.objectStore(STORES.MUTATIONS);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getPendingMutationCount(): Promise<number> {
  const mutations = await getPendingMutations();
  return mutations.length;
}

// Check if we have any cached data for a trip
export async function hasCachedData(slug: string): Promise<boolean> {
  const trip = await getCachedTrip(slug);
  return trip !== null;
}

// Online/offline status
export function isOnline(): boolean {
  return navigator.onLine;
}

// Event listeners for online/offline
type ConnectionCallback = (online: boolean) => void;
const connectionCallbacks: Set<ConnectionCallback> = new Set();

export function onConnectionChange(callback: ConnectionCallback): () => void {
  connectionCallbacks.add(callback);
  return () => connectionCallbacks.delete(callback);
}

// Initialize event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    connectionCallbacks.forEach((cb) => cb(true));
  });

  window.addEventListener('offline', () => {
    connectionCallbacks.forEach((cb) => cb(false));
  });
}
