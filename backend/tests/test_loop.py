import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import pytest
import config, graph, memory, judge as J
from checks import code_checks
from rubric import JUDGED

HEADS = "## What it is\n\n## Why it matters\n\n## How it works\n\n## Example\n\n## Recap\n"


def lesson(n_words=700, long=False):
    body = " ".join(["Cats sit on mats."] * (n_words // 3))
    if long:
        body += " " + " ".join(["word"] * 40) + "."
    return HEADS + body


@pytest.fixture(autouse=True)
def tmpdb(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "t.db")


def test_code_checks_pass_and_fail():
    ok = {c["id"]: c["passed"] for c in code_checks(lesson())}
    assert all(ok.values()), ok
    bad = {c["id"]: c["passed"] for c in code_checks(lesson(long=True))}
    assert bad["C2"] is False
    assert {c["id"]: c["passed"] for c in code_checks("## What it is\nhi there friend")}["C3"] is False
    assert {c["id"]: c["passed"] for c in code_checks(lesson(100))}["C4"] is False


def fake_judge(lesson_text):
    bad = "retraining the model" in lesson_text
    res = [{"id": i, "name": i, "kind": "judge", "passed": not (bad and i == "J1"), "reason": "false claim" if bad and i == "J1" else "ok", "evidence": ""} for i in JUDGED]
    return res, "fake"


def test_loop_catches_injected_error_and_recovers(monkeypatch):
    monkeypatch.setattr(graph, "judge", fake_judge)
    calls = []
    monkeypatch.setattr(graph.llm, "generate", lambda p: (calls.append(p), lesson() + "\n---CHANGES---\n- removed false claim")[1])
    out = {}
    for _, upd in graph.stream("RAG", inject_error=True):
        out.update(upd)
    assert out["status"] == "PASSED" and len(out["attempts"]) == 2
    first = out["log"][0]
    assert {"J1", "C2"} <= {f["id"] for f in first["failed"]}
    assert "removed false claim" in first["changes"]
    assert "PREVIOUS ATTEMPT FAILED" in calls[1] and "false claim" in calls[1]


def test_loop_terminates_at_cap(monkeypatch):
    monkeypatch.setattr(graph, "judge", fake_judge)
    monkeypatch.setattr(graph.llm, "generate", lambda p: lesson(100))
    out = {}
    for _, upd in graph.stream("RAG"):
        out.update(upd)
    assert out["status"] == "FAILED_QA" and len(out["attempts"]) == config.MAX_ATTEMPTS


def test_memory_pitfall_injected_next_run(monkeypatch):
    monkeypatch.setattr(graph, "judge", fake_judge)
    prompts = []
    monkeypatch.setattr(graph.llm, "generate", lambda p: (prompts.append(p), lesson(100) if len(prompts) == 1 else lesson())[1])
    for _ in graph.stream("RAG"):
        pass
    prompts.clear()
    monkeypatch.setattr(graph.llm, "generate", lambda p: (prompts.append(p), lesson())[1])
    for _ in graph.stream("Vector databases"):
        pass
    assert "Known pitfalls" in prompts[0] and "600 and 1000" in prompts[0]


def test_judge_rejects_unverifiable_pass(monkeypatch):
    raw = '{"results":[' + ",".join(f'{{"id":"{i}","pass":true,"evidence":"made up quote about unicorns","reason":"ok"}}' for i in JUDGED) + "]}"
    monkeypatch.setattr(J.llm, "judge_raw", lambda p, m: raw)
    res, _ = J.judge("A lesson about RAG and notes.")
    assert not any(r["passed"] for r in res)
