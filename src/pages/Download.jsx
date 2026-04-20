import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const supabaseConfigured =
  import.meta.env.VITE_SUPABASE_URL &&
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

const BADGE = { Pending: 'badge-pending', Approved: 'badge-approved', Rejected: 'badge-rejected' }

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="stat-card">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-4xl font-extrabold ${color}`}>{value}</div>
      <div className="text-sm text-gray-500 font-medium">{label}</div>
    </div>
  )
}

export default function Download() {
  const { settings } = useAuth()
  const { showToast } = useToast()

  const [nominations, setNominations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    if (supabaseConfigured) {
      const { data, error } = await supabase.from('nominations').select('*').order('created_at', { ascending: false })
      if (!error) setNominations(data || [])
    } else {
      const stored = JSON.parse(localStorage.getItem('za_demo_nominations') || '[]')
      setNominations(stored)
    }
    setLoading(false)
  }

  async function downloadCSV(filterStatus) {
    setDownloading(true)
    try {
      let rows = []
      if (supabaseConfigured) {
        let q = supabase.from('nominations').select('*').order('created_at', { ascending: false })
        if (filterStatus) q = q.eq('status', filterStatus)
        const { data, error } = await q
        if (error) throw error
        rows = data || []
      } else {
        const stored = JSON.parse(localStorage.getItem('za_demo_nominations') || '[]')
        rows = filterStatus ? stored.filter(n => n.status === filterStatus) : stored
      }
      if (!rows.length) { showToast('info', 'No Data', 'No records match this filter'); return }

      const headers = [
        'Quarter','Employee ID','Employee Name','Department','Employee Email',
        'Award Category','Key Achievements','Impact Description','Supporting Evidence',
        'Nominated By','Manager Email','Status','HOD Comments','Reviewed By','Reviewed Date','Submitted Date',
      ]
      const csvRows = [headers.join(',')]
      rows.forEach(r => {
        csvRows.push([
          r.quarter, r.employee_id, r.employee_name, r.department, r.employee_email,
          r.award_category, r.key_achievements, r.impact_description, r.supporting_evidence,
          r.manager_name, r.manager_email, r.status, r.hod_comments, r.reviewed_by,
          r.reviewed_at ? formatDate(r.reviewed_at) : '',
          r.created_at  ? formatDate(r.created_at)  : '',
        ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))
      })

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `zabardast-awards-${filterStatus || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('success', 'CSV Downloaded!', `Exported ${rows.length} record${rows.length !== 1 ? 's' : ''}`)
    } catch (err) {
      showToast('error', 'Export Failed', err.message)
    } finally {
      setDownloading(false)
    }
  }

  async function downloadExcel() {
    setDownloading(true)
    try {
      // Only reviewed nominations (Approved or Rejected)
      let rows = []
      if (supabaseConfigured) {
        const { data, error } = await supabase
          .from('nominations')
          .select('*')
          .in('status', ['Approved', 'Rejected'])
          .order('created_at', { ascending: false })
        if (error) throw error
        rows = data || []
      } else {
        const stored = JSON.parse(localStorage.getItem('za_demo_nominations') || '[]')
        rows = stored.filter(n => n.status === 'Approved' || n.status === 'Rejected')
      }

      if (!rows.length) {
        showToast('info', 'No Reviewed Data', 'No Approved or Rejected nominations to export yet')
        return
      }

      const sheetData = [
        ['Quarter', 'Employee ID', 'Employee Name', 'Department', 'Employee Email',
         'Award Category', 'Key Achievements', 'Nominated By', 'Manager Email',
         'Status', 'HOD Comments', 'Reviewed By', 'Reviewed Date', 'Submitted Date'],
        ...rows.map(r => [
          r.quarter, r.employee_id, r.employee_name, r.department, r.employee_email,
          r.award_category, r.key_achievements, r.manager_name, r.manager_email,
          r.status, r.hod_comments || '',
          r.reviewed_by || '',
          r.reviewed_at ? formatDate(r.reviewed_at) : '',
          r.created_at  ? formatDate(r.created_at)  : '',
        ]),
      ]

      const ws = XLSX.utils.aoa_to_sheet(sheetData)

      // Column widths
      ws['!cols'] = [10,12,20,14,24,18,40,18,24,10,30,18,14,14].map(w => ({ wch: w }))

      // Style header row bold (basic)
      const range = XLSX.utils.decode_range(ws['!ref'])
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
        if (cell) cell.s = { font: { bold: true } }
      }

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'HOD Reviewed')

      XLSX.writeFile(wb, `zabardast-awards-reviewed-${new Date().toISOString().slice(0, 10)}.xlsx`)
      showToast('success', 'Excel Downloaded!', `Exported ${rows.length} reviewed nomination${rows.length !== 1 ? 's' : ''}`)
    } catch (err) {
      showToast('error', 'Export Failed', err.message)
    } finally {
      setDownloading(false)
    }
  }

  const total    = nominations.length
  const approved = nominations.filter(n => n.status === 'Approved').length
  const rejected = nominations.filter(n => n.status === 'Rejected').length
  const pending  = nominations.filter(n => n.status === 'Pending').length

  const filtered = statusFilter ? nominations.filter(n => n.status === statusFilter) : nominations

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Nominations" value={loading ? '—' : total}    color="text-[#E8520A]" icon="📊" />
        <StatCard label="Pending"           value={loading ? '—' : pending}  color="text-amber-600" icon="⏳" />
        <StatCard label="Approved"          value={loading ? '—' : approved} color="text-green-600" icon="✅" />
        <StatCard label="Rejected"          value={loading ? '—' : rejected} color="text-red-600"   icon="❌" />
      </div>

      {/* Export panel */}
      {/* Excel Export — post-HOD-review */}
      <div className="card p-6 mb-6 border-2 border-green-200 bg-green-50/40">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📊</span>
          <h2 className="section-title mb-0">Excel Export (HOD Reviewed)</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Downloads only <strong>Approved</strong> and <strong>Rejected</strong> nominations — i.e. nominations actioned by the HOD.
          Pending nominations are excluded. Quarter: <strong>{settings.quarter || 'Q4 2025-26'}</strong>
        </p>
        <button
          onClick={downloadExcel}
          disabled={downloading || loading}
          className="bg-green-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {downloading
            ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
            : <><span>⬇</span> Download Reviewed Nominations (.xlsx)</>}
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Includes: Quarter · Employee ID · Name · Department · Email · Award · Key Achievements · Nominated By · Manager Email · Status · HOD Comments · Reviewed By · Dates
        </p>
      </div>

      {/* CSV Export panel */}
      <div className="card p-6 mb-8">
        <h2 className="section-title mb-1">📥 CSV Export</h2>
        <p className="text-sm text-gray-500 mb-5">
          Download all nomination data as CSV including HOD comments and review status.
          Quarter: <strong>{settings.quarter || 'Q4 2025-26'}</strong>
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => downloadCSV('')}
            disabled={downloading || loading}
            className="btn-primary"
          >
            {downloading
              ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
              : '📥 Download All Nominations'}
          </button>
          <button onClick={() => downloadCSV('Approved')} disabled={downloading || loading} className="btn-success">
            ✅ Approved Only ({approved})
          </button>
          <button onClick={() => downloadCSV('Pending')} disabled={downloading || loading}
            className="bg-amber-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2">
            ⏳ Pending Only ({pending})
          </button>
          <button onClick={() => downloadCSV('Rejected')} disabled={downloading || loading} className="btn-danger">
            ❌ Rejected Only ({rejected})
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          CSV columns: Quarter · Employee ID · Employee Name · Department · Email · Award Category · Key Achievements · Nominated By · Manager Email · Status · HOD Comments · Reviewed By · Reviewed Date · Submitted Date
        </p>
      </div>

      {/* Preview table */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="section-title mb-0">📋 All Nominations</h2>
            <p className="text-sm text-gray-500">Preview before downloading</p>
          </div>
          <div className="flex gap-2 items-center">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input w-auto py-2 text-sm">
              <option value="">All Statuses</option>
              <option>Pending</option><option>Approved</option><option>Rejected</option>
            </select>
            <button onClick={load} className="btn-secondary text-sm py-2 px-4">↻ Refresh</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <span className="inline-block w-8 h-8 border-2 border-[#E8520A]/30 border-t-[#E8520A] rounded-full animate-spin mr-3" />
            Loading data…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">📊</div>
            <div className="font-semibold text-gray-600 text-lg">No records found</div>
            <div className="text-sm mt-1">Nominations will appear here once submitted</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Employee', 'Dept', 'Award Category', 'Nominated By', 'Status', 'HOD Comments', 'Reviewed By', 'Submitted'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{n.employee_name}</div>
                      <div className="text-xs text-gray-400">{n.employee_id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{n.department}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{n.award_category}</td>
                    <td className="px-4 py-3 text-gray-600">{n.manager_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={BADGE[n.status] || 'badge-pending'}>{n.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-48">
                      <div className="truncate" title={n.hod_comments}>{n.hod_comments || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{n.reviewed_by || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(n.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {filtered.length} of {nominations.length} records
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
