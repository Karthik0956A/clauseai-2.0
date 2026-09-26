# ClauseAI API

FastAPI service for contract ingestion, retrieval, comparison, risk rules, and policy checks.

The Next.js app stays the only thing the browser talks to. It forwards the session JWT to this service. OpenRouter and Qdrant credentials stay here.

## Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Set the variables in the repository `.env.example`. Copy that file to `.env` in the repository root or export them in the shell. This process reads environment variables; it does not ship secrets.

## What calls the network

These features do nothing useful until the named service is configured. They return a clear error instead of a made-up result.

| Feature | Required |
|---|---|
| Embeddings and Qdrant indexing | `OPENROUTER_API_KEY`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `QDRANT_URL` |
| Contract Q&A, clause extraction, comparison, narrative summary | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |
| Saved documents | `MONGODB_URI` |
| Scanned PDFs and images | Tesseract and Poppler on the machine |

Text PDFs that already contain a text layer do not need Tesseract.

## Tests

```bash
cd backend
python -m pytest
python evaluation/evaluate_comparison.py
```

`evaluation/evaluate_rag.py` refuses to print a retrieval score until Qdrant, MongoDB, and the embedding model are configured.
