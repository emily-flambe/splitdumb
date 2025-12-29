-- Migration: Add expense_date column to expenses table
-- This column stores the date when the expense occurred (optional)
-- Run with: wrangler d1 execute splitdumb-db --remote --file=./src/db/migrations/001_add_expense_date.sql

ALTER TABLE expenses ADD COLUMN expense_date INTEGER;
