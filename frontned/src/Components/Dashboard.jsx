import { useEffect, useState } from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'
import DataTable from 'react-data-table-component'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

const REVISIONS_BASE = '/api/V1/revisions/'
const TOPICS_BASE = '/api/V1/topics/'
const SUBJECTS_BASE = '/api/V1/subjects/'

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

// Simple Chart Data Generators
const buildDailyRevisionTrend = (revisions) => {
  const dateMap = {}

  revisions.forEach((rev) => {
    if (rev.status === 'completed' && rev.completed_at) {
      const dateStr = rev.completed_at.slice(0, 10)
      if (!dateMap[dateStr]) dateMap[dateStr] = 0
      dateMap[dateStr] += 1
    }
  })

  const sortedDates = Object.keys(dateMap).sort()

  if (sortedDates.length === 0) {
    return [{ name: 'Today', Completed: 0 }]
  }

  return sortedDates.map((d) => {
    const formattedLabel = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return {
      name: formattedLabel,
      Completed: dateMap[d],
    }
  })
}

const buildSubjectTopicsProgress = (subjects, topics) => {
  if (!subjects.length) return []

  return subjects.map((subj) => {
    const subjTopics = topics.filter((t) => t.subject === subj.subject_id)
    const completed = subjTopics.filter((t) => t.status === 'completed').length
    const pending = subjTopics.filter((t) => t.status !== 'completed').length

    return {
      name: subj.name,
      Completed: completed,
      Pending: pending,
    }
  })
}

const CompleteModal = ({ revision, onClose, onDone }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const confirm = async () => {
    setLoading(true)
    setError(null)

    try {
      await axios.post(`${REVISIONS_BASE}${revision.revision_id}/complete/`, {}, { headers: authHeader() })
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

const DayRevisionsModal = ({ dateStr, revisions, onClose, onComplete }) => {
  if (!dateStr) return null

  const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d7bff]">Scheduled Revisions</p>
            <h3 className="text-lg font-bold text-slate-900">{dateFormatted}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {!revisions || revisions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No revisions scheduled for this date.</p>
          ) : (
            <div className="space-y-3">
              {revisions.map((rev) => {
                const isCompleted = rev.status === 'completed'
                const isMissed = rev.status === 'missed' || (rev.scheduled_date < todayStr && rev.status === 'pending')

                return (
                  <div
                    key={rev.revision_id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[#1d7bff]/10 px-2 py-0.5 text-xs font-semibold text-[#1d7bff]">
                          {rev.subject_name}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          {revisionLabel(rev.revision_number)} Revision
                        </span>
                      </div>
                      <h4 className="mt-1 truncate font-semibold text-slate-800">{rev.topic_name}</h4>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : isMissed
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isCompleted ? 'Completed' : isMissed ? 'Missed' : 'Pending'}
                      </span>

                      {!isCompleted && (
                        <button
                          onClick={() => {
                            onClose()
                            onComplete(rev)
                          }}
                          className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const RevisionCalendar = ({ revisions, onComplete }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const resetToday = () => setCurrentDate(new Date())

  // Map revisions by YYYY-MM-DD
  const revisionsByDate = {}
  revisions.forEach((rev) => {
    if (!revisionsByDate[rev.scheduled_date]) {
      revisionsByDate[rev.scheduled_date] = []
    }
    revisionsByDate[rev.scheduled_date].push(rev)
  })

  // Calculate calendar days
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const calendarDays = []

  // Previous month padding days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i
    const prevDate = new Date(year, month - 1, dayNum)
    const dateStr = prevDate.toISOString().slice(0, 10)
    calendarDays.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
      revisions: revisionsByDate[dateStr] || [],
    })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarDays.push({
      dateStr: dStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dStr === todayStr,
      revisions: revisionsByDate[dStr] || [],
    })
  }

  // Next month padding days to complete grid (multiples of 7)
  const remaining = 7 - (calendarDays.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d)
      const dateStr = nextDate.toISOString().slice(0, 10)
      calendarDays.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        revisions: revisionsByDate[dateStr] || [],
      })
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_rgba(148,163,184,0.12)]">
      {/* Calendar Controls */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{monthNames[month]} {year}</h3>
          <p className="mt-0.5 text-xs text-slate-400">Click any day to view scheduled revisions</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetToday}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
              title="Previous Month"
            >
              ‹
            </button>
            <button
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
              title="Next Month"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 border-b border-slate-100 pb-2 text-center text-xs font-bold text-slate-400">
        <div>SUN</div>
        <div>MON</div>
        <div>TUE</div>
        <div>WED</div>
        <div>THU</div>
        <div>FRI</div>
        <div>SAT</div>
      </div>

      {/* Grid of Days */}
      <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
        {calendarDays.map((cell, idx) => {
          const hasRevisions = cell.revisions.length > 0

          return (
            <div
              key={`${cell.dateStr}-${idx}`}
              onClick={() => hasRevisions && setSelectedDate(cell.dateStr)}
              className={`group flex min-h-[90px] flex-col justify-between rounded-2xl border p-2 transition ${
                cell.isCurrentMonth
                  ? cell.isToday
                    ? 'border-[#1d7bff] bg-blue-50/40 shadow-sm'
                    : 'border-slate-100 bg-slate-50/40 hover:border-slate-300 hover:bg-white'
                  : 'border-slate-100/50 bg-slate-50/10 opacity-40'
              } ${hasRevisions ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    cell.isToday
                      ? 'bg-[#1d7bff] text-white shadow-sm'
                      : cell.isCurrentMonth
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {cell.dayNum}
                </span>

                {hasRevisions && (
                  <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {cell.revisions.length}
                  </span>
                )}
              </div>

              {/* Revision chips preview */}
              <div className="mt-1 space-y-1">
                {cell.revisions.slice(0, 2).map((rev) => {
                  const isDone = rev.status === 'completed'
                  const isMissed = rev.status === 'missed' || (rev.scheduled_date < todayStr && rev.status === 'pending')

                  return (
                    <div
                      key={rev.revision_id}
                      className={`truncate rounded-lg px-1.5 py-0.5 text-[10px] font-semibold ${
                        isDone
                          ? 'bg-emerald-100/90 text-emerald-800'
                          : isMissed
                          ? 'bg-rose-100/90 text-rose-800'
                          : 'bg-amber-100/90 text-amber-800'
                      }`}
                      title={`${rev.subject_name}: ${rev.topic_name}`}
                    >
                      {rev.topic_name}
                    </div>
                  )
                })}
                {cell.revisions.length > 2 && (
                  <p className="pl-1 text-[9px] font-semibold text-slate-400">
                    +{cell.revisions.length - 2} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Day Details Modal */}
      {selectedDate && (
        <DayRevisionsModal
          dateStr={selectedDate}
          revisions={revisionsByDate[selectedDate] || []}
          onClose={() => setSelectedDate(null)}
          onComplete={onComplete}
        />
      )}
    </div>
  )
}

const StatCard = ({ title, value, accent, detail, icon }) => (
  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[12px_0_35px_rgba(148,163,184,0.08)]">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">{value}</h3>
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accent}`}>
        {icon}
      </div>
    </div>
    <p className="mt-3 text-sm leading-6 text-slate-400">{detail}</p>
  </div>
)

// Simplified Clean Analytics Component
const AnalyticsSection = ({ revisionTrendData, subjectProgressData }) => {
  const hasRevisionData = revisionTrendData && revisionTrendData.length > 0 && revisionTrendData.some((d) => d.Completed > 0)
  const hasSubjectData = subjectProgressData && subjectProgressData.length > 0

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Chart 1: Daily Completed Revisions Bar Chart */}
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_55px_rgba(148,163,184,0.12)]">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Daily Progress</p>
          <h3 className="text-lg font-bold text-slate-900">Revisions Completed</h3>
        </div>

        <div className="h-60 w-full">
          {hasRevisionData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revisionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}
                  formatter={(val) => [`${val} Revisions`, 'Completed']}
                />
                <Bar dataKey="Completed" fill="#10b981" radius={[8, 8, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="mt-3 font-semibold text-slate-700">No completed revisions yet</p>
              <p className="mt-1 text-xs text-slate-400">Complete scheduled revisions to start tracking daily progress.</p>
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Topics Completed per Subject Bar Chart */}
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_55px_rgba(148,163,184,0.12)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1d7bff]">Subject Overview</p>
            <h3 className="text-lg font-bold text-slate-900">Topics Status</h3>
          </div>
          {hasSubjectData && (
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Completed
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Pending
              </span>
            </div>
          )}
        </div>

        <div className="h-60 w-full">
          {hasSubjectData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-[#1d7bff]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <p className="mt-3 font-semibold text-slate-700">No subjects or topics found</p>
              <p className="mt-1 text-xs text-slate-400">Add subjects and topics to view subject progress charts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const Dashboard = () => {
  const [allRevisions, setAllRevisions] = useState([])
  const [allTopics, setAllTopics] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [counts, setCounts] = useState({ today: 0, upcoming: 0, missed: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')
  const [viewMode, setViewMode] = useState('table') // 'table' or 'calendar'
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
      console.error('Failed to load dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
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

  const revisionTrendData = buildDailyRevisionTrend(allRevisions)
  const subjectProgressData = buildSubjectTopicsProgress(allSubjects, allTopics)

  return (
    <div className="min-h-screen space-y-5 bg-[linear-gradient(180deg,#f5f9fd_0%,#edf4fb_100%)] p-4 sm:p-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's Revisions"
          value={loading ? '...' : counts.today}
          accent="bg-amber-100 text-amber-600"
          detail="Pending revisions due today."
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          title="Upcoming"
          value={loading ? '...' : counts.upcoming}
          accent="bg-blue-100 text-[#1d7bff]"
          detail="Scheduled for future dates."
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <StatCard
          title="Missed"
          value={loading ? '...' : counts.missed}
          accent="bg-rose-100 text-rose-600"
          detail="Past revisions not completed."
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
        <StatCard
          title="Completed"
          value={loading ? '...' : counts.completed}
          accent="bg-emerald-100 text-emerald-600"
          detail="Total revisions finished."
          icon={
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
      </div>

      {/* Simple Analytics Charts Section */}
      {!loading && (
        <AnalyticsSection
          revisionTrendData={revisionTrendData}
          subjectProgressData={subjectProgressData}
        />
      )}

      {/* Controls Bar */}
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-4 shadow-[0_20px_55px_rgba(148,163,184,0.12)] backdrop-blur sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Overview</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Revision Dashboard</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Dropdown Filter */}
            <div className="relative">
              <label htmlFor="revision-filter" className="sr-only">Filter Revisions</label>
              <select
                id="revision-filter"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-[#1d7bff] focus:outline-none focus:ring-2 focus:ring-[#1d7bff]/20"
              >
                <option value="all">All Revisions ({allRevisions.length})</option>
                <option value="today">Today ({counts.today})</option>
                <option value="upcoming">Upcoming ({counts.upcoming})</option>
                <option value="missed">Missed ({counts.missed})</option>
                <option value="completed">Completed ({counts.completed})</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'table' ? 'bg-white text-[#1d7bff] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'calendar' ? 'bg-white text-[#1d7bff] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Calendar View
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1d7bff]" />
        </div>
      ) : viewMode === 'table' ? (
        <SubjectTable grouped={grouped} onOpen={openSubjectDetail} />
      ) : (
        <RevisionCalendar revisions={allRevisions} onComplete={setConfirmRevision} />
      )}

      <SubjectDetailModal detail={subjectDetail} onClose={() => setSubjectDetail(null)} onComplete={setConfirmRevision} />

      {confirmRevision && (
        <CompleteModal revision={confirmRevision} onClose={() => setConfirmRevision(null)} onDone={handleMarked} />
      )}
    </div>
  )
}

export default Dashboard
