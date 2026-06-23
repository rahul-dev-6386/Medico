"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot, User, Send, Plus, Trash2, Sparkles, MessageSquare,
  Brain, Heart, Pill, FileText, Activity, X,
  Mic, ChevronRight, AlertCircle
} from "lucide-react"

interface Session {
  id: number
  title: string
  created_at: string
}

interface Message {
  id: number
  role: string
  content: string
  created_at: string
}

const suggestedPrompts = [
  "What do my recent blood test results mean?",
  "How can I improve my sleep quality?",
  "Should I be concerned about my blood pressure?",
  "Create a weekly workout plan for me",
  "What foods should I eat for better heart health?",
]

export default function ChatPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    loadSessions()
  }, [isAuthenticated, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadSessions = async () => {
    try {
      const data = await apiFetch("/chat/sessions")
      setSessions(data)
      if (data.length > 0) {
        setActiveSession(data[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (sessionId: number) => {
    try {
      const data = await apiFetch(`/chat/sessions/${sessionId}/messages`)
      setMessages(data)
    } catch {
      setMessages([])
    }
  }

  useEffect(() => {
    if (activeSession) loadMessages(activeSession)
  }, [activeSession])

  const createSession = async () => {
    try {
      const data = await apiFetch("/chat/sessions", {
        method: "POST",
        body: JSON.stringify({ title: "New Chat" }),
      })
      setSessions((prev) => [data, ...prev])
      setActiveSession(data.id)
      setMessages([])
    } catch (err: any) {
      alert(err.message)
    }
  }

  const deleteSession = async (sessionId: number) => {
    if (!confirm("Delete this chat session?")) return
    try {
      await apiFetch(`/chat/sessions/${sessionId}`, { method: "DELETE" })
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (activeSession === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId)
        setActiveSession(remaining.length > 0 ? remaining[0].id : null)
        setMessages([])
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeSession || sending) return

    const userMessage = input.trim()
    setInput("")
    setSending(true)

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: userMessage, created_at: new Date().toISOString() },
    ])

    try {
      const data = await apiFetch(`/chat/sessions/${activeSession}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: userMessage }),
      })

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.message || data.response || "I've analyzed your question. Based on your health profile, here's what I recommend...",
          created_at: new Date().toISOString(),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "I apologize, but I encountered an error processing your request. Please try again or rephrase your question.",
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
            <Bot className="h-6 w-6 text-white animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your health assistant...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] relative">
      <div className={`
        fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity
        ${showSidebar ? "opacity-100" : "opacity-0 pointer-events-none"}
      `} onClick={() => setShowSidebar(false)} />

      <aside className={`
        fixed lg:relative z-40 lg:z-auto h-full w-72 glass border-r border-white/5 flex flex-col
        transition-transform duration-300
        ${showSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="p-4 border-b border-white/5">
          <Button onClick={createSession} className="w-full gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => { setActiveSession(session.id); setShowSidebar(false) }}
              className={`w-full group text-left p-3 rounded-xl text-sm transition-all ${
                activeSession === session.id
                  ? "glass border border-primary/20"
                  : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{session.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => setShowMemory(!showMemory)}
            className="w-full flex items-center gap-2 p-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <Brain className="h-4 w-4" />
            <span>Health Context</span>
            <ChevronRight className={`h-3.5 w-3.5 ml-auto transition-transform ${showMemory ? "rotate-90" : ""}`} />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/5 lg:hidden">
          <button onClick={() => setShowSidebar(true)} className="p-2 rounded-xl hover:bg-muted/50">
            <MessageSquare className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">AI Health Coach</span>
          </div>
          <button onClick={() => setShowMemory(!showMemory)} className="p-2 rounded-xl hover:bg-muted/50">
            <Brain className="h-5 w-5" />
          </button>
        </div>

        <AnimatePresence>
          {showMemory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-white/5"
            >
              <div className="p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Your Health Context</p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>Health context will appear here as you add medications, metrics, and reports.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-6">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Your AI Health Coach</h2>
              <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
                Ask me anything about your health. I have access to your medical records, metrics, and health history.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(prompt); activeSession ? null : createSession() }}
                    className="text-left text-sm p-3 rounded-xl glass glass-hover text-muted-foreground hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`p-2 rounded-xl ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "glass"
                  }`}>
                    {msg.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className={`rounded-2xl p-4 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "glass"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-white/5 p-4">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <button className="p-2.5 rounded-xl glass glass-hover shrink-0">
              <Mic className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your AI health coach anything..."
                disabled={sending}
                className="glass border-white/10 pr-12 h-12 text-sm placeholder:text-muted-foreground/50"
              />
              <button
                onClick={() => { if (!activeSession) createSession(); else sendMessage() }}
                disabled={sending || !input.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            I&apos;m an AI assistant, not a doctor. For emergencies, call emergency services.
          </p>
        </div>
      </div>
    </div>
  )
}
