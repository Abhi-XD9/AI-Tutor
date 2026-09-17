import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Cookies from 'js-cookie'

const TOPICS_URL = '/api/V1/topics/'
const SUBJECTS_URL = '/api/V1/subjects/'
const authHeader = () => ({ Authorization: `Bearer ${Cookies.get('token')}` })

const difficultyConfig = {
  easy:   { label: 'Easy',   color: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' },
  medium: { label: 'Medium', color: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' },
  hard:   { label: 'Hard',   color: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' },
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#1d7bff] focus:bg-white focus:ring-2 focus:ring-blue-100'
const emptyCreateForm = { subject: '', title: '', description: '', difficulty: 'easy', estimated_time: 30 }

const parseError = (error) => {
  const data = error?.response?.data
  if (!data) return 'Something went wrong.'
  if (typeof data === 'object') return Object.values(data).flat().filter(Boolean).join(' ')
  return 'Something went wrong.'
}

/* ── Icons ── */
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
)
const EditIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
  </svg>
)
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
)
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)

/* ── Modals ── */
const AddTopicModal = ({ form, subjects, lockedSubjectId, submitting, error, onChange, onClose, onSubmit }) => {
  const selectedSubject = subjects.find((s) => String(s.subject_id) === String(form.subject))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <h3 className="mb-5 text-lg font-semibold text-slate-900">Add Topic</h3>
        {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
        <div className="space-y-4">
          {lockedSubjectId ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Subject</label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700">
                {selectedSubject?.name || `Subject ${lockedSubjectId}`}
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Subject</label>
              <select name="subject" value={form.subject} onChange={onChange} className={inputCls}>
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Title</label>
            <input name="title" value={form.title} onChange={onChange} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Description</label>
            <textarea name="description" rows={3} value={form.description} onChange={onChange} className={inputCls} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Difficulty</label>
              <select name="difficulty" value={form.difficulty} onChange={onChange} className={inputCls}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Est. Time (min)</label>
              <input name="estimated_time" type="number" min={1} value={form.estimated_time} onChange={onChange} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={onSubmit} disabled={submitting} className="rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {submitting ? 'Saving...' : 'Add Topic'}
          </button>
        </div>
      </div>
    </div>
  )
}

const EditModal = ({ topic, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: topic.title,
    description: topic.description || '',
    difficulty: topic.difficulty,
    estimated_time: topic.estimated_time,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await axios.patch(`${TOPICS_URL}${topic.topic_id}/`, form, { headers: authHeader() })
      onSaved(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update topic.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <h3 className="mb-5 text-lg font-semibold text-slate-900">Edit Topic</h3>
        {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Title</label>
            <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Description</label>
            <textarea className={inputCls} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Difficulty</label>
              <select className={inputCls} value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Est. Time (min)</label>
              <input type="number" min={1} className={inputCls} value={form.estimated_time} onChange={e => setForm(f => ({ ...f, estimated_time: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const MarkCompleteModal = ({ topic, onClose, onMarked }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleConfirm = async () => {
    setLoading(true); setError(null)
    try {
      await axios.post(`${TOPICS_URL}${topic.topic_id}/mark_completed/`, {}, { headers: authHeader() })
      onMarked(topic.topic_id)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as completed.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckIcon />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Mark as Completed?</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              Mark <span className="font-semibold text-slate-700">"{topic.title}"</span> as completed? This will also schedule it for revision.
            </p>
          </div>
        </div>
        {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={loading} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Marking...' : 'Yes, Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  )
}

const DeleteModal = ({ topic, onClose, onDeleted }) => {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await axios.delete(`${TOPICS_URL}${topic.topic_id}/`, { headers: authHeader() })
      onDeleted(topic.topic_id)
    } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <h3 className="text-lg font-semibold text-slate-900">Delete Topic</h3>
        <p className="mt-2 text-sm text-slate-500">
          Are you sure you want to delete <span className="font-semibold text-slate-700">"{topic.title}"</span>? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Topic Card ── */
const TopicCard = ({ topic, onEdit, onDelete, onComplete }) => {
  const navigate = useNavigate()
  const isCompleted = topic.status === 'completed'
  const diff = difficultyConfig[topic.difficulty] || difficultyConfig.easy

  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60">
      {/* Completed pill */}
      {isCompleted && (
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 ring-1 ring-emerald-200">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Done
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-start gap-3 pr-16">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${isCompleted ? 'bg-emerald-400' : 'bg-[#1d7bff]'}`} />
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug text-slate-900 line-clamp-2">{topic.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-400 line-clamp-2">
            {topic.description || 'No description provided.'}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${diff.color}`}>
          {diff.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
          <ClockIcon />
          {topic.estimated_time}m
        </span>
      </div>

      {/* Divider */}
      <div className="mb-4 border-t border-slate-100" />

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onComplete(topic)}
            disabled={isCompleted}
            title="Mark as completed"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              isCompleted
                ? 'cursor-not-allowed bg-emerald-50 text-emerald-400'
                : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'
            }`}
          >
            <CheckIcon />
          </button>
          <button
            onClick={() => onEdit(topic)}
            title="Edit topic"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition hover:bg-blue-50 hover:text-[#1d7bff]"
          >
            <EditIcon />
          </button>
          <button
            onClick={() => onDelete(topic)}
            title="Delete topic"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
          >
            <TrashIcon />
          </button>
        </div>

        {/* View button → navigates to Documents */}
        <button
          onClick={() => navigate(`/subjects/topics/documents?topicId=${topic.topic_id}`)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d7bff] px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 active:scale-95"
        >
          View
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  )
}

/* ── Main Component ── */
const Topics = () => {
  const [topics, setTopics] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editTopic, setEditTopic] = useState(null)
  const [deleteTopic, setDeleteTopic] = useState(null)
  const [completeTopic, setCompleteTopic] = useState(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [createError, setCreateError] = useState(null)
  const [creating, setCreating] = useState(false)
  const location = useLocation()
  const subjectId = new URLSearchParams(location.search).get('subjectId')
  const selectedSubject = subjects.find((s) => String(s.subject_id) === String(subjectId))

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setError(null)
      try {
        const [topicsRes, subjectsRes] = await Promise.all([
          axios.get(TOPICS_URL, { headers: authHeader() }),
          axios.get(SUBJECTS_URL, { headers: authHeader() }),
        ])
        setSubjects(subjectsRes.data)
        setTopics(subjectId ? topicsRes.data.filter((t) => String(t.subject) === subjectId) : topicsRes.data)
      } catch { setError('Failed to load topics.') }
      finally { setLoading(false) }
    }
    fetchData()
  }, [subjectId])

  const openAddModal = () => {
    setCreateError(null)
    setCreateForm({ ...emptyCreateForm, subject: subjectId || '' })
    setIsAddOpen(true)
  }
  const closeAddModal = () => {
    setIsAddOpen(false); setCreateError(null); setCreateForm(emptyCreateForm)
  }
  const handleCreateChange = (e) => {
    const { name, value } = e.target
    setCreateForm((f) => ({ ...f, [name]: name === 'estimated_time' ? Number(value) : value }))
  }
  const handleCreateTopic = async () => {
    if (!createForm.subject) { setCreateError('Please select a subject.'); return }
    if (!createForm.title.trim()) { setCreateError('Please enter a topic title.'); return }
    setCreating(true); setCreateError(null)
    try {
      const res = await axios.post(TOPICS_URL, createForm, { headers: authHeader() })
      const created = res.data
      setTopics((cur) => (!subjectId || String(created.subject) === subjectId ? [created, ...cur] : cur))
      closeAddModal()
    } catch (err) { setCreateError(parseError(err)) }
    finally { setCreating(false) }
  }

  const completedCount = topics.filter((t) => t.status === 'completed').length

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f9fd] to-[#edf4fb] p-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#1d7bff]">Learning Path</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {subjectId ? selectedSubject?.name || 'Topics' : 'All Topics'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {subjectId
                ? `Topics for ${selectedSubject?.name || `subject ${subjectId}`}`
                : 'Browse and manage all your topics.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openAddModal}
              disabled={!subjects.length}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1d7bff] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Topic
            </button>
            <Link
              to="/subjects"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Back to Subjects
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        {!loading && !error && topics.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Total Topics',  value: topics.length,                    color: 'text-slate-900' },
              { label: 'Completed',     value: completedCount,                   color: 'text-emerald-600' },
              { label: 'Remaining',     value: topics.length - completedCount,   color: 'text-[#1d7bff]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-3 shadow-sm">
                <span className={`text-2xl font-bold ${color}`}>{value}</span>
                <span className="text-sm font-medium text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1d7bff]" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
      ) : !topics.length ? (
        <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#1d7bff]">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-900">No topics yet</p>
          <p className="mt-1 text-sm text-slate-500">Create your first topic to get started on your learning journey.</p>
          <button
            type="button"
            onClick={openAddModal}
            disabled={!subjects.length}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add First Topic
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {topics.map((topic) => (
            <TopicCard
              key={topic.topic_id}
              topic={topic}
              onEdit={setEditTopic}
              onDelete={setDeleteTopic}
              onComplete={setCompleteTopic}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {isAddOpen && (
        <AddTopicModal
          form={createForm}
          subjects={subjects}
          lockedSubjectId={subjectId}
          submitting={creating}
          error={createError}
          onChange={handleCreateChange}
          onClose={closeAddModal}
          onSubmit={handleCreateTopic}
        />
      )}
      {editTopic && (
        <EditModal
          topic={editTopic}
          onClose={() => setEditTopic(null)}
          onSaved={(updated) => {
            setTopics(ts => ts.map(t => t.topic_id === updated.topic_id ? updated : t))
            setEditTopic(null)
          }}
        />
      )}
      {deleteTopic && (
        <DeleteModal
          topic={deleteTopic}
          onClose={() => setDeleteTopic(null)}
          onDeleted={(id) => {
            setTopics(ts => ts.filter(t => t.topic_id !== id))
            setDeleteTopic(null)
          }}
        />
      )}
      {completeTopic && (
        <MarkCompleteModal
          topic={completeTopic}
          onClose={() => setCompleteTopic(null)}
          onMarked={(id) => {
            setTopics(ts => ts.map(t => t.topic_id === id ? { ...t, status: 'completed' } : t))
            setCompleteTopic(null)
          }}
        />
      )}
    </div>
  )
}

export default Topics
