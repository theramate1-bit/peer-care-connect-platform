"""Local Postgres store for context when Graphiti is unavailable."""

import json
import os
from datetime import datetime
from typing import Any, Optional

STORE_ENABLED = False
_conn = None


def init_store():
    global _conn, STORE_ENABLED
    url = os.getenv("POSTGRES_URL")
    if not url:
        return
    try:
        import psycopg2
        _conn = psycopg2.connect(url)
        with _conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS agent_context (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    session_id TEXT,
                    content TEXT NOT NULL,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_agent_context_user ON agent_context(user_id);
                CREATE INDEX IF NOT EXISTS idx_agent_context_created ON agent_context(created_at DESC);
            """)
        _conn.commit()
        STORE_ENABLED = True
    except Exception as e:
        print(f"Store init error: {e}")


def add_context(user_id: str, content: str, metadata: Optional[dict] = None):
    if not STORE_ENABLED or not _conn:
        return
    try:
        with _conn.cursor() as cur:
            cur.execute(
                "INSERT INTO agent_context (user_id, content, metadata) VALUES (%s, %s, %s)",
                (user_id, content, json.dumps(metadata or {})),
            )
        _conn.commit()
    except Exception as e:
        print(f"Store add error: {e}")


def _ensure_init():
    global STORE_ENABLED
    if not STORE_ENABLED and _conn is None:
        init_store()


def search_context(user_id: str, query: str, limit: int = 15) -> list:
    _ensure_init()
    if not STORE_ENABLED or not _conn:
        return []
    try:
        with _conn.cursor() as cur:
            cur.execute(
                """
                SELECT content, metadata, created_at
                FROM agent_context
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            rows = cur.fetchall()
        return [{"text": r[0], "metadata": r[1], "created_at": str(r[2])} for r in rows]
    except Exception as e:
        print(f"Store search error: {e}")
        return []
