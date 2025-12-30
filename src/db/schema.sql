-- SplitDumb Database Schema
-- Trip-based expense splitting

-- Trips table (top-level container)
CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_test INTEGER DEFAULT 0,
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
  expense_date INTEGER,
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

-- Payments between participants (to settle debts)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  from_participant_id INTEGER NOT NULL,
  to_participant_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (from_participant_id) REFERENCES participants(id),
  FOREIGN KEY (to_participant_id) REFERENCES participants(id)
);

-- Event log for trip activity
CREATE TABLE IF NOT EXISTS event_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Recovery emails for trip access restoration
CREATE TABLE IF NOT EXISTS recovery_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  verified INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  UNIQUE(trip_id, email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_trip ON participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_trips_slug ON trips(slug);
CREATE INDEX IF NOT EXISTS idx_payments_trip ON payments(trip_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_trip ON event_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_created ON event_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_recovery_emails_trip ON recovery_emails(trip_id);
CREATE INDEX IF NOT EXISTS idx_recovery_emails_email ON recovery_emails(email);
