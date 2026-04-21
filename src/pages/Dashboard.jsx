import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const AWARD_COLORS = {
  'Abhimanyu Award':  { bg: 'bg-blue-100',   text: 'text-blue-800',   icon: '⭐' },
  'Bheeshma Award':   { bg: 'bg-green-100',  text: 'text-green-800',  icon: '🧙' },
  'Vishwakarma Award':{ bg: 'bg-purple-100', text: 'text-purple-800', icon: '🔧' },
  'Arjuna Award':     { bg: 'bg-amber-100',  text: 'text-amber-800',  icon: '🎯' },
  'Eklavya Award':    { bg: 'bg-orange-100', text: 'text-[#E8520A]',  icon: '📚' },
}

function daysRemaining(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr).setHours(23,59,59,999) - Date.now()
  return Math.ceil(diff / 86400000)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function CountdownCard({ label, startDate, endDate, color }) {
  const now    = Date.now()
  const start  = startDate ? new Date(startDate).getTime() : null
  const end    = endDate   ? new Date(endDate).setHours(23,59,59,999) : null
  const days   = end ? daysRemaining(endDate) : null

  let status, statusText, statusColor
  if (!start || !end) {
    status = 'not-set'; statusText = 'Not configured'; statusColor = 'text-gray-400'
  } else if (now < start) {
    const d = Math.ceil((start - now) / 86400000)
    status = 'upcoming'; statusText = `Starts in ${d} day${d !== 1 ? 's' : ''}`; statusColor = 'text-blue-600'
  } else if (now > end) {
    status = 'closed'; statusText = 'Window closed'; statusColor = 'text-red-500'
  } else {
    status = 'open'; statusText = `${days} day${days !== 1 ? 's' : ''} remaining`; statusColor = 'text-green-600'
  }

  return (
    <div className={`card p-5 border-l-4 ${color}`}>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold ${statusColor} mb-1`}>{statusText}</div>
      <div className="text-xs text-gray-400">{formatDate(startDate)} → {formatDate(endDate)}</div>
      <div className={`mt-2 text-xs font-semibold px-2 py-1 rounded-full inline-block ${
        status === 'open'     ? 'bg-green-100 text-green-700' :
        status === 'upcoming' ? 'bg-blue-100 text-blue-700'  :
        status === 'closed'   ? 'bg-red-100 text-red-600'    : 'bg-gray-100 text-gray-500'
      }`}>
        {status === 'open' ? '🟢 Open' : status === 'upcoming' ? '🔵 Upcoming' : status === 'closed' ? '🔴 Closed' : '⚪ N/A'}
      </div>
    </div>
  )
}

function WinnersCarousel({ winners }) {
  const [idx, setIdx] = useState(0)
  if (!winners.length) return null

  const pages = Math.max(1, Math.ceil(winners.length / 3))
  const visible = winners.slice(idx * 3, idx * 3 + 3)
  const cat = visible[Math.floor(visible.length / 2)]?.award_category

  return (
    <div className="card overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title">🏆 Award Winners</div>
            <div className="text-sm text-gray-500">Celebrating excellence across the team</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors text-sm">‹</button>
            <div className="flex gap-1.5">
              {Array.from({ length: pages }).map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === idx ? 'w-6 bg-[#E8520A]' : 'w-2 bg-gray-200'}`} />
              ))}
            </div>
            <button onClick={() => setIdx(i => Math.min(pages - 1, i + 1))} disabled={idx >= pages - 1}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors text-sm">›</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {visible.map((w, i) => {
            const c = AWARD_COLORS[w.award_category] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🏆' }
            const initials = (w.employee_name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
            return (
              <div key={w.id} className={`rounded-2xl p-5 text-center border-2 transition-all ${
                i === 1 ? 'border-[#E8520A] shadow-md scale-105' : 'border-transparent bg-gray-50'
              }`}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-200 to-orange-100 flex items-center justify-center text-xl font-bold text-[#E8520A] mx-auto mb-3">
                  {initials}
                </div>
                <div className="font-bold text-gray-900">{w.employee_name}</div>
                <div className="text-sm text-gray-500 mb-2">{w.department}</div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
                  {c.icon} {w.award_category}
                </span>
                <div className="text-xs text-gray-400 mt-2 line-clamp-2">{w.key_achievements}</div>
                <div className="text-xs text-gray-400 mt-2 font-medium">{w.quarter}</div>
              </div>
            )
          })}
          {visible.length < 3 && Array.from({ length: 3 - visible.length }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-2xl p-5 bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">No winner yet</div>
          ))}
        </div>
      </div>

      {cat && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-t border-orange-100 px-6 py-3 text-center">
          <span className="text-sm font-semibold text-[#E8520A]">🎉 Celebrating Excellence — {cat}</span>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { settings } = useAuth()
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('zab_nominations').select('*').order('created_at', { ascending: false })
      if (data) {
        const total    = data.length
        const pending  = data.filter(r => r.status === 'Pending').length
        const approved = data.filter(r => r.status === 'Approved').length
        const rejected = data.filter(r => r.status === 'Rejected').length
        setStats({ total, pending, approved, rejected })
        setWinners(data.filter(r => r.status === 'Approved'))
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Tagline banner */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-6 text-center mb-8">
        <div className="text-xl sm:text-2xl font-bold text-gray-900 italic mb-1">
          "{settings.tagline || 'Koshish Kar, Hal Niklega. Aaj Nahi toh Kal Niklega'}"
        </div>
        <div className="text-sm text-[#E8520A] font-semibold">
          Recognizing outstanding work with a "Make it Happen" approach · {settings.quarter || 'Q4 2025-26'}
        </div>
      </div>

      {/* Countdown windows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <CountdownCard
          label="Nomination Window"
          startDate={settings.nomination_start_date}
          endDate={settings.nomination_end_date}
          color="border-l-[#E8520A]"
        />
        <CountdownCard
          label="HOD Review Window"
          startDate={settings.hod_review_start_date}
          endDate={settings.hod_review_end_date}
          color="border-l-purple-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Nominations', value: stats.total,    color: 'text-[#E8520A]' },
          { label: 'Pending Review',    value: stats.pending,  color: 'text-amber-600' },
          { label: 'Approved',          value: stats.approved, color: 'text-green-600' },
          { label: 'Rejected',          value: stats.rejected, color: 'text-red-600'   },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`text-4xl font-extrabold ${s.color}`}>{loading ? '—' : s.value}</div>
            <div className="text-sm text-gray-500 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Winners carousel */}
      {!loading && <WinnersCarousel winners={winners} />}

    </div>
  )
}
