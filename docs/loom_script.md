# Loom script (target 16 to 18 minutes, face visible)

Setup before recording: backend and frontend running, one clean topic in the box, `docs/DESIGN.md` and `backend/graph.py` open in tabs. A full live run takes 4 to 8 minutes, so start it early in section 3 and talk while it runs.

## 1. Intro and the brief (0:00 to 1:30)
- Say who you are, what the brief asks: generate, evaluate against hard pass/fail checks, regenerate, with a hard cap, plus memory and self-evolution.
- One line on the key idea: the loop decides if content ships, a human sees it afterwards.

## 2. Architecture walkthrough (1:30 to 6:00)
- Show the graph picture in the README. Walk each node: load_memory, generate, code_checks, llm_judge, decide, finalize, reflect.
- `rubric.py`: one source of truth for 11 checks. Explain 4 code checks (free, exact) versus 7 judge checks (meaning).
- Why a different model family judges (Gemini writes, OpenRouter model judges). Why the judge must quote evidence.
- Why one judge call per attempt (50 requests/day free tier).
- Termination: 3 attempts, ship best as `FAILED_QA`, never hide a failure.

## 3. End-to-end live run (6:00 to 11:00)
- Topic: Introduction to RAG, error box unticked. Click Generate Lesson.
- Narrate the pipeline strip and the attempt tabs as checks come in. Point at a failing check and its reason.
- Show the rejection log: what failed, why, what the writer changed.
- Show the final lesson and the PASSED or FAILED_QA badge.

## 4. Evaluator catches a deliberate error (11:00 to 14:00)
- Tick "Inject a deliberate error in attempt 1" and run again, or open stored run 3 under Past Runs if time is short.
- Point out: the planted sentence "RAG retrains the model's weights" is flagged by J1 and J2, the 42-word sentence by C2, the idiom by J7.
- Show the retry removing them. Say plainly that the judge is a free model and can be wrong.

## 5. Memory and self-evolution (14:00 to 16:00)
- Memory panel: first-attempt pass rate bars, pitfalls fed to the writer, proposed rule changes. Approve one rule.
- Be honest: the rubric changed during development, so the improvement is suggestive, not a controlled result.

## 6. What I would do next (16:00 to 17:30)
- A human-labelled calibration set to measure judge accuracy. Frozen rubric and 20+ runs to measure learning.
- Paid judge for speed and a second judge for majority vote.
- More sources in the grounding pack.
- Close with the three limits from the README.
