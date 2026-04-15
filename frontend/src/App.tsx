import { useEffect, useMemo, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

type Role = "user" | "assistant" | "system";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  translations?: Record<string, string>;
};

type Thread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

type HealthStatus = "checking" | "ok" | "degraded";
type VoiceStatus = "idle" | "connecting" | "active" | "error";

type LanguageOption = { code: string; name: string; speech: string };

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;
const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID;

const STORAGE_THREADS = "nirdesh_threads_v1";
const STORAGE_ACTIVE_THREAD = "nirdesh_active_thread_v1";
const STORAGE_LANGUAGE = "nirdesh_language_v1";

const LANGUAGES: LanguageOption[] = [
  { code: "auto", name: "Auto", speech: "en-US" },
  { code: "English", name: "English", speech: "en-US" },
  { code: "Hindi", name: "Hindi", speech: "hi-IN" },
  { code: "Spanish", name: "Spanish", speech: "es-ES" },
  { code: "French", name: "French", speech: "fr-FR" },
  { code: "German", name: "German", speech: "de-DE" },
  { code: "Portuguese", name: "Portuguese", speech: "pt-PT" },
  { code: "Japanese", name: "Japanese", speech: "ja-JP" },
  { code: "Korean", name: "Korean", speech: "ko-KR" },
  { code: "Chinese", name: "Chinese", speech: "zh-CN" },
  { code: "Arabic", name: "Arabic", speech: "ar-SA" },
  { code: "Russian", name: "Russian", speech: "ru-RU" },
];
const OUTPUT_LANGUAGES = LANGUAGES.filter((l) => l.code !== "auto");

const I18N: Record<string, Record<string, string>> = {
  English: {
    title: "Nirdesh",
    subtitle: "Voice-native developer experience assistant",
    language: "Language",
    chats: "Recent chats",
    newChat: "New chat",
    deleteChat: "Delete chat",
    quickActions: "Quick actions",
    qa1: "Explain this error",
    qa2: "Debug failing API route",
    qa3: "Summarize this code",
    voice: "Voice controls",
    startVoice: "Start voice assistant",
    stopVoice: "Stop voice assistant",
    clearChat: "Clear current chat",
    threadEmpty: "Ask anything about code, tools, debugging, or architecture.",
    inputPlaceholder: "Ask Nirdesh anything...",
    send: "Send",
    thinking: "Nirdesh is thinking...",
    welcome: "Hi — I’m Nirdesh. Tell me what you’re building or stuck on, and I’ll help fast.",
    voiceUnavailable: "Voice is unavailable until Vapi env keys are configured.",
  },
  Hindi: {
    title: "निर्देश",
    subtitle: "वॉइस-नेटिव डेवलपर अनुभव सहायक",
    language: "भाषा",
    chats: "हाल की चैट",
    newChat: "नई चैट",
    deleteChat: "चैट हटाएँ",
    quickActions: "क्विक एक्शन",
    qa1: "इस एरर को समझाओ",
    qa2: "फेल होती API रूट डीबग करो",
    qa3: "इस कोड का सारांश दो",
    voice: "वॉइस कंट्रोल",
    startVoice: "वॉइस असिस्टेंट शुरू करें",
    stopVoice: "वॉइस असिस्टेंट रोकें",
    clearChat: "वर्तमान चैट साफ करें",
    threadEmpty: "कोड, टूल्स, डीबगिंग या आर्किटेक्चर पर कुछ भी पूछें।",
    inputPlaceholder: "निर्देश से कुछ भी पूछें...",
    send: "भेजें",
    thinking: "निर्देश सोच रहा है...",
    welcome: "नमस्ते — मैं निर्देश हूँ। आप क्या बना रहे हैं या कहाँ अटके हैं, बताइए।",
    voiceUnavailable: "Vapi env keys सेट होने तक वॉइस उपलब्ध नहीं है।",
  },
  Spanish: {
    title: "Nirdesh",
    subtitle: "Asistente de experiencia de desarrollo nativo por voz",
    language: "Idioma",
    chats: "Chats recientes",
    newChat: "Nuevo chat",
    deleteChat: "Eliminar chat",
    quickActions: "Acciones rápidas",
    qa1: "Explica este error",
    qa2: "Depura una ruta API fallida",
    qa3: "Resume este código",
    voice: "Controles de voz",
    startVoice: "Iniciar asistente de voz",
    stopVoice: "Detener asistente de voz",
    clearChat: "Limpiar chat actual",
    threadEmpty: "Pregunta sobre código, herramientas, depuración o arquitectura.",
    inputPlaceholder: "Pregunta cualquier cosa a Nirdesh...",
    send: "Enviar",
    thinking: "Nirdesh está pensando...",
    welcome: "Hola — soy Nirdesh. Cuéntame qué estás construyendo o dónde te atascaste.",
    voiceUnavailable: "La voz no está disponible hasta configurar las claves de entorno de Vapi.",
  },
};

const now = () => Date.now();
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function t(language: string, key: string): string {
  const lang = I18N[language] ? language : "English";
  return I18N[lang][key] || I18N.English[key] || key;
}

function makeWelcomeMessage(language: string): ChatMessage {
  return { id: makeId(), role: "assistant", content: t(language, "welcome"), createdAt: now() };
}

function createThread(language: string): Thread {
  const createdAt = now();
  return {
    id: makeId(),
    title: "New chat",
    createdAt,
    updatedAt: createdAt,
    messages: [makeWelcomeMessage(language)],
  };
}

function getVoiceLabel(role: Role, labels: Record<string, string>) {
  return role === "assistant" ? labels.title : "You";
}

function guessThreadTitle(messages: ChatMessage[], language: string): string {
  const userMsg = messages.find((m) => m.role === "user");
  if (!userMsg) return t(language, "newChat");
  return userMsg.content.slice(0, 45).trim() || t(language, "newChat");
}

export default function App() {
  const [language, setLanguage] = useState<string>(
    () => localStorage.getItem(STORAGE_LANGUAGE) || "English"
  );
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [threads, setThreads] = useState<Thread[]>(() => {
    const raw = localStorage.getItem(STORAGE_THREADS);
    if (!raw) return [createThread("English")];
    try {
      const parsed = JSON.parse(raw) as Thread[];
      return parsed.length ? parsed : [createThread("English")];
    } catch {
      return [createThread("English")];
    }
  });
  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_ACTIVE_THREAD) || "";
  });

  const vapiRef = useRef<Vapi | null>(null);
  const lastSpeechRef = useRef<string>("");
  const lastVoiceMsgRef = useRef<string>("");

  const labels = useMemo(() => {
    if (I18N[language]) return I18N[language];
    return I18N.English;
  }, [language]);

  useEffect(() => {
    if (!threads.length) {
      const fallback = createThread(language);
      setThreads([fallback]);
      setActiveThreadId(fallback.id);
      return;
    }
    if (!activeThreadId || !threads.some((tItem) => tItem.id === activeThreadId)) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId, language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_THREADS, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    if (activeThreadId) localStorage.setItem(STORAGE_ACTIVE_THREAD, activeThreadId);
  }, [activeThreadId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LANGUAGE, language);
  }, [language]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0],
    [threads, activeThreadId]
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then(async (res) => {
        if (!res.ok) throw new Error("health check failed");
        const data = (await res.json()) as { status?: HealthStatus };
        if (!cancelled) setHealthStatus(data.status === "ok" ? "ok" : "degraded");
      })
      .catch(() => {
        if (!cancelled) setHealthStatus("degraded");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateActiveThread = (updater: (thread: Thread) => Thread) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== activeThread.id) return thread;
        const next = updater(thread);
        return { ...next, title: guessThreadTitle(next.messages, language), updatedAt: now() };
      })
    );
  };

  const appendMessage = (message: ChatMessage) => {
    updateActiveThread((thread) => ({ ...thread, messages: [...thread.messages, message] }));
  };

  const speakTextByLanguage = (text: string, langCode: string, interrupt = false) => {
    if (!text) return;
    const dedupeKey = `${langCode}:${text}`;
    if (lastSpeechRef.current === dedupeKey) return;
    lastSpeechRef.current = dedupeKey;

    const found = LANGUAGES.find((l) => l.code === langCode) || LANGUAGES.find((l) => l.code === "English");
    const speechLang = found?.speech || "en-US";
    try {
      if (vapiRef.current && voiceStatus === "active" && typeof (vapiRef.current as any).say === "function") {
        (vapiRef.current as any).say(text, { interrupt });
        return;
      }
    } catch {
      // Fallback below.
    }

    if ("speechSynthesis" in window) {
      if (interrupt) window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = speechLang;
      window.speechSynthesis.speak(utter);
    }
  };

  const speakSelectedLanguage = (translations: Record<string, string>, fallback: string) => {
    const selectedLanguage = language === "auto" ? "English" : language;
    const text =
      translations[selectedLanguage] ||
      translations[selectedLanguage.toLowerCase()] ||
      fallback;
    if (!text?.trim()) return;
    speakTextByLanguage(text.trim(), selectedLanguage, true);
  };

  const sendMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || loading) return;
    setError(null);

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: text, createdAt: now() };
    appendMessage(userMessage);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: activeThread.id,
          language: language === "auto" ? "auto" : language,
        }),
      });
      if (!response.ok) throw new Error("Chat request failed");
      const data = (await response.json()) as { reply?: string; translations?: Record<string, string> };
      const assistantText = (data.reply || "I couldn't generate a reply. Please try again.").trim();
      const translations = data.translations || {};
      appendMessage({
        id: makeId(),
        role: "assistant",
        content: assistantText,
        translations,
        createdAt: now(),
      });
      speakSelectedLanguage(translations, assistantText);
    } catch {
      const msg = "Something went wrong while contacting the backend.";
      setError(msg);
      appendMessage({ id: makeId(), role: "assistant", content: msg, createdAt: now() });
    } finally {
      setLoading(false);
    }
  };

  const startVoice = async () => {
    if (!VAPI_PUBLIC_KEY || !VAPI_ASSISTANT_ID) {
      setError(labels.voiceUnavailable);
      return;
    }

    try {
      setError(null);
      setVoiceStatus("connecting");
      if (!vapiRef.current) {
        const vapi = new Vapi(VAPI_PUBLIC_KEY);
        vapiRef.current = vapi;

        vapi.on("call-start", () => setVoiceStatus("active"));
        vapi.on("call-end", () => setVoiceStatus("idle"));
        vapi.on("call-start-failed", () => {
          setVoiceStatus("error");
          setError("Voice call failed.");
        });
        vapi.on("error", (e: unknown) => {
          setVoiceStatus("error");
          const msg = typeof e === "string" ? e : "Voice call failed.";
          setError(msg);
        });
        vapi.on("message", (evt: any) => {
          const role = evt?.role === "assistant" ? "assistant" : evt?.role === "user" ? "user" : null;
          const content =
            evt?.message?.content || evt?.message || evt?.content || evt?.transcript || evt?.text || "";
          if (!role || typeof content !== "string" || !content.trim()) return;
          const key = `${role}:${content.trim()}`;
          if (lastVoiceMsgRef.current === key) return;
          lastVoiceMsgRef.current = key;
          appendMessage({ id: makeId(), role, content: content.trim(), createdAt: now() });
        });
      }

      await vapiRef.current.start(VAPI_ASSISTANT_ID);
    } catch {
      setVoiceStatus("error");
      setError("Voice call failed.");
    }
  };

  const stopVoice = async () => {
    try {
      await vapiRef.current?.stop();
    } finally {
      setVoiceStatus("idle");
    }
  };

  const newChat = () => {
    const thread = createThread(language);
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setInput("");
    setError(null);
  };

  const deleteThread = (threadId: string) => {
    setThreads((prev) => {
      const remaining = prev.filter((thread) => thread.id !== threadId);
      if (!remaining.length) {
        const replacement = createThread(language);
        setActiveThreadId(replacement.id);
        return [replacement];
      }
      if (activeThreadId === threadId) {
        const nextActive = remaining.sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setActiveThreadId(nextActive.id);
      }
      return remaining;
    });
  };

  const clearCurrentChat = () => {
    updateActiveThread((thread) => ({ ...thread, messages: [makeWelcomeMessage(language)] }));
  };

  const quickActions = [labels.qa1, labels.qa2, labels.qa3];
  const sortedThreads = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>{labels.title}</h1>
          <p className="subtitle">{labels.subtitle}</p>
        </div>
        <div className="status-row">
          <label className="lang-picker">
            <span>{labels.language}</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </label>
          <span className={`badge ${healthStatus}`}>Backend: {healthStatus}</span>
          <span className={`badge ${voiceStatus}`}>Voice: {voiceStatus}</span>
        </div>
      </header>

      <main className="workspace">
        <aside className="left-panel">
          <div className="thread-header">
            <h2>{labels.chats}</h2>
            <button className="new-chat-btn" onClick={newChat}>
              {labels.newChat}
            </button>
          </div>
          <div className="thread-list">
            {sortedThreads.map((thread) => (
              <div
                key={thread.id}
                className={`thread-item ${thread.id === activeThread.id ? "active" : ""}`}
              >
                <button className="thread-open-btn" onClick={() => setActiveThreadId(thread.id)}>
                  {thread.title}
                </button>
                <button
                  className="thread-delete-btn"
                  title={labels.deleteChat}
                  aria-label={labels.deleteChat}
                  onClick={() => deleteThread(thread.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <h2>{labels.quickActions}</h2>
          <div className="quick-grid">
            {quickActions.map((item) => (
              <button key={item} className="ghost-btn" onClick={() => setInput(item)}>
                {item}
              </button>
            ))}
          </div>

          <h2>{labels.voice}</h2>
          <div className="voice-controls">
            {voiceStatus === "active" || voiceStatus === "connecting" ? (
              <button className="voice-btn active" onClick={stopVoice}>
                {labels.stopVoice}
              </button>
            ) : (
              <button className="voice-btn" onClick={startVoice}>
                {labels.startVoice}
              </button>
            )}
            <button className="clear-btn" onClick={clearCurrentChat}>
              {labels.clearChat}
            </button>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="chat-header">{activeThread?.title || labels.newChat}</div>
          <div className="chat">
            {activeThread?.messages.length ? (
              activeThread.messages.map((message) => (
                <article key={message.id} className={`bubble ${message.role}`}>
                  <div className="bubble-meta">
                    <strong>{getVoiceLabel(message.role, labels)}</strong>
                    <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p>{message.content}</p>
                  {message.role === "assistant" && message.translations ? (
                    <div className="translation-list">
                      {OUTPUT_LANGUAGES.map((lang) => {
                        const translated = message.translations?.[lang.code] || message.translations?.[lang.name];
                        if (!translated || translated.trim() === message.content.trim()) return null;
                        return (
                          <div key={`${message.id}-${lang.code}`} className="translation-item">
                            <strong>{lang.name}</strong>
                            <p>{translated}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <article className="bubble assistant">
                <p>{labels.threadEmpty}</p>
              </article>
            )}
            {loading ? (
              <article className="bubble assistant loading-bubble">
                <p>{labels.thinking}</p>
              </article>
            ) : null}
          </div>

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              const value = input;
              setInput("");
              void sendMessage(value);
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const value = input;
                  setInput("");
                  void sendMessage(value);
                }
              }}
              placeholder={labels.inputPlaceholder}
              disabled={loading}
              rows={1}
            />
            <button type="submit" disabled={!input.trim() || loading}>
              {labels.send}
            </button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </section>
      </main>
    </div>
  );
}
