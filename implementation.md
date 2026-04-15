# Nirdesh Implementation + Full Setup Commands

## 1) What is implemented

- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI
- **Voice**: Vapi Web SDK + browser TTS fallback
- **Memory**: Qdrant (semantic memory per session)
- **LLM**: OpenAI-compatible API (`anthropic/claude-sonnet-4.5` by default)
- **Chat UX**:
  - Recent chats sidebar
  - New chat
  - Delete chat (hover/focus to show delete button)
  - Persistent chat threads (`localStorage`)
  - Enter = send, Shift+Enter = new line
  - Compact message bubbles and compact vertical spacing
- **Language UX**:
  - Language selector
  - Backend language-aware response generation
  - Multi-language translated output shown in chat
  - Voice speaks in currently selected language

---

## 2) Prerequisites download/install commands

### macOS (Homebrew)
```bash
brew install python@3.11 node
```

### Verify tools
```bash
python3 --version
node --version
npm --version
```

---

## 3) Qdrant setup commands

### Option A: Run Qdrant with Docker (recommended)
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### Option B: Use Qdrant Cloud
1. Create cluster in Qdrant Cloud
2. Copy `QDRANT_URL` and `QDRANT_API_KEY`

---

## 4) Clone/open project and install dependencies

```bash
cd /Users/manish/Developer/NirdeshAI
```

### Backend dependencies
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend dependencies
```bash
cd ../frontend
npm install
```

---

## 5) Environment files and variables

### Backend env
```bash
cd /Users/manish/Developer/NirdeshAI/backend
cp .env.example .env
```

Set in `backend/.env`:
```env
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=nirdesh_memory
QDRANT_EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
QDRANT_TOP_K=3

VAPI_WEBHOOK_SECRET=

LLM_API_KEY=your_llm_api_key
LLM_BASE_URL=https://api.ai.kodekloud.com/v1
LLM_MODEL=anthropic/claude-sonnet-4.5
```

### Frontend env
```bash
cd /Users/manish/Developer/NirdeshAI/frontend
cp .env.example .env
```

Set in `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
VITE_VAPI_ASSISTANT_ID=your_vapi_assistant_id
```

---

## 6) Run commands (start to finish)

### Terminal 1: start backend
```bash
cd /Users/manish/Developer/NirdeshAI/backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

### Terminal 2: start frontend
```bash
cd /Users/manish/Developer/NirdeshAI/frontend
npm run dev
```

Open:
```text
http://localhost:5173
```

---

## 7) Health/test commands

### Backend health
```bash
curl http://localhost:8000/health
```

### Chat API test
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain vector database indexing briefly","session_id":"test-session","language":"English"}'
```

---

## 8) Build commands

### Frontend production build
```bash
cd /Users/manish/Developer/NirdeshAI/frontend
npm run build
```

### Backend syntax check
```bash
cd /Users/manish/Developer/NirdeshAI/backend
python3 -m py_compile app/main.py
```

---

## 9) Stop commands

Stop running dev servers with:
```bash
Ctrl + C
```

If port 8000 is stuck:
```bash
kill $(lsof -nP -iTCP:8000 -sTCP:LISTEN -t)
```

If port 5173 is stuck:
```bash
kill $(lsof -nP -iTCP:5173 -sTCP:LISTEN -t)
```

---

## 10) Implemented backend endpoints

- `GET /health`
- `POST /chat`
  - returns `reply`, `translations`, `context`
- `POST /vapi/webhook`

---

## 11) Security notes

- Never put private API keys in frontend env.
- Keep secret keys only in backend `.env`.
- Rotate any keys that were exposed in chat/logs.
