import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Cookies from 'js-cookie'

const SUBJECTS_URL = '/api/V1/subjects/'
const TOPICS_URL = '/api/V1/topics/'

const defaultSubjectForm = { name: '', description: '', color: '#63acf1', icon: null }
const defaultTopicForm = { subject: '', title: '', description: '', difficulty: 'easy', estimated_time: 30 }

const authHeader = () => ({ Authorization: `Bearer ${Cookies.get('token')}` })

const parseError = (error) => {
  const data = error?.response?.data
  if (!data) return 'Something went wrong.'
  if (typeof data === 'object') return Object.values(data).flat().filter(Boolean).join(' ')
  return 'Something went wrong.'
}

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const StatusModal = ({ status, title, message, onClose }) => {
  if (!status) return null
  const isSuccess = status === 'success'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/20 bg-white/90 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-7">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold ${isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
            {isSuccess ? '✓' : '✕'}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${isSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
            {isSuccess ? 'Continue' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm outline-none transition focus:border-[#1d7bff] focus:bg-white focus:ring-2 focus:ring-blue-100'

const SubjectModal = ({ title, form, preview, onChange, onFileChange, onSubmit, onClose, submitting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-md">
    <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
      <h3 className="mb-5 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3">
        {['name', 'description'].map((field) => (
          <input key={field} name={field} value={form[field]} onChange={onChange}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)} className={inputCls} />
        ))}
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Color</label>
          <input type="color" name="color" value={form.color} onChange={onChange} className="h-9 w-16 cursor-pointer rounded-lg border border-slate-200" />
          <span className="text-xs text-slate-400">{form.color}</span>
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-slate-600">Icon Image</label>
          <input type="file" accept="image/*" onChange={onFileChange} className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#1d7bff]" />
          {preview && <img src={preview} alt="preview" className="mt-2 h-16 w-16 rounded-xl object-cover border border-slate-200 shadow-sm" />}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
        <button onClick={onSubmit} disabled={submitting} className="rounded-xl bg-[#1d7bff] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-lg shadow-blue-200">
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
)

const TopicModal = ({ title, form, subjects, onChange, onSubmit, onClose, submitting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-md">
    <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
      <h3 className="mb-5 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3">
        <select name="subject" value={form.subject} onChange={onChange} className={inputCls}>
          <option value="">Select Subject</option>
          {subjects.map((s) => <option key={s.subject_id} value={s.subject_id}>{s.name}</option>)}
        </select>
        <input name="title" value={form.title} onChange={onChange} placeholder="Title" className={inputCls} />
        <input name="description" value={form.description} onChange={onChange} placeholder="Description" className={inputCls} />
        <select name="difficulty" value={form.difficulty} onChange={onChange} className={inputCls}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <input name="estimated_time" type="number" value={form.estimated_time} onChange={onChange} placeholder="Estimated time (mins)" className={inputCls} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
        <button onClick={onSubmit} disabled={submitting} className="rounded-xl bg-[#1d7bff] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-lg shadow-blue-200">
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
)

const difficultyConfig = {
  easy: { cls: 'bg-emerald-100 text-emerald-700', label: 'Easy' },
  medium: { cls: 'bg-amber-100 text-amber-700', label: 'Medium' },
  hard: { cls: 'bg-rose-100 text-rose-700', label: 'Hard' },
}

const Subjects = () => {
  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [subjectModal, setSubjectModal] = useState(null)
  const [subjectForm, setSubjectForm] = useState(defaultSubjectForm)
  const [preview, setPreview] = useState(null)
  const [editSubjectId, setEditSubjectId] = useState(null)

  const [topicModal, setTopicModal] = useState(null)
  const [topicForm, setTopicForm] = useState(defaultTopicForm)
  const [editTopicId, setEditTopicId] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [statusModal, setStatusModal] = useState({ status: null, title: '', message: '' })

  const showStatus = (status, title, message) => setStatusModal({ status, title, message })
  const closeStatus = () => setStatusModal({ status: null, title: '', message: '' })
  const navigate = useNavigate()

  const fetchSubjects = async (search = '') => {
    try {
      const res = await axios.get(SUBJECTS_URL, { headers: authHeader(), params: search ? { search } : {} })
      setSubjects(res.data)
    } catch {
      setError('Failed to load subjects.')
    } finally {
      setLoading(false)
    }
  }

  const fetchTopics = async () => {
    try {
      const res = await axios.get(TOPICS_URL, { headers: authHeader() })
      setTopics(res.data)
    } catch {
      // topics failure should not affect subjects display
    }
  }

  useEffect(() => { fetchSubjects(); fetchTopics() }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSubjects(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const topicsForSubject = (subjectId) => topics.filter((t) => t.subject === subjectId)

  const handleSubjectChange = (e) => setSubjectForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSubjectForm((prev) => ({ ...prev, icon: file }))
    setPreview(URL.createObjectURL(file))
  }
  const openAddSubject = () => { setSubjectForm(defaultSubjectForm); setPreview(null); setSubjectModal('add') }
  const openEditSubject = (subject) => {
    setSubjectForm({ name: subject.name, description: subject.description, color: subject.color, icon: null })
    setPreview(subject.icon || null)
    setEditSubjectId(subject.subject_id)
    setSubjectModal('edit')
  }
  const handleSubjectSubmit = async () => {
    setSubmitting(true)
    try {
      const data = new FormData()
      data.append('name', subjectForm.name)
      data.append('description', subjectForm.description)
      data.append('color', subjectForm.color)
      if (subjectForm.icon) data.append('icon', subjectForm.icon)
      if (subjectModal === 'add') {
        await axios.post(SUBJECTS_URL, data, { headers: authHeader() })
        showStatus('success', 'Subject created', 'Your subject has been created successfully.')
      } else {
        await axios.patch(`${SUBJECTS_URL}${editSubjectId}/`, data, { headers: authHeader() })
        showStatus('success', 'Subject updated', 'Your subject has been updated successfully.')
      }
      setSubjectModal(null)
      fetchSubjects()
    } catch (err) {
      showStatus('error', subjectModal === 'add' ? 'Failed to create' : 'Failed to update', parseError(err))
    } finally {
      setSubmitting(false)
    }
  }
  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Delete this subject and all its topics?')) return
    try {
      await axios.delete(`${SUBJECTS_URL}${id}/`, { headers: authHeader() })
      setSubjects((prev) => prev.filter((s) => s.subject_id !== id))
      setTopics((prev) => prev.filter((t) => t.subject !== id))
      showStatus('success', 'Subject deleted', 'The subject has been deleted successfully.')
    } catch (err) {
      showStatus('error', 'Failed to delete', parseError(err))
    }
  }

  const handleTopicChange = (e) => setTopicForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  const openAddTopic = (subjectId) => { setTopicForm({ ...defaultTopicForm, subject: subjectId }); setTopicModal('add') }
  const openEditTopic = (topic) => {
    setTopicForm({ subject: topic.subject, title: topic.title, description: topic.description, difficulty: topic.difficulty, estimated_time: topic.estimated_time })
    setEditTopicId(topic.topic_id)
    setTopicModal('edit')
  }
  const handleTopicSubmit = async () => {
    setSubmitting(true)
    try {
      if (topicModal === 'add') {
        await axios.post(TOPICS_URL, topicForm, { headers: authHeader() })
        showStatus('success', 'Topic created', 'Your topic has been created successfully.')
        setTopicModal(null)
        navigate(`/topics?subjectId=${topicForm.subject}`)
        return
      }

      await axios.patch(`${TOPICS_URL}${editTopicId}/`, topicForm, { headers: authHeader() })
      showStatus('success', 'Topic updated', 'Your topic has been updated successfully.')
      setTopicModal(null)
      fetchTopics()
    } catch (err) {
      showStatus('error', topicModal === 'add' ? 'Failed to create topic' : 'Failed to update topic', parseError(err))
    } finally {
      setSubmitting(false)
    }
  }
  const handleDeleteTopic = async (id) => {
    if (!window.confirm('Delete this topic?')) return
    try {
      await axios.delete(`${TOPICS_URL}${id}/`, { headers: authHeader() })
      setTopics((prev) => prev.filter((t) => t.topic_id !== id))
      showStatus('success', 'Topic deleted', 'The topic has been deleted successfully.')
    } catch (err) {
      showStatus('error', 'Failed to delete topic', parseError(err))
    }
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-[#1d7bff]" />
    </div>
  )
  if (error) return <p className="p-6 text-rose-500">{error}</p>

  return (
<div className="min-h-screen  p-6">      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">My Subjects</h2>
          <p className="mt-1 text-sm text-slate-500">{subjects.length} subjects · {topics.length} topics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" placeholder="Search subjects..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#1d7bff] focus:ring-2 focus:ring-blue-100" />
          </div>
          <button onClick={openAddSubject}
            className="flex items-center gap-2 rounded-xl bg-[#1d7bff] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
            <PlusIcon /> Add Subject
          </button>
        </div>
      </div>

      {!subjects.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 py-16 backdrop-blur-sm">
          <p className="text-slate-400">{searchQuery ? 'No subjects match your search.' : 'No subjects yet. Add your first subject!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          {subjects.map((subject) => {
            const subjectTopics = topicsForSubject(subject.subject_id)
            const completedCount = subjectTopics.filter((t) => t.status === 'completed').length
            const progress = subjectTopics.length ? Math.round((completedCount / subjectTopics.length) * 100) : 0

            return (
              <div key={subject.subject_id}
                className="group relative overflow-visible rounded-[2rem] border border-white/20 bg-white/50 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_35px_100px_rgba(15,23,42,0.16)]">

                {/* Subject Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {subject.icon ? (
                        <img src={subject.icon} alt={subject.name}
                          className="h-14 w-14 shrink-0 rounded-3xl object-cover bg-white shadow-lg ring-2 ring-white/70" />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl text-white text-xl font-bold shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}bb)` }}>
                          {subject.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 capitalize truncate">{subject.name}</h3>
                        {subject.description && <p className="mt-1 text-sm text-slate-500 truncate">{subject.description}</p>}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openAddTopic(subject.subject_id)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100">
                          <PlusIcon /> Topic
                        </button>
                        <button onClick={() => openEditSubject(subject)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-[#1d7bff]">
                          <EditIcon />
                        </button>
                        <button onClick={() => handleDeleteSubject(subject.subject_id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500">
                          <DeleteIcon />
                        </button>
                      </div>
                      {subjectTopics.length > 0 && (
                        (() => {
                          const radius = 16
                          const circumference = 2 * Math.PI * radius
                          const offset = circumference - (progress / 100) * circumference
                          return (
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-sm">
                              <svg className="h-16 w-16" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="16" fill="transparent" stroke="rgba(148,163,184,0.18)" strokeWidth="4" />
                                <circle
                                  cx="20"
                                  cy="20"
                                  r="16"
                                  fill="transparent"
                                  stroke="#22c55e"
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  strokeDasharray={`${circumference} ${circumference}`}
                                  strokeDashoffset={offset}
                                  transform="rotate(-90 20 20)"
                                />
                              </svg>
                              <span className="absolute text-sm font-semibold text-slate-900">{progress}%</span>
                            </div>
                          )
                        })()
                      )}
                    </div>
                  </div>


                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">
                      {subjectTopics.length} topics
                    </span>
                    {subjectTopics.length > 0 && (
                      <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
                        {completedCount}/{subjectTopics.length} done
                      </span>
                    )}
                  </div>
                  {subjectTopics.length <= 0 ? (
                    <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 p-2 text-center text-slate-500 shadow-sm">
                      <p className="mt-2 text-xs leading-5">Add the first topic directly from this card.</p>
                      <button onClick={() => openAddTopic(subject.subject_id)}
                        className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                        + Add Topic
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => navigate(`/subjects/topics?subjectId=${subject.subject_id}`)}
                      className="mt-5 flex w-full items-center justify-center rounded-xl border border-slate-100 bg-black text-white py-2 text-sm font-semibold text-slate-600 transition hover:bg-black/60 hover:cursor-pointer">
                      View topics
                    </button>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      )}

      {subjectModal && (
        <SubjectModal title={subjectModal === 'add' ? 'Add Subject' : 'Edit Subject'}
          form={subjectForm} preview={preview}
          onChange={handleSubjectChange} onFileChange={handleFileChange}
          onSubmit={handleSubjectSubmit} onClose={() => setSubjectModal(null)}
          submitting={submitting} />
      )}

      {topicModal && (
        <TopicModal title={topicModal === 'add' ? 'Add Topic' : 'Edit Topic'}
          form={topicForm} subjects={subjects}
          onChange={handleTopicChange}
          onSubmit={handleTopicSubmit} onClose={() => setTopicModal(null)}
          submitting={submitting} />
      )}

      <StatusModal status={statusModal.status} title={statusModal.title} message={statusModal.message} onClose={closeStatus} />
    </div>
  )
}

export default Subjects
