// Data models

export interface Trip {
  id: number;
  slug: string;
  name: string;
  password_hash: string;
  is_test: number;
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
  is_test?: boolean;
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
