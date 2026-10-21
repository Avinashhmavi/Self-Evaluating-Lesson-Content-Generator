import { useState } from 'react'
import Markdown from 'react-markdown'
import {
  ArrowUpRight, Check, X, CircleNotch, Circle, DownloadSimple, Copy, FileText, CaretRight,
  SealCheck, WarningCircle, Info, BookOpenText, ClockCounterClockwise, Brain, ListChecks, Plus,
} from '@phosphor-icons/react'
import { API, SUGGESTIONS, fmtDate, fmtTime } from './lib.js'

export function Btn({ kind = 'primary', size, icon = <ArrowUpRight size={16} weight="bold" />, children, ...rest }) {
  return (
    <button className={`btn ${kind} ${size || ''}`} {...rest}>
      {children}
      <span className="ic" aria-hidden="true">{icon}</span>
    </button>
  )
}

function Bezel({ children, tight, className = '', style }) {
  return <div className={`shell ${className}`} style={style}><div className={`core ${tight ? 'tight' : ''}`}>{children}</div></div>
}

function Ring({ passed, total }) {
  const pct = total ? Math.round((100 * passed) / total) : 0
  const color = passed === total ? 'var(--pass)' : 'var(--fail)'
  return <span className="ring" style={{ '--p': pct, '--c': color }} aria-hidden="true"><span>{passed}</span></span>
}

/* ---------------- Create (idle) ---------------- */
export function CreateForm({ topic, setTopic, inject, setInject, onStart, error }) {
  const ok = topic.trim().length >= 2
  return (
    <>
      <section className="hero">
        <div className="hero-copy reveal">
          <span className="eyebrow">Self-checking lesson writer</span>
          <h1 className="h1">Write a beginner lesson. A second AI checks it before anyone reads it.</h1>
          <p className="lead">
            Type a topic. One AI writes the lesson for a first-time learner with simple English. A different AI marks it against
            12 pass or fail checks. If anything fails, the lesson is rewritten, up to 3 drafts.
          </p>
        </div>
        <Bezel className="reveal" style={{ '--i': 2 }}>
          <form className="form" onSubmit={(e) => { e.preventDefault(); if (ok) onStart() }}>
            <div className="field">
              <label className="label" htmlFor="topic">What should the lesson teach?</label>
              <input id="topic" className="input" name="topic" autoComplete="off" spellCheck="false" maxLength={120}
                placeholder="For example: Introduction to Large Language Models…" value={topic} onChange={(e) => setTopic(e.target.value)} />
              <span className="help">Any AI topic works. Introduction to RAG uses 3 trusted sources for fact checking.</span>
            </div>
            <div className="field">
              <span className="label">Or pick one</span>
              <div className="chips">
                {SUGGESTIONS.map((s) => <button type="button" className="chip" key={s} onClick={() => setTopic(s)}>{s}</button>)}
              </div>
            </div>
            <label className="toggle">
              <input type="checkbox" aria-label="Test the checker" aria-describedby="inject-help" checked={inject} onChange={(e) => setInject(e.target.checked)} />
              <span><b>Test the checker</b><span id="inject-help">Plant a false fact and a very long sentence in the first draft, and watch the reviewer catch them.</span></span>
            </label>
            {error && <p className="notice err" role="alert"><WarningCircle size={18} weight="fill" /> {error}</p>}
            <div><Btn type="submit" disabled={!ok}>Write and check lesson</Btn></div>
          </form>
        </Bezel>
      </section>

      <section className="how reveal" style={{ '--i': 4 }} aria-label="How it works">
        {[
          ['01', 'Write', 'The writer AI drafts a lesson with five parts: what it is, why it matters, how it works, an example and a recap.'],
          ['02', 'Quick checks', 'Simple rules measure reading level, sentence length, sections and word count.'],
          ['03', 'Review', 'A reviewer AI checks facts, topic, hard words, the example and the order of ideas.'],
          ['04', 'Fix or ship', 'Any fail sends the lesson back with the reasons. It stops after 3 drafts.'],
        ].map(([n, t, d]) => (
          <div className="how-item" key={n}><span className="how-n">{n}</span><h3>{t}</h3><p>{d}</p></div>
        ))}
      </section>
    </>
  )
}

/* ---------------- Live progress ---------------- */
const STEP_DEFS = [
  ['load_memory', 'Checking past mistakes'],
  ['plan_topic', 'Planning the lesson'],
  ['generate', 'Writing the draft'],
  ['code_checks', 'Quick checks'],
  ['llm_judge', 'Reviewer AI reads it'],
  ['finalize', 'Final decision'],
  ['reflect', 'Saving what it learned'],
]

function stepDetail(key, run) {
  const d = run.drafts[run.drafts.length - 1]
  switch (key) {
    case 'load_memory': return run.pitfalls == null ? 'Looking at earlier runs' : run.pitfalls ? `${run.pitfalls} lesson(s) learned from earlier runs` : 'Nothing learned yet'
    case 'plan_topic': return !run.profile ? 'Deciding what the lesson must cover' : run.profile.grounded ? `Using ${run.profile.n_sources} trusted sources` : 'No source pack, so facts are checked against general knowledge'
    case 'generate': return run.drafts.length > 1 ? `Draft ${run.drafts.length} of ${run.max}, fixing what failed` : `Draft ${Math.max(run.drafts.length, 1)} of ${run.max}`
    case 'code_checks': return d?.checks.length ? `${d.checks.filter((c) => c.kind === 'code' && c.passed).length} of 4 passed` : 'Reading level, sentence length, sections, length'
    case 'llm_judge': return d?.checks.length > 4 ? `${d.checks.filter((c) => c.kind === 'judge' && c.passed).length} of 8 passed` : 'Usually 1 to 3 minutes'
    case 'finalize': return run.final ? (run.final.status === 'PASSED' ? 'Ready to share' : 'Needs a human look') : 'Ship it, or send it back'
    default: return 'Remembering failures for next time'
  }
}

export function Progress({ run, elapsed }) {
  const current = STEP_DEFS.find(([k]) => run.steps[k] === 'active')
  return (
    <Bezel tight>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h2 className="h2" style={{ fontSize: 18 }}>Progress</h2>
        <span className="timer num" aria-label={`Time elapsed ${fmtTime(elapsed)}`}>{fmtTime(elapsed)}</span>
      </div>
      <p className="sr" aria-live="polite">{current ? current[1] : ''}</p>
      <ol className="steps">
        {STEP_DEFS.map(([k, t]) => {
          const s = run.steps[k] || 'idle'
          return (
            <li className="step" data-s={s} key={k}>
              <span className="step-icon" aria-hidden="true">
                {s === 'done' ? <Check size={14} weight="bold" /> : s === 'fail' ? <X size={14} weight="bold" /> : s === 'active' ? <CircleNotch size={16} weight="bold" className="spin" /> : <Circle size={8} weight="fill" />}
              </span>
              <span><b>{t}</b><small>{stepDetail(k, run)}</small></span>
            </li>
          )
        })}
      </ol>
      {run.inject && <p className="notice warn" style={{ marginTop: 12 }}><Info size={18} /> Test mode: draft 1 has a planted false fact and a long sentence.</p>}
    </Bezel>
  )
}

/* ---------------- Drafts ---------------- */
function CheckRow({ c, i }) {
  const ok = c.passed === undefined ? 'wait' : String(c.passed)
  return (
    <li className="check" data-ok={ok} style={{ '--i': i }}>
      <span className="check-ic" aria-hidden="true">{ok === 'true' ? <Check size={12} weight="bold" /> : ok === 'false' ? <X size={12} weight="bold" /> : <CircleNotch size={12} className="spin" />}</span>
      <div>
        <b>{c.name}</b><span className="tag">{ok === 'true' ? 'pass' : ok === 'false' ? 'fail' : 'checking'}</span>
        <p>{c.reason}</p>
      </div>
    </li>
  )
}

export function Drafts({ run, rubric, tab, setTab }) {
  const d = run.drafts.find((x) => x.n === tab) || run.drafts[run.drafts.length - 1]
  if (!d) {
    return <Bezel><h2 className="h2" style={{ fontSize: 18, marginBottom: 16 }}>Writing draft 1</h2><div className="skel" aria-label="Loading"><i /><i /><i /><i /></div></Bezel>
  }
  const byId = Object.fromEntries(d.checks.map((c) => [c.id, c]))
  const rows = (rubric?.checks || d.checks).map((r) => byId[r.id] || { id: r.id, name: r.name, kind: r.kind, reason: r.kind === 'code' ? 'Measuring…' : 'Waiting for the reviewer…' })
  rows.sort((a, b) => (a.passed === false ? -1 : 0) - (b.passed === false ? -1 : 0))
  const passed = d.checks.filter((c) => c.passed).length
  const total = rubric?.checks.length || 12
  const complete = d.checks.length >= total
  return (
    <Bezel>
      <div className="draft-tabs" role="group" aria-label="Choose a draft">
        {run.drafts.map((x) => {
          const p = x.checks.filter((c) => c.passed).length
          return (
            <button key={x.n} className="draft-tab" aria-pressed={x.n === d.n} onClick={() => setTab(x.n)}>
              <Ring passed={p} total={total} /> Draft {x.n}
            </button>
          )
        })}
      </div>
      <div className="score-line">
        <strong className="num">{passed}/{total}</strong>
        <span className="muted">{complete ? (passed === total ? 'checks passed. This draft is good enough to ship.' : `checks passed. ${total - passed} problem(s) to fix.`) : 'checks so far. Still reviewing…'}</span>
      </div>
      <ul className="checks">{rows.map((c, i) => <CheckRow c={c} i={i} key={c.id} />)}</ul>
      <details className="disclose">
        <summary><CaretRight size={14} weight="bold" /> Read draft {d.n}</summary>
        <div className="reader" style={{ margin: '12px 0 0', fontSize: 16 }}><Markdown>{d.lesson}</Markdown></div>
      </details>
    </Bezel>
  )
}

/* ---------------- Result ---------------- */
export function Verdict({ final, topic, max }) {
  const ok = final.status === 'PASSED'
  const [copied, setCopied] = useState(false)
  const md = () => {
    const url = URL.createObjectURL(new Blob([`# ${topic}\n\n${final.lesson}`], { type: 'text/markdown' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'lesson.md' })
    a.click(); URL.revokeObjectURL(url)
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(final.lesson); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { setCopied(false) }
  }
  return (
    <Bezel className="reveal">
      <div className="verdict" data-ok={ok}>
        <span className="verdict-ic" aria-hidden="true">{ok ? <SealCheck size={30} weight="duotone" /> : <WarningCircle size={30} weight="duotone" />}</span>
        <div>
          <h2>{ok ? 'Ready to share' : 'Needs a human look'}</h2>
          <p>{ok ? `Passed all 12 checks on draft ${final.attempt || ''}.` : `No draft passed every check in ${max} tries. This is the best draft (number ${final.attempt}). Read “How it got here” before using it.`}</p>
        </div>
        <div className="actions">
          {final.runId && <a className="btn primary sm" href={`${API}/api/runs/${final.runId}/docx`} download>Download Word<span className="ic" aria-hidden="true"><DownloadSimple size={15} weight="bold" /></span></a>}
          <Btn kind="ghost" size="sm" icon={<FileText size={15} />} onClick={md}>Markdown</Btn>
          <Btn kind="ghost" size="sm" icon={copied ? <Check size={15} weight="bold" /> : <Copy size={15} />} onClick={copy}>{copied ? 'Copied' : 'Copy text'}</Btn>
        </div>
      </div>
    </Bezel>
  )
}

export function Story({ log, rubric }) {
  if (!log?.length) return null
  const names = Object.fromEntries((rubric?.checks || []).map((c) => [c.id, c.name]))
  const last = log[log.length - 1].attempt
  return (
    <Bezel tight>
      <h2 className="h2" style={{ fontSize: 18, marginBottom: 16 }}>How it got here</h2>
      <ol className="story">
        {log.map((l) => (
          <li key={l.attempt} data-ok={!l.failed.length}>
            <span className="story-n">{l.attempt}</span>
            <div>
              <h3>Draft {l.attempt}: {l.passed} of {l.total} passed</h3>
              {l.failed.length ? (
                <>
                  <ul>{l.failed.map((f) => <li key={f.id}><b>{names[f.id] || f.name}.</b> {f.reason}</li>)}</ul>
                  <p className="fix">{l.changes ? `What the writer changed next:\n${l.changes}` : l.attempt === last ? 'No tries left, so the best draft was kept.' : 'The writer did not describe its changes.'}</p>
                </>
              ) : <ul><li>Every check passed.</li></ul>}
            </div>
          </li>
        ))}
      </ol>
    </Bezel>
  )
}

export function Reader({ topic, lesson, meta }) {
  return (
    <Bezel>
      <article className="reader">
        <div className="reader-meta">{meta}</div>
        <h1 style={{ marginTop: 10 }}>{topic}</h1>
        <Markdown>{lesson}</Markdown>
      </article>
    </Bezel>
  )
}

/* ---------------- History ---------------- */
export function History({ mem, onOpen, onNew }) {
  const runs = mem?.runs || []
  return (
    <section className="reveal">
      <div className="section-head">
        <span className="eyebrow"><ClockCounterClockwise size={12} /> History</span>
        <h1 className="h1" style={{ fontSize: 34 }}>Every lesson the system has written</h1>
        <p>Open any run to read the lesson and see why earlier drafts were rejected.</p>
      </div>
      {!runs.length ? (
        <div className="empty"><span className="ic"><BookOpenText size={22} /></span><h3>No lessons yet</h3><p className="muted">Write your first lesson to see it here.</p><Btn onClick={onNew} icon={<Plus size={16} weight="bold" />}>Write a lesson</Btn></div>
      ) : (
        <ul className="list">
          {runs.map((r, i) => (
            <li className="row-item reveal" key={r.id} style={{ '--i': Math.min(i, 8) }}>
              <div><h3>{r.topic}</h3><small>{fmtDate(r.ts)} · {r.attempts} draft(s){r.first_pass ? ' · passed on first try' : ''}</small></div>
              <span className={`pill ${r.status === 'PASSED' ? 'ok' : 'no'} hide-sm`}>{r.status === 'PASSED' ? 'Ready to share' : 'Needs a look'}</span>
              <Btn kind="ghost" size="sm" onClick={() => onOpen(r.id)} aria-label={`Open lesson ${r.id}: ${r.topic}`}>Open</Btn>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ---------------- Learning ---------------- */
export function Learning({ mem, rubric, onAct }) {
  if (!mem) return null
  const runs = [...mem.runs].reverse()
  const rate = runs.length ? Math.round((100 * runs.filter((r) => r.first_pass).length) / runs.length) : 0
  const names = Object.fromEntries((rubric?.checks || []).map((c) => [c.id, c.name]))
  return (
    <section className="reveal">
      <div className="section-head">
        <span className="eyebrow"><Brain size={12} /> Learning</span>
        <h1 className="h1" style={{ fontSize: 34 }}>What the system has learned</h1>
        <p>Every failed first draft is remembered. The writer is warned about repeat mistakes next time, and you decide whether new rules are added.</p>
      </div>
      <div className="learn-grid">
        <Bezel>
          <span className="muted">Lessons that passed on the first draft</span>
          <div className="big-stat num" style={{ marginTop: 8 }}>{rate}%</div>
          <p className="muted" style={{ marginTop: 6 }}>{runs.filter((r) => r.first_pass).length} of {runs.length} runs</p>
          <div className="bars" role="img" aria-label="First draft result for each run, oldest first">
            {runs.map((r, i) => <span key={r.id} data-ok={!!r.first_pass} style={{ '--i': i }} title={`${r.topic}: ${r.first_pass ? 'passed first time' : 'needed rewrites'}`} />)}
          </div>
          <div className="legend"><span><i style={{ background: 'var(--pass)' }} />Passed first time</span><span><i style={{ background: 'var(--tray)' }} />Needed rewrites</span></div>
          <p className="notice info" style={{ marginTop: 18 }}><Info size={18} /> The rules changed while this was being built, so this rate is a rough signal, not a measured improvement.</p>
        </Bezel>
        <div className="stack">
          <Bezel>
            <h2 className="h2" style={{ fontSize: 18 }}>Reminders given to the writer</h2>
            <p className="muted" style={{ marginTop: 4, marginBottom: 8 }}>Mistakes that happened on a first draft. They are added to the writer's instructions on every new run.</p>
            {mem.pitfalls.length ? mem.pitfalls.map((p) => (
              <div className="lesson-item" key={p.check_id}>
                <h3>{names[p.check_id] || p.check_id} <span className="pill pend num">{p.count}x</span></h3>
                <p>{p.advice}</p>
                {p.example && <small>Last time: {p.example}</small>}
              </div>
            )) : <p className="muted">Nothing yet. Reminders appear after the first lesson that needs a rewrite.</p>}
          </Bezel>
          <Bezel>
            <h2 className="h2" style={{ fontSize: 18 }}>Suggested new rules</h2>
            <p className="muted" style={{ marginTop: 4, marginBottom: 8 }}>When the same mistake repeats, the system drafts a rule. Approved rules are added to every future lesson.</p>
            {mem.proposals.length ? mem.proposals.map((p) => (
              <div className="lesson-item" key={p.id}>
                <h3>{names[p.text.slice(1, 3)] || 'Rule'} <span className={`pill ${p.status === 'approved' ? 'ok' : p.status === 'rejected' ? 'rej' : 'pend'}`}>{p.status === 'pending' ? 'Waiting for you' : p.status}</span></h3>
                <p>{p.text.replace(/^\[\w+\]\s*/, '')}</p>
                {p.status === 'pending' && (
                  <div className="actions" style={{ marginTop: 8 }}>
                    <Btn size="sm" icon={<Check size={14} weight="bold" />} onClick={() => onAct(p.id, 'approve')} aria-label={`Approve rule ${p.id}`}>Approve</Btn>
                    <Btn kind="ghost" size="sm" icon={<X size={14} weight="bold" />} onClick={() => onAct(p.id, 'reject')} aria-label={`Reject rule ${p.id}`}>Reject</Btn>
                  </div>
                )}
              </div>
            )) : <p className="muted">No suggestions yet. They appear after 3 runs when a mistake repeats.</p>}
          </Bezel>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Rules ---------------- */
export function Rules({ rubric }) {
  if (!rubric) return null
  const code = rubric.checks.filter((c) => c.kind === 'code')
  const judge = rubric.checks.filter((c) => c.kind === 'judge')
  const Rule = ({ c }) => <div className="rule"><span className="mono">{c.id}</span><div><b>{c.name}</b><p>{c.hint}</p></div></div>
  return (
    <section className="reveal">
      <div className="section-head">
        <span className="eyebrow"><ListChecks size={12} /> Rules</span>
        <h1 className="h1" style={{ fontSize: 34 }}>How every lesson is judged</h1>
        <p>12 checks. Each one is pass or fail, with no partial credit. A single fail sends the lesson back for a rewrite.</p>
      </div>
      <div className="rules-grid">
        <div className="stack">
          <Bezel>
            <h2 className="h2" style={{ fontSize: 18 }}>Measured by simple rules</h2>
            <p className="muted" style={{ margin: '4px 0 8px' }}>Instant and exact. No AI involved.</p>
            {code.map((c) => <Rule c={c} key={c.id} />)}
          </Bezel>
          <Bezel tight>
            <h2 className="h2" style={{ fontSize: 16, marginBottom: 12 }}>Technical details</h2>
            <dl className="kv">
              <dt>Writer AI</dt><dd>{rubric.generator}</dd>
              <dt>Reviewer AI</dt><dd>{rubric.judges.join(', ')}</dd>
              <dt>Max drafts</dt><dd>{rubric.max_attempts}</dd>
            </dl>
          </Bezel>
        </div>
        <Bezel>
          <h2 className="h2" style={{ fontSize: 18 }}>Judged by a reviewer AI</h2>
          <p className="muted" style={{ margin: '4px 0 8px' }}>A different AI from the writer, so it does not grade its own work. It must quote the lesson to justify every pass.</p>
          {judge.map((c) => <Rule c={c} key={c.id} />)}
        </Bezel>
      </div>
    </section>
  )
}
