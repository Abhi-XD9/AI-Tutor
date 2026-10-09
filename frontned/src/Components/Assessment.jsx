import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Cookies from 'js-cookie'
import DotField from '../commonPages/DotField'
import './Assessment.css'

const authHeader = () => ({ Authorization: `Bearer ${Cookies.get('token')}` })
const introLines = ['Ready to focus?', 'Find your edge.', 'One at a time.']

const readError = (err) =>
  err?.response?.data?.detail || err?.response?.data?.message || 'Something went wrong. Please try again.'

const parseMultiSelectAnswer = (value) => {
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const displayAnswer = (value, questionType) => {
  if (questionType === 'multi_select') {
    return parseMultiSelectAnswer(value).join(', ') || 'No answer provided'
  }
  return value || 'No answer provided'
}

const codingTopicPattern = /coding|programming|software|algorithm|data structure|python|java|javascript|typescript|sql|html|css|react|django|api development/i

const questionMixDefaults = (count, codingTopic = false) => {
  const defaults = {
    5: codingTopic ? { mcq: 2, multi_select: 0, short_answer: 2, coding: 1 } : { mcq: 3, multi_select: 0, short_answer: 2, coding: 0 },
    10: codingTopic ? { mcq: 4, multi_select: 0, short_answer: 4, coding: 2 } : { mcq: 5, multi_select: 0, short_answer: 5, coding: 0 },
    15: codingTopic ? { mcq: 6, multi_select: 0, short_answer: 6, coding: 3 } : { mcq: 8, multi_select: 0, short_answer: 7, coding: 0 },
  }
  return defaults[count]
}

/* ── QUESTION INPUT ── */
const QuestionInput = ({ question, value, onChange }) => {
  if (question.question_type === 'mcq' || question.question_type === 'multi_select') {
    const multiSelect = question.question_type === 'multi_select'
    const selectedOptions = multiSelect ? (Array.isArray(value) ? value : []) : []
    return (
      <div className="assessment-options" role={multiSelect ? 'group' : 'radiogroup'} aria-label="Answer choices">
        {(question.options || []).map((option, index) => (
          <button
            key={option}
            type="button"
            role={multiSelect ? 'checkbox' : 'radio'}
            aria-checked={multiSelect ? selectedOptions.includes(option) : value === option}
            onClick={() => {
              if (!multiSelect) return onChange(option)
              onChange(selectedOptions.includes(option)
                ? selectedOptions.filter((selected) => selected !== option)
                : [...selectedOptions, option])
            }}
            className={`assessment-option ${(multiSelect ? selectedOptions.includes(option) : value === option) ? 'is-selected' : ''}`}
          >
            <span className="assessment-option-key">{String.fromCharCode(65 + index)}</span>
            <span>{option}</span>
          </button>
        ))}
      </div>
    )
  }
  const coding = question.question_type === 'coding' || question.question_type === 'code'
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`assessment-answer-field ${coding ? 'is-code' : ''}`}
      placeholder={coding ? '// Write your solution here' : 'Write your answer in your own words…'}
      rows={coding ? 11 : 7}
      spellCheck={!coding}
    />
  )
}

/* ── REPORT ── */
const Report = ({ report, answers, onBack }) => {
  const reviewedAnswers = [...(answers || [])].sort(
    (left, right) => left.question.question_index - right.question.question_index
  )
  return (
    <section className="assessment-report">
      <div className="report-score-wrap">
        <div className="report-score-ring" style={{ '--score': `${report?.overall_percentage || 0}%` }}>
          <div>
            <strong>{Math.round(report?.overall_percentage || 0)}%</strong>
            <span>overall score</span>
          </div>
        </div>
        <div>
          <p className="assessment-eyebrow">Assessment complete</p>
          <h1>Your learning snapshot</h1>
          <p>
            You earned {report?.overall_score ?? 0} out of {report?.max_score ?? 0} points.
            Your topic rating is <b>{report?.overall_rating || 'pending'}</b>.
          </p>
        </div>
      </div>
      <div className="report-panel report-review-panel">
        <p className="assessment-eyebrow">Answer review</p>
        <div className="answer-review-list">
          {reviewedAnswers.map((answer) => {
            const question = answer.question
            return (
              <article className="answer-review-item" key={answer.id}>
                <div className="answer-review-heading">
                  <span>Question {question.question_index}</span>
                  <span className={`rating-pill ${answer.is_correct ? 'strong' : answer.score > 0 ? 'medium' : 'weak'}`}>
                    {answer.score} / {question.points} points
                  </span>
                </div>
                <h2>{question.question_text}</h2>
                <div className="answer-review-detail">
                  <span>Your answer</span>
                  <p>{displayAnswer(answer.user_answer, question.question_type)}</p>
                </div>
                <div className="answer-review-detail is-correct-answer">
                  <span>Correct answer</span>
                  <p>{displayAnswer(question.correct_answer, question.question_type)}</p>
                </div>
                {question.explanation && (
                  <div className="answer-review-detail is-explanation">
                    <span>Explanation</span>
                    <p>{question.explanation}</p>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>
      <button type="button" className="assessment-secondary-button" onClick={onBack}>
        Back to topics
      </button>
    </section>
  )
}

/* ── EXTRACTION VERIFY PANEL ── */
const ExtractionVerifyPanel = ({ topicId, documents, onClose }) => {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState({})

  const verify = async (doc) => {
    setLoading((p) => ({ ...p, [doc.id]: true }))
    try {
      const res = await axios.get(
        `/api/V1/details/topics/${topicId}/documents/${doc.id}/verify/`,
        { headers: authHeader() }
      )
      setResults((p) => ({ ...p, [doc.id]: res.data }))
    } catch (err) {
      setResults((p) => ({ ...p, [doc.id]: { error: readError(err) } }))
    } finally {
      setLoading((p) => ({ ...p, [doc.id]: false }))
    }
  }

  const qualityColor = (q) =>
    q === 'good' ? '#10b981' : q === 'partial' ? '#f59e0b' : '#f43f5e'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto',
        background: '#fff', borderRadius: 20, padding: 24,
        boxShadow: '0 30px 80px rgba(15,23,42,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#1d7bff' }}>
              Extraction Quality
            </p>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Document Verification</h3>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, border: '1px solid #e2e8f0',
            background: '#f8fafc', cursor: 'pointer', fontSize: 14, color: '#64748b',
          }}>✕</button>
        </div>

        {!documents?.length ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>No documents uploaded for this topic.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {documents.map((doc) => {
              const r = results[doc.id]
              const isLoading = loading[doc.id]
              return (
                <div key={doc.id} style={{
                  border: '1px solid #e2e8f0', borderRadius: 14, padding: 14,
                  background: '#f8fafc',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.title}
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                        {doc.file_type?.toUpperCase()} · {doc.processing_status}
                      </p>
                    </div>
                    <button
                      onClick={() => verify(doc)}
                      disabled={isLoading}
                      style={{
                        flexShrink: 0, padding: '6px 14px', borderRadius: 10,
                        border: 'none', background: '#1d7bff', color: '#fff',
                        fontSize: 12, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                      }}
                    >
                      {isLoading ? 'Checking…' : r ? 'Re-check' : 'Verify'}
                    </button>
                  </div>

                  {r && !r.error && (
                    <div style={{ marginTop: 12 }}>
                      {/* Quality badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: qualityColor(r.quality) + '20', color: qualityColor(r.quality),
                        }}>
                          {r.quality.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {r.total_chunks} chunks · {r.empty_chunks} empty · avg {r.avg_chars_per_chunk} chars
                        </span>
                        {r.total_chunks > 0 && (
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            · {r.total_chars.toLocaleString()} total chars
                          </span>
                        )}
                      </div>

                      {/* Chunk preview list */}
                      {r.chunks?.length > 0 && (
                        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {r.chunks.map((chunk) => (
                            <div key={chunk.chunk_index} style={{
                              padding: '8px 10px', borderRadius: 10,
                              background: chunk.is_empty ? '#fff1f2' : '#f0fdf4',
                              border: `1px solid ${chunk.is_empty ? '#fecdd3' : '#bbf7d0'}`,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700,
                                  color: chunk.is_empty ? '#f43f5e' : '#10b981',
                                }}>
                                  #{chunk.chunk_index} · {chunk.char_count} chars
                                  {chunk.metadata?.ocr ? ' · OCR' : ''}
                                </span>
                                {chunk.metadata?.chapter_title && (
                                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                    {chunk.metadata.chapter_title}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                                {chunk.is_empty ? '⚠ Empty or near-empty chunk' : chunk.preview}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {r.quality !== 'good' && (
                        <p style={{ marginTop: 8, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                          {r.quality === 'poor'
                            ? '⚠ No content extracted. This document may be image-only — OCR will be applied on re-upload.'
                            : '⚠ Some pages have low text content. OCR was applied where possible.'}
                        </p>
                      )}
                    </div>
                  )}

                  {r?.error && (
                    <p style={{ marginTop: 8, fontSize: 12, color: '#f43f5e' }}>{r.error}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const AssessmentHistory = ({ assessments, onOpen, onStartNew }) => (
  <section className="assessment-report">
    <div className="report-score-wrap">
      <div>
        <p className="assessment-eyebrow">Assessment history</p>
        <h1>Your progress for this topic</h1>
        <p>Review previous results or start a fresh assessment.</p>
      </div>
      <button type="button" className="assessment-primary-button" onClick={onStartNew}>
        Start new assessment
      </button>
    </div>
    <div className="report-panel">
      <p className="assessment-eyebrow">Previous attempts</p>
      <div className="strength-list">
        {assessments.map((item) => {
          const weak = item.revision_plan?.weak_sections || []
          const focus = weak[0]?.focus_area || weak[0]?.label || 'Review your topic feedback'
          const rating = item.revision_plan?.overall_rating || 'pending'
          const percentage = item.revision_plan?.overall_percentage || 0
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              className="assessment-history-row"
              style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', border: 0, borderBottom: '1px solid #eef2f7', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
            >
              <div>
                <strong>{item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'Completed assessment'}</strong>
                <span>{item.total_questions} questions · Focus: {focus}</span>
              </div>
              <div className={`rating-pill ${rating === 'pending' ? 'medium' : rating}`}>
                {rating} · {Math.round(percentage)}%
              </div>
            </button>
          )
        })}
      </div>
    </div>
  </section>
)

/* ── MAIN COMPONENT ── */
const Assessment = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const topicId = new URLSearchParams(location.search).get('topicId')
  const assessmentId = new URLSearchParams(location.search).get('assessmentId')

  const [phase, setPhase] = useState('welcome')
  const [lineIndex, setLineIndex] = useState(0)
  const [questionCount, setQuestionCount] = useState(10)
  const [questionMix, setQuestionMix] = useState(questionMixDefaults(10))
  const [codingTopic, setCodingTopic] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [assessmentHistory, setAssessmentHistory] = useState([])
  const [answers, setAnswers] = useState({})
  const [activeIndex, setActiveIndex] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState(null)
  const [reviewAnswers, setReviewAnswers] = useState([])
  const [showVerify, setShowVerify] = useState(false)
  const [documents, setDocuments] = useState([])
  const [confirmNew, setConfirmNew] = useState(false)
  const [topicSubjectId, setTopicSubjectId] = useState(null)

  /* rotating intro lines */
  useEffect(() => {
    const t = window.setInterval(() => setLineIndex((i) => (i + 1) % introLines.length), 2600)
    return () => window.clearInterval(t)
  }, [])

  /* fetch documents for verify panel */
  useEffect(() => {
    if (!topicId) return
    axios
      .get(`/api/V1/details/topics/${topicId}/documents/`, { headers: authHeader() })
      .then((res) => setDocuments(res.data.documents || []))
      .catch(() => {})
  }, [topicId])

  useEffect(() => {
    if (!topicId) return
    axios
      .get(`/api/V1/topics/${topicId}/`, { headers: authHeader() })
      .then((res) => {
        const topic = res.data
        setTopicSubjectId(topic.subject)
        const isCoding = codingTopicPattern.test(`${topic.title || ''} ${topic.description || ''}`)
        setCodingTopic(isCoding)
        setQuestionMix(questionMixDefaults(questionCount, isCoding))
      })
      .catch(() => setCodingTopic(false))
  }, [topicId])

  /* load / resume assessment:
     - if assessmentId in URL → load that specific one
     - if no assessmentId → check if there's an in_progress one for this topic */
  useEffect(() => {
    if (!topicId) return

    const load = async () => {
      setBusy(true); setError('')
      try {
        let targetId = assessmentId

        // No assessmentId in URL — check for an existing in_progress assessment
        if (!targetId) {
          const listRes = await axios.get(
            `/api/V1/details/topics/${topicId}/assessments/`,
            { headers: authHeader() }
          )
          const all = listRes.data?.data || []
          const completed = all.filter((item) => item.status === 'completed')
          setAssessmentHistory(completed)
          const inProgress = all.find((a) => a.status === 'in_progress')
          if (!inProgress) {
            setPhase(completed.length ? 'history' : 'welcome')
            setBusy(false)
            return
          }
          targetId = inProgress.id
        }

        const res = await axios.get(
          `/api/V1/details/assessments/${targetId}/resume/`,
          { headers: authHeader() }
        )
        const { data: loaded, saved_answers, resume_index } = res.data

        if (loaded.status === 'completed') {
          setAssessment(loaded)
          setReport(loaded.revision_plan || {})
          const reportRes = await axios.get(
            `/api/V1/details/assessments/${targetId}/report/`,
            { headers: authHeader() }
          )
          setReviewAnswers(reportRes.data.answers || [])
          setPhase('report')
        } else if (loaded.status === 'in_progress') {
          const restored = {}
          ;(loaded.questions || []).forEach((q) => {
            if (saved_answers[String(q.id)] !== undefined) {
              restored[q.id] = q.question_type === 'multi_select'
                ? parseMultiSelectAnswer(saved_answers[String(q.id)])
                : saved_answers[String(q.id)]
            }
          })
          setAssessment(loaded)
          setAnswers(restored)
          setActiveIndex(resume_index ?? 0)
          setPhase('resume') // special phase — show resume screen first
        }
      } catch (err) {
        if (err?.response?.status !== 409) setError(readError(err))
      } finally {
        setBusy(false)
      }
    }

    load()
  }, [topicId, assessmentId])

  const questions = assessment?.questions || []
  const activeQuestion = questions[activeIndex]
  const progress = questions.length ? ((activeIndex + 1) / questions.length) * 100 : 0
  const hasAnswer = activeQuestion && String(answers[activeQuestion.id] || '').trim().length > 0

  /* save current answer then navigate back (pause) */
  const handleBack = async () => {
    if (phase === 'active' && activeQuestion && String(answers[activeQuestion.id] || '').trim()) {
      try {
        await axios.post(
          `/api/V1/details/assessments/${assessment.id}/answers/`,
          { question_id: activeQuestion.id, answer: answers[activeQuestion.id] },
          { headers: authHeader() }
        )
      } catch (_) { /* best-effort */ }
    }
    navigate(-1)
  }

  const startFresh = async () => {
    // Abandon current in-progress assessment and create a new one
    if (Object.values(questionMix).reduce((total, count) => total + count, 0) !== questionCount) {
      setError('MCQ, descriptive, and coding counts must equal the total question count.')
      return
    }
    setConfirmNew(false)
    setBusy(true); setError('')
    try {
      const created = await axios.post(
        `/api/V1/details/topics/${topicId}/assessments/`,
        { title: 'Topic assessment', question_count: questionCount, question_type_counts: questionMix },
        { headers: authHeader() }
      )
      const started = await axios.post(
        `/api/V1/details/assessments/${created.data.data.id}/start/`,
        {},
        { headers: authHeader() }
      )
      setAssessment(started.data.data)
      setAnswers({})
      setReviewAnswers([])
      setActiveIndex(0)
      setPhase('active')
    } catch (err) {
      setError(readError(err))
    } finally { setBusy(false) }
  }

  const startNewFromHistory = () => {
    setAssessment(null)
    setReport(null)
    setError('')
    setPhase('welcome')
  }

  const openAssessmentHistoryItem = (id) => {
    navigate(`/subjects/topics/assessment?topicId=${topicId}&assessmentId=${id}`)
  }

  const createAssessment = async () => {
    if (!topicId) { setError('Choose a topic before starting an assessment.'); return }
    if (Object.values(questionMix).reduce((total, count) => total + count, 0) !== questionCount) {
      setError('MCQ, descriptive, and coding counts must equal the total question count.')
      return
    }
    setBusy(true); setError('')
    try {
      const created = await axios.post(
        `/api/V1/details/topics/${topicId}/assessments/`,
        { title: 'Topic assessment', question_count: questionCount, question_type_counts: questionMix },
        { headers: authHeader() }
      )
      const started = await axios.post(
        `/api/V1/details/assessments/${created.data.data.id}/start/`,
        {},
        { headers: authHeader() }
      )
      setAssessment(started.data.data)
      setAnswers({})
      setReviewAnswers([])
      setActiveIndex(0)
      setPhase('active')
    } catch (err) {
      setError(readError(err))
    } finally { setBusy(false) }
  }

  const updateAnswer = (answer) =>
    setAnswers((cur) => ({ ...cur, [activeQuestion.id]: answer }))

  const saveAndAdvance = async () => {
    if (activeIndex === questions.length - 1) {
      await submitAssessment()
      return
    }
    setBusy(true); setError('')
    try {
      await axios.post(
        `/api/V1/details/assessments/${assessment.id}/answers/`,
        { question_id: activeQuestion.id, answer: answers[activeQuestion.id] || '' },
        { headers: authHeader() }
      )
      setActiveIndex((i) => i + 1)
    } catch (err) {
      setError(readError(err))
    } finally { setBusy(false) }
  }

  const submitAssessment = async () => {
    setBusy(true); setError('')
    try {
      const res = await axios.post(
        `/api/V1/details/assessments/${assessment.id}/submit/`,
        { answers: questions.map((q) => ({ question_id: q.id, answer: answers[q.id] || '' })) },
        { headers: authHeader() }
      )
      setReport(res.data.report)
      setReviewAnswers(res.data.answers || [])
      setPhase('report')
    } catch (err) {
      setError(readError(err))
    } finally { setBusy(false) }
  }

  const actionLabel = useMemo(
    () => (activeIndex === questions.length - 1 ? 'Submit assessment' : 'Continue'),
    [activeIndex, questions.length]
  )

  return (
    <main className={`assessment-page my-3 ${phase === 'active' ? 'is-active' : ''}`}>
      <div className="assessment-dot-field" aria-hidden="true">
        <DotField
          dotRadius={1.15}
          dotSpacing={18}
          bulgeStrength={42}
          glowRadius={130}
          cursorRadius={340}
          cursorForce={0.08}
          bulgeOnly
          gradientFrom="#c5d5ed"
          gradientTo="#aebee1"
          glowColor="#dce9ff"
        />
      </div>

      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <button type="button" className="assessment-back" onClick={handleBack}>← Back</button>
        {phase !== 'report' && (
          <button
            type="button"
            onClick={() => setShowVerify(true)}
            style={{
              padding: '6px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#fff', fontSize: 12, fontWeight: 600, color: '#64748b',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Verify Docs
          </button>
        )}
      </div>

      {phase === 'report' ? (
        <Report
          report={report}
          answers={reviewAnswers}
          onBack={() => navigate(`/subjects/topics?subjectId=${topicSubjectId}`)}
        />
      ) : phase === 'history' ? (
        <AssessmentHistory
          assessments={assessmentHistory}
          onOpen={openAssessmentHistoryItem}
          onStartNew={startNewFromHistory}
        />
      ) : (
        <div className="assessment-stage">
          <section className="assessment-orb-zone">
            <div className="orb-glow orb-glow-one" /><div className="orb-glow orb-glow-two" />
            <div className="assessment-orb" aria-live="polite">
              <div className="orb-pulse" />
              <div className="orb-core">
                <span>
                  {phase === 'welcome' || phase === 'resume'
                    ? introLines[lineIndex]
                    : `${activeIndex + 1} / ${questions.length}`}
                </span>
              </div>
            </div>

            {/* WELCOME — no in-progress assessment */}
            {phase === 'welcome' && (
              <div className="orb-intro">
                <p className="assessment-eyebrow">Adaptive assessment</p>
                <h1>Show what you know.</h1>
                <p>Your questions are built from every uploaded document in this topic.</p>
                <div className="question-count-picker">
                  {[5, 10, 15].map((count) => (
                    <button key={count} type="button" onClick={() => {
                      setQuestionCount(count)
                      setQuestionMix(questionMixDefaults(count, codingTopic))
                    }}
                      className={questionCount === count ? 'is-selected' : ''}>
                      {count} questions
                    </button>
                  ))}
                </div>
                <div className="question-mix-picker" style={{ margin: '18px auto 20px', maxWidth: 470, padding: 16, border: '1px solid #dce6f5', borderRadius: 18, background: 'rgba(255,255,255,.72)' }}>
                  <p style={{ margin: '0 0 12px', color: '#243756', fontSize: 13, fontWeight: 800 }}>Choose your question mix</p>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${codingTopic ? 4 : 3}, minmax(0, 1fr))`, gap: 10 }}>
                    {[
                      ['mcq', 'MCQs'],
                      ['multi_select', 'Multi-select'],
                      ['short_answer', 'Descriptive'],
                      ...(codingTopic ? [['coding', 'Coding']] : []),
                    ].map(([type, label]) => (
                      <label key={type} style={{ display: 'grid', gap: 6, color: '#64748b', fontSize: 11, fontWeight: 700, textAlign: 'left' }}>
                        <span>{label}</span>
                        <input
                          type="number"
                          min="0"
                          max={questionCount}
                          value={questionMix[type]}
                          onChange={(event) => setQuestionMix((current) => ({
                            ...current,
                            [type]: Math.max(0, Number(event.target.value) || 0),
                          }))}
                          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d6e0f0', borderRadius: 10, padding: '9px 8px', color: '#183c9e', background: '#fff', fontSize: 15, fontWeight: 800, textAlign: 'center', outline: 'none' }}
                        />
                      </label>
                    ))}
                  </div>
                  <small style={{ display: 'block', marginTop: 12, color: Object.values(questionMix).reduce((total, count) => total + count, 0) === questionCount ? '#16804b' : '#d13d5a', fontSize: 11, fontWeight: 700 }}>
                    Total: {Object.values(questionMix).reduce((total, count) => total + count, 0)} / {questionCount}
                  </small>
                </div>
                <button type="button" className="assessment-primary-button"
                  onClick={createAssessment} disabled={busy}>
                  {busy ? 'Building your assessment…' : 'Begin assessment'}
                </button>
                {error && <p className="assessment-error">{error}</p>}
              </div>
            )}

            {/* RESUME — in-progress assessment found */}
            {phase === 'resume' && assessment && (
              <div className="orb-intro">
                <p className="assessment-eyebrow">Assessment in progress</p>
                <h1>Continue where you left off.</h1>
                <p>
                  You have answered{' '}
                  <b>{Object.keys(answers).length}</b> of{' '}
                  <b>{questions.length}</b> questions.
                </p>
                <button type="button" className="assessment-primary-button me-3"
                  onClick={() => setPhase('active')} disabled={busy}>
                  Resume Assessment
                </button>
                <button type="button" className="assessment-secondary-button"
                  style={{ marginTop: 10 }}
                  onClick={() => setConfirmNew(true)} disabled={busy}>
                  Start New Assessment
                </button>
                {error && <p className="assessment-error">{error}</p>}
              </div>
            )}
          </section>

          {phase === 'active' && activeQuestion && (
            <section className="assessment-question-zone">
              <div className="assessment-progress">
                <div style={{ width: `${progress}%` }} />
              </div>
              <div className="question-meta">
                <span>Question {activeIndex + 1} of {questions.length}</span>
                <span>{activeQuestion.difficulty} level</span>
              </div>
              <p className="assessment-eyebrow">Take your time</p>
              <h1>{activeQuestion.question_text}</h1>
              <QuestionInput
                question={activeQuestion}
                value={answers[activeQuestion.id]}
                onChange={updateAnswer}
              />
              {error && <p className="assessment-error">{error}</p>}
              <div className="question-actions">
                <button
                  type="button"
                  className="assessment-secondary-button"
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  disabled={activeIndex === 0 || busy}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="assessment-primary-button"
                  disabled={!hasAnswer || busy}
                  onClick={saveAndAdvance}
                >
                  {busy ? 'Saving…' : actionLabel}
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {showVerify && (
        <ExtractionVerifyPanel
          topicId={topicId}
          documents={documents}
          onClose={() => setShowVerify(false)}
        />
      )}

      {confirmNew && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmNew(false)
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center',
            padding: 20, background: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(4px)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-assessment-title"
            aria-describedby="new-assessment-description"
            style={{
              width: 'min(440px, 100%)', padding: 26, border: '1px solid #dce6f5',
              borderRadius: 20, background: '#fff', boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)',
            }}
          >
            <p className="assessment-eyebrow">Start over</p>
            <h2 id="new-assessment-title" style={{ margin: '8px 0', color: '#102352', fontSize: 22 }}>
              Start a new assessment?
            </h2>
            <p id="new-assessment-description" style={{ margin: '0 0 22px', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
              Your current attempt will stay saved. Choose the size and question mix for the new assessment.
            </p>
            <div className="question-count-picker" role="group" aria-label="Number of questions">
              {[5, 10, 15].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    setQuestionCount(count)
                    setQuestionMix(questionMixDefaults(count, codingTopic))
                  }}
                  className={questionCount === count ? 'is-selected' : ''}
                  aria-pressed={questionCount === count}
                  disabled={busy}
                >
                  {count} questions
                </button>
              ))}
            </div>
            <div className="question-mix-picker" style={{ margin: '18px 0 22px', padding: 14, border: '1px solid #dce6f5', borderRadius: 16, background: '#f8fbff' }}>
              <p style={{ margin: '0 0 10px', color: '#243756', fontSize: 12, fontWeight: 800 }}>Question mix</p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${codingTopic ? 4 : 3}, minmax(0, 1fr))`, gap: 8 }}>
                {[
                  ['mcq', 'MCQs'],
                  ['multi_select', 'Multi-select'],
                  ['short_answer', 'Descriptive'],
                  ...(codingTopic ? [['coding', 'Coding']] : []),
                ].map(([type, label]) => (
                  <label key={type} style={{ display: 'grid', gap: 5, color: '#64748b', fontSize: 10, fontWeight: 700 }}>
                    <span>{label}</span>
                    <input
                      type="number"
                      min="0"
                      max={questionCount}
                      value={questionMix[type]}
                      onChange={(event) => setQuestionMix((current) => ({
                        ...current,
                        [type]: Math.max(0, Number(event.target.value) || 0),
                      }))}
                      disabled={busy}
                      style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d6e0f0', borderRadius: 9, padding: '7px 6px', color: '#183c9e', background: '#fff', fontSize: 14, fontWeight: 800, textAlign: 'center' }}
                    />
                  </label>
                ))}
              </div>
              <small style={{ display: 'block', marginTop: 9, color: Object.values(questionMix).reduce((total, count) => total + count, 0) === questionCount ? '#16804b' : '#d13d5a', fontSize: 10, fontWeight: 700 }}>
                Total: {Object.values(questionMix).reduce((total, count) => total + count, 0)} / {questionCount}
              </small>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="assessment-secondary-button"
                onClick={() => setConfirmNew(false)}
                disabled={busy}
              >
                Keep current attempt
              </button>
              <button
                type="button"
                className="assessment-primary-button"
                onClick={startFresh}
                disabled={busy}
              >
                {busy ? 'Starting…' : 'Start new'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default Assessment
