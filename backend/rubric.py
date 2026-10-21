# Single source of truth for the rubric: id, plain name, kind, technical name, condition template, fix hint.
RUBRIC = [
    ("C1", "Easy to read", "code", "Readable at Grade 8 or lower", "Flesch-Kincaid grade <= 8.", "Use shorter sentences and everyday words."),
    ("C2", "Short sentences", "code", "No sentence over 25 words", "Every sentence has at most 25 words.", "Split long sentences into two or three short ones."),
    ("C3", "All five sections", "code", "Has all required sections", "H2 headings for: What it is, Why it matters, How it works, Example, Recap.", "Use exactly these five headings: What it is, Why it matters, How it works, Example, Recap."),
    ("C4", "Right length", "code", "Length 600 to 1000 words", "Lesson body has 600 to 1000 words.", "Keep the lesson between 600 and 1000 words."),
    ("J8", "Stays on topic", "judge", "On topic", "The whole lesson teaches {topic}. It does not explain a different subject instead.", "Teach exactly the requested topic and nothing else."),
    ("J1", "Facts are correct", "judge", "Accurate", "No statement is false or overclaimed. {facts_rule}", "Check every claim; remove or fix anything false or overstated."),
    ("J2", "Backed by sources", "judge", "Grounded", "{grounding_rule}", "Stick to well-supported facts; do not invent details."),
    ("J3", "Hard words explained", "judge", "Jargon defined", "Each of these terms, if used, is explained in plain words in the same or the next sentence where it first appears: {terms}.", "Define each technical term in simple words right where it first appears."),
    ("J4", "Has a real-life example", "judge", "Teaches by example", "Contains one concrete worked example from everyday Indian student life, as an analogy in which each step from How it works has a matching everyday action, in the same order.", "Add a step-by-step everyday example where each step matches How it works."),
    ("J5", "Covers the key points", "judge", "Covers key points", "Covers every one of these: {key_points}.", "Cover every key point in the list."),
    ("J6", "Logical order", "judge", "Coherent flow", "Sections follow a logical order (what, why, how, example, recap); the Example follows the same steps as How it works; the Recap only repeats things already taught.", "Keep the order what, why, how, example, recap; make the Example follow the same steps as How it works."),
    ("J7", "Simple English", "judge", "Simple vocabulary", "Plain, literal English for a non-native reader: no idioms or slang (phrases whose meaning differs from their plain words, such as 'from scratch' or 'break the ice'). Ordinary literal phrases such as 'look up', 'out of date' or 'just like' are fine.", "Replace idioms and slang with plain, literal words."),
]
BY_ID = {r[0]: dict(id=r[0], name=r[1], kind=r[2], tech=r[3], template=r[4], hint=r[5]) for r in RUBRIC}
JUDGED = [i for i, r in BY_ID.items() if r["kind"] == "judge"]


def conditions(profile: dict) -> dict:
    """Fill the condition templates for one topic profile."""
    if profile["grounded"]:
        facts = "Nothing contradicts the SOURCES."
        ground = "The main technical claims (what it is, why it matters, how it works) are supported by the SOURCES."
    else:
        facts = "Judge against standard, widely accepted knowledge of the topic."
        ground = f"The main claims are standard, widely accepted facts about {profile['topic']}; no invented numbers, names, dates or features."
    vals = dict(topic=profile["topic"], terms=", ".join(profile["terms"]) or "every technical term in the lesson", key_points="; ".join(profile["key_points"]),
                facts_rule=facts, grounding_rule=ground)
    return {i: r["template"].format(**vals) for i, r in BY_ID.items()}
