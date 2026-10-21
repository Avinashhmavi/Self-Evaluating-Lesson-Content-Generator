import re
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
import config, llm, memory
from checks import code_checks
from judge import judge
from rubric import BY_ID, RUBRIC

BAD_FACT = "RAG works by retraining the model's weights on your documents every time you ask a question, so the model permanently memorizes them."
BAD_LONG = " ".join(["The system then goes on to do many different things at the same time with the data that it has found and it keeps on doing them again and again until the whole process is finally over and done with for good"])


class S(TypedDict, total=False):
    topic: str
    inject_error: bool
    pitfalls: list
    rules: list
    attempt: int
    lesson: str
    changes: str
    checks: list
    judge_model: str
    attempts: list
    log: list
    status: str
    final: str
    run_id: int


def corrupt(lesson: str) -> str:
    """Deliberate error for the demo: a false claim plus an over-long sentence."""
    i = lesson.find("## How it works")
    j = lesson.find("\n\n", i) if i >= 0 else -1
    pos = j if j >= 0 else len(lesson)
    return lesson[:pos] + f"\n\n{BAD_FACT} {BAD_LONG}." + lesson[pos:]


def split_changes(text: str):
    body, _, ch = text.partition("---CHANGES---")
    return body.strip(), ch.strip()


def load_memory(s: S):
    return {"pitfalls": memory.active_pitfalls(), "rules": memory.approved_rules(), "attempt": 0, "attempts": [], "log": []}


def generate(s: S):
    n = s["attempt"] + 1
    pit = ""
    if s.get("pitfalls"):
        pit = "Known pitfalls from past lessons (avoid them):\n" + "\n".join(f"- {p['advice']} (failed {p['count']} time(s))" for p in s["pitfalls"]) + "\n\n"
    rules = ""
    if s.get("rules"):
        rules = "Approved extra rules:\n" + "\n".join(f"- {r}" for r in s["rules"]) + "\n\n"
    fb = ""
    if n > 1:
        prev = max(s["attempts"], key=lambda a: (sum(c["passed"] for c in a["checks"]), a["n"]))
        fails = [c for c in prev["checks"] if not c["passed"]]
        old = {}
        for a in s["attempts"]:
            if a is prev:
                continue
            for c in a["checks"]:
                if not c["passed"]:
                    old[c["id"]] = c["reason"]
        hist = ("EARLIER FIXES, do not bring these problems back:\n" + "\n".join(f"- {k}: {v}" for k, v in old.items()) + "\n\n") if old else ""
        fb = (hist + "PREVIOUS ATTEMPT FAILED THESE CHECKS. Rewrite the lesson to fix them and keep everything that already passed:\n"
              + "\n".join(f"- {c['id']} {c['name']}: {c['reason']}" + (f' (problem text: "{c["evidence"]}")' if c["evidence"] else "") for c in fails)
              + f"\n\nPREVIOUS LESSON:\n{prev['lesson']}\n\nAfter the lesson, add a line ---CHANGES--- then 2 or 3 short bullet points on what you changed.\n\n")
    prompt = (config.ROOT / "prompts" / "generator.txt").read_text().format(
        topic=s["topic"], rubric="\n".join(f"- {r[1]}: {r[3]}" for r in RUBRIC), pitfalls=pit, rules=rules, feedback=fb, sources=config.SOURCES)
    lesson, changes = split_changes(llm.generate(prompt))
    if n == 1 and s.get("inject_error"):
        lesson = corrupt(lesson)
    log = [dict(x) for x in s["log"]]
    if log and changes:
        log[-1]["changes"] = changes
    return {"attempt": n, "lesson": lesson, "changes": changes, "log": log}


def run_code_checks(s: S):
    return {"checks": code_checks(s["lesson"])}


def run_judge(s: S):
    res, model = judge(s["lesson"])
    checks = s["checks"] + res
    entry = {"attempt": s["attempt"], "failed": [c for c in checks if not c["passed"]], "passed": sum(c["passed"] for c in checks), "total": len(checks), "changes": ""}
    att = s["attempts"] + [{"n": s["attempt"], "lesson": s["lesson"], "checks": checks}]
    return {"checks": checks, "judge_model": model, "attempts": att, "log": s["log"] + [entry]}


def decide(s: S):
    if all(c["passed"] for c in s["checks"]):
        return "finalize"
    return "generate" if s["attempt"] < config.MAX_ATTEMPTS else "finalize"


def finalize(s: S):
    best = max(s["attempts"], key=lambda a: (sum(c["passed"] for c in a["checks"]), a["n"]))
    ok = all(c["passed"] for c in best["checks"])
    return {"lesson": best["lesson"], "checks": best["checks"], "status": "PASSED" if ok else "FAILED_QA"}


def reflect(s: S):
    first = s["attempts"][0]
    fails = [{"id": c["id"], "advice": f"{BY_ID[c['id']]['hint']} (last failure: {c['reason']})"} for c in first["checks"] if not c["passed"]]
    rid = memory.save_run(s["topic"], s["status"], len(s["attempts"]), not fails, s["lesson"], s["log"], fails)
    try:
        _propose()
    except Exception:
        pass
    return {"run_id": rid}


def _propose():
    st = memory.stats()
    if len(st["runs"]) < 3:
        return
    have = " ".join(p["text"] for p in st["proposals"])
    for p in st["pitfalls"]:
        if p["count"] >= 2 and f"[{p['check_id']}]" not in have:
            c = BY_ID[p["check_id"]]
            rule = llm.generate(f"Write ONE short imperative rule (max 25 words) for a lesson-writing prompt that prevents this repeated failure. Check: {c['name']} - {c['condition']}. Recent reason: {p['advice']}. Output only the rule.")
            memory.add_proposal(f"[{p['check_id']}] {rule.strip()}")
            return


def build():
    g = StateGraph(S)
    for name, fn in [("load_memory", load_memory), ("generate", generate), ("code_checks", run_code_checks),
                     ("llm_judge", run_judge), ("finalize", finalize), ("reflect", reflect)]:
        g.add_node(name, fn)
    g.add_edge(START, "load_memory")
    g.add_edge("load_memory", "generate")
    g.add_edge("generate", "code_checks")
    g.add_edge("code_checks", "llm_judge")
    g.add_conditional_edges("llm_judge", decide, ["generate", "finalize"])
    g.add_edge("finalize", "reflect")
    g.add_edge("reflect", END)
    return g.compile()


def stream(topic: str, inject_error: bool = False):
    """Yield (node, update) pairs as the graph runs."""
    for chunk in build().stream({"topic": topic, "inject_error": inject_error}, stream_mode="updates"):
        for node, upd in chunk.items():
            yield node, upd
