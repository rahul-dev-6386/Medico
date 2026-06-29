"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { apiFetch, cn } from "@/lib/utils"
import { useVoiceRecorder } from "@/lib/use-voice-recorder"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot, Send, Sparkles, MessageSquare, Plus, Trash2,
  ChevronLeft, ChevronRight, Copy, RefreshCw,
  ThumbsUp, ThumbsDown, Search, Clock, FileText,
  Pill, Activity, BookOpen, Loader2, AlertCircle,
  Mic, Paperclip, ArrowDown, Circle,
} from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  id?: string
  timestamp?: string
}

interface ChatSession {
  id: number
  title: string
  created_at: string
  updated_at?: string
  pinned?: boolean
}

const suggestedPrompts = [
  "What do my latest lab results mean?",
  "Summarize my health this week",
  "Should I be worried about my blood pressure?",
  "Check my medication interactions",
  "What lifestyle changes would help me sleep better?",
  "Analyze my recent blood work",
]

function TypingIndicator() {
  return (
    <div className="chat-bubble-assistant">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
        <span className="text-xs text-[#94A3B8]">Medico is thinking...</span>
      </div>
    </div>
  )
}

function ChatMessage({ message, onCopy, onRegenerate }: { message: Message; onCopy: () => void; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false)

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
      className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
    >
      {message.role === "assistant" && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#22C55E] to-emerald-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-[#22C55E]/20">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={cn("group max-w-[80%]", message.role === "user" && "order-first")}>
        <div
          className={cn(
            "prose prose-invert prose-sm max-w-none",
            message.role === "user"
              ? "chat-bubble-user"
              : "chat-bubble-assistant"
          )}
          dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, "<br/>") }}
        />
        {message.role === "assistant" && (
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity px-1">
            <button onClick={handleCopy} className="btn-icon !p-1" title="Copy">
              {copied ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} className="btn-icon !p-1" title="Regenerate">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <button className="btn-icon !p-1" title="Like"><ThumbsUp className="h-3.5 w-3.5" /></button>
            <button className="btn-icon !p-1" title="Dislike"><ThumbsDown className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Check(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> }

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<number | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
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

  const handleSend = async (text?: string) => {
    const message = (text || input).trim()
    if (!message || loading) return

    setInput("")
    const userMsg: Message = { role: "user", content: message, id: Date.now().toString() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      let sessionId = activeSession
      if (!sessionId) {
        const session = await apiFetch("/chat/sessions", {
          method: "POST",
          body: JSON.stringify({ title: message.slice(0, 50) }),
        })
        sessionId = session.id
        setActiveSession(sessionId)
        setSessions((prev) => [session, ...prev])
      }

      const data = await apiFetch(`/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: message }),
      })
      const assistantMsg: Message = {
        role: "assistant",
        content: data.response || data.message || data.content || "I'm here to help with your health questions.",
        id: (Date.now() + 1).toString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting. Please try again.",
        id: (Date.now() + 1).toString(),
      }])
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

  const filteredSessions = sessions.filter(
    (s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Chat Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/[0.06] bg-[#0B0E14]/50 flex flex-col shrink-0 overflow-hidden"
          >
            <div className="p-3 border-b border-white/[0.06]">
              <button onClick={createSession} className="btn-primary w-full gap-2">
                <Plus className="h-4 w-4" />
                New Chat
              </button>
            </div>
            <div className="p-3">
              <div className="relative">
                <Search className="h-4 w-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#94A3B8] px-4">
                  <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  {searchQuery ? "No chats found" : "Start a new conversation"}
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group",
                      activeSession === session.id
                        ? "bg-[#22C55E]/10 text-[#22C55E]"
                        : "text-[#94A3B8] hover:text-[#F9FAFB] hover:bg-white/[0.04]"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="text-sm truncate flex-1">{session.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                      className="opacity-0 group-hover:opacity-100 btn-icon !p-1 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#090B10]">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06] lg:hidden">
          <button onClick={() => setShowSidebar(!showSidebar)} className="btn-icon">
            <MessageSquare className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20">
            <Sparkles className="h-3 w-3 text-[#22C55E]" />
            <span className="text-xs font-medium text-[#22C55E]">Medico</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22C55E] to-emerald-600 flex items-center justify-center mb-6 shadow-2xl shadow-[#22C55E]/20">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[#F9FAFB] mb-2">Medico</h1>
              <p className="text-sm text-[#94A3B8] text-center mb-8 max-w-md">
                Your AI health assistant. Ask me anything about your health, medications, lab results, or symptoms.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestedPrompts.map((prompt, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => handleSend(prompt)}
                    className="text-left text-sm px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] transition-all text-[#94A3B8] hover:text-[#F9FAFB]"
                  >
                    {prompt}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
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

        {/* Input Area */}
        <div className="border-t border-white/[0.06] bg-[#090B10]">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {messages.length > 0 && (
              <div className="flex justify-center mb-2">
                <button onClick={scrollToBottom} className="btn-icon !p-1.5">
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-[#111827] rounded-2xl border border-white/[0.08] px-3 py-2 focus-within:border-[#22C55E]/40 focus-within:ring-1 focus-within:ring-[#22C55E]/20 transition-all">
              <button className="btn-icon !p-1.5 shrink-0" title="Attach file">
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your health..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-[#F9FAFB] outline-none resize-none max-h-32 py-1.5 placeholder:text-[#94A3B8]/60"
                style={{ minHeight: "24px" }}
                onInput={(e) => {
                  const el = e.currentTarget
                  el.style.height = "auto"
                  el.style.height = Math.min(el.scrollHeight, 128) + "px"
                }}
              />
              <button
                onClick={handleVoiceToggle}
                disabled={processing}
                className={cn(
                  "btn-icon !p-1.5 shrink-0 relative transition-all",
                  recording && "text-red-400 bg-red-500/10 animate-pulse-soft"
                )}
                title={recording ? "Stop recording" : "Voice input"}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className={cn("h-4 w-4", recording && "text-red-400")} />
                )}
                {recording && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-[#22C55E] text-white flex items-center justify-center shrink-0 hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-[#94A3B8]/50 text-center mt-2">
              Medico uses AI. Verify critical medical information with your doctor.
            </p>
          </div>
        </div>
      </div>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="hidden lg:flex absolute left-[var(--sidebar-width)] top-20 -translate-x-1/2 w-6 h-6 rounded-full bg-[#111827] border border-white/[0.06] items-center justify-center hover:bg-white/[0.06] transition-colors z-10"
        style={{ left: showSidebar ? "calc(260px + var(--sidebar-width, 0px))" : "0px" }}
      >
        <ChevronLeft className={cn("h-3 w-3 text-[#94A3B8]", !showSidebar && "rotate-180")} />
      </button>
    </div>
  )
}
