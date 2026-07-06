"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch, cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  Activity, Pill, FileText,
  Calendar, AlertCircle, Clock,
  Search, Sparkles, Loader2, ChevronDown,
  Bot, X,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface TimelineEvent {
  id: number
  type: string
  title: string
  description: string
  date: string
  icon: any
  color: string
}

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  metric: { icon: Activity, color: "text-[#0EA5A9]", label: "Metric" },
  medication: { icon: Pill, color: "text-purple-400", label: "Medication" },
  report: { icon: FileText, color: "text-blue-400", label: "Report" },
  symptom: { icon: AlertCircle, color: "text-amber-400", label: "Symptom" },
}

export default function TimelinePage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [showAiResult, setShowAiResult] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch("/metrics?days=30").catch(() => []),
      apiFetch("/medications?active_only=false").catch(() => []),
      apiFetch("/reports").catch(() => []),
    ])
      .then(([metrics, medications, reports]) => {
        const allEvents: TimelineEvent[] = []
        const now = Date.now()

        if (Array.isArray(metrics)) {
          metrics.forEach((m: any, i: number) => {
            const items: string[] = []
            if (m.sleep_hours) items.push(`Sleep: ${m.sleep_hours}h`)
            if (m.water_ml) items.push(`Water: ${m.water_ml}ml`)
            if (m.exercise_min) items.push(`Exercise: ${m.exercise_min}min`)
            if (m.mood) items.push(`Mood: ${m.mood}/10`)
            if (items.length > 0) {
              allEvents.push({
                id: -(i + 1),
                type: "metric",
                title: "Health Check-in",
                description: items.join(" — "),
                date: m.date || new Date(now - i * 86400000).toISOString(),
                icon: Activity,
                color: "text-[#0EA5A9]",
              })
            }
          })
        }

        if (Array.isArray(medications)) {
          medications.forEach((m: any) => {
            allEvents.push({
              id: m.id,
              type: "medication",
              title: `${m.active ? "Active" : "Inactive"}: ${m.name}`,
              description: `${m.dosage} — ${m.frequency}${m.notes ? `. ${m.notes}` : ""}`,
              date: m.start_date || new Date().toISOString(),
              icon: Pill,
              color: "text-purple-400",
            })
          })
        }

        if (Array.isArray(reports)) {
          reports.forEach((r: any) => {
            allEvents.push({
              id: r.id + 1000,
              type: "report",
              title: r.title || r.original_filename,
              description: r.ai_summary
                ? `AI: ${r.ai_summary.substring(0, 100)}${r.ai_summary.length > 100 ? "..." : ""}`
                : r.processed
                  ? "No AI summary available"
                  : "Processing...",
              date: r.uploaded_at,
              icon: FileText,
              color: "text-blue-400",
            })
          })
        }

        allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setEvents(allEvents)
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated, router])

  const handleTimelineSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setAiResult(null)
    setShowAiResult(true)

    try {
      const now = new Date()
      const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000)
      const data = await apiFetch("/timeline/query", {
        method: "POST",
        body: JSON.stringify({
          query: searchQuery.trim(),
          date_from: sixMonthsAgo.toISOString().split("T")[0],
          date_to: now.toISOString().split("T")[0],
          top_k: 10,
        }),
      })
      setAiResult(data.response || "No insights found for this query.")
    } catch {
      setAiResult("Unable to search timeline right now. Please try again.")
    } finally {
      setSearching(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-[#0EA5A9] flex items-center justify-center">
          <Clock className="h-5 w-5 text-white animate-spin" />
        </div>
        <p className="text-sm text-[#8B9BB5]">Loading your health timeline...</p>
      </div>
    </div>
  )

  const counts = {
    metric: events.filter((e) => e.type === "metric").length,
    report: events.filter((e) => e.type === "report").length,
    medication: events.filter((e) => e.type === "medication").length,
    symptom: events.filter((e) => e.type === "symptom").length,
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center">
            <Calendar className="h-3.5 w-3.5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-[#EDF2F7]">Health Timeline</h1>
        </div>
        <p className="text-sm text-[#8B9BB5] ml-8">Your complete health journey from your data</p>
      </motion.div>

      {/* AI Timeline Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="clinical-card"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleTimelineSearch() }}
              placeholder="Ask about your timeline — e.g., 'What happened last month?'"
              className="w-full bg-transparent text-sm text-[#EDF2F7] placeholder:text-[#8B9BB5]/50 outline-none"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setShowAiResult(false); setAiResult(null) }}
              className="btn-clinical-icon !p-1 shrink-0"
            >
              <X className="h-4 w-4 text-[#8B9BB5]" />
            </button>
          )}
          <button
            onClick={handleTimelineSearch}
            disabled={searching || !searchQuery.trim()}
            className="h-7 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 flex items-center justify-center transition-all shrink-0 text-xs font-medium text-white gap-1"
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
            ) : (
              <><Search className="h-3.5 w-3.5" /> Search</>
            )}
          </button>
        </div>

        {/* AI Result */}
        <AnimatePresence>
          {showAiResult && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-[#2B364A]">
                {searching ? (
                  <div className="flex items-center gap-2 text-sm text-[#8B9BB5]">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                    Analyzing your timeline...
                  </div>
                ) : aiResult ? (
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div className="clinical-prose flex-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiResult}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Check-ins", count: counts.metric, icon: Activity, color: "text-[#0EA5A9]" },
          { label: "Reports", count: counts.report, icon: FileText, color: "text-blue-400" },
          { label: "Medications", count: counts.medication, icon: Pill, color: "text-purple-400" },
          { label: "Total Events", count: events.length, icon: Calendar, color: "text-rose-400" },
        ].map((stat) => (
          <div key={stat.label} className="clinical-card !p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#181E2E]">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-[#EDF2F7]">{stat.count}</p>
              <p className="text-xs text-[#8B9BB5]">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {events.length === 0 ? (
        <div className="clinical-card !p-10 text-center">
          <div className="flex flex-col items-center">
            <Calendar className="h-10 w-10 text-[#8B9BB5]/40 mb-4" />
            <h2 className="text-base font-bold text-[#EDF2F7] mb-2">No Timeline Events Yet</h2>
            <p className="text-sm text-[#8B9BB5] max-w-md">
              Your health timeline will populate as you log metrics, add medications, and upload reports.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[23px] top-0 bottom-0 w-px bg-gradient-to-b from-[#0EA5A9] via-[#0EA5A9]/30 to-transparent opacity-30" />

          <div className="space-y-4">
            {events.map((event, i) => {
              const cfg = typeConfig[event.type] || { icon: Activity, color: "text-[#8B9BB5]" }
              return (
                <motion.div
                  key={`${event.type}-${event.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  className="relative pl-12"
                >
                  <div className={`absolute left-3.5 top-4 w-3 h-3 rounded-full border-2 border-[#0B0F1A] ${cfg.color.replace("text", "bg")}`} />
                  <div className="clinical-card !p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[#181E2E] shrink-0">
                        <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[#EDF2F7]">{event.title}</p>
                          <span className="text-xs text-[#8B9BB5] shrink-0">
                            {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-sm text-[#8B9BB5] mt-1 leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
