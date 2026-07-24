import { useEffect, useState } from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'
import DataTable from 'react-data-table-component'

const BASE = '/api/V1/revisions'
const authHeader = () => ({ Authorization: `Bearer ${Cookies.get('token')}` })

const revisionLabel = (n) => ({ 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' }[n] ?? `${n}th`)
const todayStr = new Date().toISOString().slice(0, 10)

const tableStyles = {
  table: {
    style: {
      backgroundColor: 'transparent',
    },
  },
  headRow: {
    style: {
      minHeight: '60px',
      borderBottomWidth: '1px',
      borderBottomColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
    },
  },
  headCells: {
    style: {
      color: '#94a3b8',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.16em',
      whiteSpace: 'nowrap',
    },
  },
  rows: {
    style: {
      minHeight: '82px',
      borderBottomColor: '#f1f5f9',
      backgroundColor: '#ffffff',
    },
  },
  cells: {
    style: {
      paddingTop: '16px',
      paddingBottom: '16px',
      color: '#334155',
      fontSize: '14px',
    },
  },
}

const groupRevisions = (list) => {
  const map = {}
  list.forEach((revision) => {
    if (!map[revision.subject_name]) map[revision.subject_name] = {}
    if (!map[revision.subject_name][revision.topic_name]) map[revision.subject_name][revision.topic_name] = []
    map[revision.subject_name][revision.topic_name].push(revision)
  })

  Object.values(map).forEach((topics) =>
    Object.values(topics).forEach((revisions) =>
      revisions.sort((a, b) => a.revision_number - b.revision_number)
    )
  )

  return map
}

const deriveCounts = (list) => ({
  today: list.filter((revision) => revision.scheduled_date === todayStr && revision.status === 'pending').length,
  upcoming: list.filter((revision) => revision.scheduled_date > todayStr && revision.status === 'pending').length,
  missed: list.filter((revision) => revision.scheduled_date < todayStr && revision.status === 'pending').length,
  completed: list.filter((revision) => revision.status === 'completed').length,
})

const getSubjectDueDate = (revisions) => {
  const pendingDates = revisions
    .filter((revision) => revision.status !== 'completed')
    .map((revision) => revision.scheduled_date)
    .sort()

  if (pendingDates.length > 0) return pendingDates[0]

  const allDates = revisions.map((revision) => revision.scheduled_date).sort()
  return allDates[0] || '--'
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
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
  const prevRevisions = allTopicRevisions.filter((item) => item.revision_number < revision.revision_number)
  const prevIncomplete = prevRevisions.some((item) => item.status !== 'completed')
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
  const completed = revisions.filter((revision) => revision.status === 'completed').length
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
        {revisions.map((revision) => (
          <RevisionChip key={revision.revision_id} revision={revision} allTopicRevisions={revisions} onComplete={onComplete} />
        ))}
      </div>
    </div>
  )
}

const EyeButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-[#1d7bff] hover:text-[#1d7bff]"
    title="View revisions"
  >
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </button>
)

const SubjectDetailModal = ({ detail, onClose, onComplete }) => {
  if (!detail) return null

  const allRevisions = Object.values(detail.topicsMap).flat()
  const completed = allRevisions.filter((revision) => revision.status === 'completed').length
  const total = allRevisions.length
  const dueDate = getSubjectDueDate(allRevisions)

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm">
      <div className="mx-auto flex h-screen w-full max-w-6xl flex-col bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Subject Details</p>
            <h3 className="mt-1 truncate text-2xl font-semibold tracking-[-0.03em] text-slate-900">{detail.subjectName}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {Object.keys(detail.topicsMap).length} topics / {total} revisions / Due {dueDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 border-b border-slate-200 bg-white/70 px-5 py-4 sm:grid-cols-3 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Topics</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{Object.keys(detail.topicsMap).length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Completed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{completed}/{total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Next Due</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{dueDate}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="space-y-4">
            {Object.entries(detail.topicsMap).map(([topicName, revisions]) => (
              <TopicRow key={topicName} topicName={topicName} revisions={revisions} onComplete={onComplete} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const SubjectTable = ({ grouped, onOpen }) => {
  const subjectRows = Object.entries(grouped).map(([subjectName, topicsMap]) => {
    const allRevisions = Object.values(topicsMap).flat()
    const completed = allRevisions.filter((revision) => revision.status === 'completed').length
    const pending = allRevisions.filter((revision) => revision.status === 'pending').length

    return {
      id: subjectName,
      subjectName,
      topicsMap,
      topicsCount: Object.keys(topicsMap).length,
      revisionsCount: allRevisions.length,
      completed,
      pending,
      dueDate: getSubjectDueDate(allRevisions),
      progress: allRevisions.length ? Math.round((completed / allRevisions.length) * 100) : 0,
    }
  })

  if (!subjectRows.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
        <p className="font-semibold text-slate-700">No subjects found</p>
        <p className="mt-1 text-sm text-slate-400">There are no revisions in this filter right now.</p>
      </div>
    )
  }

  const columns = [
    {
      name: 'Subject',
      minWidth: '240px',
      grow: 2,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3 py-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d7bff] text-sm font-bold text-white shadow-[0_12px_24px_rgba(29,123,255,0.25)]">
            {row.subjectName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-900">{row.subjectName}</p>
            <p className="mt-1 text-xs text-slate-400">{row.topicsCount} topics / {row.revisionsCount} revisions</p>
          </div>
        </div>
      ),
    },
    {
      name: 'Topics',
      width: '96px',
      center: true,
      cell: (row) => <span className="text-sm font-semibold text-slate-700">{row.topicsCount}</span>,
    },
    {
      name: 'Revisions',
      width: '110px',
      center: true,
      cell: (row) => <span className="text-sm font-semibold text-slate-700">{row.revisionsCount}</span>,
    },
    {
      name: 'Due Date',
      minWidth: '130px',
      center: true,
      cell: (row) => <span className="text-sm font-semibold text-slate-700">{row.dueDate}</span>,
    },
    {
      name: 'Progress',
      minWidth: '180px',
      cell: (row) => (
        <div className="flex w-full min-w-[150px] items-center gap-3">
          <span className="w-10 shrink-0 text-sm font-semibold text-slate-700">{row.progress}%</span>
          <div className="h-2 flex-1 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#1d7bff] transition-all" style={{ width: `${row.progress}%` }} />
          </div>
        </div>
      ),
    },
    {
      name: 'Pending',
      width: '110px',
      center: true,
      cell: (row) => <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{row.pending}</span>,
    },
    {
      name: 'View',
      width: '90px',
      center: true,
      cell: (row) => <EyeButton onClick={() => onOpen(row.subjectName, row.topicsMap)} />,
    },
  ]

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(148,163,184,0.12)]">
      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          data={subjectRows}
          keyField="id"
          responsive
          persistTableHead
          highlightOnHover
          customStyles={tableStyles}
        />
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

const TABS = ['today', 'upcoming', 'missed', 'completed', 'all']
const TAB_LABELS = { all: 'All', today: 'Today', upcoming: 'Upcoming', missed: 'Missed', completed: 'Completed' }
const TAB_ACCENT = {
  all: 'bg-slate-100 text-slate-600',
  today: 'bg-amber-100 text-amber-700',
  upcoming: 'bg-blue-100 text-[#1d7bff]',
  missed: 'bg-rose-100 text-[#ff6f7d]',
  completed: 'bg-emerald-100 text-emerald-700',
}

const Dashboard = () => {
  const [allRevisions, setAllRevisions] = useState([])
  const [counts, setCounts] = useState({ today: 0, upcoming: 0, missed: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')
  const [confirmRevision, setConfirmRevision] = useState(null)
  const [subjectDetail, setSubjectDetail] = useState(null)

  const fetchAll = async () => {
    setLoading(true)

    try {
      const response = await axios.get(`${BASE}/`, { headers: authHeader() })
      setAllRevisions(response.data)
      setCounts(deriveCounts(response.data))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleMarked = (revisionId) => {
    setAllRevisions((previous) => {
      const updated = previous.map((revision) => (
        revision.revision_id === revisionId
          ? { ...revision, status: 'completed', completed_at: new Date().toISOString() }
          : revision
      ))

      setCounts(deriveCounts(updated))

      if (subjectDetail) {
        const groupedUpdated = groupRevisions(updated)
        if (groupedUpdated[subjectDetail.subjectName]) {
          setSubjectDetail({
            subjectName: subjectDetail.subjectName,
            topicsMap: groupedUpdated[subjectDetail.subjectName],
          })
        }
      }

      return updated
    })

    setConfirmRevision(null)
  }

  const filtered = allRevisions.filter((revision) => {
    if (activeTab === 'all') return true
    if (activeTab === 'today') return revision.scheduled_date === todayStr && revision.status === 'pending'
    if (activeTab === 'upcoming') return revision.scheduled_date > todayStr && revision.status === 'pending'
    if (activeTab === 'missed') return revision.scheduled_date < todayStr && revision.status === 'pending'
    if (activeTab === 'completed') return revision.status === 'completed'
    return true
  })

  const grouped = groupRevisions(filtered)

  const openSubjectDetail = (subjectName, topicsMap) => {
    setSubjectDetail({ subjectName, topicsMap })
  }

  return (
    <div className="min-h-screen space-y-5 bg-[linear-gradient(180deg,#f5f9fd_0%,#edf4fb_100%)] p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's Revisions" value={loading ? '...' : counts.today} accent="bg-amber-400/15" detail="Pending revisions due today." />
        <StatCard title="Upcoming" value={loading ? '...' : counts.upcoming} accent="bg-blue-400/15" detail="Scheduled for future dates." />
        <StatCard title="Missed" value={loading ? '...' : counts.missed} accent="bg-rose-400/15" detail="Past revisions not completed." />
        <StatCard title="Completed" value={loading ? '...' : counts.completed} accent="bg-emerald-400/15" detail="Total revisions finished." />
      </div>

      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-4 shadow-[0_20px_55px_rgba(148,163,184,0.12)] backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Revision Dashboard</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Subjects Summary</h2>
            <p className="mt-2 text-sm text-slate-500">Showing subjects in a cleaner list, with revision details available from the eye icon.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab ? `${TAB_ACCENT[tab]} shadow-sm` : 'bg-slate-100/70 text-slate-500 hover:bg-slate-100'
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
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1d7bff]" />
        </div>
      ) : (
        <SubjectTable grouped={grouped} onOpen={openSubjectDetail} />
      )}

      <SubjectDetailModal detail={subjectDetail} onClose={() => setSubjectDetail(null)} onComplete={setConfirmRevision} />

      {confirmRevision && (
        <CompleteModal revision={confirmRevision} onClose={() => setConfirmRevision(null)} onDone={handleMarked} />
      )}
    </div>
  )
}

export default Dashboard
