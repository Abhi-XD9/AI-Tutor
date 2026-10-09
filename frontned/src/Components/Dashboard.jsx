import { useEffect, useState } from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'
import DataTable from 'react-data-table-component'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'

const REVISIONS_BASE = '/api/V1/revisions/'
const TOPICS_BASE = '/api/V1/topics/'
const SUBJECTS_BASE = '/api/V1/subjects/'

const authHeader = () => ({ Authorization: `Bearer ${Cookies.get('token')}` })
const revisionLabel = (n) => ({ 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' }[n] ?? `${n}th`)
const todayStr = new Date().toISOString().slice(0, 10)

const groupRevisions = (list) => {
  const map = {}
  list.forEach((r) => {
    if (!map[r.subject_name]) map[r.subject_name] = {}
    if (!map[r.subject_name][r.topic_name]) map[r.subject_name][r.topic_name] = []
    map[r.subject_name][r.topic_name].push(r)
  })
  Object.values(map).forEach((topics) =>
    Object.values(topics).forEach((revs) => revs.sort((a, b) => a.revision_number - b.revision_number))
  )
  return map
}

const deriveCounts = (list) => ({
  today: list.filter((r) => r.scheduled_date === todayStr && r.status === 'pending').length,
  upcoming: list.filter((r) => r.scheduled_date > todayStr && r.status === 'pending').length,
  missed: list.filter((r) => r.scheduled_date < todayStr && r.status === 'pending').length,
  completed: list.filter((r) => r.status === 'completed').length,
})

const getSubjectDueDate = (revisions) => {
  const dates = revisions.filter((r) => r.status !== 'completed').map((r) => r.scheduled_date).sort()
  return dates[0] || revisions.map((r) => r.scheduled_date).sort()[0] || '--'
}

const buildAreaTrend = (revisions) => {
  const map = {}
  revisions.forEach((r) => {
    if (r.status === 'completed' && r.completed_at) {
      const d = r.completed_at.slice(0, 10)
      map[d] = (map[d] || 0) + 1
    }
  })
  const sorted = Object.keys(map).sort().slice(-14)
  if (!sorted.length) return [{ name: 'Today', value: 0 }]
  return sorted.map((d) => ({
    name: new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: map[d],
  }))
}

const buildSubjectProgress = (subjects, topics) =>
  subjects.map((s) => {
    const st = topics.filter((t) => t.subject === s.subject_id)
    return {
      name: s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name,
      fullName: s.name,
      Completed: st.filter((t) => t.status === 'completed').length,
      Pending: st.filter((t) => t.status !== 'completed').length,
    }
  })

const buildDonut = (counts) => [
  { name: 'Completed', value: counts.completed, color: '#10b981' },
  { name: 'Today', value: counts.today, color: '#f59e0b' },
  { name: 'Missed', value: counts.missed, color: '#f43f5e' },
  { name: 'Upcoming', value: counts.upcoming, color: '#1d7bff' },
]

const tableStyles = {
  headRow: { style: { minHeight: 52, borderBottomColor: '#e2e8f0', backgroundColor: '#f8fafc' } },
  headCells: { style: { color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' } },
  rows: { style: { minHeight: 72, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' } },
  cells: { style: { paddingTop: 12, paddingBottom: 12, color: '#334155', fontSize: 14 } },
}

/* ── STAT CARD ── */
const StatCard = ({ title, value, accent, bg, detail, icon, trend }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-slate-100 ${bg} p-5 shadow-sm`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
        <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</h3>
        {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accent}`}>
        {icon}
      </div>
    </div>
    {trend !== undefined && (
      <div className="mt-3 flex items-center gap-1.5">
        <span className={`text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </span>
        <span className="text-xs text-slate-400">vs last week</span>
      </div>
    )}
  </div>
)

/* ── CUSTOM TOOLTIP ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

/* ── AREA CHART ── */
const RevisionTrendChart = ({ data }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Activity</p>
        <h3 className="mt-0.5 text-base font-bold text-slate-900">Revision Trend</h3>
      </div>
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Last 14 days</span>
    </div>
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="value" name="Completed" stroke="#10b981" strokeWidth={2.5} fill="url(#areaGrad)" dot={false} activeDot={{ r: 5, fill: '#10b981' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
)

/* ── STACKED BAR CHART ── */
const SubjectProgressChart = ({ data }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1d7bff]">Subjects</p>
        <h3 className="mt-0.5 text-base font-bold text-slate-900">Topics Progress</h3>
      </div>
      <div className="flex items-center gap-3 text-xs font-semibold">
        <span className="flex items-center gap-1 text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Done</span>
        <span className="flex items-center gap-1 text-amber-600"><span className="h-2 w-2 rounded-full bg-amber-400" />Pending</span>
      </div>
    </div>
    <div className="h-52">
      {data.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={28} />
            <Bar dataKey="Pending" stackId="a" fill="#fbbf24" radius={[6, 6, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">No subject data yet</div>
      )}
    </div>
  </div>
)

/* ── DONUT CHART ── */
const DonutChart = ({ counts }) => {
  const data = buildDonut(counts).filter((d) => d.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">Overview</p>
        <h3 className="mt-0.5 text-base font-bold text-slate-900">Revision Status</h3>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.length ? data : [{ name: 'None', value: 1, color: '#e2e8f0' }]}
                cx="50%" cy="50%" innerRadius={44} outerRadius={64}
                dataKey="value" strokeWidth={0}>
                {(data.length ? data : [{ color: '#e2e8f0' }]).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{total}</span>
            <span className="text-[10px] font-semibold text-slate-400">Total</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {buildDonut(counts).map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="text-xs text-slate-500">{d.name}</span>
              <span className="ml-auto pl-3 text-xs font-bold text-slate-800">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── ASSESSMENT INSIGHTS ── */
/* ── COMPLETE MODAL ── */
const CompleteModal = ({ revision, onClose, onDone }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const confirm = async () => {
    setLoading(true); setError(null)
    try {
      await axios.post(`${REVISIONS_BASE}${revision.revision_id}/complete/`, {}, { headers: authHeader() })
      onDone(revision.revision_id)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark revision.')
      setLoading(false)
    }
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Mark Revision Complete?</h3>
            <p className="mt-1 text-sm text-slate-500">"{revision.topic_name}" — {revisionLabel(revision.revision_number)} revision</p>
            <p className="mt-0.5 text-xs text-slate-400">Scheduled: {revision.scheduled_date}</p>
          </div>
        </div>
        {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={confirm} disabled={loading} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Saving…' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── REVISION CHIP ── */
const RevisionChip = ({ revision, allTopicRevisions, onComplete }) => {
  const prevIncomplete = allTopicRevisions.filter((r) => r.revision_number < revision.revision_number).some((r) => r.status !== 'completed')
  const isCompleted = revision.status === 'completed'
  const isMissed = revision.status === 'missed'
  const chipStatus = isCompleted ? 'Done' : isMissed ? 'Missed' : prevIncomplete ? 'Locked' : 'Ready'

  const colors = isCompleted
    ? { wrap: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', status: 'bg-emerald-100 text-emerald-700' }
    : isMissed
    ? { wrap: 'border-rose-200 bg-rose-50', badge: 'bg-rose-100 text-rose-600', status: 'bg-rose-100 text-rose-700' }
    : !prevIncomplete
    ? { wrap: 'border-amber-200 bg-amber-50', badge: 'bg-amber-100 text-amber-700', status: 'bg-amber-100 text-amber-700' }
    : { wrap: 'border-slate-200 bg-white', badge: 'bg-slate-100 text-slate-500', status: 'bg-slate-100 text-slate-500' }

  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-3 ${colors.wrap}`}>
      <div className="flex items-center justify-between">
        <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${colors.badge}`}>{revisionLabel(revision.revision_number)}</span>
        {isCompleted ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
        ) : (
          <button disabled={prevIncomplete} onClick={() => !prevIncomplete && onComplete(revision)}
            className={`flex h-7 w-7 items-center justify-center rounded-xl transition ${prevIncomplete ? 'cursor-not-allowed bg-slate-100 text-slate-300' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </button>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-600">{revision.scheduled_date}</p>
      <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.status}`}>{chipStatus}</span>
    </div>
  )
}

/* ── TOPIC ROW ── */
const TopicRow = ({ topicName, revisions, onComplete }) => {
  const completed = revisions.filter((r) => r.status === 'completed').length
  const pct = Math.round((completed / revisions.length) * 100)
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#1d7bff]" />
          <p className="truncate text-sm font-semibold text-slate-800">{topicName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">{completed}/{revisions.length}</span>
          <div className="h-1.5 w-20 rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-[#1d7bff]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' }}>
        {revisions.map((r) => <RevisionChip key={r.revision_id} revision={r} allTopicRevisions={revisions} onComplete={onComplete} />)}
      </div>
    </div>
  )
}

/* ── SUBJECT DETAIL MODAL ── */
const SubjectDetailModal = ({ detail, onClose, onComplete }) => {
  if (!detail) return null
  const allRevisions = Object.values(detail.topicsMap).flat()
  const completed = allRevisions.filter((r) => r.status === 'completed').length
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm">
      <div className="mx-auto flex h-screen w-full max-w-5xl flex-col bg-[#f5f9fd] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Subject</p>
            <h3 className="mt-0.5 text-xl font-bold text-slate-900">{detail.subjectName}</h3>
            <p className="mt-1 text-xs text-slate-400">{Object.keys(detail.topicsMap).length} topics · {completed}/{allRevisions.length} revisions done</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 p-6">
          {Object.entries(detail.topicsMap).map(([name, revs]) => (
            <TopicRow key={name} topicName={name} revisions={revs} onComplete={onComplete} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── SUBJECT TABLE ── */
const SubjectTable = ({ grouped, onOpen }) => {
  const rows = Object.entries(grouped).map(([subjectName, topicsMap]) => {
    const all = Object.values(topicsMap).flat()
    const completed = all.filter((r) => r.status === 'completed').length
    return {
      id: subjectName, subjectName, topicsMap,
      topicsCount: Object.keys(topicsMap).length,
      revisionsCount: all.length,
      completed,
      pending: all.filter((r) => r.status === 'pending').length,
      dueDate: getSubjectDueDate(all),
      progress: all.length ? Math.round((completed / all.length) * 100) : 0,
    }
  })

  if (!rows.length) return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14">
      <p className="font-semibold text-slate-600">No revisions in this filter</p>
    </div>
  )

  const columns = [
    {
      name: 'Subject', minWidth: '220px', grow: 2,
      cell: (row) => (
        <div className="flex items-center gap-3 py-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1d7bff] to-[#7c3aed] text-sm font-bold text-white">
            {row.subjectName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{row.subjectName}</p>
            <p className="text-xs text-slate-400">{row.topicsCount} topics</p>
          </div>
        </div>
      ),
    },
    {
      name: 'Progress', minWidth: '160px',
      cell: (row) => (
        <div className="flex w-full items-center gap-2">
          <span className="w-9 shrink-0 text-xs font-bold text-slate-700">{row.progress}%</span>
          <div className="h-1.5 flex-1 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#1d7bff]" style={{ width: `${row.progress}%` }} />
          </div>
        </div>
      ),
    },
    { name: 'Due', minWidth: '110px', center: true, cell: (row) => <span className="text-xs font-semibold text-slate-600">{row.dueDate}</span> },
    {
      name: 'Pending', width: '100px', center: true,
      cell: (row) => <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{row.pending}</span>,
    },
    {
      name: '', width: '80px', center: true,
      cell: (row) => (
        <button onClick={() => onOpen(row.subjectName, row.topicsMap)}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-[#1d7bff] hover:text-[#1d7bff]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      ),
    },
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <DataTable columns={columns} data={rows} keyField="id" responsive persistTableHead highlightOnHover customStyles={tableStyles} />
    </div>
  )
}

/* ── DAY REVISIONS MODAL ── */
const DayRevisionsModal = ({ dateStr, revisions, onClose, onComplete }) => {
  if (!dateStr) return null
  const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1d7bff]">Revisions</p>
            <h3 className="text-base font-bold text-slate-900">{label}</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50">✕</button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-5 space-y-2.5">
          {!revisions?.length ? (
            <p className="py-6 text-center text-sm text-slate-400">No revisions for this date.</p>
          ) : revisions.map((rev) => {
            const done = rev.status === 'completed'
            const missed = rev.status === 'missed' || (rev.scheduled_date < todayStr && rev.status === 'pending')
            return (
              <div key={rev.revision_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                <div className="min-w-0">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#1d7bff]">{rev.subject_name}</span>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-800">{rev.topic_name}</p>
                  <p className="text-xs text-slate-400">{revisionLabel(rev.revision_number)} revision</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${done ? 'bg-emerald-100 text-emerald-700' : missed ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {done ? 'Done' : missed ? 'Missed' : 'Pending'}
                  </span>
                  {!done && (
                    <button onClick={() => { onClose(); onComplete(rev) }}
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                      Complete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── CALENDAR ── */
const RevisionCalendar = ({ revisions, onComplete }) => {
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState(null)
  const year = current.getFullYear(), month = current.getMonth()
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const byDate = {}
  revisions.forEach((r) => { if (!byDate[r.scheduled_date]) byDate[r.scheduled_date] = []; byDate[r.scheduled_date].push(r) })

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = firstDow - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrev - i)
    const ds = d.toISOString().slice(0, 10)
    cells.push({ ds, day: daysInPrev - i, cur: false, revs: byDate[ds] || [] })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ ds, day: d, cur: true, today: ds === todayStr, revs: byDate[ds] || [] })
  }
  const rem = 7 - (cells.length % 7)
  if (rem < 7) for (let d = 1; d <= rem; d++) {
    const nd = new Date(year, month + 1, d)
    const ds = nd.toISOString().slice(0, 10)
    cells.push({ ds, day: d, cur: false, revs: byDate[ds] || [] })
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">{monthNames[month]} {year}</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(new Date())} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Today</button>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white">‹</button>
            <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white">›</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 border-b border-slate-100 pb-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => (
          <div key={i} onClick={() => cell.revs.length && setSelected(cell.ds)}
            className={`flex min-h-[80px] flex-col rounded-xl border p-1.5 transition ${cell.cur ? cell.today ? 'border-[#1d7bff] bg-blue-50/50' : 'border-slate-100 bg-slate-50/50 hover:bg-white' : 'border-transparent opacity-35'} ${cell.revs.length ? 'cursor-pointer' : ''}`}>
            <span className={`flex h-5 w-5 items-center justify-center self-end rounded-full text-[11px] font-bold ${cell.today ? 'bg-[#1d7bff] text-white' : 'text-slate-600'}`}>{cell.day}</span>
            <div className="mt-1 space-y-0.5">
              {cell.revs.slice(0, 2).map((r) => {
                const done = r.status === 'completed'
                const missed = r.status === 'missed' || (r.scheduled_date < todayStr && r.status === 'pending')
                return (
                  <div key={r.revision_id} className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold ${done ? 'bg-emerald-100 text-emerald-800' : missed ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {r.topic_name}
                  </div>
                )
              })}
              {cell.revs.length > 2 && <p className="pl-0.5 text-[9px] font-semibold text-slate-400">+{cell.revs.length - 2}</p>}
            </div>
          </div>
        ))}
      </div>
      {selected && <DayRevisionsModal dateStr={selected} revisions={byDate[selected] || []} onClose={() => setSelected(null)} onComplete={onComplete} />}
    </div>
  )
}

/* ── MAIN DASHBOARD ── */
const Dashboard = () => {
  const [allRevisions, setAllRevisions] = useState([])
  const [allTopics, setAllTopics] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [counts, setCounts] = useState({ today: 0, upcoming: 0, missed: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')
  const [viewMode, setViewMode] = useState('table')
  const [confirmRevision, setConfirmRevision] = useState(null)
  const [subjectDetail, setSubjectDetail] = useState(null)

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [revisionsRes, topicsRes, subjectsRes] = await Promise.all([
        axios.get(REVISIONS_BASE, { headers: authHeader() }),
        axios.get(TOPICS_BASE, { headers: authHeader() }).catch(() => ({ data: [] })),
        axios.get(SUBJECTS_BASE, { headers: authHeader() }).catch(() => ({ data: [] })),
      ])
      setAllRevisions(revisionsRes.data || [])
      setAllTopics(topicsRes.data || [])
      setAllSubjects(subjectsRes.data || [])
      setCounts(deriveCounts(revisionsRes.data || []))
    } catch (err) {
      console.error('Dashboard load error', err)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAllData() }, [])

  const handleMarked = (revisionId) => {
    setAllRevisions((prev) => {
      const updated = prev.map((r) => r.revision_id === revisionId ? { ...r, status: 'completed', completed_at: new Date().toISOString() } : r)
      setCounts(deriveCounts(updated))
      if (subjectDetail) {
        const g = groupRevisions(updated)
        if (g[subjectDetail.subjectName]) setSubjectDetail({ subjectName: subjectDetail.subjectName, topicsMap: g[subjectDetail.subjectName] })
      }
      return updated
    })
    setConfirmRevision(null)
  }

  const filtered = allRevisions.filter((r) => {
    if (activeTab === 'all') return true
    if (activeTab === 'today') return r.scheduled_date === todayStr && r.status === 'pending'
    if (activeTab === 'upcoming') return r.scheduled_date > todayStr && r.status === 'pending'
    if (activeTab === 'missed') return r.scheduled_date < todayStr && r.status === 'pending'
    if (activeTab === 'completed') return r.status === 'completed'
    return true
  })

  const grouped = groupRevisions(filtered)
  const trendData = buildAreaTrend(allRevisions)
  const subjectData = buildSubjectProgress(allSubjects, allTopics)

  const TABS = [
    { key: 'today', label: 'Today', count: counts.today, color: 'text-amber-600' },
    { key: 'upcoming', label: 'Upcoming', count: counts.upcoming, color: 'text-[#1d7bff]' },
    { key: 'missed', label: 'Missed', count: counts.missed, color: 'text-rose-500' },
    { key: 'completed', label: 'Done', count: counts.completed, color: 'text-emerald-600' },
    { key: 'all', label: 'All', count: allRevisions.length, color: 'text-slate-600' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f9fd] to-[#edf4fb] p-4 sm:p-6" style={{ fontFamily: "'Inter',-apple-system,sans-serif" }}>

      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1d7bff]">Overview</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-slate-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPI row */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today" value={loading ? '—' : counts.today} bg="bg-white" accent="bg-amber-100 text-amber-600" detail="Pending today"
          icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} />
        <StatCard title="Upcoming" value={loading ? '—' : counts.upcoming} bg="bg-white" accent="bg-blue-100 text-[#1d7bff]" detail="Scheduled ahead"
          icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} />
        <StatCard title="Missed" value={loading ? '—' : counts.missed} bg="bg-white" accent="bg-rose-100 text-rose-500" detail="Need catch-up"
          icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>} />
        <StatCard title="Completed" value={loading ? '—' : counts.completed} bg="bg-white" accent="bg-emerald-100 text-emerald-600" detail="All time"
          icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
      </div>

      {/* Charts row */}
      {!loading && (
        <div className="mb-5 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1"><DonutChart counts={counts} /></div>
          <div className="lg:col-span-1"><RevisionTrendChart data={trendData} /></div>
          <div className="lg:col-span-1"><SubjectProgressChart data={subjectData} /></div>
        </div>
      )}

      {/* Revision table / calendar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm mb-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Revisions</p>
            <h2 className="mt-0.5 text-base font-bold text-slate-900">Revision Schedule</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Tab pills */}
            <div className="flex flex-wrap gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeTab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t.label}
                  <span className={`text-[10px] font-bold ${activeTab === t.key ? t.color : 'text-slate-400'}`}>{t.count}</span>
                </button>
              ))}
            </div>
            {/* View toggle */}
            <div className="flex rounded-xl border border-slate-100 bg-slate-50 p-1">
              <button onClick={() => setViewMode('table')}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${viewMode === 'table' ? 'bg-white shadow-sm text-[#1d7bff]' : 'text-slate-400 hover:text-slate-600'}`}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              </button>
              <button onClick={() => setViewMode('calendar')}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${viewMode === 'calendar' ? 'bg-white shadow-sm text-[#1d7bff]' : 'text-slate-400 hover:text-slate-600'}`}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[#1d7bff]" />
          </div>
        ) : viewMode === 'table' ? (
          <SubjectTable grouped={grouped} onOpen={(name, map) => setSubjectDetail({ subjectName: name, topicsMap: map })} />
        ) : (
          <RevisionCalendar revisions={allRevisions} onComplete={setConfirmRevision} />
        )}
      </div>

      <SubjectDetailModal detail={subjectDetail} onClose={() => setSubjectDetail(null)} onComplete={setConfirmRevision} />
      {confirmRevision && <CompleteModal revision={confirmRevision} onClose={() => setConfirmRevision(null)} onDone={handleMarked} />}
    </div>
  )
}

export default Dashboard
