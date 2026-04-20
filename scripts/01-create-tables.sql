-- ================================================================
-- Zabardast Awards – Table Creation Script
-- Run this first in your Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS nominations (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  quarter          TEXT,
  manager_name     TEXT        NOT NULL,
  manager_email    TEXT        NOT NULL,
  employee_id      TEXT        NOT NULL,
  employee_name    TEXT        NOT NULL,
  department       TEXT        NOT NULL,
  employee_email   TEXT        NOT NULL,
  award_category   TEXT        NOT NULL,
  key_achievements TEXT        NOT NULL,
  impact_description TEXT,
  supporting_evidence TEXT,
  status           TEXT        DEFAULT 'Pending',
  hod_comments     TEXT,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      TEXT
);

CREATE TABLE IF NOT EXISTS app_users (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('manager', 'hod', 'admin')),
  display_name  TEXT,
  email         TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT UNIQUE NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
