import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import Cookies from 'js-cookie'

const TOPICS_URL = '/api/V1/topics/'
const SUBJECTS_URL = '/api/V1/subjects/'
const authHeader = () => ({ Authorization: `Bearer ${Cookies.get('token')}` })

const difficultyConfig = {
  easy: { label: 'Easy', color: 'bg-emerald-100 text-emerald-700' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  hard: { label: 'Hard', color: 'bg-rose-100 text-rose-700' },
}

const inputCls = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#1d7bff]'
const emptyCreateForm = { subject: '', title: '', description: '', difficulty: 'easy', estimated_time: 30 }

const parseError = (error) => {
  const data = error?.response?.data
  if (!data) return 'Something went wrong.'
  if (typeof data === 'object') return Object.values(data).flat().filter(Boolean).join(' ')
  return 'Something went wrong.'
}

const AddTopicModal = ({ form, subjects, lockedSubjectId, submitting, error, onChange, onClose, onSubmit }) => {
  const selectedSubject = subjects.find((subject) => String(subject.subject_id) === String(form.subject))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
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
                {subjects.map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.name}
                  </option>
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
            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={onChange}
              className={inputCls}
            />
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
              <input
                name="estimated_time"
                type="number"
                min={1}
                value={form.estimated_time}
                onChange={onChange}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
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
    setSaving(true)
    setError(null)
    try {
      const res = await axios.patch(`${TOPICS_URL}${topic.topic_id}/`, form, { headers: authHeader() })
      onSaved(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update topic.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
        <h3 className="mb-5 text-lg font-semibold text-slate-900">Edit Topic</h3>
        {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Title</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1d7bff]"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Description</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1d7bff]"
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Difficulty</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1d7bff]"
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Est. Time (min)</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1d7bff]"
                value={form.estimated_time}
                onChange={e => setForm(f => ({ ...f, estimated_time: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60">
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
    setLoading(true)
    setError(null)
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
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
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
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={loading}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60">
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
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
        <h3 className="text-lg font-semibold text-slate-900">Delete Topic</h3>
        <p className="mt-2 text-sm text-slate-500">
          Are you sure you want to delete <span className="font-semibold text-slate-700">"{topic.title}"</span>? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-60">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const selectedSubject = subjects.find((subject) => String(subject.subject_id) === String(subjectId))

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [topicsRes, subjectsRes] = await Promise.all([
          axios.get(TOPICS_URL, { headers: authHeader() }),
          axios.get(SUBJECTS_URL, { headers: authHeader() }),
        ])
        const allTopics = topicsRes.data
        setSubjects(subjectsRes.data)
        setTopics(subjectId ? allTopics.filter((topic) => String(topic.subject) === subjectId) : allTopics)
      } catch {
        setError('Failed to load topics.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [subjectId])

  const openAddModal = () => {
    setCreateError(null)
    setCreateForm({ ...emptyCreateForm, subject: subjectId || '' })
    setIsAddOpen(true)
  }

  const closeAddModal = () => {
    setIsAddOpen(false)
    setCreateError(null)
    setCreateForm(emptyCreateForm)
  }

  const handleCreateChange = (e) => {
    const { name, value } = e.target
    setCreateForm((current) => ({
      ...current,
      [name]: name === 'estimated_time' ? Number(value) : value,
    }))
  }

  const handleCreateTopic = async () => {
    if (!createForm.subject) {
      setCreateError('Please select a subject.')
      return
    }
    if (!createForm.title.trim()) {
      setCreateError('Please enter a topic title.')
      return
    }

    setCreating(true)
    setCreateError(null)
    try {
      const res = await axios.post(TOPICS_URL, createForm, { headers: authHeader() })
      const createdTopic = res.data
      setTopics((current) => (
        !subjectId || String(createdTopic.subject) === subjectId
          ? [createdTopic, ...current]
          : current
      ))
      closeAddModal()
    } catch (err) {
      setCreateError(parseError(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f9fd_0%,#edf4fb_100%)] p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Topics</h2>
          <p className="mt-2 text-sm text-slate-500">
            {subjectId ? `Showing topics for ${selectedSubject?.name || `subject ${subjectId}`}.` : 'Browse all topics.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openAddModal}
            disabled={!subjects.length}
            className="inline-flex items-center justify-center rounded-xl bg-[#1d7bff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Topic
          </button>
          <Link to="/subjects" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Back to subjects
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-500" />
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
      ) : !topics.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          <p className="text-lg font-semibold text-slate-900">No topics found.</p>
          <p className="mt-2 text-sm">Create your first topic from here.</p>
          <button
            type="button"
            onClick={openAddModal}
            disabled={!subjects.length}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Topic
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {topics.map((topic) => (
            <div key={topic.topic_id} className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">{topic.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{topic.description || 'No description'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setCompleteTopic(topic)}
                    disabled={topic.status === 'completed'}
                    style={{
                      cursor: topic.status === 'completed' ? 'not-allowed' : 'pointer',
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 transition hover:bg-emerald-100"
                    title="Mark as completed"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setEditTopic(topic)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#1d7bff] transition hover:bg-blue-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteTopic(topic)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition hover:bg-rose-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${difficultyConfig[topic.difficulty]?.color}`}>
                  {difficultyConfig[topic.difficulty]?.label}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${topic.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {topic.status}
                </span>
                <span className="ml-auto rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {topic.estimated_time}m
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

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
