-- ================================================================
-- Zabardast Awards – Row Level Security Policies
-- Run this AFTER 01-create-tables.sql
-- Allows all operations from anon key (internal tool)
-- ================================================================

ALTER TABLE nominations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "allow_all_nominations"  ON nominations;
DROP POLICY IF EXISTS "allow_all_app_users"    ON app_users;
DROP POLICY IF EXISTS "allow_all_app_settings" ON app_settings;

-- Nominations: anyone can INSERT and SELECT (managers submit, HOD/admin read)
-- UPDATE is open at DB level; role enforcement is done in application logic
-- (only HOD role can call updateStatus — enforced in HodReview.jsx + App.jsx route guard)
CREATE POLICY "allow_all_nominations"
  ON nominations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_app_users"
  ON app_users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_app_settings"
  ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- NOTE: For stronger DB-level enforcement, replace the nominations UPDATE policy
-- with a stored procedure that checks app_users.role = 'hod' before allowing
-- status changes. This requires Supabase Auth integration.
