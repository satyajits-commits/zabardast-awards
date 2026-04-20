-- ================================================================
-- Zabardast Awards – Seed Data Script
-- Run this AFTER 01-create-tables.sql
-- ================================================================

-- Default users (password stored as plain text for this internal tool)
INSERT INTO app_users (username, password_hash, role, display_name, email) VALUES
  ('manager1', 'manager@123', 'manager', 'Rajesh Gupta',  'manager1@company.com'),
  ('hod1',     'hod@123',     'hod',     'Priya Sharma',  'hod1@company.com'),
  ('admin1',   'admin@123',   'admin',   'Amit Singh',    'admin1@company.com')
ON CONFLICT (username) DO NOTHING;

-- Default app settings
INSERT INTO app_settings (key, value) VALUES
  ('quarter',                 'Q4 2025-26'),
  ('nomination_start_date',   '2026-01-01'),
  ('nomination_end_date',     '2026-04-25'),
  ('hod_review_start_date',   '2026-04-20'),
  ('hod_review_end_date',     '2026-05-16'),
  ('company_name',            'NoPaperForms'),
  ('tagline',                 'Koshish Kar, Hal Niklega. Aaj Nahi toh Kal Niklega')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
