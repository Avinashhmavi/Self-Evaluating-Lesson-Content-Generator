import re
import textstat
from rubric import BY_ID

SECTIONS = ["what it is", "why it matters", "how it works", "example", "recap"]


def clean(md: str) -> str:
    md = re.sub(r"^#{1,6}\s*.*$", "", md, flags=re.M)
    md = re.sub(r"[*_`>]|^\s*[-\d.]+\s+", "", md, flags=re.M)
    return md


def sentences(md: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", clean(md))
    return [p.strip() for p in parts if len(p.split()) > 1]


def _r(cid, ok, reason, evidence=""):
    return {"id": cid, "name": BY_ID[cid]["name"], "kind": "code", "passed": bool(ok), "reason": reason, "evidence": evidence}


def code_checks(lesson: str) -> list[dict]:
    text = clean(lesson)
    grade = textstat.flesch_kincaid_grade(text)
    sents = sentences(lesson)
    longest = max(sents, key=lambda s: len(s.split()), default="")
    over = [x for x in sents if len(x.split()) > 25]
    heads = [h.lower() for h in re.findall(r"^##\s*(.+)$", lesson, flags=re.M)]
    missing = [s for s in SECTIONS if not any(s in h for h in heads)]
    words = len(text.split())
    return [
        _r("C1", grade <= 8, f"Flesch-Kincaid grade is {grade:.1f} (limit 8)."),
        _r("C2", len(longest.split()) <= 25, f"{len(over)} sentence(s) over 25 words; longest has {len(longest.split())} words. Split each listed sentence into two sentences of under 15 words." if over else f"Longest sentence has {len(longest.split())} words (limit 25).", " | ".join(x[:160] for x in over[:4])),
        _r("C3", not missing, "All sections present." if not missing else f"Missing sections: {', '.join(missing)}."),
        _r("C4", 600 <= words <= 1000, f"Lesson has {words} words (allowed 600 to 1000)." + (f" Add at least {600 - words + 100} more words of useful explanation." if words < 600 else f" Cut at least {words - 1000 + 50} words." if words > 1000 else "")),
    ]
