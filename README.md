# Lesson Gate

An agentic system that writes a beginner lesson, grades it against a pass/fail rubric, and rewrites it until it clears the bar or runs out of tries. Built for the GenAI Engineer (Content Systems) take-home. Submission topic: Introduction to RAG.

```
load_memory -> plan_topic -> generate -> code_checks -> llm_judge -> decide --pass--> finalize -> reflect
                                ^                                       |
                                +--------- fail, attempts left ---------+        (max 3 attempts)
```

## What it does
- **Plan:** any topic works. A topic with a profile in `backend/topics/` (RAG has one, with 3 sources) is grounded in its source pack. Any other topic gets an auto-planned list of key points and terms, and facts are judged against general knowledge (the UI says so).
- **Generate:** Gemini (`gemini-3.5-flash-lite`) writes a lesson for a 12th-grade Indian learner with limited English.
- **Evaluate:** 12 hard pass/fail checks, including "stays on topic". 4 are plain code (readability, sentence length, sections, length). 8 are judged by a different model family (an OpenRouter free model) that must quote evidence from the lesson for every pass.
- **Regenerate:** failed checks, reasons and offending text go back to the writer. The retry starts from the best attempt so far. At most 2 retries.
- **Output:** the best lesson, a status (`PASSED` or `FAILED_QA`) and a rejection log (what failed, why, what the writer changed).
- **Memory:** every run is stored in SQLite. Checks that fail on a first attempt become "pitfalls" injected into later writer prompts. After 3 runs the system proposes new rules that you approve or reject in the UI.

## Setup
Requires Python 3.12, Node 20+.

```bash
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python -r requirements.txt
cp .env.example .env   # add GOOGLE_API_KEY and OPENROUTER_API_KEY
cd frontend && npm install
```

## Run
```bash
.venv/bin/uvicorn api:app --app-dir backend --port 8000     # terminal 1
cd frontend && npm run dev                                   # terminal 2, open http://localhost:5173
.venv/bin/python backend/cli.py "Introduction to RAG" --inject   # CLI alternative, --inject plants an error
```
The UI has four pages: **Write** (type a topic, watch each draft being checked, read and download the result as Word or Markdown), **History** (reopen any run), **Learning** (first-draft pass rate, reminders fed to the writer, suggested rules to approve) and **Rules** (the 12 checks in plain words). Turn on "Test the checker" to plant a false fact and a long sentence in draft 1.

## Test
```bash
.venv/bin/python -m pytest backend/tests -q     # offline, mocked models, no API calls
```

## Files
| Path | Role |
|---|---|
| `backend/rubric.py` | The 12 checks, with per-topic condition templates. Single source of truth for code, judge prompt, writer prompt and UI. |
| `backend/topics.py`, `backend/topics/` | Topic profiles (source pack, key points, terms) and the planner for unknown topics. |
| `backend/checks.py` | Deterministic checks (textstat, regex). |
| `backend/judge.py` | One JSON call per attempt, evidence verification, caching, model fallback. |
| `backend/graph.py` | LangGraph state machine and the retry logic. |
| `backend/memory.py` | SQLite: runs, failures, pitfalls, proposals, judge cache. |
| `backend/api.py` | FastAPI with an SSE stream of node updates. |
| `frontend/` | React UI (Geist, Phosphor icons): Write, History, Learning, Rules. |
| `docs/DESIGN.md` | Design reasoning and the iteration log. |
| `docs/lesson_rag.md`, `.docx` | The final lesson (run 7). |

## Known limits
- The judge runs on OpenRouter free models: 50 requests/day, and 1 to 4 minutes per call. A run takes about 4 to 8 minutes.
- The judge disagrees with itself across models (see DESIGN.md). Passing means "cleared this judge", not "is perfect".
- Only RAG has a source pack. For other topics the planner and the judge rely on model knowledge, which is weaker grounding.
- The grounding pack has 3 sources, so for RAG "accurate" means "consistent with those sources".
