"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { motion } from "framer-motion"
import {
  Activity, Pill, FileText,
  Calendar, AlertCircle, Clock
} from "lucide-react"

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
  metric: { icon: Activity, color: "text-emerald-400", label: "Metric" },
  medication: { icon: Pill, color: "text-purple-400", label: "Medication" },
  report: { icon: FileText, color: "text-blue-400", label: "Report" },
  symptom: { icon: AlertCircle, color: "text-amber-400", label: "Symptom" },
}

export default function TimelinePage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return }

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
                color: "text-emerald-400",
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
          <Clock className="h-6 w-6 text-white animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your health timeline...</p>
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
        <h1 className="text-2xl font-bold">Health Timeline</h1>
        <p className="text-muted-foreground text-sm mt-1">Your complete health journey from your data</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Check-ins", count: counts.metric, icon: Activity, color: "text-emerald-400" },
          { label: "Reports", count: counts.report, icon: FileText, color: "text-blue-400" },
          { label: "Medications", count: counts.medication, icon: Pill, color: "text-purple-400" },
          { label: "Total Events", count: events.length, icon: Calendar, color: "text-rose-400" },
        ].map((stat) => (
          <GlassCard key={stat.label} hover={false} className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/30">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div>
              <p className="text-lg font-bold">{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </GlassCard>
        ))}
      </motion.div>

      {events.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-bold mb-2">No Timeline Events Yet</h2>
            <p className="text-muted-foreground max-w-md">
              Your health timeline will populate as you log metrics, add medications, and upload reports.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="relative">
          <div className="absolute left-[23px] top-0 bottom-0 w-px bg-gradient-to-b from-primary via-secondary to-transparent opacity-30" />

          <div className="space-y-4">
            {events.map((event, i) => {
              const cfg = typeConfig[event.type] || { icon: Activity, color: "text-muted-foreground" }
              return (
                <motion.div
                  key={`${event.type}-${event.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  className="relative pl-12"
                >
                  <div className={`absolute left-3.5 top-4 w-3 h-3 rounded-full border-2 border-background ${cfg.color.replace("text", "bg")}`} />
                  <GlassCard hover={false}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted/30 shrink-0">
                        <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{event.title}</p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
