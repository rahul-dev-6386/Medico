"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { apiFetch, cn, API_URL, getAuthHeaders } from "@/lib/utils"
import { useVoiceRecorder } from "@/lib/use-voice-recorder"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bot, Send, MessageSquare, Plus, Trash2,
  Copy, RefreshCw, Loader2, Mic, PanelLeftClose,
  PanelLeft,
} from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  id?: string
}

interface ChatSession {
  id: number
  title: string
  created_at: string
}

const suggestions = [
  "What do my latest lab results mean?",
  "Check my medication interactions",
  "Summarize my health this week",
  "Analyze my recent blood work",
  "Should I be worried about my blood pressure?",
  "What lifestyle changes would help me sleep better?",
]

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 rounded-xl bg-[#0EA5A9]/10 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-[#0EA5A9]" />
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5A9] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5A9] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5A9] animate-bounce" />
      </div>
    </motion.div>
  )
}

function ChatMessage({
  message,
  onCopy,
  onRegenerate,
}: {
  message: Message
  onCopy: () => void
  onRegenerate?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === "user"

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("group flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-[#0EA5A9]/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-4 w-4 text-[#0EA5A9]" />
        </div>
      )}

      <div className={cn("min-w-0", isUser ? "max-w-[70%] order-first" : "flex-1")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-[14px] leading-[1.6]",
            isUser
              ? "bg-[#0EA5A9] text-white rounded-br-md"
              : "text-[#D1D9E8]"
          )}
        >
          {!isUser && message.content ? (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:bg-[#0D1117] prose-pre:border prose-pre:border-[#2B364A] prose-code:text-[#0EA5A9] prose-code:bg-[#0EA5A9]/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-code:font-mono prose-headings:text-[#EDF2F7] prose-strong:text-[#EDF2F7] prose-a:text-[#0EA5A9] prose-li:text-[#D1D9E8]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            message.content
          )}
        </div>

        {!isUser && (
          <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-[#8B9BB5] hover:text-[#EDF2F7] hover:bg-[#181E2E] transition-colors"
              title="Copy"
            >
              {copied ? (
                <svg className="h-3.5 w-3.5 text-[#0EA5A9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 rounded-md text-[#8B9BB5] hover:text-[#EDF2F7] hover:bg-[#181E2E] transition-colors"
                title="Regenerate"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-5 w-5 text-[#0EA5A9] animate-spin" />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  )
}

function ChatPageInner() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { recording, processing, startRecording, stopRecording } = useVoiceRecorder()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const prompt = searchParams.get("prompt")
    if (prompt) {
      setInput("")
      handleSend(prompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    apiFetch("/chat/sessions").then(setSessions).catch(() => {})
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [activeSession])

  const handleSend = async (text?: string) => {
    const message = (text || input).trim()
    if (!message || loading) return

    setInput("")
    const userMsg: Message = { role: "user", content: message, id: `user-${Date.now()}` }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    let sessionId = activeSession
    if (!sessionId) {
      try {
        const session = await apiFetch("/chat/sessions", {
          method: "POST",
          body: JSON.stringify({ title: message.slice(0, 50) }),
        })
        sessionId = session.id
        setActiveSession(sessionId)
        setSessions((prev) => [session, ...prev])
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Connection error. Please try again.", id: `err-${Date.now()}` },
        ])
        setLoading(false)
        return
      }
    }

    const assistantId = `assistant-${Date.now()}`
    setMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantId }])

    try {
      const response = await fetch(`${API_URL}/chat/sessions/${sessionId}/messages/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ content: message }),
      })

      if (!response.ok) throw new Error("Stream failed")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === "token") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId ? { ...msg, content: msg.content + data.content } : msg
                )
              )
            } else if (data.type === "error") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId ? { ...msg, content: data.content } : msg
                )
              )
            }
          } catch {
            /* skip malformed */
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId && !msg.content
            ? { ...msg, content: "Connection error. Please try again." }
            : msg
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceToggle = async () => {
    if (recording) {
      stopRecording()
      return
    }
    const text = await startRecording()
    if (text) {
      setInput((prev) => prev + text)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const createSession = async () => {
    try {
      const session = await apiFetch("/chat/sessions", {
        method: "POST",
        body: JSON.stringify({ title: "New Chat" }),
      })
      setSessions((prev) => [session, ...prev])
      setActiveSession(session.id)
      setMessages([])
      inputRef.current?.focus()
    } catch {}
  }

  const deleteSession = async (id: number) => {
    try {
      await apiFetch(`/chat/sessions/${id}`, { method: "DELETE" })
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (activeSession === id) {
        setActiveSession(null)
        setMessages([])
      }
    } catch {}
  }

  const loadSession = async (id: number) => {
    setActiveSession(id)
    try {
      const data = await apiFetch(`/chat/sessions/${id}/messages`)
      setMessages(Array.isArray(data) ? data : data.messages || [])
    } catch {
      setMessages([])
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Chat History Panel ── */}
      <AnimatePresence initial={false}>
        {showHistory && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="relative z-10 border-r border-[#2B364A] bg-[#0B0F1A] flex flex-col shrink-0 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 h-12 shrink-0">
              <span className="text-xs font-medium text-[#8B9BB5] uppercase tracking-wider">Chats</span>
              <button
                onClick={createSession}
                className="p-1 rounded-md text-[#8B9BB5] hover:text-[#EDF2F7] hover:bg-[#181E2E] transition-colors"
                title="New chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#8B9BB5]/60 px-4">
                  No conversations yet
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors group mb-0.5",
                      activeSession === session.id
                        ? "bg-[#0EA5A9]/10 text-[#0EA5A9]"
                        : "text-[#8B9BB5] hover:text-[#D1D9E8] hover:bg-[#181E2E]"
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span className="text-[13px] truncate flex-1">{session.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#8B9BB5] hover:text-red-400 transition-all shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar — minimal, only session controls */}
        <div className="flex items-center h-12 px-4 border-b border-[#2B364A] shrink-0">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 rounded-md text-[#8B9BB5] hover:text-[#EDF2F7] hover:bg-[#181E2E] transition-colors mr-2"
            title={showHistory ? "Hide history" : "Show history"}
          >
            {showHistory ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>
          {activeSession && (
            <span className="text-[13px] text-[#8B9BB5] truncate">
              {sessions.find((s) => s.id === activeSession)?.title || "Chat"}
            </span>
          )}
        </div>

        {/* Messages or Welcome */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            /* ── Welcome — minimal, composer-focused ── */
            <div className="flex flex-col items-center justify-center h-full px-6 md:px-10 lg:px-12">
              <div className="w-full">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-center mb-8"
                >
                  <h1 className="text-[22px] font-semibold text-[#EDF2F7] mb-1.5">
                    Sanjeevni AI
                  </h1>
                  <p className="text-[13px] text-[#8B9BB5]">
                    Ask anything about your health, medications, or lab results.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className="flex flex-wrap justify-center gap-2 mb-10"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="px-3.5 py-2 rounded-xl bg-[#181E2E] border border-[#2B364A] text-[13px] text-[#8B9BB5] hover:text-[#D1D9E8] hover:border-[#3B4A63] hover:bg-[#1C2336] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              </div>
            </div>
          ) : (
            /* ── Messages ── */
            <div className="px-6 md:px-10 lg:px-12 py-6 space-y-4">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={msg.id || i}
                  message={msg}
                  onCopy={() => {}}
                  onRegenerate={msg.role === "assistant" ? () => {} : undefined}
                />
              ))}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Composer — the strongest visual element ── */}
        <div className="border-t border-[#2B364A] bg-[#0B0F1A]">
          <div className="px-6 md:px-10 lg:px-12 py-4">
            <div className="relative flex items-end bg-[#181E2E] rounded-2xl border border-[#2B364A] focus-within:border-[#0EA5A9]/50 focus-within:shadow-[0_0_0_3px_rgba(14,165,169,0.08)] transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                className="flex-1 bg-transparent text-[14px] text-[#EDF2F7] outline-none resize-none max-h-32 py-3.5 px-4 placeholder:text-[#8B9BB5]/50 leading-[1.5]"
                style={{ minHeight: "48px" }}
                onInput={(e) => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = Math.min(el.scrollHeight, 128) + "px"
                }}
              />
              <div className="flex items-center gap-1 pr-2 pb-2.5">
                <button
                  onClick={handleVoiceToggle}
                  disabled={processing}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    recording
                      ? "text-red-400 bg-red-500/10"
                      : "text-[#8B9BB5] hover:text-[#D1D9E8] hover:bg-[#252F40]"
                  )}
                  title={recording ? "Stop recording" : "Voice input"}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-lg bg-[#0EA5A9] text-white hover:bg-[#0D9498] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#8B9BB5]/40 text-center mt-2.5">
              AI-generated. Verify critical medical information with your doctor.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
