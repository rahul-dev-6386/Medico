"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  HeartPulse, Search, Loader2, MessageSquare, Sparkles,
  GraduationCap, BookOpen,
} from "lucide-react"
import { apiFetch, cn } from "@/lib/utils"
import { MedicalAnswer } from "@/components/consult/medical-answer"
import { QuickActions } from "@/components/consult/quick-actions"

const SUGGESTIONS = [
  "Can I take Metformin with alcohol?",
  "Explain Digoxin in simple language",
  "Compare Atorvastatin vs Rosuvastatin",
  "Is Amoxicillin safe during pregnancy?",
  "Why was this medicine prescribed?",
  "What should I monitor while taking Warfarin?",
]

interface ConsultResponse {
  title: string
  summary: string
  sections: { heading: string; content: string }[]
  references: string[]
  follow_up_questions: string[]
  sources_used: string[]
  confidence: string
  patient_mode: boolean
}

export default function ConsultPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ConsultResponse | null>(null)
  const [patientMode, setPatientMode] = useState(false)
  const [history, setHistory] = useState<{ q: string; r: ConsultResponse }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [response, history])

  const handleConsult = async (q?: string) => {
    const term = (q || query).trim()
    if (!term || loading) return
    setLoading(true)
    setQuery("")
    try {
      const data = await apiFetch("/drugs/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: term, patient_mode: patientMode }),
      })
      setResponse(data)
      setHistory((prev) => [...prev, { q: term, r: data }])
    } catch {
      setResponse({
        title: "Error",
        summary: "Failed to get a response. Please try again.",
        sections: [],
        references: [],
        follow_up_questions: [],
        sources_used: [],
        confidence: "low",
        patient_mode: patientMode,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFollowUp = (question: string) => {
    setQuery(question)
    handleConsult(question)
  }

  return (
    <div className="min-h-screen bg-[#090B10]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-[#0EA5A9] flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#F1F5F9] tracking-tight">AI Drug Consultant</h1>
              <p className="text-[11px] text-[#64748B]">Evidence-based medication AI</p>
            </div>
          </div>

          {/* Patient mode toggle */}
          <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl p-0.5 border border-white/[0.08]">
            <button
              onClick={() => setPatientMode(false)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all",
                !patientMode ? "bg-[#0EA5A9] text-white shadow-sm" : "text-[#64748B] hover:text-[#F1F5F9]",
              )}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Professional
            </button>
            <button
              onClick={() => setPatientMode(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all",
                patientMode ? "bg-[#0EA5A9] text-white shadow-sm" : "text-[#64748B] hover:text-[#F1F5F9]",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Patient Friendly
            </button>
          </div>
        </motion.div>

        {/* Search area */}
        <div className="relative">
          <div className={cn(
            "relative rounded-2xl border transition-all duration-300",
            loading
              ? "border-[#0EA5A9]/50 ring-1 ring-[#0EA5A9]/20"
              : "border-white/[0.08] hover:border-white/[0.15]",
            "bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl",
          )}>
            <div className="flex items-center pl-4">
              <Search className="h-5 w-5 text-[#64748B]" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConsult() }}
              placeholder="Ask anything about medications..."
              className="w-full bg-transparent text-[#F1F5F9] text-base outline-none py-4 px-3 placeholder:text-[#64748B]/50"
              disabled={loading}
              aria-label="Ask a medication question"
            />
            <button
              onClick={() => handleConsult()}
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-[#0EA5A9] hover:from-emerald-400 hover:to-[#0EA5A9] transition-all disabled:opacity-40 flex items-center justify-center shadow-lg shadow-emerald-500/20"
              aria-label="Search"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Loading state */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 space-y-4"
            >
              <div className="flex items-center gap-3 text-sm text-[#64748B]">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#0EA5A9] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#0EA5A9] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#0EA5A9] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Consulting medical knowledge base...</span>
              </div>
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-3/4 skeleton rounded-lg" />
                <div className="h-4 w-1/2 skeleton rounded-lg" />
                <div className="h-24 skeleton rounded-xl" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && !response && history.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-[#0EA5A9]/20 flex items-center justify-center mx-auto mb-5">
              <MessageSquare className="h-8 w-8 text-[#0EA5A9]" />
            </div>
            <h2 className="text-xl font-semibold text-[#F1F5F9] mb-2">Ask anything about medications</h2>
            <p className="text-sm text-[#64748B] max-w-md mx-auto mb-8">
              Get evidence-based answers powered by medical textbooks, verified drug databases, and AI.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); handleConsult(s) }}
                  className="text-left text-sm px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-10 flex items-center justify-center gap-6 text-xs text-[#475569]">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Medical textbooks
              </span>
              <span className="flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" />
                Drug databases
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                AI-powered
              </span>
            </div>
          </motion.div>
        )}

        {/* Conversation history */}
        {history.length > 0 && (
          <div className="mt-8 space-y-8">
            {history.map((item, i) => (
              <div key={i} className="space-y-4">
                {/* User question */}
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4 text-[#64748B]" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium text-[#F1F5F9]">{item.q}</p>
                  </div>
                </motion.div>

                {/* AI response */}
                <div className="ml-11">
                  <MedicalAnswer
                    title={item.r.title}
                    summary={item.r.summary}
                    sections={item.r.sections}
                    references={item.r.references}
                    followUpQuestions={item.r.follow_up_questions}
                    sourcesUsed={item.r.sources_used}
                    confidence={item.r.confidence}
                    patientMode={item.r.patient_mode}
                    onFollowUpClick={handleFollowUp}
                  />
                  <div className="mt-4">
                    <QuickActions
                      content={`${item.r.title}\n\n${item.r.summary}\n\n${item.r.sections.map((s) => `${s.heading}\n${s.content}`).join("\n\n")}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
