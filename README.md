# Nirdesh

Voice-native developer experience agent (MVP scaffold with Vapi + Qdrant).

## Stack

- Frontend: React + Vite + TypeScript
- Backend: FastAPI
- Voice: Vapi Web SDK
- Memory: Qdrant semantic memory per session

## Environment setup

Backend:

```bash
cd backend
cp .env.example .env
```

Frontend:

```bash
cd frontend
cp .env.example .env
```

Set Vapi values in `frontend/.env`:

- `VITE_API_URL` (e.g. `http://localhost:8000`)
- `VITE_VAPI_PUBLIC_KEY`
- `VITE_VAPI_ASSISTANT_ID`

Set Qdrant values in `backend/.env` (defaults already provided for local Qdrant).
Optional for secure Vapi webhooks:

- `VAPI_WEBHOOK_SECRET` (must match `x-vapi-secret` sent by Vapi)
- `VAPI_PRIVATE_API_KEY` (server-side only; never expose in frontend)
- `LLM_API_KEY` (server-side only; used for `/chat` generation)
- `LLM_BASE_URL` (default `https://api.ai.kodekloud.com/v1`)
- `LLM_MODEL` (default `anthropic/claude-sonnet-4.5`)

## Security note

- Do not put Vapi private API keys in `frontend/.env` or client code.
- Keep private keys only in `backend/.env`.

## Run backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Notes

- `/chat` now stores each user message in Qdrant and retrieves top related messages for the same `session_id`.
- `/chat` uses the configured LLM provider for real technical answers.
- `/chat` supports multilingual replies (`language: "auto"` by default, or force a specific language).
- Frontend UI text localizes based on selected language (with full English/Hindi/Spanish coverage and auto fallback).
- The frontend includes a `Start Voice` button that starts/stops a Vapi call.
- `/vapi/webhook` ingests Vapi events/transcripts into Qdrant memory for call-level continuity.
