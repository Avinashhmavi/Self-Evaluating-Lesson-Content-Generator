export const API = import.meta.env.VITE_API || 'http://127.0.0.1:8000'

export const SUGGESTIONS = [
  'Introduction to RAG (Retrieval-Augmented Generation)',
  'Introduction to Large Language Models',
  'What is MCP (Model Context Protocol)?',
  'How vector databases work',
  'What is prompt engineering?',
]

export async function getJSON(path, init) {
  const r = await fetch(`${API}${path}`, init)
  if (!r.ok) throw new Error(`Server returned ${r.status}`)
  return r.json()
}

export async function* sseStream(path, body, signal) {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
  if (!res.ok || !res.body) throw new Error(res.status === 422 ? 'Please type a topic of 2 to 120 characters.' : `Server returned ${res.status}`)
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

export const fmtDate = (ts) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(ts * 1000))
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function friendlyError(msg) {
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Cannot reach the lesson server. Start the backend on port 8000, then try again.'
  if (/All judge models failed/i.test(msg)) return 'The reviewer AI is not responding right now (free models can be busy or out of daily quota). Wait a minute and try again.'
  return msg
}
