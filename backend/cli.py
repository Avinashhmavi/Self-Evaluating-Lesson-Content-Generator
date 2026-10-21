import json, sys
import graph

topic = sys.argv[1] if len(sys.argv) > 1 else "Introduction to RAG (Retrieval-Augmented Generation)"
inject = "--inject" in sys.argv
final = {}
for node, upd in graph.stream(topic, inject):
    print(f"[{node}]", {k: (v if k in ("attempt", "status", "judge_model", "run_id") else "...") for k, v in upd.items()})
    final.update(upd)
    if node == "llm_judge":
        print("   failed:", [c["id"] for c in upd["checks"] if not c["passed"]])
print("\nSTATUS:", final.get("status"))
print(json.dumps(final.get("log"), indent=1))
