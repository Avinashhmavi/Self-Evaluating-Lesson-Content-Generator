import json, re, sqlite3, time
import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY, topic TEXT, status TEXT, attempts INT, first_pass INT, lesson TEXT, log TEXT, ts REAL);
CREATE TABLE IF NOT EXISTS fails(run_id INT, attempt INT, check_id TEXT, reason TEXT);
CREATE TABLE IF NOT EXISTS pitfalls(check_id TEXT PRIMARY KEY, count INT, advice TEXT, ts REAL);
CREATE TABLE IF NOT EXISTS proposals(id INTEGER PRIMARY KEY, text TEXT, status TEXT, ts REAL);
CREATE TABLE IF NOT EXISTS judge_cache(key TEXT PRIMARY KEY, val TEXT);
CREATE TABLE IF NOT EXISTS topic_plans(key TEXT PRIMARY KEY, val TEXT);
"""


def db():
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(config.DB_PATH)
    c.row_factory = sqlite3.Row
    c.executescript(SCHEMA)
    cols = {r["name"] for r in c.execute("PRAGMA table_info(pitfalls)")}
    for col in ("example", "topic"):
        if col not in cols:
            c.execute(f"ALTER TABLE pitfalls ADD COLUMN {col} TEXT")
    return c


def _kv_get(table, key):
    with db() as c:
        r = c.execute(f"SELECT val FROM {table} WHERE key=?", (key,)).fetchone()
    return json.loads(r["val"]) if r else None


def _kv_put(table, key, val):
    with db() as c:
        c.execute(f"INSERT OR REPLACE INTO {table} VALUES(?,?)", (key, json.dumps(val)))


def cache_get(key): return _kv_get("judge_cache", key)
def cache_put(key, val): _kv_put("judge_cache", key, val)
def plan_get(key): return _kv_get("topic_plans", key)
def plan_put(key, val): _kv_put("topic_plans", key, val)


def active_pitfalls(topic=""):
    """Recurring first-attempt failures. The concrete example is only shown for the same topic."""
    with db() as c:
        rows = c.execute("SELECT check_id, count, advice, example, topic FROM pitfalls WHERE count>=? ORDER BY count DESC LIMIT 4", (config.PITFALL_MIN,)).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        same = (d["topic"] or "").lower() == topic.lower()
        d["text"] = d["advice"] + (f" (last time: {d['example']})" if same and d["example"] else "")
        out.append(d)
    return out


def approved_rules():
    with db() as c:
        return [re.sub(r"^\[\w+\]\s*", "", r["text"]) for r in c.execute("SELECT text FROM proposals WHERE status='approved' ORDER BY id")]


def save_run(topic, status, attempts, first_pass, lesson, log, first_attempt_fails):
    """Persist run and update pitfall counts from first-attempt failures."""
    with db() as c:
        cur = c.execute("INSERT INTO runs(topic,status,attempts,first_pass,lesson,log,ts) VALUES(?,?,?,?,?,?,?)",
                        (topic, status, attempts, int(first_pass), lesson, json.dumps(log), time.time()))
        rid = cur.lastrowid
        for f in log:
            for x in f["failed"]:
                c.execute("INSERT INTO fails VALUES(?,?,?,?)", (rid, f["attempt"], x["id"], x["reason"]))
        for f in first_attempt_fails:
            old = c.execute("SELECT count FROM pitfalls WHERE check_id=?", (f["id"],)).fetchone()
            c.execute("INSERT OR REPLACE INTO pitfalls(check_id,count,advice,ts,example,topic) VALUES(?,?,?,?,?,?)",
                      (f["id"], (old["count"] if old else 0) + 1, f["advice"], time.time(), f["example"], topic))
    return rid


def stats():
    with db() as c:
        runs = [dict(r) for r in c.execute("SELECT id,topic,status,attempts,first_pass,ts FROM runs ORDER BY id DESC LIMIT 50")]
        pits = [dict(r) for r in c.execute("SELECT * FROM pitfalls ORDER BY count DESC")]
        props = [dict(r) for r in c.execute("SELECT * FROM proposals ORDER BY id DESC")]
    return {"runs": runs, "pitfalls": pits, "proposals": props}


def get_run(rid):
    with db() as c:
        r = c.execute("SELECT * FROM runs WHERE id=?", (rid,)).fetchone()
    if not r:
        return None
    d = dict(r)
    d["log"] = json.loads(d["log"])
    return d


def add_proposal(text):
    with db() as c:
        c.execute("INSERT INTO proposals(text,status,ts) VALUES(?,?,?)", (text, "pending", time.time()))


def set_proposal(pid, status):
    with db() as c:
        c.execute("UPDATE proposals SET status=? WHERE id=?", (status, pid))
