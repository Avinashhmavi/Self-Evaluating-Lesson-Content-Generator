import os, time
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
import config


def _text(msg) -> str:
    return msg.text if isinstance(msg.text, str) else str(msg.content)


def _retry(fn, tries=4):
    for i in range(tries):
        try:
            return fn()
        except Exception as e:  # rate limits and transient errors
            if i == tries - 1:
                raise
            time.sleep(2 ** (i + 1))


def generate(prompt: str) -> str:
    llm = ChatGoogleGenerativeAI(model=config.GEN_MODEL, timeout=120, google_api_key=os.getenv("GOOGLE_API_KEY"))
    return _text(_retry(lambda: llm.invoke(prompt)))


def judge_raw(prompt: str, model: str) -> str:
    llm = ChatOpenAI(model=model, temperature=0, base_url="https://openrouter.ai/api/v1",
                     api_key=os.getenv("OPENROUTER_API_KEY"), timeout=120,
                     extra_body={"reasoning": {"effort": "low"}})
    return _text(_retry(lambda: llm.invoke(prompt), tries=1))
