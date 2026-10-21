# Plan: Self-Evaluating Lesson Content Generator

Topic for submission: Introduction to RAG. Audience: 12th-grade Indian learner, limited English, zero background.

## 1. Stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Orchestration | LangGraph (Python 3.11) | The loop is a state machine with a conditional edge and a hard cap. Auditable state. |
| Generator | `gemini-3.5-flash-lite` via `langchain-google-genai` | Your choice. Cheap, 1M context fits the whole source pack. |
| Judge | OpenRouter `:free` model (JSON-capable, e.g. Nemotron 3 Super 120B or GPT-OSS-120B), with a fallback list | A different model family from the generator reduces self-preference bias. |
| Readability | `textstat` | Measured in code. Models follow readability prompts unreliably. |
| Memory | SQLite (stdlib `sqlite3`) | Real persistence, zero setup, easy to show on video. |
| API | FastAPI + SSE | Streams node-by-node progress to the UI. |
| UI | React + Vite (one page) | Live graph progress, attempt tabs, rejection log, memory panel. |

## 2. Architecture

```
START -> load_memory -> generate -> code_checks -> llm_judge -> decide
                          ^                                       |
                          |------ regenerate (feedback) <---- fail & retries left
                                                                  |
                                              pass OR cap hit -> finalize -> reflect -> END
```

- `load_memory`: reads recurring pitfalls from SQLite.
- `generate`: lesson prompt + source pack + pitfalls (+ failure feedback on retries).
- `code_checks`: deterministic checks (no LLM).
- `llm_judge`: ONE call per attempt, returns JSON for all LLM-judged checks (saves the 50 requests/day quota).
- `decide`: all checks pass -> finalize. Any fail and attempts < 3 -> regenerate. Otherwise finalize as `FAILED_QA` with the best attempt.
- `finalize`: writes lesson + rejection log.
- `reflect`: updates failure stats, distills pitfall sentences, may create a rubric/prompt patch proposal.

Max 2 retries (3 attempts total). Termination is guaranteed by the attempt counter.

## 3. Rubric (hard pass/fail, no partial credit)

Code-checked:
- C1 Flesch-Kincaid grade <= 8
- C2 No sentence longer than 25 words
- C3 Has all sections: What it is, Why it matters, How it works, Example, Recap
- C4 Length 600 to 1,000 words

Judge-checked (each must return a quoted evidence line from the lesson):
- J1 Accurate: no claim contradicts the source pack
- J2 Grounded: key technical claims are supported by the source pack
- J3 Every technical term is defined in plain words at first use
- J4 Contains one concrete worked example from everyday Indian life (for example, a student searching a stack of notes before an exam)
- J5 Covers key points: retrieve, augment, generate; the hallucination and stale-knowledge problem; embeddings and vector store at an intro level
- J6 Coherent flow: each section builds on the one before, no term used before it is explained
- J7 Simple vocabulary: no idioms or phrasal-verb-heavy phrasing

Rationale: cheap deterministic checks run first and catch most style failures for free. The judge handles meaning.

## 4. Grounding

Curated source pack in `sources/` (4 to 6 files): Lewis et al. 2020 RAG paper abstract and intro, plus vendor docs (Google, AWS or IBM overview). Passed to both generator and judge. Fetched once and committed, so runs are reproducible.

## 5. Memory and self-evolution

SQLite tables: `runs`, `attempts`, `check_results`, `pitfalls`, `proposals`.

1. After each run, `reflect` counts failures per check and asks the LLM to distill a one-line lesson learned per recurring failure.
2. Pitfalls failing on first attempt in 2 or more recent runs are injected into the next generator prompt as "Known pitfalls".
3. After 3 or more runs, reflect proposes one rubric or prompt patch. The UI shows Approve/Reject. Approved patches are saved as a new versioned prompt file (`prompts/generator_v2.txt`).
4. Proof of learning: report first-attempt pass rate per run in the UI. Demo with RAG, then a second topic (for example, "Vector databases").

## 6. Deliberate-error demo (for the Loom)

UI button "Inject error": swaps in a lesson that says "RAG retrains the model's weights on your documents" (false) and has a 40-word sentence. Expected: J1 and C2 fail, the log shows reasons, the retry fixes them. Also a calibration test set of 3 known-good and 3 known-bad lessons that the judge must classify correctly before we trust it.

## 7. Repo layout

```
backend/  graph.py state.py checks.py judge.py generator.py memory.py api.py
          prompts/  sources/  tests/  data/memory.db
frontend/ src/ (App, RunView, AttemptTabs, RejectionLog, MemoryPanel)
README.md  CLAUDE.md  docs/DESIGN.md  docs/lesson_rag.md  docs/loom_script.md
```

## 8. Time plan (5 hours)

| Time | Work |
|---|---|
| 0:00 to 0:30 | Scaffold, CLAUDE.md, API keys, fetch source pack |
| 0:30 to 1:30 | Rubric, code checks, judge prompt, calibration tests |
| 1:30 to 2:15 | LangGraph loop, SQLite memory, CLI end-to-end run |
| 2:15 to 3:15 | FastAPI SSE + React UI |
| 3:15 to 3:45 | Reflect node, pitfalls, proposals |
| 3:45 to 4:15 | Real RAG run, error-injection run, second-topic run |
| 4:15 to 5:00 | README, DESIGN.md, lesson doc, Loom script |

The Loom recording (15 to 20 min) is outside the 5 hours. If we fall behind, cut UI polish first and keep the evaluator, memory, and tests.

## 9. Risks

| Risk | Mitigation |
|---|---|
| OpenRouter free: 20 requests/min, only 50/day unless the account has bought $10 credits (1,000/day) | One judge call per attempt; cache judge results by lesson hash; fallback model list; mock judge for tests |
| Free models give malformed JSON | Pydantic validation, one repair retry, then fall back to the next model |
| flash-lite writes weaker prose | Strong structured prompt, source pack in context, the loop exists to fix this |
| Judge too lenient or too harsh | Calibration set, evidence-quote requirement |
| Gemini free-tier rate limits | Backoff, small number of demo runs |

## 10. Out of scope

DSPy/GEPA, Mem0, multi-judge voting, auth, deployment.
