import { useEffect, useMemo, useRef, useState } from 'react'
import Markdown from 'react-markdown'

const API = import.meta.env.VITE_API || 'http://127.0.0.1:8000'
const NODES = ['load_memory', 'generate', 'code_checks', 'llm_judge', 'finalize', 'reflect']

async function* sseStream(url, body, signal) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
  if (!res.ok || !res.body) throw new Error(`Server returned ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i)
      buf = buf.slice(i + 2)
      const ev = /event: (.*)/.exec(block)?.[1]
      const data = /data: (.*)/s.exec(block)?.[1]
      if (ev && data) yield { ev, data: JSON.parse(data) }
    }
  }
}

function CheckList({ checks }) {
  if (!checks?.length) return <p className="muted">Waiting for checks…</p>
  return (
    <ul className="checks">
      {checks.map((c) => (
        <li key={c.id} data-ok={c.passed}>
          <span className="id">{c.id} · {c.kind}</span>
          <br />
          <b>{c.passed ? 'Pass' : 'Fail'}: {c.name}</b>
          <span className="why">{c.reason}</span>
        </li>
      ))}
    </ul>
  )
}

function Pipeline({ active, seen, attempt, max }) {
  return (
    <div>
      <ol className="pipe" aria-label="Pipeline progress">
        {NODES.map((n) => (
          <li key={n} data-s={active === n ? 'active' : seen.has(n) ? 'done' : 'idle'}>{n}</li>
        ))}
      </ol>
      <p className="muted num" style={{ marginTop: 8 }} aria-live="polite">
        {attempt ? `Attempt ${attempt} of ${max}` : 'Idle'}
      </p>
    </div>
  )
}

function RejectionLog({ log }) {
  const rows = log.filter((l) => l.failed.length)
  if (!rows.length) return <p className="muted">No rejections yet.</p>
  return (
    <div className="stack">
      {rows.map((l) => (
        <article className="rej" key={l.attempt}>
          <h3>Attempt {l.attempt} <span className="muted num">({l.passed} of {l.total} checks passed)</span></h3>
          <ul className="fails">
            {l.failed.map((f) => (
              <li key={f.id}><b>{f.id} {f.name}.</b> {f.reason}</li>
            ))}
          </ul>
          <p className="chg"><b>Changed on retry:</b> {l.changes || (l.attempt === log[log.length - 1].attempt ? 'No retry (attempt cap reached).' : 'The writer did not describe its changes.')}</p>
        </article>
      ))}
    </div>
  )
}

function MemoryPanel({ mem, onAct, onLoad }) {
  if (!mem) return null
  const runs = [...mem.runs].reverse()
  const rate = runs.length ? Math.round((100 * runs.filter((r) => r.first_pass).length) / runs.length) : 0
  return (
    <section className="card" aria-labelledby="mem-h">
      <h2 id="mem-h">Memory</h2>
      <p className="muted" style={{ margin: '4px 0' }}>Stored in SQLite. Failures from one run shape the next.</p>
      <p className="num"><b>{rate}%</b> first-attempt pass rate over {runs.length} run(s)</p>
      <div className="bars" role="img" aria-label="Per-run first attempt result, oldest first">
        {runs.map((r) => <span key={r.id} data-ok={!!r.first_pass} title={`Run ${r.id}: ${r.topic}`} />)}
      </div>
      <h3 style={{ marginTop: 12 }}>Past Runs</h3>
      {mem.runs.length ? mem.runs.slice(0, 8).map((r) => (
        <div className="pit row" key={r.id} style={{ justifyContent: 'space-between' }}>
          <span className="num">#{r.id} · {r.attempts} attempt(s) · <span className={`badge ${r.status === 'PASSED' ? 'pass' : 'fail'}`}>{r.status}</span></span>
          <button className="small" aria-label={`Open run ${r.id}`} onClick={() => onLoad(r.id)}>Open</button>
        </div>
      )) : <p className="muted">No runs yet.</p>}
      <h3 style={{ marginTop: 12 }}>Pitfalls Fed to the Writer</h3>
      {mem.active.length ? mem.active.map((p) => (
        <div className="pit" key={p.check_id}><b>{p.check_id}</b> failed first try {p.count}x. {p.advice}</div>
      )) : <p className="muted">None yet.</p>}
      <h3 style={{ marginTop: 12 }}>Proposed Rule Changes</h3>
      {mem.proposals.length ? mem.proposals.map((p) => (
        <div className="pit" key={p.id}>
          <p>{p.text}</p>
          <div className="row" style={{ marginTop: 6 }}>
            <span className={`badge ${p.status === 'approved' ? 'pass' : p.status === 'rejected' ? 'fail' : 'warn'}`}>{p.status}</span>
            {p.status === 'pending' && <>
              <button className="small" aria-label={`Approve proposal ${p.id}`} onClick={() => onAct(p.id, 'approve')}>Approve</button>
              <button className="small" aria-label={`Reject proposal ${p.id}`} onClick={() => onAct(p.id, 'reject')}>Reject</button>
            </>}
          </div>
        </div>
      )) : <p className="muted">None yet. Needs 3 runs with a repeated failure.</p>}
    </section>
  )
}

export default function App() {
  const [topic, setTopic] = useState('Introduction to RAG (Retrieval-Augmented Generation)')
  const [inject, setInject] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState([])
  const [log, setLog] = useState([])
  const [final, setFinal] = useState(null)
  const [active, setActive] = useState('')
  const [seen, setSeen] = useState(new Set())
  const [tab, setTab] = useState(1)
  const [mem, setMem] = useState(null)
  const [rubric, setRubric] = useState(null)
  const [judgeModel, setJudgeModel] = useState('')
  const abort = useRef(null)

  const loadMem = () => fetch(`${API}/api/memory`).then((r) => r.json()).then(setMem).catch(() => {})
  useEffect(() => {
    loadMem()
    fetch(`${API}/api/rubric`).then((r) => r.json()).then(setRubric).catch(() => setError('Cannot reach the API. Start the backend on port 8000.'))
  }, [])

  const max = rubric?.max_attempts || 3
  const attempt = attempts.length

  function apply(node, u) {
    setSeen((s) => new Set(s).add(node))
    setActive(NODES[NODES.indexOf(node) + 1] || '')
    if (u.log) setLog(u.log)
    if (node === 'generate') {
      setAttempts((a) => [...a, { n: u.attempt, lesson: u.lesson, changes: u.changes, checks: [] }])
      setTab(u.attempt)
      setSeen(new Set(['load_memory', 'generate']))
    }
    if (node === 'code_checks') setAttempts((a) => a.map((x, i) => (i === a.length - 1 ? { ...x, checks: u.checks } : x)))
    if (node === 'llm_judge') {
      setJudgeModel(u.judge_model)
      setAttempts((a) => a.map((x, i) => (i === a.length - 1 ? { ...x, checks: u.checks } : x)))
      const ok = u.checks.every((c) => c.passed)
      setActive(ok ? 'finalize' : 'generate')
    }
    if (node === 'finalize') setFinal({ status: u.status, lesson: u.lesson, checks: u.checks })
    if (node === 'reflect') loadMem()
  }

  async function run() {
    abort.current?.abort()
    abort.current = new AbortController()
    setRunning(true); setError(''); setAttempts([]); setLog([]); setFinal(null); setSeen(new Set()); setActive('load_memory'); setJudgeModel('')
    try {
      for await (const { ev, data } of sseStream(`${API}/api/run`, { topic, inject_error: inject }, abort.current.signal)) {
        if (ev === 'node') apply(data.node, data.update)
        if (ev === 'error') throw new Error(data.message)
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message)
    } finally {
      setRunning(false); setActive('')
    }
  }

  async function openRun(id) {
    const r = await fetch(`${API}/api/runs/${id}`).then((x) => x.json())
    setAttempts([]); setError(''); setSeen(new Set()); setActive(''); setLog(r.log)
    setFinal({ status: r.status, lesson: r.lesson, checks: [] })
    setTimeout(() => document.getElementById('fin-h')?.scrollIntoView(), 0)
  }

  async function act(id, action) {
    await fetch(`${API}/api/proposals/${id}/${action}`, { method: 'POST' })
    loadMem()
  }

  const current = useMemo(() => attempts.find((a) => a.n === tab), [attempts, tab])
  const download = () => {
    const url = URL.createObjectURL(new Blob([final.lesson], { type: 'text/markdown' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'lesson.md' })
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="wrap">
        <header className="top">
          <div>
            <h1>Lesson Gate</h1>
            <p>An agent writes a beginner lesson, grades it against an 11-point pass/fail rubric, and rewrites it until it clears the bar or runs out of tries.</p>
          </div>
          {rubric && (
            <div className="chips" aria-label="Models in use">
              <span className="chip">writer: {rubric.generator}</span>
              <span className="chip">judge: {judgeModel || rubric.judges[0]}</span>
              <span className="chip">max {rubric.max_attempts} attempts</span>
            </div>
          )}
        </header>

        <main id="main" className="grid">
          <div className="stack">
            <section className="card" aria-labelledby="run-h">
              <h2 id="run-h">Run</h2>
              <form className="row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); run() }}>
                <label className="field">Topic
                  <input type="text" name="topic" autoComplete="off" value={topic} onChange={(e) => setTopic(e.target.value)} />
                </label>
                <label className="check">
                  <input type="checkbox" checked={inject} onChange={(e) => setInject(e.target.checked)} />
                  Inject a deliberate error in attempt 1
                </label>
                <button className="primary" type="submit" disabled={running || !topic.trim()}>{running ? 'Running… (a run takes 3 to 6 minutes)' : 'Generate Lesson'}</button>
              </form>
              <div style={{ marginTop: 16 }}><Pipeline active={active} seen={seen} attempt={attempt} max={max} /></div>
              {error && <p className="err" role="alert" style={{ marginTop: 12 }}>{error}</p>}
            </section>

            {attempts.length > 0 && (
              <section className="card" aria-labelledby="att-h">
                <h2 id="att-h">Attempts</h2>
                <div className="tabs" role="group" aria-label="Choose an attempt" style={{ marginTop: 12 }}>
                  {attempts.map((a) => {
                    const done = a.checks.length >= 11
                    const ok = done && a.checks.every((c) => c.passed)
                    return (
                      <button key={a.n} aria-pressed={tab === a.n} onClick={() => setTab(a.n)}>
                        Attempt {a.n} {done ? (ok ? '· pass' : `· ${a.checks.filter((c) => !c.passed).length} failed`) : '· checking…'}
                      </button>
                    )
                  })}
                </div>
                {current && <>
                  <CheckList checks={current.checks} />
                  <details>
                    <summary>Show This Attempt's Lesson Text</summary>
                    <div className="lesson" style={{ marginTop: 12 }}><Markdown>{current.lesson}</Markdown></div>
                  </details>
                </>}
              </section>
            )}

            {(log.length > 0) && (
              <section className="card" aria-labelledby="log-h">
                <h2 id="log-h">Rejection Log</h2>
                <div style={{ marginTop: 12 }}><RejectionLog log={log} /></div>
              </section>
            )}

            {final && (
              <section className="card" aria-labelledby="fin-h">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h2 id="fin-h">Final Lesson</h2>
                  <div className="row">
                    <span className={`badge ${final.status === 'PASSED' ? 'pass' : 'fail'}`}>{final.status === 'PASSED' ? 'PASSED all checks' : 'FAILED QA, best attempt shown'}</span>
                    <button className="small" onClick={download}>Download Markdown</button>
                  </div>
                </div>
                <div className="lesson" style={{ marginTop: 16 }}><Markdown>{final.lesson}</Markdown></div>
              </section>
            )}
          </div>

          <aside className="stack" aria-label="Memory and rubric">
            <MemoryPanel mem={mem} onAct={act} onLoad={openRun} />
            {rubric && (
              <section className="card" aria-labelledby="rub-h">
                <h2 id="rub-h">Rubric</h2>
                <p className="muted" style={{ margin: '4px 0 8px' }}>Every check is pass or fail. One fail rejects the lesson.</p>
                <details>
                  <summary>Show all {rubric.checks.length} checks</summary>
                  {rubric.checks.map((c) => (
                    <div className="pit" key={c.id}><b>{c.id}</b> {c.name} <span className="chip">{c.kind === 'code' ? 'code' : 'LLM judge'}</span><br /><span className="muted">{c.condition}</span></div>
                  ))}
                </details>
              </section>
            )}
          </aside>
        </main>
      </div>
    </>
  )
}
