# ClauseAI — AI Contract Intelligence Platform

ClauseAI helps a signed-in user upload a contract, ask questions about that contract, compare two versions, and review risk and policy findings with page and section evidence.

It is a decision-support tool. It does not provide legal advice. A person should review every finding before relying on it.

## Architecture

```text
Next.js UI
    │  session cookie stays in the browser
    ▼
Next.js /api routes
    │  Authorization: Bearer <session JWT>
    ▼
FastAPI
    ├── PDF / text extraction, OCR when a page has no text
    ├── section chunking (page, section, clause type kept on every chunk)
    ├── EmbeddingService → OpenRouter embeddings
    ├── VectorStoreService → Qdrant (filtered by user id and document id)
    ├── RagPipeline → OpenRouter chat model, with citations
    ├── rule-based risk score and policy checks
    └── LangGraph workflow: clauses → risk → compliance → summary
MongoDB stores users, documents, chunks, and analysis records.
Qdrant stores vectors. It is not used as the application database.
```

OpenRouter is the model gateway. RAG, embeddings, semantic matching, structured extraction, risk rules, and policy checks are the techniques.

## Ingestion

```text
PDF or text
  → page text
  → OCR only for pages with almost no text
  → section detection
  → paragraph chunks that keep page and section
  → embeddings
  → Qdrant + MongoDB
```

## Question answering

The chat route embeds the question, searches Qdrant for that user and document, and sends only those chunks to the model. If nothing relevant is retrieved, the service says the contract does not contain sufficient information and does not call the model.

## Comparison

Clauses are extracted with a structured model call, embedded, and paired by cosine similarity. A wording change is marked material only when a rule sees a real difference, such as a new dollar amount, a different notice period, or a switch between a cap and unlimited liability. "Shall not exceed $1 million" and "shall be limited to $1 million" stay non-material.

## Risk and policy

The risk score is the sum of rule weights, capped at 100. It is not a number invented by the model. Each finding includes the clause text, the reason, and the page and section.

Policy checks compare extracted amounts, notice periods, jurisdictions, and required clause types with a policy object. The pass or fail result comes from that comparison.

## Agent workflow

`backend/app/ai/workflow.py` runs four LangGraph nodes. The risk node reads the clauses produced by the extraction node. The compliance node reads those clauses. The summary node reads both findings. If the summary model fails, the structured findings are still returned.

## API

Browser routes stay under Next.js:

```text
POST /api/upload
POST /api/chat
POST /api/compare
POST /api/risk
POST /api/suggest
```

FastAPI routes:

```text
POST /documents/upload
GET  /documents
GET  /documents/{id}
DELETE /documents/{id}
POST /documents/{id}/index
GET  /documents/{id}/clauses
POST /chat
POST /comparison
POST /risk/analyze
POST /risk/suggest
GET  /documents/{id}/risks
POST /policies
GET  /policies
POST /contracts/{id}/compliance
POST /contracts/{id}/analyze
GET  /health
```

## Setup

1. Copy `.env.example` to `.env` and fill in MongoDB, `AUTH_SECRET`, OpenRouter, the embedding model, and Qdrant.
2. Use the same `AUTH_SECRET` as the Next.js app.
3. Start the API from `backend/` with `uvicorn app.main:app --reload --port 8000`.
4. Start Next.js with `npm run dev`. Set `FASTAPI_URL` if the API is not on `http://127.0.0.1:8000`.

`OPENROUTER_API_KEY` is read only by FastAPI. It is not exposed to the browser.

Scanned documents need the Tesseract binary and Poppler. Without them, text-layer PDFs still upload, and scanned files fail with an error that names the missing tool.

## Tests

From `backend/`:

```bash
python -m pytest
python evaluation/evaluate_comparison.py
```

The comparison evaluation scores the checked-in material-change cases. The RAG evaluation script does not print an accuracy number unless the external services are configured, and even then it does not invent a percentage.

## Limits

- Voice notes are not transcribed.
- Comparison and clause extraction need a configured OpenRouter model. They are not a local string diff.
- Indexing needs a reachable Qdrant and an embedding model whose vector size matches `EMBEDDING_DIMENSIONS`.
- Risk rules cover a fixed set of patterns. A clause that does not match a rule is not given a guessed severity.
