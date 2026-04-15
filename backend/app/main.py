import os
import json
import uuid
from functools import lru_cache
from typing import Any, Optional

from fastembed import TextEmbedding
from fastapi import FastAPI, Header, HTTPException
from openai import APIConnectionError, APIStatusError, APITimeoutError, OpenAI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from qdrant_client.http.exceptions import ResponseHandlingException, UnexpectedResponse


QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "nirdesh_memory")
EMBED_MODEL = os.getenv("QDRANT_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
TOP_K = int(os.getenv("QDRANT_TOP_K", "3"))
LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.ai.kodekloud.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "anthropic/claude-sonnet-4.5")
SUPPORTED_REPLY_LANGUAGES = [
    "English",
    "Hindi",
    "Spanish",
    "French",
    "German",
    "Portuguese",
    "Japanese",
    "Korean",
    "Chinese",
    "Arabic",
    "Russian",
]


app = FastAPI(title="Nirdesh API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    language: str = "auto"


class ChatResponse(BaseModel):
    reply: str
    translations: dict[str, str] = {}
    context: list[str] = []


@lru_cache(maxsize=1)
def get_embedding_model() -> TextEmbedding:
    return TextEmbedding(model_name=EMBED_MODEL)


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


@lru_cache(maxsize=1)
def get_llm_client() -> Optional[OpenAI]:
    if not LLM_API_KEY:
        return None
    return OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)


def ensure_collection(client: QdrantClient) -> None:
    collections = client.get_collections().collections
    names = {c.name for c in collections}
    if QDRANT_COLLECTION not in names:
        client.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=qmodels.VectorParams(size=384, distance=qmodels.Distance.COSINE),
        )
    client.create_payload_index(
        collection_name=QDRANT_COLLECTION,
        field_name="session_id",
        field_schema=qmodels.PayloadSchemaType.KEYWORD,
        wait=True,
    )


def embed_text(text: str) -> list[float]:
    vector = next(get_embedding_model().embed([text]))
    return vector.tolist()


def store_memory(client: QdrantClient, session_id: str, text: str, kind: str) -> None:
    vector = embed_text(text)
    client.upsert(
        collection_name=QDRANT_COLLECTION,
        points=[
            qmodels.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"session_id": session_id, "text": text, "kind": kind},
            )
        ],
    )


def retrieve_memory(client: QdrantClient, session_id: str, query_text: str, limit: int = TOP_K) -> list[str]:
    query_vector = embed_text(query_text)
    query_hits = client.query_points(
        collection_name=QDRANT_COLLECTION,
        query=query_vector,
        with_payload=True,
        query_filter=qmodels.Filter(
            must=[qmodels.FieldCondition(key="session_id", match=qmodels.MatchValue(value=session_id))]
        ),
        limit=limit,
    )
    return [
        str(point.payload.get("text", ""))
        for point in query_hits.points
        if point.payload and point.payload.get("text")
    ]


def generate_assistant_reply(
    user_message: str, context: list[str], memory_unavailable: bool, language: str = "auto"
) -> str:
    llm_client = get_llm_client()
    if llm_client is None:
        if memory_unavailable:
            return "I can help, but memory is temporarily unavailable and LLM API key is not configured."
        return "I can help. Set LLM_API_KEY to enable full AI responses."

    context_text = "\n".join(f"- {item}" for item in context) if context else "- No prior memory found."
    language_instruction = (
        "Detect the user's language and respond in that same language."
        if language == "auto"
        else f"Respond in {language}."
    )
    user_prompt = (
        f"User message:\n{user_message}\n\n"
        f"Retrieved memory context:\n{context_text}\n\n"
        f"Language instruction:\n{language_instruction}\n\n"
        "Respond as Nirdesh, a concise senior developer assistant. "
        "Provide actionable steps and ask one clarifying question only if essential."
    )

    try:
        completion = llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Nirdesh, a voice-native developer assistant. "
                        "Be concise, technically accurate, and practical."
                    ),
                },
                {"role": "user", "content": user_prompt},
            ],
        )
        text = completion.choices[0].message.content
        if isinstance(text, str) and text.strip():
            return text.strip()
        return "I could not generate a response. Please try rephrasing your question."
    except (APIConnectionError, APITimeoutError):
        return "I could not reach the LLM provider right now. Please try again."
    except APIStatusError as exc:
        return f"LLM provider returned an error ({exc.status_code}). Please verify model and API configuration."


def translate_reply(reply: str, languages: list[str]) -> dict[str, str]:
    llm_client = get_llm_client()
    if llm_client is None:
        return {lang: reply for lang in languages}

    lang_list = ", ".join(languages)
    prompt = (
        "Translate the following assistant reply into each requested language. "
        "Return only valid JSON object with language names as keys and translated text as values. "
        "Do not include markdown or extra text.\n\n"
        f"Languages: {lang_list}\n\n"
        f"Reply:\n{reply}"
    )

    try:
        completion = llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise technical translator. Return JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        text = completion.choices[0].message.content
        if not isinstance(text, str) or not text.strip():
            return {lang: reply for lang in languages}
        parsed = json.loads(text)
        if not isinstance(parsed, dict):
            return {lang: reply for lang in languages}
        out: dict[str, str] = {}
        for lang in languages:
            value = parsed.get(lang)
            out[lang] = value.strip() if isinstance(value, str) and value.strip() else reply
        return out
    except (APIConnectionError, APITimeoutError, APIStatusError, json.JSONDecodeError):
        return {lang: reply for lang in languages}


@app.get("/health")
def health() -> dict[str, str]:
    status = "ok"
    try:
        client = get_qdrant_client()
        client.get_collections()
    except Exception:
        status = "degraded"
    return {"status": status, "service": "nirdesh-backend"}


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    user_message = payload.message.strip()
    if not user_message:
        return ChatResponse(reply="Please say or type something.", context=[])

    retrieved: list[str] = []
    memory_unavailable = False
    client: Optional[QdrantClient] = None
    try:
        client = get_qdrant_client()
        ensure_collection(client)
        retrieved = retrieve_memory(client=client, session_id=payload.session_id, query_text=user_message)
        store_memory(client=client, session_id=payload.session_id, text=user_message, kind="user_message")
    except (ResponseHandlingException, UnexpectedResponse):
        retrieved = []
        memory_unavailable = True

    reply = generate_assistant_reply(
        user_message=user_message,
        context=retrieved,
        memory_unavailable=memory_unavailable,
        language=payload.language,
    )
    translations = translate_reply(reply, SUPPORTED_REPLY_LANGUAGES)

    if client is not None and not memory_unavailable:
        try:
            store_memory(client=client, session_id=payload.session_id, text=reply, kind="assistant_message")
        except (ResponseHandlingException, UnexpectedResponse):
            pass

    return ChatResponse(reply=reply, translations=translations, context=retrieved)


@app.post("/vapi/webhook")
def vapi_webhook(
    payload: dict[str, Any],
    x_vapi_secret: Optional[str] = Header(default=None, alias="x-vapi-secret"),
) -> dict[str, Any]:
    expected_secret = os.getenv("VAPI_WEBHOOK_SECRET")
    if expected_secret and x_vapi_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    call = payload.get("call")
    session_id = "vapi-default"
    if isinstance(call, dict):
        call_id = call.get("id")
        if isinstance(call_id, str) and call_id.strip():
            session_id = call_id

    stored = 0
    client = get_qdrant_client()
    ensure_collection(client)

    message = payload.get("message")
    if isinstance(message, dict):
        role = str(message.get("role") or "unknown")
        text = message.get("message") or message.get("content") or message.get("transcript")
        if isinstance(text, str) and text.strip():
            store_memory(client=client, session_id=session_id, text=text.strip(), kind=f"vapi_{role}")
            stored += 1

    transcript = payload.get("transcript")
    if isinstance(transcript, str) and transcript.strip():
        store_memory(client=client, session_id=session_id, text=transcript.strip(), kind="vapi_transcript")
        stored += 1

    return {"status": "ok", "session_id": session_id, "stored": stored}
