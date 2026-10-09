import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Cookies from 'js-cookie'

const SUBJECTS_URL = '/api/V1/subjects/'
const TOPICS_URL = '/api/V1/topics/'
const authHeader = () => ({ Authorization: `Bearer ${Cookies.get('token')}` })
const parseError = (error) => {
  const data = error?.response?.data
  if (!data) return 'Something went wrong.'
  if (typeof data === 'object') return Object.values(data).flat().filter(Boolean).join(' ')
  return 'Something went wrong.'
}
const defaultSubjectForm = { name: '', description: '', document: null }
const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm outline-none transition focus:border-[#1d7bff] focus:bg-white focus:ring-2 focus:ring-blue-100'

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
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const StatusModal = ({ status, title, message, onClose }) => {
  if (!status) return null
  const isSuccess = status === 'success'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white/90 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-7">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold ${isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
            {isSuccess ? '✓' : '✕'}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
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

const DeleteDocumentModal = ({ document, onClose, onConfirm, deleting }) => {
  if (!document) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">!</div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">Delete document?</h3>
            <p className="mt-1 truncate text-sm font-medium text-slate-600">{document.document.title}</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600">Deleting this document will also:</p>
        <ul className="mt-2 space-y-2 text-sm text-slate-600">
          <li>• Remove its extracted chunks and topic mappings.</li>
          <li>• Delete topics generated from this document.</li>
          <li>• Delete assessments and conversations under those topics.</li>
          <li>• Rebuild the affected FAISS indexes.</li>
        </ul>
        <p className="mt-4 text-xs leading-5 text-slate-400">Manually created topics are not affected.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} disabled={deleting} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete document'}
          </button>
        </div>
      </div>
    </div>
  )
}

const SubjectModal = ({ title, mode, form, onChange, onDocumentChange, onSubmit, onClose, submitting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-md">
    <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
      <h3 className="mb-5 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3">
        <input name="name" value={form.name} onChange={onChange}
          placeholder="Name" required className={inputCls} />
        {mode === 'add' ? (
          <div>
            <label className="mb-1.5 block text-sm text-slate-600">Document (optional)</label>
            <input type="file" accept=".pdf,.docx,.txt" onChange={onDocumentChange}
              className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#1d7bff]" />
          </div>
        ) : (
          <input name="description" value={form.description} onChange={onChange}
            placeholder="Description" className={inputCls} />
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
        <button onClick={onSubmit} disabled={submitting || !form.name.trim()} className="rounded-xl bg-[#1d7bff] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-lg shadow-blue-200">
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
)

const UploadDocumentModal = ({ subjectId, onClose, onProposal }) => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    setUploading(true); setError(null)
    const formData = new FormData()
    formData.append('title', file.name)
    formData.append('file', file)
    try {
      const res = await axios.post(
        `/api/V1/details/subjects/${subjectId}/documents/`,
        formData,
        { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } }
      )
      onProposal(res.data.proposal, res.data.document)
      onClose()
    } catch (err) {
      setError(parseError(err))
    } finally { setUploading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <h3 className="mb-1 text-lg font-semibold text-slate-900">Upload Subject Document</h3>
        <p className="mb-5 text-sm text-slate-500">The AI will analyse the document and propose topics for your review.</p>
        {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">File (PDF / DOCX / TXT)</label>
            <input type="file" accept=".pdf,.docx,.txt" onChange={e => setFile(e.target.files[0])} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={uploading} className="rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition">
              {uploading ? 'Uploading & Analysing...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ProposalReviewModal = ({ proposal, subjectId, onClose, onTopicsCreated }) => {
  const [selected, setSelected] = useState(() => new Set(proposal.items.map(i => i.id)))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleApprove = async () => {
    if (selected.size === 0) { setError('Select at least one topic.'); return }
    setSubmitting(true); setError(null)
    try {
      const res = await axios.post(
        `/api/V1/details/subjects/${subjectId}/proposals/`,
        { proposal_id: proposal.id, approved_item_ids: [...selected] },
        { headers: authHeader() }
      )
      onTopicsCreated(res.data.topics)
      onClose()
    } catch (err) {
      setError(parseError(err))
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <h3 className="mb-1 text-lg font-semibold text-slate-900">Review AI-Proposed Topics</h3>
        <p className="mb-5 text-sm text-slate-500">Select the topics you want to create. You can add more manually later.</p>
        {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {proposal.items.map(item => (
            <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${selected.has(item.id) ? 'border-[#1d7bff] bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} className="mt-0.5 h-4 w-4 accent-[#1d7bff]" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                {item.description && <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>}
              </div>
            </label>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{selected.size} of {proposal.items.length} selected</span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Skip</button>
            <button type="button" onClick={handleApprove} disabled={submitting} className="rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition">
              {submitting ? 'Creating...' : 'Create Selected Topics'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const difficultyConfig = {
  easy: { cls: 'bg-emerald-100 text-emerald-700', label: 'Easy' },
  medium: { cls: 'bg-amber-100 text-amber-700', label: 'Medium' },
  hard: { cls: 'bg-rose-100 text-rose-700', label: 'Hard' },
}

const Subjects = () => {
  const [subjects, setSubjects] = useState([])
  const [subjectDocuments, setSubjectDocuments] = useState({})
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [subjectModal, setSubjectModal] = useState(null)
  const [subjectForm, setSubjectForm] = useState(defaultSubjectForm)
  const [editSubjectId, setEditSubjectId] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [statusModal, setStatusModal] = useState({ status: null, title: '', message: '' })

  // Upload + proposal state
  const [uploadSubjectId, setUploadSubjectId] = useState(null)
  const [documentSubjectId, setDocumentSubjectId] = useState(null)
  const [deletingDocumentId, setDeletingDocumentId] = useState(null)
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const [pendingProposal, setPendingProposal] = useState(null)
  const [proposalSubjectId, setProposalSubjectId] = useState(null)

  const showStatus = (status, title, message) => setStatusModal({ status, title, message })
  const closeStatus = () => setStatusModal({ status: null, title: '', message: '' })
  const navigate = useNavigate()

  const fetchSubjects = async (search = '') => {
    try {
      const res = await axios.get(SUBJECTS_URL, { headers: authHeader(), params: search ? { search } : {} })
      const nextSubjects = res.data
      setSubjects(nextSubjects)
      const documentEntries = await Promise.all(nextSubjects.map(async (subject) => {
        try {
          const documentsRes = await axios.get(
            `/api/V1/details/subjects/${subject.subject_id}/documents/`,
            { headers: authHeader() }
          )
          return [subject.subject_id, documentsRes.data.documents || []]
        } catch {
          return [subject.subject_id, []]
        }
      }))
      setSubjectDocuments(Object.fromEntries(documentEntries))
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
    } catch { /* topics failure should not affect subjects display */ }
  }

  useEffect(() => { fetchSubjects(); fetchTopics() }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSubjects(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const topicsForSubject = (subjectId) => topics.filter((t) => t.subject === subjectId)

  const handleSubjectChange = (e) => setSubjectForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  const handleDocumentChange = (e) => setSubjectForm((prev) => ({ ...prev, document: e.target.files[0] || null }))
  const openAddSubject = () => { setSubjectForm(defaultSubjectForm); setSubjectModal('add') }
  const openEditSubject = (subject) => {
    setSubjectForm({ name: subject.name, description: subject.description || '', document: null })
    setEditSubjectId(subject.subject_id)
    setSubjectModal('edit')
  }
  const handleSubjectSubmit = async () => {
    setSubmitting(true)
    try {
      if (subjectModal === 'add') {
        const createRes = await axios.post(SUBJECTS_URL, { name: subjectForm.name }, { headers: authHeader() })
        const subject = createRes.data
        if (subjectForm.document) {
          const documentData = new FormData()
          documentData.append('title', subjectForm.document.name)
          documentData.append('file', subjectForm.document)
          try {
            const uploadRes = await axios.post(
              `/api/V1/details/subjects/${subject.subject_id}/documents/`,
              documentData,
              { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } }
            )
            if (uploadRes.data.proposal?.items?.length > 0) {
              setPendingProposal(uploadRes.data.proposal)
              setProposalSubjectId(subject.subject_id)
            } else {
              showStatus('success', 'Subject created', 'Your subject and document have been added.')
            }
          } catch (uploadError) {
            showStatus('error', 'Subject created, document upload failed', parseError(uploadError))
          }
        } else {
          showStatus('success', 'Subject created', 'Your subject has been created successfully.')
        }
      } else {
        await axios.patch(
          `${SUBJECTS_URL}${editSubjectId}/`,
          { name: subjectForm.name, description: subjectForm.description },
          { headers: authHeader() }
        )
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

  const handleDeleteDocument = async (subjectId, documentId) => {
    setDeletingDocumentId(documentId)
    try {
      await axios.delete(
        `/api/V1/details/subjects/${subjectId}/documents/${documentId}/`,
        { headers: authHeader() }
      )
      setSubjectDocuments((prev) => ({
        ...prev,
        [subjectId]: (prev[subjectId] || []).filter((document) => document.id !== documentId),
      }))
      setSubjects((prev) => prev.map((subject) => subject.subject_id === subjectId
        ? { ...subject, source_document_count: Math.max(0, (subject.source_document_count || 1) - 1) }
        : subject
      ))
      setDocumentToDelete(null)
    } catch (err) {
      showStatus('error', 'Failed to delete document', parseError(err))
    } finally {
      setDeletingDocumentId(null)
    }
  }

  const handleProposalReceived = (proposal, _doc) => {
    fetchSubjects()
    if (proposal && proposal.items?.length > 0) {
      setPendingProposal(proposal)
      setProposalSubjectId(uploadSubjectId)
    } else {
      showStatus('success', 'Document uploaded', 'No topics were proposed. You can add topics manually.')
      fetchSubjects()
    }
  }

  const handleTopicsCreated = (newTopics) => {
    fetchTopics()
    fetchSubjects()
    showStatus('success', `${newTopics.length} topic(s) created`, 'Topics have been added to your subject.')
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-[#1d7bff]" />
    </div>
  )
  if (error) return <p className="p-6 text-rose-500">{error}</p>

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
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
            const documents = subjectDocuments[subject.subject_id] || []
            const completedCount = subjectTopics.filter((t) => t.status === 'completed').length
            const progress = subjectTopics.length ? Math.round((completedCount / subjectTopics.length) * 100) : 0
            const hasDoc = documents.length > 0 || (subject.source_document_count || 0) > 0

            return (
              <div key={subject.subject_id}
                className="group relative overflow-visible rounded-[2rem] border border-white/20 bg-white/50 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_35px_100px_rgba(15,23,42,0.16)]">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {subject.icon ? (
                        <img src={subject.icon} alt={subject.name} className="h-14 w-14 shrink-0 rounded-3xl object-cover bg-white shadow-lg ring-2 ring-white/70" />
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

                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        {hasDoc && (
                          <button
                            onClick={() => setUploadSubjectId(subject.subject_id)}
                            title="Upload another document"
                            className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-[#1d7bff] transition hover:bg-blue-100">
                            <UploadIcon /> Add Doc
                          </button>
                        )}
                        <button onClick={() => openEditSubject(subject)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-[#1d7bff]">
                          <EditIcon />
                        </button>
                        <button onClick={() => handleDeleteSubject(subject.subject_id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500">
                          <DeleteIcon />
                        </button>
                      </div>
                      {subjectTopics.length > 0 && (() => {
                        const radius = 16
                        const circumference = 2 * Math.PI * radius
                        const offset = circumference - (progress / 100) * circumference
                        return (
                          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-sm">
                            <svg className="h-16 w-16" viewBox="0 0 40 40">
                              <circle cx="20" cy="20" r="16" fill="transparent" stroke="rgba(148,163,184,0.18)" strokeWidth="4" />
                              <circle cx="20" cy="20" r="16" fill="transparent" stroke="#22c55e" strokeWidth="4" strokeLinecap="round"
                                strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} transform="rotate(-90 20 20)" />
                            </svg>
                            <span className="absolute text-sm font-semibold text-slate-900">{progress}%</span>
                          </div>
                        )
                      })()}
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
                    {!hasDoc && (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-200">
                        No document yet
                      </span>
                    )}
                  </div>

                  {documents.length > 0 && (
                    <div className="mt-4 border-t border-slate-200/70 pt-3">
                      <button
                        onClick={() => setDocumentSubjectId(subject.subject_id)}
                        className="flex w-full items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-left text-xs font-semibold text-[#1d7bff] transition hover:bg-blue-100"
                      >
                        <span>Documents</span>
                        <span>{documents.length}</span>
                      </button>
                    </div>
                  )}

                  {subjectTopics.length <= 0 ? (
                    <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 p-2 text-center text-slate-500 shadow-sm">
                      <p className="mt-2 text-xs leading-5">
                        {hasDoc ? 'No topics yet. Add topics from the Topics page.' : 'Upload a document and the AI will propose topics for you.'}
                      </p>
                    </div>
                  ) : (
                    <button onClick={() => navigate(`/subjects/topics?subjectId=${subject.subject_id}`)}
                      className="mt-5 flex w-full items-center justify-center rounded-xl border border-slate-100 bg-black text-white py-2 text-sm font-semibold transition hover:bg-black/60 hover:cursor-pointer">
                      View topics
                    </button>
                  )}
                  {!hasDoc && (
                    <button
                      onClick={() => setUploadSubjectId(subject.subject_id)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1d7bff] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <UploadIcon /> Upload Document
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
          mode={subjectModal} form={subjectForm}
          onChange={handleSubjectChange} onDocumentChange={handleDocumentChange}
          onSubmit={handleSubjectSubmit} onClose={() => setSubjectModal(null)}
          submitting={submitting} />
      )}

      {uploadSubjectId && (
        <UploadDocumentModal
          subjectId={uploadSubjectId}
          onClose={() => setUploadSubjectId(null)}
          onProposal={handleProposalReceived}
        />
      )}

      {documentSubjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Subject documents</h3>
                <p className="mt-1 text-xs text-slate-500">Manage the documents used by this subject.</p>
              </div>
              <button
                onClick={() => setDocumentSubjectId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close documents"
              >
                ×
              </button>
            </div>
            <div className="mt-5 max-h-72 space-y-2 overflow-y-auto">
              {(subjectDocuments[documentSubjectId] || []).map((document) => (
                <div key={document.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[10px] font-bold uppercase text-[#1d7bff]">
                    {(document.file_type || 'file').slice(0, 3)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{document.title}</p>
                    <p className={`text-[11px] ${document.processing_status === 'processed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {document.processing_status}
                    </p>
                  </div>
                  <button
                    onClick={() => setDocumentToDelete({
                      subjectId: documentSubjectId,
                      document,
                    })}
                    disabled={deletingDocumentId === document.id}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                    title="Delete document"
                    aria-label={`Delete ${document.title}`}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDocumentSubjectId(null)
                  setUploadSubjectId(documentSubjectId)
                }}
                className="flex items-center gap-1.5 rounded-xl bg-[#1d7bff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <UploadIcon /> Add document
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteDocumentModal
        document={documentToDelete}
        deleting={Boolean(deletingDocumentId)}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={() => handleDeleteDocument(documentToDelete.subjectId, documentToDelete.document.id)}
      />

      {pendingProposal && proposalSubjectId && (
        <ProposalReviewModal
          proposal={pendingProposal}
          subjectId={proposalSubjectId}
          onClose={() => { setPendingProposal(null); setProposalSubjectId(null) }}
          onTopicsCreated={handleTopicsCreated}
        />
      )}

      <StatusModal status={statusModal.status} title={statusModal.title} message={statusModal.message} onClose={closeStatus} />
    </div>
  )
}

export default Subjects
