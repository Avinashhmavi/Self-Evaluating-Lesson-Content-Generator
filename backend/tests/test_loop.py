import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import pytest
import config, graph, memory, topics, judge as J
from checks import code_checks
from rubric import JUDGED, conditions

HEADS = "## What it is\n\n## Why it matters\n\n## How it works\n\n## Example\n\n## Recap\n"
RAG = "Introduction to RAG"


def lesson(n_words=700, long=False):
    body = " ".join(["Cats sit on mats."] * (n_words // 3))
    if long:
        body += " " + " ".join(["word"] * 40) + "."
    return HEADS + body


@pytest.fixture(autouse=True)
def tmpdb(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "t.db")


def fake_judge(lesson_text, profile):
    bad = "retraining the model" in lesson_text
    res = [{"id": i, "name": i, "tech": i, "kind": "judge", "passed": not (bad and i == "J1"), "reason": "false claim" if bad and i == "J1" else "ok", "evidence": ""} for i in JUDGED]
    return res, "fake"


def run(topic, inject=False):
    out = {}
    for _, upd in graph.stream(topic, inject):
        out.update(upd)
    return out


def test_code_checks_pass_and_fail():
    ok = {c["id"]: c["passed"] for c in code_checks(lesson())}
    assert all(ok.values()), ok
    assert {c["id"]: c["passed"] for c in code_checks(lesson(long=True))}["C2"] is False
    assert {c["id"]: c["passed"] for c in code_checks("## What it is\nhi there friend")}["C3"] is False
    assert {c["id"]: c["passed"] for c in code_checks(lesson(100))}["C4"] is False


def test_loop_catches_injected_error_and_recovers(monkeypatch):
    monkeypatch.setattr(graph, "judge", fake_judge)
    calls = []
    monkeypatch.setattr(graph.llm, "generate", lambda p: (calls.append(p), lesson() + "\n---CHANGES---\n- removed false claim")[1])
    out = run(RAG, inject=True)
    assert out["status"] == "PASSED" and len(out["attempts"]) == 2
    first = out["log"][0]
    assert {"J1", "C2"} <= {f["id"] for f in first["failed"]}
    assert "removed false claim" in first["changes"]
    assert "PREVIOUS ATTEMPT FAILED" in calls[1] and "false claim" in calls[1]


def test_loop_terminates_at_cap(monkeypatch):
    monkeypatch.setattr(graph, "judge", fake_judge)
    monkeypatch.setattr(graph.llm, "generate", lambda p: lesson(100))
    out = run(RAG)
    assert out["status"] == "FAILED_QA" and len(out["attempts"]) == config.MAX_ATTEMPTS


def test_memory_pitfall_injected_next_run(monkeypatch):
    monkeypatch.setattr(graph, "judge", fake_judge)
    prompts = []
    monkeypatch.setattr(graph.llm, "generate", lambda p: (prompts.append(p), lesson(100) if len(prompts) == 1 else lesson())[1])
    run(RAG)
    prompts.clear()
    run(RAG + " again")
    assert "Known pitfalls" in prompts[0] and "600 and 1000" in prompts[0]


def test_other_topic_is_not_rag(monkeypatch):
    monkeypatch.setattr(graph, "judge", fake_judge)
    plan = '{"key_points":["what MCP is","why tools need a standard"],"terms":["protocol","server"]}'
    prompts = []
    monkeypatch.setattr(graph.llm, "generate", lambda p: plan if p.startswith("You plan") else (prompts.append(p), lesson())[1])
    out = run("Introduction to MCP")
    p = out["profile"]
    assert p["grounded"] is False and p["terms"] == ["protocol", "server"]
    assert "TOPIC: Introduction to MCP" in prompts[0] and "SOURCES" not in prompts[0] and "Lewis" not in prompts[0]
    assert "teaches Introduction to MCP" in conditions(p)["J8"]
    assert "Introduction to MCP" in J.build_prompt("x", p) and "Lewis" not in J.build_prompt("x", p)


def test_rag_topic_uses_source_pack():
    p = topics.profile_for("Introduction to RAG (Retrieval-Augmented Generation)")
    assert p["grounded"] and p["n_sources"] == 3 and "Lewis" in p["sources"]


def test_judge_rejects_unverifiable_pass(monkeypatch):
    raw = '{"results":[' + ",".join(f'{{"id":"{i}","pass":true,"evidence":"made up quote about unicorns","reason":"ok"}}' for i in JUDGED) + "]}"
    monkeypatch.setattr(J.llm, "judge_raw", lambda p, m: raw)
    res, _ = J.judge("A lesson about RAG and notes.", topics.profile_for(RAG))
    assert not any(r["passed"] for r in res)


def test_api_docx_and_validation(monkeypatch):
    from fastapi.testclient import TestClient
    import api
    rid = memory.save_run("Intro to X", "PASSED", 1, True, "## What it is\n\nHello.", [], [])
    c = TestClient(api.app)
    r = c.get(f"/api/runs/{rid}/docx")
    assert r.status_code == 200 and r.content[:2] == b"PK"
    assert c.post("/api/run", json={"topic": ""}).status_code == 422
    assert len(c.get("/api/rubric").json()["checks"]) == 12
