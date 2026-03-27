# Agent Context Stack – Fully Self-Hosted Open Source

Ingest chat, JSON business data, and documents. Build a temporal context graph. Assemble token-efficient context for your LLM. **All open source, all self-hosted, no SaaS required.**

## What This Fixes

| Problem                | Solution                                                                  |
| ---------------------- | ------------------------------------------------------------------------- |
| **Chat-only memory**   | Ingest chat + app events + business data + docs                           |
| **Static RAG**         | Temporal graph (Graphiti) or Postgres fallback – facts can be invalidated |
| **Tool-call guessing** | Deterministic context assembly before every agent turn                    |

## Architecture

```
Your app → POST /ingest (chat, JSON, events)
                ↓
         [Graphiti or Postgres store]
                ↓
Your agent → POST /assemble?query=... → formatted context → LLM
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- (Optional) [Ollama](https://ollama.ai) for fully offline LLMs

### 1. Clone and configure

```bash
cd agent-context
cp .env.example .env
# Edit .env: set NEO4J_PASSWORD, and OPENAI_API_KEY if using Graphiti with OpenAI
```

### 2. Run the stack

```bash
docker compose up -d
```

Services:

| Service             | Port                   | Role                                                         |
| ------------------- | ---------------------- | ------------------------------------------------------------ |
| **Neo4j**           | 7474 (UI), 7687 (Bolt) | Graph store for Graphiti                                     |
| **Graphiti**        | 8001                   | Temporal knowledge graph (optional; fallback if unavailable) |
| **Postgres**        | 5433                   | Vector + relational store, context-service fallback          |
| **Context Service** | 8002                   | Ingest + assemble API                                        |

### 3. Verify

```bash
curl http://localhost:8002/health
curl http://localhost:8002/
```

### 4. Ingest data

```bash
curl -X POST http://localhost:8002/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-1",
    "session_id": "sess-1",
    "messages": [
      {"role": "user", "content": "My preferred clinic is City Osteopaths."},
      {"role": "assistant", "content": "Noted. I will remember City Osteopaths."}
    ],
    "business_data": {"last_booking": "2025-03-10", "credits": 5}
  }'
```

### 5. Assemble context for your agent

```bash
curl -X POST http://localhost:8002/assemble \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-1",
    "query": "Where does the user prefer to book?",
    "max_tokens": 4000
  }'
```

Response includes `context` (ready for your LLM prompt) and `token_estimate`.

### 6. Test (optional)

```powershell
# Windows
.\scripts\test-context.ps1
```

### 7. Ingest documents

Place PDFs, DOCX, HTML, TXT, or MD in `agent-context/ingest/`:

```bash
cp your-policy.pdf agent-context/ingest/
curl -X POST http://localhost:8002/ingest/documents
```

Assembled context will include relevant chunks from these documents.

## Fully Offline (Ollama)

1. Install [Ollama](https://ollama.ai) and run: `ollama pull llama3.2` (or `mistral`, `phi3`)
2. For embeddings: `ollama pull nomic-embed-text`
3. Run Ollama on the host; Docker services reach it via `host.docker.internal:11434`
4. Graphiti has known issues with Ollama env overrides; the **context-service** uses the Postgres store as primary/fallback and works fully offline

For a fully offline setup, you can disable Graphiti and rely on the Postgres-backed context store:

```bash
# Run offline stack (no Graphiti, no external APIs)
docker compose -f docker-compose.offline.yml up -d
# Or: npm run agent-context:offline
```

The context-service will use its local Postgres store when Graphiti is unavailable.

## Optional: PostHog for App Events

To ingest browser/app events into your context pipeline:

```bash
# PostHog self-host (separate stack)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/posthog/posthog/HEAD/bin/deploy-hobby)"
```

Then forward relevant events to `/ingest` with `business_data` containing the event payload.

## Tech Stack (All OSS)

- [Graphiti](https://github.com/getzep/graphiti) – temporal knowledge graph
- [Neo4j](https://neo4j.com/) – graph database
- [PostgreSQL + pgvector](https://github.com/pgvector/pgvector) – vector + relational store
- [Unstructured](https://github.com/Unstructured-IO/unstructured) – document parsing
- [FastAPI](https://fastapi.tiangolo.com/) – context service API

## API Reference

| Endpoint            | Method | Body              | Description                     |
| ------------------- | ------ | ----------------- | ------------------------------- |
| `/health`           | GET    | -                 | Health check                    |
| `/ingest`           | POST   | `IngestRequest`   | Ingest chat + business JSON     |
| `/ingest/documents` | POST   | -                 | Parse docs in `./ingest`        |
| `/assemble`         | POST   | `AssembleRequest` | Get formatted context for agent |
| `/`                 | GET    | -                 | Service info                    |

### IngestRequest

```json
{
  "user_id": "string",
  "session_id": "string (optional)",
  "messages": [{ "role": "user|assistant", "content": "..." }],
  "business_data": {},
  "source": "chat|events|manual"
}
```

### AssembleRequest

```json
{
  "user_id": "string",
  "session_id": "string (optional)",
  "query": "string",
  "max_tokens": 4000,
  "include_recent_n": 10
}
```

## Integration with Theramate

From your React/Supabase app, call the context service:

```typescript
// Before agent/chat runs
const res = await fetch("http://localhost:8002/assemble", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: user?.id ?? "guest",
    session_id: sessionId,
    query: userMessage,
    max_tokens: 4000,
  }),
});
const { context } = await res.json();
// Prepend context to your LLM prompt
const systemPrompt = `Context:\n${context}\n\nYou are a helpful assistant...`;
```

After each user message, ingest the conversation:

```typescript
await fetch("http://localhost:8002/ingest", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: user?.id ?? "guest",
    session_id: sessionId,
    messages: conversationHistory.slice(-10),
    business_data: { last_page: pathname, credits: userCredits },
  }),
});
```

## License

MIT. All components are open source.
