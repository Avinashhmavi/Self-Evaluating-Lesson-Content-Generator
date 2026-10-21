# Lesson Gate: Self-Evaluating Lesson Content Generator

Take-home for a GenAI Engineer (Content Systems) role. An agent writes a beginner lesson (topic: Introduction to RAG), grades it against an 11-check pass/fail rubric, and rewrites until it passes or hits 3 attempts. Audience of the lesson: 12th-grade Indian learner, limited English. Users: only the author and the reviewers. Reviewers judge the system design, the evaluator, and memory/self-evolution, not just the lesson.

## State
- Built and run live (Gemini writer, OpenRouter free judge): LangGraph loop, 11 checks, SQLite memory, FastAPI SSE, React UI (white, light-only). Offline tests pass (mocked LLMs). 7 live runs so far: 2 PASSED, 5 FAILED_QA (see docs/DESIGN.md iteration log).
- Known limits: OpenRouter free tier is 50 requests/day and the judge takes 1 to 4 minutes per call. Judge has no human-labelled calibration set. Learning effect is unproven (rubric changed between runs). Light-mode only, phone width unchecked.

## Do not touch without asking
- `backend/rubric.py` is the single source of truth for checks; the UI, judge prompt and code checks all read it.
- `backend/sources/` is the grounding pack; edits change what counts as accurate.

## Run
- Backend: `.venv/bin/uvicorn api:app --app-dir backend --port 8000`
- Frontend: `cd frontend && npm run dev` (http://localhost:5173)
- CLI: `.venv/bin/python backend/cli.py [topic] [--inject]`
- Tests (offline, no API calls): `.venv/bin/python -m pytest backend/tests -q`
- Machine has 8GB RAM: run one server at a time, stop them when done.
