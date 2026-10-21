import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import config, graph, memory
from rubric import RUBRIC

app = FastAPI(title="Self-Evaluating Lesson Generator")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])


class RunReq(BaseModel):
    topic: str = "Introduction to RAG (Retrieval-Augmented Generation)"
    inject_error: bool = False


def sse(event, data):
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.post("/api/run")
def run(req: RunReq):
    def gen():
        try:
            for node, upd in graph.stream(req.topic, req.inject_error):
                yield sse("node", {"node": node, "update": upd})
            yield sse("done", {})
        except Exception as e:
            yield sse("error", {"message": str(e)})
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.get("/api/rubric")
def rubric():
    return {"checks": [dict(id=r[0], name=r[1], kind=r[2], condition=r[3]) for r in RUBRIC],
            "max_attempts": config.MAX_ATTEMPTS, "generator": config.GEN_MODEL, "judges": config.JUDGE_MODELS}


@app.get("/api/memory")
def mem():
    return memory.stats()


@app.get("/api/runs/{rid}")
def get_run(rid: int):
    r = memory.get_run(rid)
    if not r:
        raise HTTPException(404)
    return r


@app.post("/api/proposals/{pid}/{action}")
def proposal(pid: int, action: str):
    if action not in ("approve", "reject"):
        raise HTTPException(400)
    memory.set_proposal(pid, "approved" if action == "approve" else "rejected")
    return {"ok": True}
