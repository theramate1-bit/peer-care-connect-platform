"""
Agent Context Service - Self-Hosted Open Source
Ingests chat, JSON business data, and documents.
Assembles token-efficient context for your LLM.
"""
import json
import os
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Agent Context Service",
    description="Ingest, graph, and assemble context for AI agents. Fully self-hosted.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ---

class ChatMessage(BaseModel):
    role: str
    content: str


class IngestRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    messages: Optional[list[ChatMessage]] = None
    business_data: Optional[dict[str, Any]] = None
    source: Optional[str] = None


class AssembleRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    query: str
    max_tokens: Optional[int] = 4000
    include_recent_n: Optional[int] = 10


# --- Config ---

GRAPHITI_URL = os.getenv("GRAPHITI_API_URL", "http://localhost:8001")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")
INGEST_DIR = Path(os.getenv("INGEST_DIR", "/app/ingest"))
CONFIG_DIR = Path(os.getenv("CONFIG_DIR", "/app/config"))


# --- Document ingestion ---

def ingest_documents_from_dir() -> list[dict]:
    """Parse documents in ingest/ with Unstructured."""
    out = []
    if not INGEST_DIR.exists():
        return out
    try:
        from unstructured.partition.auto import partition
        for f in INGEST_DIR.rglob("*"):
            if f.is_file() and f.suffix.lower() in {".pdf", ".docx", ".html", ".txt", ".md"}:
                elements = partition(str(f))
                text = "\n\n".join(el.text for el in elements if getattr(el, "text", None))
                out.append({"path": str(f.name), "content": text[:50000]})
    except ImportError:
        pass
    return out


# --- Graphiti client ---

def add_to_graph(user_id: str, content: str, metadata: Optional[dict] = None):
    """Send facts to Graphiti or fallback to Postgres store."""
    try:
        import httpx
        r = httpx.post(
            f"{GRAPHITI_URL}/v1/graph/add",
            json={"user_id": user_id, "content": content, "metadata": metadata or {}},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"Graphiti add error: {e}")
        try:
            from store import add_context, init_store
            init_store()
            add_context(user_id, content, metadata)
        except Exception:
            pass
        return {"ok": False, "error": str(e)}


def search_graph(user_id: str, query: str, limit: int = 20) -> list:
    """Retrieve relevant facts from Graphiti or Postgres fallback."""
    try:
        import httpx
        r = httpx.post(
            f"{GRAPHITI_URL}/v1/graph/search",
            json={"user_id": user_id, "query": query, "limit": limit},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("results", data) if isinstance(data, dict) else data
    except Exception as e:
        print(f"Graphiti search error: {e}")
        try:
            from store import search_context, init_store
            init_store()
            return search_context(user_id, query, limit)
        except Exception:
            return []


# --- Routes ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "agent-context"}


@app.post("/ingest")
def ingest(req: IngestRequest):
    """Ingest chat messages, JSON business data, or both."""
    ingested = []
    if req.messages:
        for m in req.messages[-50:]:  # last 50
            content = f"[{m.role}]: {m.content}"
            add_to_graph(req.user_id, content, {"session_id": req.session_id, "source": req.source or "chat"})
            ingested.append({"type": "message", "role": m.role})
    if req.business_data:
        content = json.dumps(req.business_data, default=str)
        add_to_graph(req.user_id, content, {"session_id": req.session_id, "source": req.source or "business"})
        ingested.append({"type": "business_data"})
    return {"ingested": ingested}


@app.post("/ingest/documents")
def ingest_documents():
    """Ingest documents from ./ingest directory."""
    docs = ingest_documents_from_dir()
    return {"ingested": len(docs), "documents": [d["path"] for d in docs]}


@app.post("/assemble")
def assemble(req: AssembleRequest):
    """
    Assemble context for the agent: recent graph facts + document chunks.
    Returns token-efficient formatted context.
    """
    parts = []
    # 1. Graph facts
    graph_results = search_graph(req.user_id, req.query, limit=15)
    if graph_results:
        parts.append("## Relevant facts (user and session)")
        for i, r in enumerate(graph_results[:10]):
            text = r.get("text", r.get("content", str(r)))
            parts.append(f"- {text}")
    # 2. Document chunks (from ingest dir)
    docs = ingest_documents_from_dir()
    for d in docs[:5]:  # up to 5 docs
        chunk = d["content"][:2000]
        parts.append(f"\n## From {d['path']}\n{chunk}")
    # 3. Format for LLM
    context = "\n".join(parts)
    if len(context) > req.max_tokens * 4:  # rough chars
        context = context[: req.max_tokens * 4] + "\n...[truncated]"
    return {"context": context, "token_estimate": len(context) // 4}


@app.get("/")
def root():
    return {
        "service": "Agent Context",
        "docs": "/docs",
        "endpoints": ["/ingest", "/assemble", "/ingest/documents", "/health"],
    }
