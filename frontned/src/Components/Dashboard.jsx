import { useEffect, useState } from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'

const BASE = '/api/V1/revisions'
const authHeader = () => ({ Authorization: `Bearer ${Cookies.get('token')}` })

const revisionLabel = (n) => ({ 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' }[n] ?? `${n}th`)

const groupRevisions = (list) => {
  const map = {}
  list.forEach((r) => {
    if (!map[r.subject_name]) map[r.subject_name] = {}
    if (!map[r.subject_name][r.topic_name]) map[r.subject_name][r.topic_name] = []
    map[r.subject_name][r.topic_name].push(r)
  })

  Object.values(map).forEach((topics) =>
    Object.values(topics).forEach((revs) =>
      revs.sort((a, b) => a.revision_number - b.revision_number)
    )
  )

  return map
}

const CompleteModal = ({ revision, onClose, onDone }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const confirm = async () => {
    setLoading(true)
    setError(null)

    try {
      await axios.post(`${BASE}/${revision.revision_id}/complete/`, {}, { headers: authHeader() })
      onDone(revision.revision_id)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark revision.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Mark Revision Complete?</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">&quot;{revision.topic_name}&quot;</span>
              {' - '}
              {revisionLabel(revision.revision_number)} revision
            </p>
            <p className="mt-1 text-xs text-slate-400">Scheduled: {revision.scheduled_date}</p>
          </div>
        </div>
        {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Yes, Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}

const RevisionChip = ({ revision, allTopicRevisions, onComplete }) => {
  const prevRevisions = allTopicRevisions.filter((r) => r.revision_number < revision.revision_number)
  const prevIncomplete = prevRevisions.some((r) => r.status !== 'completed')
  const isCompleted = revision.status === 'completed'
  const isMissed = revision.status === 'missed'
  const chipStatus = isCompleted ? 'Completed' : isMissed ? 'Missed' : prevIncomplete ? 'Locked' : 'Ready'

  let chipCls = 'border-slate-200 bg-white text-slate-600 shadow-sm'
  let badgeCls = 'border-slate-200 bg-slate-50 text-slate-600'
  let statusCls = 'bg-slate-100 text-slate-500'

  if (isCompleted) {
    chipCls = 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-[0_16px_32px_rgba(16,185,129,0.08)]'
    badgeCls = 'border-emerald-200 bg-white text-emerald-700'
    statusCls = 'bg-emerald-100 text-emerald-700'
  } else if (isMissed) {
    chipCls = 'border-rose-200 bg-rose-50 text-rose-700 shadow-[0_16px_32px_rgba(244,63,94,0.07)]'
    badgeCls = 'border-rose-200 bg-white text-rose-600'
    statusCls = 'bg-rose-100 text-rose-700'
  } else if (!prevIncomplete) {
    chipCls = 'border-amber-200 bg-amber-50 text-amber-800 shadow-[0_16px_32px_rgba(245,158,11,0.07)]'
    badgeCls = 'border-amber-200 bg-white text-amber-700'
    statusCls = 'bg-amber-100 text-amber-700'
  }

  return (
    <div className={`grid min-h-[126px] grid-cols-[auto_1fr_auto] gap-x-3 gap-y-3 rounded-[1.35rem] border px-4 py-4 transition ${chipCls}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold ${badgeCls}`}>
        {revision.revision_number}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">Revision</p>
        <p className="mt-1 text-sm font-semibold leading-5">{revisionLabel(revision.revision_number)} Revision</p>
      </div>

      {isCompleted ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      ) : (
        <button
          disabled={prevIncomplete}
          onClick={() => !prevIncomplete && onComplete(revision)}
          title={prevIncomplete ? `Complete the ${revisionLabel(revision.revision_number - 1)} revision first` : 'Mark as complete'}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition ${
            prevIncomplete
              ? 'cursor-not-allowed bg-slate-100 text-slate-300'
              : 'cursor-pointer bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      )}

      <div className="col-span-3 flex items-end justify-between gap-3 border-t border-current/10 pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-55">Scheduled</p>
          <p className="mt-1 text-sm font-semibold tracking-[-0.01em]">{revision.scheduled_date}</p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusCls}`}>
          {chipStatus}
        </span>
      </div>
    </div>
  )
}

const TopicRow = ({ topicName, revisions, onComplete }) => {
  const completed = revisions.filter((r) => r.status === 'completed').length
  const total = revisions.length
  const pct = Math.round((completed / total) * 100)

  return (
    <div className="rounded-[1.6rem] border border-slate-200/80 bg-slate-50/85 p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1d7bff]" />
            <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-800">{topicName}</p>
          </div>
          <p className="mt-1 pl-5 text-xs text-slate-400">Revision flow</p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{completed}/{total}</span>
          <div className="h-2 w-24 rounded-full bg-slate-200 sm:w-28">
            <div className="h-full rounded-full bg-[#1d7bff] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))' }}>
        {revisions.map((r) => (
          <RevisionChip key={r.revision_id} revision={r} allTopicRevisions={revisions} onComplete={onComplete} />
        ))}
      </div>
    </div>
  )
}

const SubjectSection = ({ subjectName, topicsMap, onComplete }) => {
  const allRevisions = Object.values(topicsMap).flat()
  const completed = allRevisions.filter((r) => r.status === 'completed').length
  const total = allRevisions.length

  return (
    <div className="rounded-[1.9rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.1)] sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.25rem] bg-[#1d7bff] text-sm font-bold text-white shadow-[0_12px_24px_rgba(29,123,255,0.25)]">
            {subjectName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold capitalize tracking-[-0.02em] text-slate-900">{subjectName}</p>
            <p className="mt-1 text-xs text-slate-400">{Object.keys(topicsMap).length} topics / {total} revisions</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{completed}/{total} done</span>
          <div className="h-2 w-24 rounded-full bg-slate-100 sm:w-28">
            <div
              className="h-full rounded-full bg-[#1d7bff] transition-all"
              style={{ width: `${Math.round((completed / total) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(topicsMap).map(([topicName, revisions]) => (
          <TopicRow key={topicName} topicName={topicName} revisions={revisions} onComplete={onComplete} />
        ))}
      </div>
    </div>
  )
}

const StatCard = ({ title, value, accent, detail }) => (
  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[12px_0_35px_rgba(148,163,184,0.08)]">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">{value}</h3>
      </div>
      <span className={`h-11 w-11 rounded-2xl ${accent}`} />
    </div>
    <p className="mt-3 text-sm leading-6 text-slate-400">{detail}</p>
  </div>
)

const TABS = ['all', 'today', 'upcoming', 'missed', 'completed']
const TAB_LABELS = { all: 'All', today: 'Today', upcoming: 'Upcoming', missed: 'Missed', completed: 'Completed' }
const TAB_ACCENT = {
  all: 'bg-slate-100 text-slate-600',
  today: 'bg-amber-100 text-amber-700',
  upcoming: 'bg-blue-100 text-[#1d7bff]',
  missed: 'bg-rose-100 text-[#ff6f7d]',
  completed: 'bg-emerald-100 text-emerald-700',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CalendarView = ({ allRevisions }) => {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = useState(null)

  const { year, month } = cursor
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })

  const byDate = {}
  allRevisions.forEach((r) => {
    if (!byDate[r.scheduled_date]) byDate[r.scheduled_date] = []
    byDate[r.scheduled_date].push(r)
  })

  const pad = (n) => String(n).padStart(2, '0')
  const dateStr = (d) => `${year}-${pad(month + 1)}-${pad(d)}`

  const dotColor = (revs) => {
    if (revs.every((r) => r.status === 'completed')) return 'bg-emerald-400'
    if (revs.some((r) => r.scheduled_date < todayStr && r.status === 'pending')) return 'bg-rose-400'
    if (revs.some((r) => r.scheduled_date === todayStr)) return 'bg-amber-400'
    return 'bg-blue-400'
  }

  const cells = []
  for (let i = 0; i < firstDay; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d)

  const selectedRevs = selected ? byDate[dateStr(selected)] || [] : []

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[12px_0_35px_rgba(148,163,184,0.08)]">
        <div className="mb-5 flex items-center justify-between">
          <button
            onClick={() => setCursor((c) => {
              const d = new Date(c.year, c.month - 1)
              return { year: d.getFullYear(), month: d.getMonth() }
            })}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <p className="font-semibold text-slate-800">{monthLabel}</p>
          <button
            onClick={() => setCursor((c) => {
              const d = new Date(c.year, c.month + 1)
              return { year: d.getFullYear(), month: d.getMonth() }
            })}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center">
          {DAYS.map((d) => (
            <p key={d} className="text-xs font-semibold text-slate-400">{d}</p>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />

            const ds = dateStr(day)
            const revs = byDate[ds] || []
            const isToday = ds === todayStr
            const isSelected = selected === day

            return (
              <button
                key={day}
                onClick={() => setSelected(isSelected ? null : day)}
                className={`relative flex flex-col items-center justify-start rounded-2xl py-2 transition ${
                  isSelected
                    ? 'bg-[#1d7bff] text-white shadow-lg shadow-blue-200'
                    : isToday
                      ? 'bg-blue-50 font-bold text-[#1d7bff]'
                      : revs.length
                        ? 'text-slate-700 hover:bg-slate-50'
                        : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm font-semibold">{day}</span>
                {revs.length > 0 && (
                  <div className="mt-1 flex gap-0.5">
                    {revs.slice(0, 3).map((r, idx) => (
                      <span key={`${r.revision_id}-${idx}`} className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white/70' : dotColor(revs)}`} />
                    ))}
                    {revs.length > 3 && (
                      <span className={`text-[9px] font-bold ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                        +{revs.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4">
          {[
            { color: 'bg-amber-400', label: 'Today' },
            { color: 'bg-blue-400', label: 'Upcoming' },
            { color: 'bg-rose-400', label: 'Missed' },
            { color: 'bg-emerald-400', label: 'Completed' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${item.color}`} />
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[12px_0_35px_rgba(148,163,184,0.08)]">
        {selected ? (
          <>
            <p className="mb-4 font-semibold text-slate-800">
              {new Date(`${dateStr(selected)}T00:00:00`).toLocaleDateString('default', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            {selectedRevs.length === 0 ? (
              <p className="text-sm text-slate-400">No revisions on this day.</p>
            ) : (
              <div className="space-y-2.5">
                {selectedRevs.map((r) => {
                  const statusCls = r.status === 'completed'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : r.scheduled_date < todayStr
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'

                  return (
                    <div key={r.revision_id} className={`rounded-2xl border px-4 py-3 ${statusCls}`}>
                      <p className="text-sm font-semibold">{r.topic_name}</p>
                      <p className="mt-0.5 text-xs opacity-70">{r.subject_name} / {revisionLabel(r.revision_number)} revision</p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          r.status === 'completed'
                            ? 'bg-emerald-200 text-emerald-800'
                            : r.scheduled_date < todayStr
                              ? 'bg-rose-200 text-rose-800'
                              : 'bg-amber-200 text-amber-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-slate-200" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <p className="mt-3 text-sm font-semibold text-slate-400">Select a day</p>
            <p className="mt-1 text-xs text-slate-300">Click any highlighted date to see revisions</p>
          </div>
        )}
      </div>
    </div>
  )
}

const Dashboard = () => {
  const [allRevisions, setAllRevisions] = useState([])
  const [counts, setCounts] = useState({ today: 0, upcoming: 0, missed: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [view, setView] = useState('list')
  const [confirmRevision, setConfirmRevision] = useState(null)

  const fetchAll = async () => {
    setLoading(true)

    try {
      const [allRes, todayRes, upcomingRes, missedRes, completedRes] = await Promise.allSettled([
        axios.get(`${BASE}/`, { headers: authHeader() }),
        axios.get(`${BASE}/today/`, { headers: authHeader() }),
        axios.get(`${BASE}/upcoming/`, { headers: authHeader() }),
        axios.get(`${BASE}/missed/`, { headers: authHeader() }),
        axios.get(`${BASE}/completed/`, { headers: authHeader() }),
      ])

      if (allRes.status === 'fulfilled') setAllRevisions(allRes.value.data)

      setCounts({
        today: todayRes.status === 'fulfilled' ? todayRes.value.data.length : 0,
        upcoming: upcomingRes.status === 'fulfilled' ? upcomingRes.value.data.length : 0,
        missed: missedRes.status === 'fulfilled' ? missedRes.value.data.length : 0,
        completed: completedRes.status === 'fulfilled' ? completedRes.value.data.length : 0,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleMarked = (id) => {
    setAllRevisions((prev) =>
      prev.map((r) => (r.revision_id === id ? { ...r, status: 'completed', completed_at: new Date().toISOString() } : r))
    )
    setCounts((c) => ({ ...c, completed: c.completed + 1, today: Math.max(0, c.today - 1) }))
    setConfirmRevision(null)
  }

  const today = new Date().toISOString().slice(0, 10)
  const filtered = allRevisions.filter((r) => {
    if (activeTab === 'all') return true
    if (activeTab === 'today') return r.scheduled_date === today && r.status === 'pending'
    if (activeTab === 'upcoming') return r.scheduled_date > today && r.status === 'pending'
    if (activeTab === 'missed') return r.scheduled_date < today && r.status === 'pending'
    if (activeTab === 'completed') return r.status === 'completed'
    return true
  })

  const grouped = groupRevisions(filtered)

  return (
    <div className="min-h-screen space-y-5 bg-[linear-gradient(180deg,#f5f9fd_0%,#edf4fb_100%)] p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's Revisions" value={loading ? '...' : counts.today} accent="bg-amber-400/15" detail="Pending revisions due today." />
        <StatCard title="Upcoming" value={loading ? '...' : counts.upcoming} accent="bg-blue-400/15" detail="Scheduled for future dates." />
        <StatCard title="Missed" value={loading ? '...' : counts.missed} accent="bg-rose-400/15" detail="Past revisions not completed." />
        <StatCard title="Completed" value={loading ? '...' : counts.completed} accent="bg-emerald-400/15" detail="Total revisions finished." />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {view === 'list' && TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab ? `${TAB_ACCENT[tab]} shadow-sm` : 'bg-white/70 text-slate-500 hover:bg-white'
              }`}
            >
              {TAB_LABELS[tab]}
              {tab !== 'all' && !loading && (
                <span className="ml-1.5 text-xs opacity-70">
                  {tab === 'today'
                    ? counts.today
                    : tab === 'upcoming'
                      ? counts.upcoming
                      : tab === 'missed'
                        ? counts.missed
                        : counts.completed}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              view === 'list' ? 'bg-[#1d7bff] text-white shadow-sm' : 'text-slate-500 hover:bg-[#f4f8fc]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              view === 'calendar' ? 'bg-[#1d7bff] text-white shadow-sm' : 'text-slate-500 hover:bg-[#f4f8fc]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Calendar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1d7bff]" />
        </div>
      ) : view === 'calendar' ? (
        <CalendarView allRevisions={allRevisions} />
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
          <p className="font-semibold text-slate-700">All clear</p>
          <p className="mt-1 text-sm text-slate-400">No revisions in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {Object.entries(grouped).map(([subjectName, topicsMap]) => (
            <SubjectSection
              key={subjectName}
              subjectName={subjectName}
              topicsMap={topicsMap}
              onComplete={setConfirmRevision}
            />
          ))}
        </div>
      )}

      {confirmRevision && (
        <CompleteModal revision={confirmRevision} onClose={() => setConfirmRevision(null)} onDone={handleMarked} />
      )}
    </div>
  )
}

export default Dashboard
