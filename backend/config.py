import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT.parent / ".env")

GEN_MODEL = os.getenv("GEN_MODEL", "gemini-3.5-flash-lite")
JUDGE_MODELS = [m.strip() for m in os.getenv(
    "JUDGE_MODELS", "nvidia/nemotron-3-ultra-550b-a55b:free,minimax/minimax-m3.1-flash:free,google/gemma-4-31b-it:free"
).split(",") if m.strip()]
MAX_ATTEMPTS = 3
PITFALL_MIN = int(os.getenv("PITFALL_MIN", "1"))
DB_PATH = Path(os.getenv("DB_PATH", ROOT / "data" / "memory.db"))
SOURCES = "\n\n".join(p.read_text() for p in sorted((ROOT / "sources").glob("*.md")))
