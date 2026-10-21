import json, re
import config, llm, memory


def _from_folder(d):
    p = json.loads((d / "profile.json").read_text())
    src = "\n\n".join(f.read_text() for f in sorted((d / "sources").glob("*.md")))
    return {**p, "sources": src, "n_sources": len(list((d / "sources").glob("*.md"))), "grounded": True}


def _plan(topic: str) -> dict:
    """Ask the writer model for the key points and terms a beginner lesson on this topic must cover."""
    raw = llm.generate(
        f'You plan beginner lessons. Topic: "{topic}". Return ONLY JSON: '
        '{"key_points": [4 to 5 short phrases a complete beginner lesson must cover, including what it is, why it matters and how it works], '
        '"terms": [5 to 9 technical terms the lesson will need to define]}')
    try:
        data = json.loads(re.search(r"\{.*\}", raw, flags=re.S).group(0))
        return {"key_points": [str(x) for x in data["key_points"]][:6], "terms": [str(x) for x in data["terms"]][:9], "planned": True}
    except Exception:  # ponytail: generic plan if the planner reply is not JSON
        return {"key_points": [f"what {topic} is", f"why {topic} matters", f"how {topic} works step by step"], "terms": [], "planned": False}


def profile_for(topic: str) -> dict:
    for d in sorted(p for p in config.TOPICS_DIR.iterdir() if p.is_dir()):
        prof = _from_folder(d)
        if re.search(prof["match"], topic, flags=re.I):
            return {**prof, "topic": topic, "slug": d.name}
    key = topic.strip().lower()
    plan = memory.plan_get(key)
    if not plan:
        plan = _plan(topic)
        if plan["planned"]:
            memory.plan_put(key, plan)
    return {**plan, "topic": topic, "slug": None, "sources": "", "n_sources": 0, "grounded": False}
