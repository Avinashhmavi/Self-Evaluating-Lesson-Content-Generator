import json, sqlite3, time
import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY, topic TEXT, status TEXT, attempts INT, first_pass INT, lesson TEXT, log TEXT, ts REAL);
CREATE TABLE IF NOT EXISTS fails(run_id INT, attempt INT, check_id TEXT, reason TEXT);
CREATE TABLE IF NOT EXISTS pitfalls(check_id TEXT PRIMARY KEY, count INT, advice TEXT, ts REAL);
CREATE TABLE IF NOT EXISTS proposals(id INTEGER PRIMARY KEY, text TEXT, status TEXT, ts REAL);
CREATE TABLE IF NOT EXISTS judge_cache(key TEXT PRIMARY KEY, val TEXT);
"""


def db():
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(config.DB_PATH)
    c.row_factory = sqlite3.Row
    c.executescript(SCHEMA)
    return c


def cache_get(key):
    with db() as c:
        r = c.execute("SELECT val FROM judge_cache WHERE key=?", (key,)).fetchone()
    return json.loads(r["val"]) if r else None


def cache_put(key, val):
    with db() as c:
        c.execute("INSERT OR REPLACE INTO judge_cache VALUES(?,?)", (key, json.dumps(val)))


def active_pitfalls():
    with db() as c:
        rows = c.execute("SELECT check_id, count, advice FROM pitfalls WHERE count>=? ORDER BY count DESC LIMIT 4", (config.PITFALL_MIN,)).fetchall()
    return [dict(r) for r in rows]


def approved_rules():
    with db() as c:
        return [r["text"] for r in c.execute("SELECT text FROM proposals WHERE status='approved' ORDER BY id")]


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
            c.execute("INSERT OR REPLACE INTO pitfalls VALUES(?,?,?,?)",
                      (f["id"], (old["count"] if old else 0) + 1, f["advice"], time.time()))
    return rid


def stats():
    with db() as c:
        runs = [dict(r) for r in c.execute("SELECT id,topic,status,attempts,first_pass,ts FROM runs ORDER BY id DESC LIMIT 50")]
        pits = [dict(r) for r in c.execute("SELECT * FROM pitfalls ORDER BY count DESC")]
        props = [dict(r) for r in c.execute("SELECT * FROM proposals ORDER BY id DESC")]
    return {"runs": runs, "pitfalls": pits, "proposals": props, "active": active_pitfalls()}


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
