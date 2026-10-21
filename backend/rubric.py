# Single source of truth for the rubric: id, name, kind, pass condition, fix hint.
RUBRIC = [
    ("C1", "Readable at Grade 8 or lower", "code", "Flesch-Kincaid grade <= 8.", "Use shorter sentences and everyday words."),
    ("C2", "No sentence over 25 words", "code", "Every sentence has at most 25 words.", "Split long sentences into two or three short ones."),
    ("C3", "Has all required sections", "code", "H2 headings for: What it is, Why it matters, How it works, Example, Recap.", "Use exactly these ## headings: What it is, Why it matters, How it works, Example, Recap."),
    ("C4", "Length 600 to 1000 words", "code", "Lesson body has 600 to 1000 words.", "Keep the lesson between 600 and 1000 words."),
    ("J1", "Accurate", "judge", "No statement contradicts the SOURCES or is plainly false about RAG, and nothing is overclaimed (the sources say RAG lowers the risk of hallucination; it does not stop it or make a model error-proof).", "Check every claim against the sources; remove or fix anything false."),
    ("J2", "Grounded", "judge", "The main technical claims (what RAG is, why it is needed, how it works) are supported by the SOURCES.", "Stick to what the sources say; do not invent details."),
    ("J3", "Jargon defined", "judge", "Each of these terms, if used, is explained in plain words in the same or the next sentence where it first appears: LLM, hallucination, embedding, vector, vector database, knowledge base, retrieval, prompt, context.", "Define each technical term in simple words right where it first appears."),
    ("J4", "Teaches by example", "judge", "Contains one concrete worked example from everyday Indian student life as an analogy in which each RAG step (store notes, find the relevant page for a question, put it next to the question, write the answer) has a matching everyday action, in the same order.", "Add a step-by-step everyday example (for example a student finding answers in notes before an exam)."),
    ("J5", "Covers key points", "judge", "Covers: retrieve, then add to the prompt, then generate; the problems of made-up answers (hallucination) and out-of-date knowledge; and, at an intro level, embeddings and a vector store.", "Cover all key points: retrieve, augment, generate; hallucination; out-of-date knowledge; embeddings and vector store."),
    ("J6", "Coherent flow", "judge", "Sections follow a logical order (what, why, how, example, recap); the Example follows the same steps as How it works; the Recap only repeats things already taught.", "Keep the order what, why, how, example, recap; make the Example follow the same steps as How it works."),
    ("J7", "Simple vocabulary", "judge", "Plain, literal English for a non-native reader: no idioms or slang (phrases whose meaning differs from their plain words, such as 'from scratch' or 'break the ice'). Ordinary literal phrases such as 'look up', 'out of date' or 'just like' are fine.", "Replace idioms and fancy words with plain, literal words."),
]
BY_ID = {r[0]: dict(id=r[0], name=r[1], kind=r[2], condition=r[3], hint=r[4]) for r in RUBRIC}
JUDGED = [i for i, r in BY_ID.items() if r["kind"] == "judge"]
