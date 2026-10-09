import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Cookies from 'js-cookie'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const authHeader = () => ({ Authorization: `Bearer ${Cookies.get('token')}` })

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
const SendIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)
const DocIcon = ({ type }) => {
  if (type === 'pdf') return <span className="text-lg">📕</span>
  if (type === 'docx') return <span className="text-lg">📘</span>
  return <span className="text-lg">📄</span>
}

/* ─────────────────────────────────────────────
   MODALS
───────────────────────────────────────────── */
const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#1d7bff] focus:bg-white focus:ring-2 focus:ring-blue-100'

const markdownComponents = {
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto my-2"> 
      <table className="min-w-full divide-y divide-slate-200 border border-slate-100 rounded-md">{props.children}</table>
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="bg-slate-50">{props.children}</thead>,
  tbody: ({ node, ...props }) => <tbody className="bg-white divide-y divide-slate-100">{props.children}</tbody>,
  th: ({ node, ...props }) => <th className="px-3 py-2 text-left text-sm font-semibold text-slate-700">{props.children}</th>,
  td: ({ node, ...props }) => <td className="px-3 py-2 text-sm text-slate-700 align-top border-t border-slate-100">{props.children}</td>,
  ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1">{props.children}</ul>,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1">{props.children}</ol>,
  li: ({ node, ...props }) => <li className="mb-1">{props.children}</li>,
  p: ({ node, ...props }) => <p className="mb-1 text-sm leading-6">{props.children}</p>,
  code: ({ inline, className, children, ...props }) =>
    inline ? (
      <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
    ) : (
      <pre className="bg-slate-900 text-white p-3 rounded overflow-auto"><code className="font-mono text-sm">{children}</code></pre>
    ),
  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-slate-200 pl-4 italic text-slate-600 my-2">{props.children}</blockquote>,
  a: ({ href, children, ...props }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">{children}</a>,
  h1: ({ children }) => <h1 className="text-xl font-bold my-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold my-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-md font-semibold my-2">{children}</h3>,
}

const AddDocumentModal = ({ topicId, onClose, onRefresh }) => {
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    setSaving(true); setError(null)
    const formData = new FormData()
    formData.append('topic', topicId)
    formData.append('title', file.name)
    formData.append('file', file)
    try {
      await axios.post(`/api/V1/details/topics/${topicId}/documents/`, formData, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }
      })
      onRefresh(); onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add document.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.15)]">
        <h3 className="mb-5 text-lg font-semibold text-slate-900">Add Document</h3>
        {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">File (PDF / DOCX / TXT)</label>
            <input type="file" accept=".pdf,.docx,.txt" onChange={e => setFile(e.target.files[0])} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving…' : 'Add Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const NewConversationModal = ({ topicId, onClose, onCreated }) => {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true); setError(null)
    try {
      const res = await axios.post(
        `/api/V1/details/topics/${topicId}/conversations/`,
        { title },
        { headers: authHeader() }
      )
      onCreated(res.data.data || res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create conversation.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.15)]">
        <h3 className="mb-5 text-lg font-semibold text-slate-900">New Conversation</h3>
        {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Chapter 1 Review" />
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MESSAGE BUBBLE
───────────────────────────────────────────── */
const ConfirmDeleteModal = ({ itemName, itemType, onCancel, onConfirm, loading }) => {
  const label = itemType === 'document' ? 'document' : 'conversation'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.15)]">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Delete {label}?</h3>
        <p className="mb-6 text-sm leading-6 text-slate-600">Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Deleting…' : `Delete ${label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 14, alignItems: 'flex-end', gap: 8 }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg,#1d7bff,#7c3aed)',
          fontSize: 9, fontWeight: 700, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>AI</div>
      )}
      <div style={{
        maxWidth: '72%', padding: '10px 14px', borderRadius: 16, fontSize: 14,
        ...(isUser
          ? { background: 'linear-gradient(135deg,#1d7bff 0%,#2563eb 100%)', color: '#fff', borderBottomRightRadius: 4 }
          : { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderBottomLeftRadius: 4 }
        )
      }}>
        <div style={{ margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content || ''}</ReactMarkdown>
        </div>
        <span style={{ display: 'block', fontSize: 10, marginTop: 5, textAlign: 'right', color: isUser ? 'rgba(255,255,255,0.5)' : '#94a3b8' }}>
          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </span>
      </div>
      {isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg,#1d7bff,#2563eb)',
          fontSize: 9, fontWeight: 700, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>You</div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   WEB SEARCH APPROVAL BOX
───────────────────────────────────────────── */
const WebSearchApprovalBox = ({ interrupt, onApprove, onReject, loading }) => (
  <div style={{
    margin: '8px 16px',
    padding: '14px 16px',
    borderRadius: 14,
    background: '#fffbeb',
    border: '1px solid #fcd34d',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 18 }}>🔍</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Web Search Request</span>
    </div>
    <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>{interrupt.message}</p>
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={onApprove}
        disabled={loading}
        style={{
          flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg,#1d7bff,#2563eb)',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
        }}
      >
        ✅ Approve
      </button>
      <button
        onClick={onReject}
        disabled={loading}
        style={{
          flex: 1, padding: '8px 0', borderRadius: 10, border: '1px solid #fca5a5',
          background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
        }}
      >
        ❌ Reject
      </button>
    </div>
  </div>
)

/* ─────────────────────────────────────────────
   CHAT PANEL
───────────────────────────────────────────── */
const ChatPanel = ({ topicId, conversation, documents, sidebarOpen, setSidebarOpen }) => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const [pendingApproval, setPendingApproval] = useState(null)
  const bottomRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setMessages([])
    setPendingApproval(null)

    const token = Cookies.get('token')
    const ws = new WebSocket(
      `ws://localhost:8000/ws/topics/${topicId}/conversations/${conversation.id}/chat/?token=${token}`
    )
    wsRef.current = ws

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'history') {
        setMessages(data.messages || [])
        setLoading(false)
      } else if (data.type === 'token') {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'assistant' && last?.streaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + data.content }]
          }
          return [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: data.content, streaming: true, created_at: new Date().toISOString() }]
        })
      } else if (data.type === 'done') {
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.streaming) return [...prev.slice(0, -1), { ...last, streaming: false }]
          return prev
        })
        setSending(false)
      } else if (data.type === 'interrupt' && data.interrupt?.type === 'WEB_SEARCH_APPROVAL') {
        setPendingApproval(data.interrupt)
        setSending(false)
      } else if (data.type === 'error') {
        console.error('WS error:', data.message)
        setSending(false)
      }
    }

    ws.onerror = (e) => { console.error('WebSocket error', e); setLoading(false) }
    ws.onclose = () => { setLoading(false) }

    return () => ws.close()
  }, [conversation.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  const handleSend = () => {
    const content = input.trim()
    if (!content || sending || wsRef.current?.readyState !== WebSocket.OPEN) return
    setInput('')
    setSending(true)
    setMessages(prev => [...prev, { id: `temp-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }])
    wsRef.current.send(JSON.stringify({ type: 'message', content }))
  }

  const handleApprovalResponse = (decision) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    setSending(true)
    setPendingApproval(null)
    wsRef.current.send(JSON.stringify({ type: 'resume', decision }))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const [docsOpen, setDocsOpen] = useState(false)
  const docsRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (docsRef.current && !docsRef.current.contains(e.target)) setDocsOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        borderBottom: '1px solid #e2e8f0',
        background: '#fff', flexShrink: 0,
      }}>
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title="Open chats"
            style={{
              width: 30, height: 30, borderRadius: 9, border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1d7bff 0%,#7c3aed 100%)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.title}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>AI Tutor · Powered by Gemini</div>
        </div>
        {/* Docs popover */}
        <div ref={docsRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDocsOpen(o => !o)}
            title="View documents"
            style={{
              width: 34, height: 34, borderRadius: 10, border: '1px solid #e2e8f0',
              background: docsOpen ? '#eff6ff' : '#f8fafc',
              color: docsOpen ? '#1d7bff' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
          </button>
          {docsOpen && (
            <div style={{
              position: 'absolute', top: 40, right: 0, zIndex: 50,
              width: 240, background: '#fff', borderRadius: 14,
              border: '1px solid #e2e8f0', boxShadow: '0 12px 40px rgba(15,23,42,0.12)',
              padding: '10px 0',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 14px 8px' }}>Documents</p>
              {!documents || documents.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94a3b8', padding: '4px 14px 8px' }}>No documents uploaded yet.</p>
              ) : documents.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d7bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</p>
                    <p style={{ fontSize: 10, color: doc.processing_status === 'processed' ? '#10b981' : '#f59e0b' }}>{doc.processing_status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', background: '#fafbfc' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}><Spinner /></div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <p style={{ color: '#94a3b8', marginTop: 12, fontSize: 14, fontWeight: 500 }}>Ask anything about your documents!</p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
        )}
        {sending && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>AI</div>
            <div style={{ padding: '10px 14px', borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderBottomLeftRadius: 4 }}><TypingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Approval box */}
      {pendingApproval && (
        <WebSearchApprovalBox
          interrupt={pendingApproval}
          onApprove={() => handleApprovalResponse('approve')}
          onReject={() => handleApprovalResponse('reject')}
          loading={sending}
        />
      )}

      {/* Input row */}
      <div style={{
        display: 'flex', gap: 10, padding: '12px 16px',
        borderTop: '1px solid #e2e8f0',
        background: '#fff', flexShrink: 0, alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask a question about your documents… (Enter to send)"
          disabled={sending || !!pendingApproval}
          style={{
            flex: 1, resize: 'none',
            opacity: pendingApproval ? 0.5 : 1,
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 14, padding: '10px 14px',
            color: '#0f172a', fontSize: 14, lineHeight: 1.5,
            outline: 'none', fontFamily: 'inherit', maxHeight: 120, overflowY: 'auto',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim() || !!pendingApproval}
          style={{
            width: 42, height: 42, borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg,#1d7bff 0%,#2563eb 100%)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: sending || !input.trim() ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export const Documents = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const topicId = new URLSearchParams(location.search).get('topicId')

  const [documents, setDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [docsError, setDocsError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const [conversations, setConversations] = useState([])
  const [convsLoading, setConvsLoading] = useState(true)
  const [activeConversation, setActiveConversation] = useState(null)
  const [showNewConvModal, setShowNewConvModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(true)

  const fetchDocuments = async () => {
    setDocsLoading(true); setDocsError(null)
    try {
      const res = await axios.get(`/api/V1/details/topics/${topicId}/documents`, { headers: authHeader() })
      setDocuments(res.data.documents || [])
    } catch (err) {
      setDocsError(err.response?.data?.message || 'Failed to load documents.')
    } finally { setDocsLoading(false) }
  }

  const fetchConversations = async () => {
    setConvsLoading(true)
    try {
      const res = await axios.get(`/api/V1/details/topics/${topicId}/conversations/`, { headers: authHeader() })
      const list = res.data.data || res.data.conversations || []
      setConversations(list)
      if (list.length > 0 && !activeConversation) setActiveConversation(list[0])
    } catch (err) {
      console.error('Failed to load conversations', err)
    } finally { setConvsLoading(false) }
  }

  useEffect(() => {
    if (topicId) { fetchDocuments(); fetchConversations() }
    else { setDocsLoading(false); setDocsError('No topic specified.') }
  }, [topicId])

  const handleDeleteDocument = (doc) => {
    setConfirmDelete({ type: 'document', id: doc.id, name: doc.title })
  }

  const handleDeleteConversation = (conv) => {
    setConfirmDelete({ type: 'conversation', id: conv.id, name: conv.title })
  }

  const closeConfirmDelete = () => setConfirmDelete(null)

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return
    setDeleteLoading(true)

    try {
      if (confirmDelete.type === 'document') {
        await axios.delete(`/api/V1/details/topics/${topicId}/documents/${confirmDelete.id}/`, { headers: authHeader() })
        await fetchDocuments()
      } else {
        await axios.delete(`/api/V1/details/topics/${topicId}/conversations/${confirmDelete.id}`, { headers: authHeader() })
        setConversations(prev => {
          const updated = prev.filter(conv => conv.id !== confirmDelete.id)
          if (activeConversation?.id === confirmDelete.id) {
            setActiveConversation(updated[0] || null)
          }
          return updated
        })
      }
      closeConfirmDelete()
    } catch (err) {
      console.error('Failed to delete item', err)
      alert('Failed to delete. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f9fd] to-[#edf4fb]" style={{ fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-end justify-between border-b border-slate-100 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-widest text-[#1d7bff]">Topic Workspace</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documents &amp; Chat</h1>
          <p className="mt-0.5 text-sm text-slate-500">Upload files and ask your AI Tutor questions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1d7bff] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Upload Doc
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Go Back
          </button>
        </div>
      </div>

      {/* 2-column layout: collapsible sidebar + chat */}
      <div style={{ display: 'flex', height: 'calc(100vh - 90px)', padding: '16px', boxSizing: 'border-box', gap: 12 }}>

        {/* Collapsible Conversations Sidebar */}
        <div style={{
          width: sidebarOpen ? 220 : 0,
          minWidth: sidebarOpen ? 220 : 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          flexShrink: 0,
        }}>
          <div className="flex flex-col gap-3 h-full overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" style={{ width: 220 }}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(false)}
                  title="Collapse sidebar"
                  style={{
                    width: 26, height: 26, borderRadius: 8, border: '1px solid #e2e8f0',
                    background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Chats</span>
              </div>
              <button
                onClick={() => setShowNewConvModal(true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1d7bff] text-white transition hover:bg-blue-700"
              >
                <PlusIcon />
              </button>
            </div>

            {convsLoading ? (
              <div className="flex flex-1 items-center justify-center"><Spinner /></div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                <p className="mt-2 text-xs font-semibold text-slate-500">No chats yet</p>
                <button onClick={() => setShowNewConvModal(true)} className="mt-3 rounded-xl bg-[#1d7bff] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700">New Chat</button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {conversations.map(conv => (
                  <div key={conv.id} className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                    activeConversation?.id === conv.id ? 'border-[#1d7bff]/30 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:bg-white'
                  }`}>
                    <button type="button" onClick={() => setActiveConversation(conv)} className="flex flex-1 items-center gap-2 text-left min-w-0">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${activeConversation?.id === conv.id ? 'bg-[#1d7bff]' : 'bg-slate-300'}`} />
                      <p className="truncate text-[12px] font-semibold text-slate-800">{conv.title}</p>
                    </button>
                    <button type="button" onClick={() => handleDeleteConversation(conv)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500">
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm flex-1" style={{ display: 'flex', flexDirection: 'column' }}>
          {activeConversation ? (
            <ChatPanel topicId={topicId} conversation={activeConversation} documents={documents} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <p style={{ marginTop: 16, color: '#0f172a', fontWeight: 700, fontSize: 15 }}>Select a conversation</p>
              <p style={{ marginTop: 6, color: '#94a3b8', fontSize: 12 }}>Or create a new one to ask questions about your documents.</p>
              <button onClick={() => setShowNewConvModal(true)} className="mt-5 rounded-xl bg-[#1d7bff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">New Conversation</button>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddDocumentModal topicId={topicId} onClose={() => setShowAddModal(false)} onRefresh={fetchDocuments} />
      )}
      {showNewConvModal && (
        <NewConversationModal
          topicId={topicId}
          onClose={() => setShowNewConvModal(false)}
          onCreated={(conv) => {
            setConversations(prev => [conv, ...prev])
            setActiveConversation(conv)
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          itemName={confirmDelete.name}
          itemType={confirmDelete.type}
          onCancel={closeConfirmDelete}
          onConfirm={handleConfirmDelete}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SMALL UI HELPERS
───────────────────────────────────────────── */
const Spinner = () => (
  <div style={{
    width: 28, height: 28, borderRadius: '50%',
    border: '3px solid #e2e8f0', borderTopColor: '#1d7bff',
    animation: 'spin 0.8s linear infinite',
  }} />
)

const TypingDots = () => (
  <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '2px 4px' }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{
        width: 7, height: 7, borderRadius: '50%', background: '#cbd5e1',
        display: 'inline-block',
        animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
      }} />
    ))}
  </span>
)

/* Inject keyframes once */
if (typeof document !== 'undefined' && !document.getElementById('docs-chat-kf')) {
  const s = document.createElement('style')
  s.id = 'docs-chat-kf'
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes bounce { 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-6px); } }
  `
  document.head.appendChild(s)
}
