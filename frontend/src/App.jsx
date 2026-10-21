import { useEffect, useRef, useState } from 'react'
import { PencilSimpleLine, ClockCounterClockwise, Brain, ListChecks, ArrowCounterClockwise, WarningCircle } from '@phosphor-icons/react'
import { getJSON, sseStream, friendlyError, fmtDate } from './lib.js'
import { Btn, CreateForm, Progress, Drafts, Verdict, Story, Reader, History, Learning, Rules } from './views.jsx'

const ORDER = ['load_memory', 'plan_topic', 'generate', 'code_checks', 'llm_judge', 'finalize', 'reflect']
const NAV = [['create', 'Write', PencilSimpleLine], ['history', 'History', ClockCounterClockwise], ['learning', 'Learning', Brain], ['rules', 'Rules', ListChecks]]

const freshRun = (topic, inject, max) => ({ topic, inject, max, steps: { load_memory: 'active' }, drafts: [], log: [], profile: null, pitfalls: null, final: null, judge: '' })

export default function App() {
  const [view, setView] = useState('create')
  const [topic, setTopic] = useState('Introduction to RAG (Retrieval-Augmented Generation)')
  const [inject, setInject] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | running | done | error
  const [run, setRun] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(1)
  const [mem, setMem] = useState(null)
  const [rubric, setRubric] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const abort = useRef(null)
  const started = useRef(0)

  const loadMem = () => getJSON('/api/memory').then(setMem).catch(() => {})
  useEffect(() => {
    loadMem()
    getJSON('/api/rubric').then(setRubric).catch((e) => setError(friendlyError(e.message)))
    return () => abort.current?.abort()
  }, [])

  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [phase])

  const max = rubric?.max_attempts || 3

  function apply(node, u) {
    if (node === 'generate') setTab(u.attempt)
    setRun((r) => {
      const steps = { ...r.steps, [node]: 'done' }
      const next = ORDER[ORDER.indexOf(node) + 1]
      let drafts = r.drafts
      const extra = {}
      if (node === 'load_memory') extra.pitfalls = u.pitfalls.length
      if (node === 'plan_topic') extra.profile = u.profile
      if (node === 'generate') {
        drafts = [...drafts, { n: u.attempt, lesson: u.lesson, checks: [] }]
        steps.code_checks = 'idle'; steps.llm_judge = 'idle'
      }
      if (node === 'code_checks' || node === 'llm_judge') drafts = drafts.map((d, i) => (i === drafts.length - 1 ? { ...d, checks: u.checks } : d))
      if (u.log) extra.log = u.log
      if (node === 'llm_judge') {
        extra.judge = u.judge_model
        const ok = u.checks.every((c) => c.passed)
        if (!ok && drafts.length < r.max) { steps.llm_judge = 'fail'; steps.generate = 'active'; return { ...r, ...extra, steps, drafts } }
      }
      if (node === 'finalize') extra.final = { status: u.status, lesson: u.lesson, attempt: u.attempt }
      if (node === 'reflect') extra.final = { ...r.final, runId: u.run_id }
      if (next) steps[next] = 'active'
      return { ...r, ...extra, steps, drafts }
    })
  }

  async function start() {
    if (!rubric) getJSON('/api/rubric').then(setRubric).catch(() => {})
    loadMem()
    abort.current?.abort()
    abort.current = new AbortController()
    started.current = Date.now()
    setElapsed(0); setError(''); setTab(1)
    setRun(freshRun(topic.trim(), inject, max)); setPhase('running'); setView('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      let finished = false
      for await (const { ev, data } of sseStream('/api/run', { topic: topic.trim(), inject_error: inject }, abort.current.signal)) {
        if (ev === 'node') apply(data.node, data.update)
        if (ev === 'error') throw new Error(data.message)
        if (ev === 'done') finished = true
      }
      if (!finished) throw new Error('The connection closed before the lesson was finished.')
      setPhase('done')
      loadMem()
    } catch (e) {
      if (e.name === 'AbortError') return
      setRun((r) => r && { ...r, steps: Object.fromEntries(Object.entries(r.steps).map(([k, v]) => [k, v === 'active' ? 'fail' : v])) })
      setError(friendlyError(e.message)); setPhase('error')
    }
  }

  async function openRun(id) {
    try {
      const r = await getJSON(`/api/runs/${id}`)
      const best = r.log.reduce((b, l) => (!b || l.passed >= b.passed ? l : b), null)
      setRun({ ...freshRun(r.topic, false, max), past: r.ts, log: r.log, final: { status: r.status, lesson: r.lesson, attempt: best?.attempt || r.attempts, runId: r.id } })
      setPhase('done'); setView('create'); window.scrollTo({ top: 0 })
    } catch (e) { setError(friendlyError(e.message)) }
  }

  async function act(id, action) {
    await getJSON(`/api/proposals/${id}/${action}`, { method: 'POST' }).catch(() => {})
    loadMem()
  }

  const reset = () => { setPhase('idle'); setRun(null); setError(''); setView('create') }

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="nav-wrap">
        <nav className="nav" aria-label="Main">
          <span className="brand"><span className="brand-mark" aria-hidden="true"><ListChecks size={15} weight="bold" /></span><span>Lesson Gate</span></span>
          {NAV.map(([k, label, Icon]) => (
            <button key={k} aria-current={view === k ? 'page' : undefined} onClick={() => { setView(k); window.scrollTo({ top: 0 }); loadMem(); if (!rubric) getJSON('/api/rubric').then(setRubric).catch(() => {}) }}>
              {k === 'create' && phase === 'running' ? <span className="dot" aria-hidden="true" /> : <Icon size={15} />}
              {k === 'create' && phase === 'running' ? 'Writing…' : label}
            </button>
          ))}
        </nav>
      </div>

      <main id="main" className="page">
        {view === 'create' && phase === 'idle' && (
          <CreateForm topic={topic} setTopic={setTopic} inject={inject} setInject={setInject} onStart={start} error={error} />
        )}

        {view === 'create' && phase !== 'idle' && run && (
          <>
            <div className="run-title reveal">
              <span className="eyebrow">{run.past ? `Saved lesson · ${fmtDate(run.past)}` : phase === 'running' ? 'Working on it' : 'Lesson'}</span>
              <h1 className="h1" style={{ fontSize: 'clamp(26px, 3.4vw, 38px)' }}>{run.topic}</h1>
              {phase === 'running' && <p className="muted">This takes about 3 to 8 minutes. Each draft is checked live below.</p>}
            </div>

            {phase === 'error' && (
              <div className="notice err reveal" role="alert" style={{ marginBottom: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', gap: 10 }}><WarningCircle size={18} weight="fill" /> {error}</span>
                <span className="actions">
                  <Btn size="sm" icon={<ArrowCounterClockwise size={14} weight="bold" />} onClick={start}>Try again</Btn>
                  <Btn size="sm" kind="ghost" icon={<PencilSimpleLine size={14} />} onClick={reset}>Change topic</Btn>
                </span>
              </div>
            )}

            {phase === 'done' && run.final && (
              <div className="stack">
                <Verdict final={run.final} topic={run.topic} max={max} />
                <div className="run-grid">
                  <div className="sticky stack">
                    <Story log={run.log} rubric={rubric} />
                    <div><Btn kind="ghost" icon={<PencilSimpleLine size={15} />} onClick={reset}>Write another lesson</Btn></div>
                  </div>
                  <div className="stack">
                    {run.drafts.length > 0 && <Drafts run={run} rubric={rubric} tab={tab} setTab={setTab} />}
                    <Reader topic={run.topic} lesson={run.final.lesson}
                      meta={<><span>{run.final.lesson.split(/\s+/).length} words</span><span>{run.log.length || run.final.attempt} draft(s)</span>{run.profile && <span>{run.profile.grounded ? `Checked against ${run.profile.n_sources} sources` : 'Checked against general knowledge'}</span>}</>} />
                  </div>
                </div>
              </div>
            )}

            {phase !== 'done' && (
              <div className="run-grid">
                <div className="sticky"><Progress run={run} elapsed={elapsed} /></div>
                {(phase === 'running' || run.drafts.length > 0) && <Drafts run={run} rubric={rubric} tab={tab} setTab={setTab} />}
              </div>
            )}
          </>
        )}

        {view === 'history' && <History mem={mem} onOpen={openRun} onNew={reset} />}
        {view === 'learning' && <Learning mem={mem} rubric={rubric} onAct={act} />}
        {view === 'rules' && <Rules rubric={rubric} />}
      </main>
    </>
  )
}
