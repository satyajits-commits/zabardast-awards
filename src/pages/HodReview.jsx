import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

const AWARD_COLORS = {
  'Abhimanyu Award':  'bg-blue-100 text-blue-800',
  'Bheeshma Award':   'bg-green-100 text-green-800',
  'Vishwakarma Award':'bg-purple-100 text-purple-800',
  'Arjuna Award':     'bg-amber-100 text-amber-800',
  'Eklavya Award':    'bg-orange-100 text-[#E8520A]',
}
const BADGE = { Pending: 'badge-pending', Approved: 'badge-approved', Rejected: 'badge-rejected' }
const STATUS_DOT = { Pending: '⏳', Approved: '✅', Rejected: '❌' }

function isWindowOpen(start, end) {
  if (!start || !end) return true
  const now = Date.now()
  return now >= new Date(start).getTime() && now <= new Date(end).setHours(23,59,59,999)
}

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}
function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <div className={`text-4xl font-extrabold ${color}`}>{value}</div>
      <div className="text-sm text-gray-500 font-medium">{label}</div>
    </div>
  )
}

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm text-gray-800 bg-white border border-gray-100 rounded-xl px-3 py-2 leading-relaxed">{value}</div>
    </div>
  )
}

export default function HodReview() {
  const { user, settings } = useAuth()
  const { showToast } = useToast()
  const windowOpen = isWindowOpen(settings.hod_review_start_date, settings.hod_review_end_date)

  const [nominations, setNominations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [expandedId, setExpandedId]   = useState(null)
  const [comments, setComments]       = useState({})
  const [updating, setUpdating]       = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter,   setDeptFilter]   = useState('')
  const [catFilter,    setCatFilter]    = useState('')
  const [search,       setSearch]       = useState('')

  const supabaseConfigured =
    import.meta.env.VITE_SUPABASE_URL &&
    !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

  const loadAll = useCallback(async () => {
    setLoading(true)
    if (supabaseConfigured) {
      const { data } = await supabase.from('nominations').select('*').order('created_at', { ascending: false })
      setNominations(data || [])
    } else {
      // Demo mode: read from localStorage
      const stored = JSON.parse(localStorage.getItem('za_demo_nominations') || '[]')
      setNominations(stored)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function updateStatus(id, status) {
    // Role guard — only HOD may approve or reject (frontend + second-layer check)
    if (user?.role !== 'hod') {
      showToast('error', 'Unauthorized', 'Only HOD users can approve or reject nominations')
      return
    }
    const comment = (comments[id] || '').trim()
    if (!comment) { showToast('warning', 'Comment Required', 'Please add HOD comments before updating status'); return }
    setUpdating(id)
    try {
      if (supabaseConfigured) {
        const { error } = await supabase.from('nominations').update({
          status,
          hod_comments: comment,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.display_name || user?.username,
        }).eq('id', id)
        if (error) throw error
      } else {
        // Demo mode: update in localStorage
        const stored = JSON.parse(localStorage.getItem('za_demo_nominations') || '[]')
        const updated = stored.map(n => n.id === id
          ? { ...n, status, hod_comments: comment, reviewed_at: new Date().toISOString(), reviewed_by: user?.display_name || user?.username }
          : n
        )
        localStorage.setItem('za_demo_nominations', JSON.stringify(updated))
      }
      showToast('success', `Nomination ${status}`, status === 'Approved' ? '🎉 Well done!' : 'Status updated')
      setExpandedId(null)
      await loadAll()
    } catch (err) {
      showToast('error', 'Update Failed', err.message)
    } finally {
      setUpdating(null)
    }
  }

  const filtered = nominations.filter(n => {
    if (statusFilter && n.status !== statusFilter) return false
    if (deptFilter   && n.department !== deptFilter) return false
    if (catFilter    && n.award_category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (![n.employee_name, n.department, n.award_category, n.manager_name].some(f => (f||'').toLowerCase().includes(q))) return false
    }
    return true
  })

  const stats = {
    total:    nominations.length,
    pending:  nominations.filter(n => n.status === 'Pending').length,
    approved: nominations.filter(n => n.status === 'Approved').length,
    rejected: nominations.filter(n => n.status === 'Rejected').length,
  }

  const depts = [...new Set(nominations.map(n => n.department))].filter(Boolean).sort()
  const cats  = [...new Set(nominations.map(n => n.award_category))].filter(Boolean).sort()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Review window banner */}
      {!windowOpen && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <div className="font-bold text-amber-800">HOD Review Window Closed</div>
            <div className="text-sm text-amber-700 mt-0.5">
              You can view nominations but cannot approve or reject outside the review window.
              {settings.hod_review_start_date && settings.hod_review_end_date && (
                <> Window: {new Date(settings.hod_review_start_date).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})} – {new Date(settings.hod_review_end_date).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})}</>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total"    value={stats.total}    color="text-[#E8520A]" />
        <StatCard label="Pending"  value={stats.pending}  color="text-amber-600" />
        <StatCard label="Approved" value={stats.approved} color="text-green-600" />
        <StatCard label="Rejected" value={stats.rejected} color="text-red-600"   />
      </div>

      {/* Table card */}
      <div className="card">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title mb-0">👔 Nomination Review</h2>
              <p className="text-sm text-gray-500">Quarter: {settings.quarter || 'Q4 2025-26'}</p>
            </div>
            <button onClick={loadAll} className="btn-secondary text-sm py-2 px-4">↻ Refresh</button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, department…"
              className="form-input flex-1 min-w-48 py-2 text-sm" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="form-input w-auto py-2 text-sm">
              <option value="">All Statuses</option>
              <option>Pending</option><option>Approved</option><option>Rejected</option>
            </select>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="form-input w-auto py-2 text-sm">
              <option value="">All Departments</option>
              {depts.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="form-input w-auto py-2 text-sm">
              <option value="">All Categories</option>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <span className="inline-block w-8 h-8 border-2 border-[#E8520A]/30 border-t-[#E8520A] rounded-full animate-spin mr-3" />
            Loading nominations…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            <div className="font-semibold text-gray-600 text-lg">No nominations found</div>
            <div className="text-sm mt-1">Adjust your filters or wait for managers to submit</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Award Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nominated By</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n, i) => {
                  const isOpen = expandedId === n.id
                  return (
                    <>
                      <tr key={n.id} className={`border-b border-gray-50 transition-colors ${isOpen ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-5 py-4 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">{n.employee_name}</div>
                          <div className="text-xs text-gray-400">{n.employee_id} · {n.employee_email}</div>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{n.department}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${AWARD_COLORS[n.award_category] || 'bg-gray-100 text-gray-700'}`}>
                            {n.award_category}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-600 text-sm">{n.manager_name}</td>
                        <td className="px-5 py-4 text-gray-400 text-xs">{formatDate(n.created_at)}</td>
                        <td className="px-5 py-4">
                          <span className={BADGE[n.status] || 'badge-pending'}>{STATUS_DOT[n.status]} {n.status}</span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setExpandedId(isOpen ? null : n.id)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                              isOpen
                                ? 'border-[#E8520A] text-[#E8520A] bg-orange-50'
                                : 'border-gray-200 text-gray-600 hover:border-[#E8520A] hover:text-[#E8520A]'
                            }`}
                          >
                            {isOpen ? '▲ Close' : '▼ Review'}
                          </button>
                        </td>
                      </tr>

                      {/* Inline review panel */}
                      {isOpen && (
                        <tr key={`review-${n.id}`}>
                          <td colSpan={8} className="p-0 border-b-2 border-[#E8520A]">
                            <div className="review-panel-enter bg-gradient-to-br from-orange-50 to-amber-50 border-t border-orange-100 p-6">
                              <div className="max-w-4xl mx-auto">
                                <h3 className="font-bold text-gray-900 mb-4 text-base">📄 Full Nomination Details</h3>

                                {/* Grid of details */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                                  {[
                                    ['Employee ID', n.employee_id],
                                    ['Department',  n.department],
                                    ['Employee Email', n.employee_email],
                                    ['Quarter', n.quarter],
                                    ['Manager', n.manager_name],
                                    ['Manager Email', n.manager_email],
                                    ['Submitted', formatDateTime(n.created_at)],
                                    ['Award', n.award_category],
                                  ].map(([label, val]) => (
                                    <div key={label} className="bg-white rounded-xl p-3 border border-gray-100">
                                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">{label}</div>
                                      <div className="font-medium text-gray-800 text-xs break-words">{val || '—'}</div>
                                    </div>
                                  ))}
                                </div>

                                <div className="space-y-3 mb-5">
                                  <DetailRow label="Key Achievements" value={n.key_achievements} />
                                  <DetailRow label="Impact Description" value={n.impact_description} />
                                  <DetailRow label="Supporting Evidence" value={n.supporting_evidence} />
                                </div>

                                {/* Existing review info */}
                                {n.hod_comments && (
                                  <div className="mb-4 p-3 bg-white rounded-xl border border-gray-100">
                                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Previous HOD Comments</div>
                                    <div className="text-sm text-gray-700">{n.hod_comments}</div>
                                    <div className="text-xs text-gray-400 mt-1">by {n.reviewed_by} · {formatDateTime(n.reviewed_at)}</div>
                                  </div>
                                )}

                                {/* HOD Comments */}
                                <div className="mb-4">
                                  <label className="form-label">
                                    HOD Comments <span className="text-red-500">*</span>
                                    <span className="text-gray-400 font-normal ml-1">(required before approving or rejecting)</span>
                                  </label>
                                  <textarea
                                    value={comments[n.id] !== undefined ? comments[n.id] : (n.hod_comments || '')}
                                    onChange={e => setComments(prev => ({ ...prev, [n.id]: e.target.value }))}
                                    rows={3}
                                    className="form-input w-full"
                                    placeholder="Add your review comments, feedback, or justification…"
                                    disabled={!windowOpen}
                                  />
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-3 items-center">
                                  <button
                                    onClick={() => updateStatus(n.id, 'Approved')}
                                    disabled={!windowOpen || updating === n.id}
                                    className="btn-success"
                                  >
                                    {updating === n.id ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✅'} Approve
                                  </button>
                                  <button
                                    onClick={() => updateStatus(n.id, 'Rejected')}
                                    disabled={!windowOpen || updating === n.id}
                                    className="btn-danger"
                                  >
                                    {updating === n.id ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '❌'} Reject
                                  </button>
                                  <button
                                    onClick={() => setExpandedId(null)}
                                    className="btn-secondary text-sm py-2"
                                  >
                                    Cancel
                                  </button>
                                  {!windowOpen && (
                                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                                      🔒 Review window closed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {nominations.length} nominations
          </div>
        )}
      </div>
    </div>
  )
}
