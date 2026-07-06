"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  Pill, Plus, X, Clock, AlertCircle,
  Bell, Activity, Flame, CheckCircle2,
  CalendarDays, Sparkles, ChevronRight, Loader2,
  Bot, Send, Search,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Medication {
  id: number
  name: string
  dosage: string
  frequency: string
  times: string[]
  start_date: string
  end_date: string | null
  notes: string | null
  active: boolean
}

const STREAK_KEY = "medico_adherence_streak"
const HISTORY_KEY = "medico_adherence_history"

function getStreak(): { current: number; longest: number } {
  if (typeof window === "undefined") return { current: 0, longest: 0 }
  try {
    const data = JSON.parse(localStorage.getItem(STREAK_KEY) || "{}")
    return { current: data.current || 0, longest: data.longest || 0 }
  } catch { return { current: 0, longest: 0 } }
}

function getHistory(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}")
  } catch { return {} }
}

function saveStreak(current: number, longest: number) {
  localStorage.setItem(STREAK_KEY, JSON.stringify({ current, longest }))
}

function saveHistory(history: Record<string, boolean>) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0]
}

function getLast7Days() {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split("T")[0])
  }
  return days
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

export default function MedicationsPage() {
  const router = useRouter()
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [takenToday, setTakenToday] = useState<Set<number>>(new Set())
  const [streak, setStreak] = useState(getStreak())
  const [history, setHistory] = useState(getHistory())
  const [form, setForm] = useState({
    name: "", dosage: "", frequency: "", times: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "", notes: "",
  })
  const [aiQueryOpen, setAiQueryOpen] = useState(false)
  const [aiQuery, setAiQuery] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)

  useEffect(() => { loadMedications() }, [])

  const loadMedications = async () => {
    try {
      const data = await apiFetch("/medications?active_only=true")
      setMedications(data)
      restoreTodayState(data)
    } finally { setLoading(false) }
  }

  const restoreTodayState = (meds: Medication[]) => {
    const todayKey = getTodayKey()
    const stored = getHistory()
    const taken = new Set<number>()
    meds.forEach((m) => {
      const key = `${todayKey}_${m.id}`
      if (stored[key]) taken.add(m.id)
    })
    setTakenToday(taken)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = { ...form, times: form.times.split(",").map(t => t.trim()).filter(Boolean) }
      if (!payload.end_date) delete payload.end_date
      await apiFetch("/medications", { method: "POST", body: JSON.stringify(payload) })
      setShowForm(false)
      setForm({ name: "", dosage: "", frequency: "", times: "", start_date: new Date().toISOString().split("T")[0], end_date: "", notes: "" })
      loadMedications()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const deleteMedication = async (id: number) => {
    try { await apiFetch(`/medications/${id}`, { method: "DELETE" }); loadMedications() }
    catch (err: any) { alert(err.message) }
  }

  const toggleTaken = useCallback(async (med: Medication) => {
    const todayKey = getTodayKey()
    const key = `${todayKey}_${med.id}`
    const newTaken = new Set(takenToday)
    const isTaking = !newTaken.has(med.id)

    if (isTaking) {
      newTaken.add(med.id)
      try {
        await apiFetch(`/medications/${med.id}/adherence`, {
          method: "POST",
          body: JSON.stringify({ scheduled_time: todayKey, taken: true }),
        })
      } catch {}
    } else {
      newTaken.delete(med.id)
    }

    setTakenToday(newTaken)

    const newHistory = { ...history, [key]: isTaking }
    setHistory(newHistory)
    saveHistory(newHistory)

    // Update streak
    const allTaken = medications.every((m) => newTaken.has(m.id))
    if (allTaken && isTaking) {
      const newCurrent = streak.current + 1
      const newLongest = Math.max(newCurrent, streak.longest)
      setStreak({ current: newCurrent, longest: newLongest })
      saveStreak(newCurrent, newLongest)
    } else if (!isTaking) {
      // Check if still have a streak
      const stillAllTaken = medications.every((m) => newTaken.has(m.id))
      if (!stillAllTaken) {
        setStreak((prev) => ({ ...prev, current: 0 }))
        saveStreak(0, streak.longest)
      }
    }
  }, [medications, takenToday, history, streak])

  const handleAiQuery = async () => {
    if (!aiQuery.trim() || aiLoading) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const data = await apiFetch("/medications/query", {
        method: "POST",
        body: JSON.stringify({ query: aiQuery.trim() }),
      })
      setAiResult(data.response || "No response generated.")
    } catch {
      setAiResult("Unable to process query. Please try again.")
    } finally {
      setAiLoading(false)
    }
  }

  const last7Days = getLast7Days()
  const totalToday = medications.length
  const takenCount = takenToday.size
  const allDone = totalToday > 0 && takenCount === totalToday

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-[#0EA5A9] flex items-center justify-center">
          <Pill className="h-5 w-5 text-white animate-spin" />
        </div>
        <p className="text-sm text-[#8B9BB5]">Loading medications...</p>
      </div>
    </div>
  )

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
              <Pill className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[#EDF2F7]">Medications</h1>
          </div>
          <p className="text-sm text-[#8B9BB5] ml-11">Track and manage your daily medications</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiQueryOpen(!aiQueryOpen)} className="btn-clinical-ghost text-xs">
            <Bot className="h-4 w-4" />Ask AI
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-clinical text-xs">
            <Plus className="h-4 w-4" />Add Medication
          </button>
        </div>
      </motion.div>

      {/* AI Query Dialog */}
      <AnimatePresence>
        {aiQueryOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="clinical-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#EDF2F7]">Ask about your medications</p>
                  <p className="text-[10px] text-[#8B9BB5]">Get AI insights about your medication regimen</p>
                </div>
                <button onClick={() => { setAiQueryOpen(false); setAiResult(null); setAiQuery("") }} className="btn-clinical-icon !p-1 ml-auto">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-[#181E2E] rounded-lg border border-[#2B364A] px-3 py-2 focus-within:border-purple-500/40 focus-within:ring-1 focus-within:ring-purple-500/15 transition-all">
                <Search className="h-4 w-4 text-purple-400 shrink-0" />
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAiQuery() } }}
                  placeholder="e.g., Are there any interactions between my medications?"
                  className="flex-1 bg-transparent text-sm text-[#EDF2F7] placeholder:text-[#8B9BB5]/50 outline-none"
                />
                <button
                  onClick={handleAiQuery}
                  disabled={aiLoading || !aiQuery.trim()}
                  className="w-7 h-7 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-40 flex items-center justify-center transition-all shrink-0"
                >
                  {aiLoading ? (
                    <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5 text-white" />
                  )}
                </button>
              </div>

              {/* AI Result */}
              <AnimatePresence>
                {aiResult && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-[#2B364A]">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="h-3.5 w-3.5 text-purple-400" />
                        </div>
                        <div className="clinical-prose flex-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {aiResult}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak + Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="clinical-card !p-4 flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
            streak.current > 0 ? "bg-orange-500/10" : "bg-[#181E2E]"
          )}>
            <Flame className={cn("h-5 w-5", streak.current > 0 ? "text-orange-400" : "text-[#8B9BB5]/40")} />
          </div>
          <div>
            <p className="text-xl font-bold text-[#EDF2F7]">{streak.current}</p>
            <p className="text-xs text-[#8B9BB5]">Day streak</p>
          </div>
          {streak.current > 0 && (
            <Sparkles className="h-4 w-4 text-amber-400 ml-auto animate-pulse-soft" />
          )}
        </div>
        <div className="clinical-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0EA5A9]/10 flex items-center justify-center">
            <Pill className="h-5 w-5 text-[#0EA5A9]" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#EDF2F7]">{medications.length}</p>
            <p className="text-xs text-[#8B9BB5]">Active meds</p>
          </div>
        </div>
        <div className="clinical-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0EA5A9]/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-[#0EA5A9]" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#EDF2F7]">{takenCount}/{totalToday}</p>
            <p className="text-xs text-[#8B9BB5]">Taken today</p>
          </div>
        </div>
        <div className="clinical-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#EDF2F7]">{streak.longest}</p>
            <p className="text-xs text-[#8B9BB5]">Best streak</p>
          </div>
        </div>
      </motion.div>

      {/* Last 7 Days Calendar */}
      {medications.length > 0 && (
        <motion.div variants={itemVariants} className="clinical-card !p-4">
          <h3 className="clinical-label mb-3">
            Last 7 Days
          </h3>
          <div className="flex gap-2 justify-center">
            {last7Days.map((day) => {
              const allMedsTaken = medications.every((m) => history[`${day}_${m.id}`])
              const someTaken = medications.some((m) => history[`${day}_${m.id}`])
              const d = new Date(day)
              const dayName = d.toLocaleDateString("en-US", { weekday: "short" })
              const dayNum = d.getDate()
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-[#8B9BB5]">{dayName}</span>
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all",
                    allMedsTaken
                      ? "bg-[#0EA5A9]/20 text-[#0EA5A9] border border-[#0EA5A9]/30"
                      : someTaken
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-[#181E2E] text-[#8B9BB5]/40 border border-[#2B364A]"
                  )}>
                    {allMedsTaken ? <CheckCircle2 className="h-4 w-4" /> : dayNum}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Today's Schedule */}
      {medications.length > 0 && medications.some((m) => m.times && m.times.length > 0) && (
        <motion.div variants={itemVariants}>
          <h3 className="clinical-label flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-[#0EA5A9]" />
            Today&apos;s Schedule
            {allDone && <CheckCircle2 className="h-4 w-4 text-[#0EA5A9]" />}
          </h3>
          <div className="space-y-3">
            {Array.from(new Set(medications.flatMap((m) => m.times))).sort().map((time) => {
              const medsAtTime = medications.filter((m) => m.times.includes(time))
              const allAtTimeTaken = medsAtTime.every((m) => takenToday.has(m.id))
              return (
                <div key={time} className="clinical-card !p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                        allAtTimeTaken ? "bg-[#0EA5A9]/10" : "bg-[#181E2E]"
                      )}>
                        <Clock className={cn("h-5 w-5", allAtTimeTaken ? "text-[#0EA5A9]" : "text-[#8B9BB5]")} />
                      </div>
                      <span className={cn(
                        "text-xs font-medium mt-1",
                        allAtTimeTaken ? "text-[#0EA5A9]" : "text-[#8B9BB5]"
                      )}>{time}</span>
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-medium mb-2",
                        allAtTimeTaken ? "text-[#0EA5A9]" : "text-[#EDF2F7]"
                      )}>
                        {(() => {
                          const h = parseInt(time.split(":")[0])
                          if (h < 12) return "Morning"
                          if (h < 17) return "Afternoon"
                          return "Evening"
                        })()}
                      </p>
                      <div className="space-y-1.5">
                        {medsAtTime.map((med) => {
                          const isTaken = takenToday.has(med.id)
                          return (
                            <div
                              key={med.id}
                              onClick={() => toggleTaken(med)}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all",
                                isTaken ? "bg-[#0EA5A9]/5 border border-[#0EA5A9]/15" : "bg-[#181E2E] hover:bg-[#252F40] border border-transparent"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                  isTaken
                                    ? "bg-[#0EA5A9] border-[#0EA5A9]"
                                    : "border-[#3B4A63] hover:border-[#0EA5A9]/50"
                                )}>
                                  {isTaken && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                </div>
                                <span className={cn(
                                  "text-sm",
                                  isTaken ? "text-[#8B9BB5] line-through" : "text-[#EDF2F7]"
                                )}>
                                  {med.name} {med.dosage}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* New Medication Form */}
      <motion.div variants={itemVariants}>
        {showForm && (
          <div className="clinical-card">
            <h3 className="text-sm font-semibold text-[#EDF2F7] mb-4">New Medication</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#8B9BB5]">Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Medication name" required className="clinical-input h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#8B9BB5]">Dosage *</label>
                  <input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 500mg" required className="clinical-input h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#8B9BB5]">Frequency *</label>
                  <input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="e.g. Twice daily" required className="clinical-input h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#8B9BB5]">Times</label>
                  <input value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} placeholder="e.g. 08:00, 20:00" className="clinical-input h-9 text-sm" />
                </div>
              </div>
              <button type="submit" className="btn-clinical w-full" disabled={saving}>
                {saving ? "Saving..." : "Add Medication"}
              </button>
            </form>
          </div>
        )}
      </motion.div>

      {/* All Medications List */}
      <motion.div variants={itemVariants}>
        <h3 className="clinical-label">Your Medications</h3>
        {medications.length === 0 && !showForm ? (
          <div className="clinical-card !p-10 text-center">
            <div className="w-12 h-12 rounded-lg bg-[#181E2E] flex items-center justify-center mx-auto mb-4">
              <Pill className="h-6 w-6 text-[#8B9BB5]/40" />
            </div>
            <h3 className="text-base font-semibold text-[#EDF2F7] mb-2">No Medications Yet</h3>
            <p className="text-sm text-[#8B9BB5] mb-6 max-w-md mx-auto">
              Add your first medication to start tracking adherence and building your streak.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-clinical">
              <Plus className="h-4 w-4" />
              Add Your First Medication
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {medications.map((med, i) => (
              <motion.div
                key={med.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="clinical-card !p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-all",
                      takenToday.has(med.id) ? "bg-[#0EA5A9]/10" : "bg-[#181E2E]"
                    )}>
                      <Pill className={cn("h-4 w-4", takenToday.has(med.id) ? "text-[#0EA5A9]" : "text-[#8B9BB5]")} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#EDF2F7]">{med.name}</p>
                      <p className="text-xs text-[#8B9BB5]">{med.dosage} — {med.frequency}</p>
                      {med.times.length > 0 && (
                        <p className="text-xs text-[#8B9BB5]/60 mt-0.5">{med.times.join(", ")}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTaken(med)}
                      className={cn(
                        "text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all",
                        takenToday.has(med.id)
                          ? "bg-[#0EA5A9]/10 text-[#0EA5A9] border border-[#0EA5A9]/20"
                          : "bg-[#181E2E] text-[#8B9BB5] hover:text-[#EDF2F7] border border-[#2B364A]"
                      )}
                    >
                      {takenToday.has(med.id) ? "Taken" : "Mark taken"}
                    </button>
                    <button
                      onClick={() => deleteMedication(med.id)}
                      className="btn-clinical-icon !p-1.5"
                    >
                      <X className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
