# Loom script (target 16 to 18 minutes, face visible)

Before recording: start the backend and frontend (see README), open http://localhost:5173, and have `backend/graph.py`, `backend/rubric.py` and `docs/DESIGN.md` open in your editor. A live run takes 3 to 8 minutes, so start it in section 3 and keep talking while it runs.

## 1. Intro (0:00 to 1:30)
- Who you are. The brief: generate, evaluate against hard pass/fail checks, regenerate with a cap, plus memory and self-evolution.
- The one idea: the system decides whether a lesson is good enough to ship before a human sees it.
- Optional: play 30 seconds of `demo/lesson-gate-demo-voiceover.mp4` as a teaser.

## 2. Architecture walkthrough (1:30 to 6:00)
- Show the mermaid diagram in the README. Walk the nodes: load_memory, plan_topic, generate, code_checks, llm_judge, decide, finalize, reflect.
- `rubric.py`: 12 checks, one source of truth. Why 4 are code (countable, exact) and 8 are judged (meaning).
- `judge.py`: a different model family judges; it must quote the lesson or the pass is flipped; one JSON call per draft; cache; fallback chain.
- `graph.py`: the retry prompt (failed checks, problem text, earlier fixes), rewriting from the best draft, the 3-draft cap, `FAILED_QA` instead of hiding failures.

## 3. End to end, with a deliberate error (6:00 to 12:00)
- On the Write page pick "Introduction to RAG", switch on **Test the checker**, click **Write and check lesson**.
- Explain the plain-language step list while it runs.
- When draft 1 is reviewed: point at the failed checks (false fact about retraining weights, the 42-word sentence, the idiom) and read one reason aloud.
- Watch the rewrite and the next review. Explain "earlier fixes" and "best draft so far".
- On the result: verdict, "How it got here", compare draft 1 with the final draft, download Word.
- If the run is slow, open run 14 from History: it is the same flow, already finished.

## 4. Any topic, memory and self-evolution (12:00 to 15:30)
- History: open the MCP lesson. Tell the story of the bug (an MCP request produced a RAG lesson that passed) and the fix (topic planning plus the J8 "Stays on topic" check).
- Learning: first-draft pass rate, the reminders fed to the writer, approve or reject a suggested rule. Say plainly that the rubric changed during development, so the rate is a rough signal.
- Rules: the 12 checks in plain words.

## 5. Trade-offs and next steps (15:30 to 17:30)
- Free models: slow and rate limited, so one judge call per draft and caching.
- The judge can be wrong: next step is a human-labelled calibration set and a second judge.
- Only RAG is grounded in sources; other topics rely on model knowledge and the UI says so.
- Close on the final lesson in the Google Doc.
