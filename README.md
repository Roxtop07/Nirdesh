# 🎙️ **Nirdesh**
### *Voice-Native Developer AI Assistant*

> **Hands-free, voice-first coding companion**: Speak your questions, get real-time technical guidance in 11+ languages with full conversation memory.

---

## 🚀 **Problem & Vision**
Developers constantly context-switch between terminal, IDE, docs, and chat tools. **Nirdesh** eliminates the friction—talk naturally, get instant answers, and never lose context.

Think: Voice interface + semantic memory + real-time LLM intelligence = frictionless developer workflow.

---

## ✨ **Key Features**

🎤 **Voice-First Interface**
- Real-time voice input via Vapi with speech recognition
- Start/stop voice calls with one click
- Natural, conversational tone

🌍 **Multilingual Support (11 Languages)**
- English, Hindi, Spanish, French, German, Portuguese, Japanese, Korean, Chinese, Arabic, Russian
- Automatic language detection
- Context-aware responses in the user's language

🧠 **Semantic Memory**
- Qdrant vector database stores all conversation history
- Retrieves relevant past interactions for context
- Session-based conversation continuity
- Meaningful Q&A synthesis, not just chat logs

⚡ **Real Technical Answers**
- Powered by Claude Sonnet 4.5 LLM
- Configured for practical, accurate developer guidance
- Supports code explanations, debugging tips, architecture decisions
- Low-latency API responses

🔐 **Enterprise-Grade Security**
- Server-side API key management
- Webhook signature verification
- No sensitive data in frontend
- CORS-enabled for safe cross-origin requests

---

## 🏗️ **Architecture**

```
┌─────────────────────────┐
│   React + Vite + TS     │
│   (Frontend UI)         │
└────────┬────────────────┘
         │
         │ REST API
         ↓
┌─────────────────────────┐
│   FastAPI Backend       │
│ ┌─────────────────────┐ │
│ │  Voice Webhook      │ │  ← Vapi transcripts
│ │  Chat Endpoints     │ │
│ │  Auth & Routing     │ │
│ └─────────────────────┘ │
└────────┬────────────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌─────────┐ ┌───────────┐
│  Qdrant │ │ Claude    │
│(Memory) │ │(LLM)      │
└─────────┘ └───────────┘
```

---

## 🛠️ **Tech Stack**

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite + TypeScript | Modern, fast UI |
| **Voice** | Vapi Web SDK | Voice I/O & real-time streaming |
| **Backend** | FastAPI (Python) | High-performance async API |
| **Memory** | Qdrant (Vector DB) | Semantic search + storage |
| **LLM** | Claude Sonnet 4.5 | Real-time answers |
| **Language Detection** | Lingua | Deterministic multi-language support |
| **Embeddings** | FastEmbed | Fast, local embeddings |
| **UI Components** | shadcn/ui + Tailwind CSS | Polished, accessible design |

---

## 🎯 **Core Endpoints**

### `POST /chat`
**Interactive Q&A with memory**
```json
{
  "session_id": "user-123",
  "query": "How do I optimize a React component?",
  "language": "auto"
}
```
Returns: Contextual answer + top 3 remembered messages

### `POST /vapi/webhook`
**Ingests Vapi call transcripts**
- Receives speech-to-text from Vapi
- Stores in Qdrant for future session context
- Enables conversation continuity

### `GET /docs`
**Interactive API documentation** (Swagger UI)

---

## 🚀 **Quick Start**

### Prerequisites
- Python 3.13+
- Node.js 18+
- Local Qdrant instance (Docker) or Qdrant Cloud

### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with:
#  - VAPI_WEBHOOK_SECRET (optional)
#  - LLM_API_KEY
#  - QDRANT_URL & QDRANT_API_KEY

# Run
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with:
#  - VITE_API_URL=http://localhost:8000
#  - VITE_VAPI_PUBLIC_KEY
#  - VITE_VAPI_ASSISTANT_ID

# Run
npm run dev
# Open http://localhost:5173
```

### Qdrant Setup (Optional - Local)
```bash
docker run -p 6333:6333 qdrant/qdrant:latest
```

---

## 📊 **How It Works**

1. **User speaks** into the interface
2. **Vapi** transcribes speech → sends to backend
3. **Backend** detects language, embeds query, searches Qdrant for context
4. **LLM** (Claude) generates answer informed by past conversations
5. **Response** streamed back and read aloud via text-to-speech
6. **Memory** stored: Query + Answer + Metadata in Qdrant

---

## 🎮 **Use Cases**

✅ **Pair Programming**: "Debug this async/await error for me"  
✅ **Architecture Decisions**: "Should I use microservices or monolith?"  
✅ **Code Explanations**: "Walk me through this React hook"  
✅ **Learning**: "How do I implement OAuth2?"  
✅ **Troubleshooting**: "Why is my Docker container failing?"  

All in your preferred language, with full conversation history.

---

## 📈 **Performance**

- **Voice Latency**: < 2s (speech → response start)
- **Memory Retrieval**: ~100ms (top-K semantic search)
- **LLM Response**: ~3-5s (average answer generation)
- **Concurrent Users**: Scales with Qdrant + LLM API capacity

---

## 🔒 **Security & Privacy**

✅ Private API keys stay on backend (.env)  
✅ Frontend only receives public config  
✅ Vapi webhook signatures are verified  
✅ CORS restricted to authorized domains  
✅ No PII in logs (configurable) 

---

## 📦 **Project Structure**

```
Nirdesh/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, routes, LLM logic
│   │   ├── auth.py          # Authentication & Vapi webhooks
│   │   └── db.py            # Qdrant client wrapper
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend config template
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main app component
│   │   ├── AppRouter.tsx     # Routing setup
│   │   ├── pages/            # Page components (Landing, Dashboard, etc.)
│   │   ├── components/       # UI components (Navbar, Voice button, etc.)
│   │   └── styles/           # Global styles + Tailwind
│   ├── package.json          # Dependencies
│   └── vite.config.ts        # Vite build config
└── README.md

```

---

## 🧪 **Testing & Development**

### Dev Server (with hot reload)
```bash
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev
```

### Build for Production
```bash
cd frontend && npm run build
# Output in frontend/dist/
```

---

## 🌟 **Highlights for Judges**

✨ **Innovation**: Voice + Semantic Memory = Novel Developer Experience  
🚀 **Full Stack**: Production-ready frontend, backend, voice integration  
🌐 **Multilingual**: 11 languages with automatic detection  
🔬 **Technical Depth**: Vector DB, LLM orchestration, real-time streaming  
📱 **User-Centric**: Solves real friction point in dev workflows  
🛡️ **Enterprise-Ready**: Security, scalability, architecture considered  

---

## 🤝 **Team & Credits**

Built with ❤️ for **HackBLR** 2026 
Tech: Vapi + Qdrant + FastAPI + React

---

## 📞 **Support & Feedback**

Issues? Questions? Open an issue or reach out!

---

**Ready to experience hands-free coding?** 🎙️  
Clone, configure, and start talking to your AI assistant today.
