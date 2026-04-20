import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'

const DEPARTMENTS = ['Technology', 'Product', 'QA', 'Design']

const AWARD_CATEGORIES = [
  { value: 'Abhimanyu Award',   desc: 'For extraordinary newcomers (joined in last 6 months)',     icon: '⭐', color: 'bg-blue-50 border-blue-200 text-blue-700'   },
  { value: 'Bheeshma Award',    desc: 'For those who trained and enabled team members',            icon: '🧙', color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'Vishwakarma Award', desc: 'For innovation and bringing new dimensions',                icon: '🔧', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'Arjuna Award',      desc: 'For goal accomplishment with complete ownership',           icon: '🎯', color: 'bg-amber-50 border-amber-200 text-amber-700'  },
  { value: 'Eklavya Award',     desc: 'For continuous learning and knowledge sharing',             icon: '📚', color: 'bg-orange-50 border-orange-200 text-[#E8520A]' },
]

function isWindowOpen(start, end) {
  if (!start || !end) return true
  const now  = Date.now()
  const s    = new Date(start).getTime()
  const e    = new Date(end).setHours(23, 59, 59, 999)
  return now >= s && now <= e
}

const BADGE = { Pending: 'badge-pending', Approved: 'badge-approved', Rejected: 'badge-rejected' }

const EMPTY_FORM = (user) => ({
  manager_name: user?.display_name || user?.username || '',
  manager_email: user?.email || '',
  employee_id: '', employee_name: '', department: '',
  employee_email: '', award_category: '',
  key_achievements: '',
})

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="text-red-500 text-xs mt-1">{msg}</p>
}

export default function Nominations() {
  const { user, settings } = useAuth()
  const { showToast } = useToast()
  const windowOpen = isWindowOpen(settings.nomination_start_date, settings.nomination_end_date)

  const [form, setForm]         = useState(EMPTY_FORM(user))
  const [errors, setErrors]     = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [myNoms, setMyNoms]     = useState([])
  const [loadingNoms, setLoadingNoms] = useState(true)

  useEffect(() => { loadMine() }, [])

  async function loadMine() {
    setLoadingNoms(true)
    const supabaseOk =
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

    if (supabaseOk) {
      const { data } = await supabase
        .from('nominations')
        .select('id, employee_name, employee_id, department, award_category, status, created_at, quarter')
        .eq('manager_name', user?.display_name || user?.username || '')
        .order('created_at', { ascending: false })
      setMyNoms(data || [])
    } else {
      const stored = JSON.parse(localStorage.getItem('za_demo_nominations') || '[]')
      const managerName = user?.display_name || user?.username || ''
      setMyNoms(stored.filter(n => n.manager_name === managerName))
    }
    setLoadingNoms(false)
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.manager_name.trim()) e.manager_name = 'Required'
    if (!form.manager_email) e.manager_email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.manager_email)) e.manager_email = 'Invalid email'
    if (!form.employee_id.trim())   e.employee_id   = 'Required'
    if (!form.employee_name.trim()) e.employee_name = 'Required'
    if (!form.department)           e.department    = 'Required'
    if (!form.employee_email)       e.employee_email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.employee_email)) e.employee_email = 'Invalid email'
    if (!form.award_category)       e.award_category = 'Required'
    if (!form.key_achievements.trim()) e.key_achievements = 'Required'
    else if (form.key_achievements.trim().length < 100) e.key_achievements = `Minimum 100 characters (${form.key_achievements.trim().length}/100)`
    return e
  }

  const supabaseConfigured =
    import.meta.env.VITE_SUPABASE_URL &&
    !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    try {
      const record = {
        ...form,
        quarter: settings.quarter || 'Q4 2025-26',
        status: 'Pending',
        created_at: new Date().toISOString(),
      }

      if (supabaseConfigured) {
        const { error } = await supabase.from('nominations').insert([record])
        if (error) throw error
      } else {
        // Demo mode: persist to localStorage so the list refreshes
        const stored = JSON.parse(localStorage.getItem('za_demo_nominations') || '[]')
        stored.unshift({ ...record, id: `demo-${Date.now()}` })
        localStorage.setItem('za_demo_nominations', JSON.stringify(stored))
      }

      showToast('success', 'Nomination Submitted! 🎉', `${form.employee_name} nominated for ${form.award_category}`)
      setForm(EMPTY_FORM(user))
      setErrors({})
      loadMine()
    } catch (err) {
      showToast('error', 'Submission Failed', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCat = AWARD_CATEGORIES.find(c => c.value === form.award_category)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {!windowOpen && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <div className="font-bold text-amber-800">Nominations Closed</div>
            <div className="text-sm text-amber-700 mt-0.5">
              The nomination window is currently closed.
              {settings.nomination_start_date && settings.nomination_end_date && (
                <> Window: {new Date(settings.nomination_start_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })} – {new Date(settings.nomination_end_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">

        {/* Form */}
        <div className="xl:col-span-3 card p-6">
          <div className="mb-6">
            <h2 className="section-title">📝 Manager Nomination Form</h2>
            <p className="text-sm text-gray-500">Nominate your team members · Quarter: <strong>{settings.quarter || 'Q4 2025-26'}</strong></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Manager Details */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">Manager Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Manager Name *</label>
                  <input
                    type="text"
                    value={form.manager_name}
                    onChange={e => set('manager_name', e.target.value)}
                    className={`form-input ${errors.manager_name ? 'form-input-error' : ''}`}
                    placeholder="Your full name"
                  />
                  <FieldError msg={errors.manager_name} />
                </div>
                <div>
                  <label className="form-label">Manager Email *</label>
                  <input value={form.manager_email} onChange={e => set('manager_email', e.target.value)}
                    className={`form-input ${errors.manager_email ? 'form-input-error' : ''}`} placeholder="manager@company.com" />
                  <FieldError msg={errors.manager_email} />
                </div>
              </div>
            </div>

            {/* Nominee Details */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">Nominee Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Employee ID *</label>
                  <input value={form.employee_id} onChange={e => set('employee_id', e.target.value)}
                    className={`form-input ${errors.employee_id ? 'form-input-error' : ''}`} placeholder="e.g. NP001" />
                  <FieldError msg={errors.employee_id} />
                </div>
                <div>
                  <label className="form-label">Employee Name *</label>
                  <input value={form.employee_name} onChange={e => set('employee_name', e.target.value)}
                    className={`form-input ${errors.employee_name ? 'form-input-error' : ''}`} placeholder="Full name" />
                  <FieldError msg={errors.employee_name} />
                </div>
                <div>
                  <label className="form-label">Department *</label>
                  <select value={form.department} onChange={e => set('department', e.target.value)}
                    className={`form-input ${errors.department ? 'form-input-error' : ''}`}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                  <FieldError msg={errors.department} />
                </div>
                <div>
                  <label className="form-label">Employee Email *</label>
                  <input value={form.employee_email} onChange={e => set('employee_email', e.target.value)}
                    className={`form-input ${errors.employee_email ? 'form-input-error' : ''}`} placeholder="employee@company.com" />
                  <FieldError msg={errors.employee_email} />
                </div>
              </div>
            </div>

            {/* Award Details */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100">Award Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Award Category *</label>
                  <select value={form.award_category} onChange={e => set('award_category', e.target.value)}
                    className={`form-input ${errors.award_category ? 'form-input-error' : ''}`}>
                    <option value="">Select award category</option>
                    {AWARD_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.value}</option>)}
                  </select>
                  <FieldError msg={errors.award_category} />
                  {selectedCat && (
                    <div className={`mt-2 text-xs px-3 py-2 rounded-xl border font-medium ${selectedCat.color}`}>
                      {selectedCat.icon} {selectedCat.desc}
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label">
                    Key Achievements * <span className="text-gray-400 font-normal">(min 100 chars · {form.key_achievements.length} typed)</span>
                  </label>
                  <textarea value={form.key_achievements} onChange={e => set('key_achievements', e.target.value)}
                    rows={4} className={`form-input ${errors.key_achievements ? 'form-input-error' : ''}`}
                    placeholder="Describe specific achievements and contributions in detail…" />
                  <FieldError msg={errors.key_achievements} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={submitting || !windowOpen} className="btn-primary w-full py-3 text-base">
              {submitting
                ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                : '✈️ Submit Nomination'}
            </button>
          </form>
        </div>

        {/* Sidebar: award guide */}
        <div className="xl:col-span-2 space-y-4">
          <div className="card p-5">
            <h3 className="section-title mb-4">🎖️ Award Guide</h3>
            <div className="space-y-3">
              {AWARD_CATEGORIES.map(c => (
                <div key={c.value} className={`p-3 rounded-xl border text-sm ${c.color}`}>
                  <div className="font-bold">{c.icon} {c.value}</div>
                  <div className="text-xs mt-0.5 opacity-80">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* My Nominations */}
      <div className="mt-8 card p-6">
        <h3 className="section-title mb-4">📋 My Nominations</h3>
        {loadingNoms ? (
          <div className="text-center py-8 text-gray-400">Loading…</div>
        ) : myNoms.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📝</div>
            <div className="font-semibold text-gray-600">No nominations yet</div>
            <div className="text-sm">Submit your first nomination above</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-3 pr-4 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="text-left pb-3 pr-4 text-xs font-semibold text-gray-500 uppercase">Department</th>
                  <th className="text-left pb-3 pr-4 text-xs font-semibold text-gray-500 uppercase">Award</th>
                  <th className="text-left pb-3 pr-4 text-xs font-semibold text-gray-500 uppercase">Quarter</th>
                  <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {myNoms.map(n => (
                  <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-gray-900">{n.employee_name}</div>
                      <div className="text-xs text-gray-400">{n.employee_id}</div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{n.department}</td>
                    <td className="py-3 pr-4 text-gray-600">{n.award_category}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{n.quarter}</td>
                    <td className="py-3">
                      <span className={BADGE[n.status] || 'badge-pending'}>
                        {n.status === 'Approved' ? '✅' : n.status === 'Rejected' ? '❌' : '⏳'} {n.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
