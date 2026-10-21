import hashlib, json, re
from pydantic import BaseModel
import config, llm, memory
from rubric import BY_ID, JUDGED


class Item(BaseModel):
    id: str
    pass_: bool
    evidence: str = ""
    reason: str = ""


def _toks(s):
    return re.findall(r"[a-z0-9']+", s.lower())


def evidence_ok(evidence: str, lesson: str) -> bool:
    q = _toks(evidence)
    if not q:
        return False
    have = set(_toks(lesson))
    return sum(t in have for t in q) / len(q) >= 0.8


def parse(raw: str) -> list[Item]:
    m = re.search(r"\{.*\}", raw, flags=re.S)
    data = json.loads(m.group(0))["results"]
    items = [Item(id=d["id"], pass_=bool(d["pass"]), evidence=d.get("evidence", ""), reason=d.get("reason", "")) for d in data]
    if {i.id for i in items} != set(JUDGED):
        raise ValueError("judge returned wrong check ids")
    return items


def build_prompt(lesson: str) -> str:
    checks = "\n".join(f"{i}. {BY_ID[i]['name']}: {BY_ID[i]['condition']}" for i in JUDGED)
    tpl = (config.ROOT / "prompts" / "judge.txt").read_text()
    return tpl.format(checks=checks, ids=", ".join(JUDGED), sources=config.SOURCES, lesson=lesson)


def judge(lesson: str) -> tuple[list[dict], str]:
    prompt = build_prompt(lesson)
    key = hashlib.sha256(prompt.encode()).hexdigest()
    cached = memory.cache_get(key)
    if cached:
        return cached["results"], cached["model"] + " (cached)"
    last = None
    for model in config.JUDGE_MODELS:
        try:
            items = parse(llm.judge_raw(prompt, model))
        except Exception as e:
            last = e
            continue
        out = []
        for it in sorted(items, key=lambda x: x.id):
            ok, reason = it.pass_, it.reason
            if ok and not evidence_ok(it.evidence, lesson):
                ok, reason = False, "Judge gave no verifiable quote from the lesson as evidence for a pass."
            out.append({"id": it.id, "name": BY_ID[it.id]["name"], "kind": "judge", "passed": ok, "reason": reason, "evidence": it.evidence})
        memory.cache_put(key, {"results": out, "model": model})
        return out, model
    raise RuntimeError(f"all judge models failed: {last}")
