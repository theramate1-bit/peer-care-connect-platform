# Agent Context Stack

Self-hosted open-source stack for agent memory, document ingestion, and context assembly. Lives in `agent-context/` at the repo root.

## What It Does

- **Ingest**: Chat messages, JSON business data, documents (PDF, DOCX, HTML)
- **Store**: Temporal graph (Graphiti) or Postgres fallback
- **Assemble**: Deterministic context assembly for LLM prompts

## Quick Start

```bash
cd agent-context
cp .env.example .env
docker compose -f docker-compose.offline.yml up -d
```

Context API: `http://localhost:8002`

See [agent-context/README.md](../../agent-context/README.md) for full docs.
