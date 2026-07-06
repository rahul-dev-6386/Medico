"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch, cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot, Sparkles, ChevronRight, ChevronLeft,
  Lightbulb, Dumbbell, Moon, Droplets,
  Heart, Loader2, X, TrendingUp,
} from "lucide-react"

const COACH_CACHE_KEY = "medico_coach_tip"
const COACH_DATE_KEY = "medico_coach_date"

function getCachedTip(): string | null {
  if (typeof window === "undefined") return null
  const date = localStorage.getItem(COACH_DATE_KEY)
  const today = new Date().toISOString().split("T")[0]
  if (date !== today) return null
  return localStorage.getItem(COACH_CACHE_KEY)
}

function cacheTip(tip: string) {
  const today = new Date().toISOString().split("T")[0]
  localStorage.setItem(COACH_DATE_KEY, today)
  localStorage.setItem(COACH_CACHE_KEY, tip)
}

const tips = [
  "Drink a glass of water first thing in the morning to jumpstart hydration.",
  "A 10-minute walk after meals can help regulate blood sugar levels.",
  "Going to bed at the same time every night improves sleep quality by up to 40%.",
  "Deep breathing for 60 seconds can lower your heart rate and reduce stress.",
  "Eating protein with breakfast helps stabilize energy levels throughout the day.",
  "Standing for 2 minutes every hour improves circulation and reduces back pain.",
  "Taking your medications at the same time daily improves adherence by 80%.",
  "Blue light from screens before bed suppresses melatonin — try reading instead.",
  "Adding one extra serving of vegetables to your dinner boosts fiber intake significantly.",
  "Stretching for 5 minutes in the morning reduces joint stiffness and improves mobility.",
  "Keeping a health journal helps you identify patterns in your symptoms and triggers.",
  "Vitamin D levels impact mood — 15 minutes of morning sunlight can make a difference.",
]

export function HealthCoachSidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [tip, setTip] = useState<string | null>(getCachedTip)
  const [loading, setLoading] = useState(!tip)

  const fetchTip = useCallback(async () => {
    const cached = getCachedTip()
    if (cached) {
      setTip(cached)
      setLoading(false)
      return
    }
    try {
      const data = await apiFetch("/chat/send", {
        method: "POST",
        body: JSON.stringify({
          message: "Give me one specific, actionable health tip for today based on common health best practices. Keep it to 1-2 sentences. No markdown. No greetings.",
        }),
      })
      const response = data.response || data.message || tips[Math.floor(Math.random() * tips.length)]
      setTip(response)
      cacheTip(response)
    } catch {
      setTip(tips[Math.floor(Math.random() * tips.length)])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (open) fetchTip() }, [open, fetchTip])

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l border-[#2B364A] bg-[#0B0F1A]/50 flex flex-col shrink-0 overflow-hidden"
        >
          <div className="p-4 border-b border-[#2B364A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#22C55E] to-emerald-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-[#F9FAFB]">AI Coach</span>
            </div>
            <button onClick={onToggle} className="btn-clinical-icon !p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Daily Tip */}
            <div className="clinical-card !p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <h4 className="text-xs font-semibold text-[#F9FAFB] uppercase tracking-wider">Daily Tip</h4>
              </div>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#22C55E]" />
                  <span className="text-xs text-[#94A3B8]">Generating tip...</span>
                </div>
              ) : (
                <p className="text-xs text-[#94A3B8] leading-relaxed">{tip}</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="clinical-card !p-4">
              <h4 className="text-xs font-semibold text-[#F9FAFB] uppercase tracking-wider mb-3">Quick Actions</h4>
              <div className="space-y-1.5">
                {[
                  { label: "Log Health Metrics", href: "/metrics", icon: Heart },
                  { label: "Start AI Chat", href: "/chat", icon: Bot },
                  { label: "Check Medications", href: "/medications", icon: Dumbbell },
                  { label: "View Trends", href: "/analytics", icon: TrendingUp },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <a
                      key={action.href}
                      href={action.href}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#181E2E] transition-all group"
                    >
                      <Icon className="h-3.5 w-3.5 text-[#94A3B8] group-hover:text-[#22C55E] transition-colors" />
                      <span className="text-xs text-[#94A3B8] group-hover:text-[#F9FAFB] transition-colors">{action.label}</span>
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Health Reminders */}
            <div className="clinical-card !p-4">
              <h4 className="text-xs font-semibold text-[#F9FAFB] uppercase tracking-wider mb-3">Health Reminders</h4>
              <div className="space-y-2">
                {[
                  { icon: Droplets, text: "Drink 8 glasses of water", color: "#22D3EE" },
                  { icon: Moon, text: "Get 7-9 hours of sleep", color: "#818CF8" },
                  { icon: Heart, text: "Monitor your blood pressure", color: "#FB7185" },
                  { icon: Dumbbell, text: "30 minutes of activity", color: "#34D399" },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />
                      <span className="text-xs text-[#94A3B8]">{item.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[#2B364A]">
            <a
              href="/chat?prompt=Give me a personalized health plan"
              className="btn-clinical text-xs w-full"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask Coach for a Plan
            </a>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
