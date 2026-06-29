"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  Pill, Plus, X, Clock, AlertCircle,
  Bell, Activity, Flame, CheckCircle2,
  CalendarDays, Sparkles, ChevronRight, Loader2,
} from "lucide-react"

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

  const last7Days = getLast7Days()
  const totalToday = medications.length
  const takenCount = takenToday.size
  const allDone = totalToday > 0 && takenCount === totalToday

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
          <Pill className="h-6 w-6 text-white animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading medications...</p>
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#F9FAFB]">Medications</h1>
          </div>
          <p className="text-sm text-[#94A3B8] ml-12">Track and manage your daily medications</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs">
          <Plus className="h-4 w-4" />Add Medication
        </button>
      </motion.div>

      {/* Streak + Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            streak.current > 0 ? "bg-orange-500/10" : "bg-white/[0.04]"
          )}>
            <Flame className={cn("h-5 w-5", streak.current > 0 ? "text-orange-400" : "text-[#94A3B8]/40")} />
          </div>
          <div>
            <p className="text-xl font-bold text-[#F9FAFB]">{streak.current}</p>
            <p className="text-xs text-[#94A3B8]">Day streak</p>
          </div>
          {streak.current > 0 && (
            <Sparkles className="h-4 w-4 text-amber-400 ml-auto animate-pulse-soft" />
          )}
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center">
            <Pill className="h-5 w-5 text-[#22C55E]" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#F9FAFB]">{medications.length}</p>
            <p className="text-xs text-[#94A3B8]">Active meds</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-[#06B6D4]" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#F9FAFB]">{takenCount}/{totalToday}</p>
            <p className="text-xs text-[#94A3B8]">Taken today</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#F9FAFB]">{streak.longest}</p>
            <p className="text-xs text-[#94A3B8]">Best streak</p>
          </div>
        </div>
      </motion.div>

      {/* Last 7 Days Calendar */}
      {medications.length > 0 && (
        <motion.div variants={itemVariants} className="glass rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-[#F9FAFB] mb-3 flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-[#94A3B8]" />
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
                  <span className="text-[10px] text-[#94A3B8]">{dayName}</span>
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-medium transition-all",
                    allMedsTaken
                      ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30"
                      : someTaken
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-white/[0.03] text-[#94A3B8]/40 border border-white/[0.06]"
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
          <h3 className="section-title flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#22C55E]" />
            Today&apos;s Schedule
            {allDone && <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />}
          </h3>
          <div className="space-y-3">
            {Array.from(new Set(medications.flatMap((m) => m.times))).sort().map((time) => {
              const medsAtTime = medications.filter((m) => m.times.includes(time))
              const allAtTimeTaken = medsAtTime.every((m) => takenToday.has(m.id))
              return (
                <div key={time} className="glass rounded-2xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        allAtTimeTaken ? "bg-[#22C55E]/10" : "bg-white/[0.04]"
                      )}>
                        <Clock className={cn("h-5 w-5", allAtTimeTaken ? "text-[#22C55E]" : "text-[#94A3B8]")} />
                      </div>
                      <span className={cn(
                        "text-xs font-medium mt-1",
                        allAtTimeTaken ? "text-[#22C55E]" : "text-[#94A3B8]"
                      )}>{time}</span>
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-medium mb-2",
                        allAtTimeTaken ? "text-[#22C55E]" : "text-[#F9FAFB]"
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
                                "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all",
                                isTaken ? "bg-[#22C55E]/5 border border-[#22C55E]/15" : "bg-white/[0.03] hover:bg-white/[0.05] border border-transparent"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                  isTaken
                                    ? "bg-[#22C55E] border-[#22C55E]"
                                    : "border-white/[0.15] hover:border-[#22C55E]/50"
                                )}>
                                  {isTaken && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                </div>
                                <span className={cn(
                                  "text-sm",
                                  isTaken ? "text-[#94A3B8] line-through" : "text-[#F9FAFB]"
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
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#F9FAFB] mb-4">New Medication</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#94A3B8]">Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Medication name" required className="input-field h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#94A3B8]">Dosage *</label>
                  <input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 500mg" required className="input-field h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#94A3B8]">Frequency *</label>
                  <input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="e.g. Twice daily" required className="input-field h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#94A3B8]">Times</label>
                  <input value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} placeholder="e.g. 08:00, 20:00" className="input-field h-9 text-sm" />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={saving}>
                {saving ? "Saving..." : "Add Medication"}
              </button>
            </form>
          </div>
        )}
      </motion.div>

      {/* All Medications List */}
      <motion.div variants={itemVariants}>
        <h3 className="section-title">Your Medications</h3>
        {medications.length === 0 && !showForm ? (
          <div className="glass rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Pill className="h-7 w-7 text-[#94A3B8]/40" />
            </div>
            <h3 className="text-lg font-semibold text-[#F9FAFB] mb-2">No Medications Yet</h3>
            <p className="text-sm text-[#94A3B8] mb-6 max-w-md mx-auto">
              Add your first medication to start tracking adherence and building your streak.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
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
                className="glass rounded-2xl p-4 hover:border-white/[0.12] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-xl transition-all",
                      takenToday.has(med.id) ? "bg-[#22C55E]/10" : "bg-white/[0.04]"
                    )}>
                      <Pill className={cn("h-4 w-4", takenToday.has(med.id) ? "text-[#22C55E]" : "text-[#94A3B8]")} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F9FAFB]">{med.name}</p>
                      <p className="text-xs text-[#94A3B8]">{med.dosage} — {med.frequency}</p>
                      {med.times.length > 0 && (
                        <p className="text-xs text-[#94A3B8]/60 mt-0.5">{med.times.join(", ")}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTaken(med)}
                      className={cn(
                        "text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all",
                        takenToday.has(med.id)
                          ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20"
                          : "bg-white/[0.04] text-[#94A3B8] hover:text-[#F9FAFB] border border-transparent"
                      )}
                    >
                      {takenToday.has(med.id) ? "Taken" : "Mark taken"}
                    </button>
                    <button
                      onClick={() => deleteMedication(med.id)}
                      className="btn-icon !p-1.5"
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
