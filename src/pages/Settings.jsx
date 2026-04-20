import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

const SQL_CREATE = `-- 01-create-tables.sql
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
  role          TEXT NOT NULL CHECK (role IN ('manager','hod','admin')),
  display_name  TEXT,
  email         TEXT
);
CREATE TABLE IF NOT EXISTS app_settings (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT UNIQUE NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`

const SQL_SEED = `-- 02-seed-data.sql
INSERT INTO app_users (username, password_hash, role, display_name, email) VALUES
  ('manager1','manager@123','manager','Rajesh Gupta','manager1@company.com'),
  ('hod1',    'hod@123',   'hod',    'Priya Sharma','hod1@company.com'),
  ('admin1',  'admin@123', 'admin',  'Amit Singh',  'admin1@company.com')
ON CONFLICT (username) DO NOTHING;

INSERT INTO app_settings (key, value) VALUES
  ('quarter',               'Q4 2025-26'),
  ('nomination_start_date', '2026-01-01'),
  ('nomination_end_date',   '2026-04-25'),
  ('hod_review_start_date', '2026-04-26'),
  ('hod_review_end_date',   '2026-05-10'),
  ('company_name',          'NoPaperForms'),
  ('tagline',               'Koshish Kar, Hal Niklega. Aaj Nahi toh Kal Niklega')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`

const SQL_RLS = `-- 03-rls-policies.sql
ALTER TABLE nominations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_nominations"  ON nominations;
DROP POLICY IF EXISTS "allow_all_app_users"    ON app_users;
DROP POLICY IF EXISTS "allow_all_app_settings" ON app_settings;

CREATE POLICY "allow_all_nominations"
  ON nominations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_app_users"
  ON app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_app_settings"
  ON app_settings FOR ALL USING (true) WITH CHECK (true);`

function CopyBlock({ label, code }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <button onClick={copy} className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors border ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-[#E8520A] hover:text-[#E8520A]'}`}>
          {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
      </div>
      <pre className="bg-gray-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-gray-800">{code}</pre>
    </div>
  )
}

export default function Settings() {
  const { settings: ctxSettings, refreshSettings } = useAuth()
  const { showToast } = useToast()

  const [form, setForm] = useState({
    quarter: '', company_name: '', tagline: '',
    nomination_start_date: '', nomination_end_date: '',
    hod_review_start_date: '', hod_review_end_date: '',
  })
  const [savingSettings, setSavingSettings] = useState(false)

  const [users, setUsers]   = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'manager', display_name: '', email: '' })
  const [addingUser, setAddingUser] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [showAddUser, setShowAddUser] = useState(false)

  // Sync form with context settings
  useEffect(() => {
    setForm({
      quarter:               ctxSettings.quarter               || '',
      company_name:          ctxSettings.company_name          || '',
      tagline:               ctxSettings.tagline               || '',
      nomination_start_date: ctxSettings.nomination_start_date || '',
      nomination_end_date:   ctxSettings.nomination_end_date   || '',
      hod_review_start_date: ctxSettings.hod_review_start_date || '',
      hod_review_end_date:   ctxSettings.hod_review_end_date   || '',
    })
  }, [ctxSettings])

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoadingUsers(true)
    const { data } = await supabase.from('app_users').select('id, username, role, display_name, email, created_at').order('created_at')
    setUsers(data || [])
    setLoadingUsers(false)
  }

  async function saveSettings() {
    setSavingSettings(true)
    try {
      const updates = Object.entries(form).map(([key, value]) => ({
        key, value, updated_at: new Date().toISOString()
      }))
      const { error } = await supabase.from('app_settings').upsert(updates, { onConflict: 'key' })
      if (error) throw error
      await refreshSettings()
      showToast('success', 'Settings Saved', 'All settings updated successfully')
    } catch (err) {
      showToast('error', 'Save Failed', err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  async function addUser() {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      showToast('warning', 'Missing Fields', 'Username and password are required'); return
    }
    setAddingUser(true)
    try {
      const { error } = await supabase.from('app_users').insert([{
        username: newUser.username.trim(),
        password_hash: newUser.password,
        role: newUser.role,
        display_name: newUser.display_name.trim() || newUser.username.trim(),
        email: newUser.email.trim(),
      }])
      if (error) throw error
      showToast('success', 'User Added', `${newUser.username} created as ${newUser.role}`)
      setNewUser({ username: '', password: '', role: 'manager', display_name: '', email: '' })
      setShowAddUser(false)
      loadUsers()
    } catch (err) {
      showToast('error', 'Failed to Add User', err.message)
    } finally {
      setAddingUser(false)
    }
  }

  async function deleteUser(id, username) {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from('app_users').delete().eq('id', id)
      if (error) throw error
      showToast('success', 'User Deleted', `${username} removed`)
      loadUsers()
    } catch (err) {
      showToast('error', 'Delete Failed', err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const ROLE_BADGE = { manager: 'bg-blue-100 text-blue-700', hod: 'bg-purple-100 text-purple-700', admin: 'bg-orange-100 text-[#E8520A]' }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Award Cycle Settings */}
      <div className="card p-6">
        <h2 className="section-title mb-1">⚙️ Award Cycle Settings</h2>
        <p className="text-sm text-gray-500 mb-6">Configure the current quarter, windows, and branding</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="form-label">Current Quarter</label>
            <input value={form.quarter} onChange={e => setForm(f => ({ ...f, quarter: e.target.value }))}
              className="form-input" placeholder="Q4 2025-26" />
          </div>
          <div>
            <label className="form-label">Company Name</label>
            <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              className="form-input" placeholder="NoPaperForms" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Award Cycle Tagline</label>
            <input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
              className="form-input" placeholder="Koshish Kar, Hal Niklega…" />
          </div>

          <div className="sm:col-span-2">
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
              📝 Nomination Window (Manager submissions)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Start Date</label>
                <input type="date" value={form.nomination_start_date} onChange={e => setForm(f => ({ ...f, nomination_start_date: e.target.value }))} className="form-input" />
              </div>
              <div>
                <label className="form-label">Last Date</label>
                <input type="date" value={form.nomination_end_date} onChange={e => setForm(f => ({ ...f, nomination_end_date: e.target.value }))} className="form-input" />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">
              👔 HOD Review Window
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Start Date</label>
                <input type="date" value={form.hod_review_start_date} onChange={e => setForm(f => ({ ...f, hod_review_start_date: e.target.value }))} className="form-input" />
              </div>
              <div>
                <label className="form-label">Last Date</label>
                <input type="date" value={form.hod_review_end_date} onChange={e => setForm(f => ({ ...f, hod_review_end_date: e.target.value }))} className="form-input" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={saveSettings} disabled={savingSettings} className="btn-primary px-8">
            {savingSettings ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : '💾 Save Settings'}
          </button>
        </div>
      </div>

      {/* User Management */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="section-title mb-0">👥 Manage Users</h2>
            <p className="text-sm text-gray-500">Add or remove manager and HOD accounts</p>
          </div>
          <button onClick={() => setShowAddUser(v => !v)} className="btn-primary text-sm py-2">
            {showAddUser ? '✕ Cancel' : '+ Add User'}
          </button>
        </div>

        {/* Add user form */}
        {showAddUser && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-5">
            <h3 className="font-bold text-gray-800 mb-4">New User</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="form-label">Username *</label>
                <input value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} className="form-input" placeholder="manager2" />
              </div>
              <div>
                <label className="form-label">Password *</label>
                <input value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} className="form-input" placeholder="password123" type="text" />
              </div>
              <div>
                <label className="form-label">Role *</label>
                <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} className="form-input">
                  <option value="manager">Manager</option>
                  <option value="hod">HOD</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="form-label">Display Name</label>
                <input value={newUser.display_name} onChange={e => setNewUser(u => ({ ...u, display_name: e.target.value }))} className="form-input" placeholder="Full Name" />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Email</label>
                <input value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} className="form-input" placeholder="user@company.com" />
              </div>
            </div>
            <button onClick={addUser} disabled={addingUser} className="btn-primary text-sm py-2 px-5">
              {addingUser ? 'Adding…' : '+ Create User'}
            </button>
          </div>
        )}

        {/* Users table */}
        {loadingUsers ? (
          <div className="text-center py-8 text-gray-400">Loading users…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Username</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Display Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{u.username}</td>
                    <td className="px-4 py-3 text-gray-700">{u.display_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteUser(u.id, u.username)}
                        disabled={deletingId === u.id}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingId === u.id ? 'Deleting…' : '🗑 Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SQL Setup Scripts */}
      <div className="card p-6">
        <h2 className="section-title mb-1">🗄️ Database Setup Scripts</h2>
        <p className="text-sm text-gray-500 mb-5">Run these in your <strong>Supabase SQL Editor</strong> in order (first time setup only)</p>
        <CopyBlock label="Script 1 — Create Tables"   code={SQL_CREATE} />
        <CopyBlock label="Script 2 — Seed Default Data" code={SQL_SEED} />
        <CopyBlock label="Script 3 — RLS Policies"    code={SQL_RLS} />
      </div>

    </div>
  )
}
