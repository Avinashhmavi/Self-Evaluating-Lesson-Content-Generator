# Design Notes

## Goal
A loop that decides on its own whether generated content is good enough to ship, and explains every rejection. The lesson is the test input. The loop is the product.

## Why these components
| Choice | Reason | Trade-off |
|---|---|---|
| LangGraph | The loop is a state machine with a conditional edge and a hard cap. Every node update streams to the UI. | More ceremony than a `for` loop, but the graph is the architecture diagram. |
| Different model family for writer and judge | A model grading its own output is lenient on its own habits. | Free judge models are slow and rate limited. |
| Hybrid rubric (4 code, 7 judge) | Code checks are free, exact and repeatable. The judge is reserved for meaning. | Thresholds (grade 8, 25 words, 600 to 1000 words) are my choices. |
| Binary checks only | The brief asks for no partial credit. A fail always has a reason that can be fed back. | A near miss (26 words vs 25) fails like a bad miss. |
| One judge call per attempt | The free tier allows 50 requests/day. | One call judges 7 checks at once, so a long reply can lose precision. |
| Evidence quote required | A pass with no verifiable quote from the lesson is flipped to a fail. | Rare false rejections if the judge paraphrases. |
| Source pack in both prompts | Without evidence, self-critique adds little. | Accuracy is relative to 3 sources. |
| SQLite memory | Real persistence, zero setup, inspectable on video. | No vector search, not needed at this scale. |
| Max 3 attempts, ship best as `FAILED_QA` | Guaranteed termination, and a failure is never hidden. | A lesson can ship below the bar, but flagged. |

## Rubric
C1 grade 8 or lower, C2 no sentence over 25 words, C3 five required sections, C4 600 to 1000 words (code).
J8 stays on topic, J1 accurate and not overclaimed, J2 grounded, J3 jargon defined, J4 teaches by example, J5 covers key points, J6 coherent flow, J7 simple vocabulary (judge).
Judge conditions are templates filled per topic (terms, key points, grounding rule).

## Topics
`plan_topic` picks a profile from `backend/topics/` by regex (RAG: 3 sources, curated key points and terms). Any other topic is planned by the writer model (key points and terms, cached in SQLite) and marked ungrounded, so J1/J2 judge against general knowledge. This was added after a user ran "Introduction to MCP" and got a RAG lesson that still PASSED: the writer prompt carried the RAG source pack, and no check asked whether the lesson matched the requested topic. J8 closes that gap.
Full pass conditions are in `backend/rubric.py`.

## Regeneration
The writer sees the failed checks with reasons and the exact offending text, plus earlier fixes it must not undo. The retry starts from the best attempt so far, not the latest, so a bad rewrite cannot throw away a good draft. The writer also reports what it changed, which becomes the log's "changed on retry" column.

## Memory and self-evolution
1. After each run, checks that failed on attempt 1 are counted in `pitfalls`.
2. Pitfalls seen at least once (`PITFALL_MIN=1`, low on purpose so it shows within a few runs) are injected into the writer prompt.
3. With 3 or more runs and a check that has failed twice, the system drafts one rule. It stays `pending` until a human approves it in the UI. Approved rules join the writer prompt.

## Iteration log (live runs)
| Run | Result | What it taught |
|---|---|---|
| 1 | FAILED_QA | Several `:free` OpenRouter model slugs from articles were dead. I queried the live model list and probed each. |
| 2 | PASSED on attempt 3 | The judge caught a real writer error: it defined each number as a "vector". The retry fixed it. |
| 3 | FAILED_QA (best 10/11) | Deliberate error run. The judge caught the planted false claim (J1, J2), the idiom (J7) and the 42-word sentence (C2). Attempt 3 scored worse than 2, so retries now start from the best attempt. |
| 4 | FAILED_QA | My own J4 edit contradicted J6 ("student actions only" vs "mirror every RAG step"). The writer oscillated. A contradictory rubric looks like a flaky judge. Fixed the wording. |
| 5 | FAILED_QA | The writer kept missing 600 words. The check now says how many words to add. |
| 6 | FAILED_QA | The writer kept one 27-word sentence for two retries. The check now names every offending sentence and says to split it. |
| 7 | PASSED on attempt 1 | Memory pitfalls were in the prompt. See the caveat below. |
| 8 | PASSED on attempt 3 | Overclaim ("fixes hallucination") caught and fixed. |
| 9 | PASSED, but wrong | Topic "Introduction to MCP" produced a RAG lesson. Led to topic profiles and J8. |
| 10 | PASSED on attempt 1 | "What is MCP" after the fix: lesson mentions MCP 17 times, RAG 0 times. |
| 11 | PASSED on attempt 3 | Planted error on the new code: draft 1 failed C2, J1, J2, J7; draft 3 passed 12/12. |
| 13 | FAILED_QA (best 11/12) | "Introduction to Large Language Models" with a planted error: false fact fixed, one long sentence survived all 3 drafts. Shipped flagged, not hidden. |
| 14 | PASSED on attempt 3 | The final submitted lesson. Draft 1 7/12 (planted error caught), draft 2 11/12, draft 3 12/12. |

Caveat: the rubric and prompts changed between runs, so run 7 passing first time is not a controlled measurement of learning. A fair test needs a frozen rubric and many runs.

## What is not proven
- Planned topics are only as good as the writer model's own knowledge; there is no source pack for them.
- Run 10's MCP lesson passed although it says an AI model "thinks and talks like a human", a loose claim the judge accepted.
- Judge reliability. Another free model gave a different verdict on one lesson (J1 failed on minimax, passed on nemotron). There is no human-labelled calibration set.
- Whether memory improves first-attempt pass rate. One pass in seven runs, confounded as above.
- The analogy quality of the Example section. The judge checks that each step has a matching action, not that the analogy is sound. Run 7's "typed files = embeddings" is loose.
- Approving a proposed rule in the UI has not been tested end to end against a live run.
- Light-mode UI and narrow phone widths have not been checked.
