"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import {
  Pill, Plus, X, Clock, AlertCircle,
  Bell, Activity
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

export default function MedicationsPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "", dosage: "", frequency: "", times: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "", notes: "",
  })

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return }
    loadMedications()
  }, [isAuthenticated, router])

  const loadMedications = async () => {
    try {
      const data = await apiFetch("/medications?active_only=true")
      setMedications(data)
    } finally { setLoading(false) }
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
          <Pill className="h-6 w-6 text-white animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Loading medications...</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medications</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your medications and stay on schedule</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />Add Medication
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard hover={false} className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Pill className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{medications.length}</p>
            <p className="text-sm text-muted-foreground">Active medications</p>
          </div>
        </GlassCard>
        <GlassCard hover={false} className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Bell className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {medications.filter((m) => m.times && m.times.length > 0).length}
            </p>
            <p className="text-sm text-muted-foreground">With scheduled times</p>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Today&apos;s Schedule</h3>
          {medications.length > 0 && medications.some((m) => m.times && m.times.length > 0) ? (
            <div className="space-y-3">
              {Array.from(new Set(medications.flatMap((m) => m.times))).sort().map((time) => {
                const medsAtTime = medications.filter((m) => m.times.includes(time))
                return (
                  <GlassCard key={time} hover={false}>
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-xs font-medium mt-1">{time}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">
                          {(() => {
                            const h = parseInt(time.split(":")[0])
                            if (h < 12) return "Morning"
                            if (h < 17) return "Afternoon"
                            return "Evening"
                          })()}
                        </p>
                        <div className="space-y-1.5">
                          {medsAtTime.map((med) => (
                            <div key={med.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <span className="text-sm">{med.name} {med.dosage}</span>
                              <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-muted/50 accent-primary" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          ) : (
            <GlassCard hover={false}>
              <div className="flex flex-col items-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {medications.length === 0
                    ? "Add medications to see your daily schedule"
                    : "Add scheduled times to your medications to see them here"}
                </p>
              </div>
            </GlassCard>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Pill className="h-4 w-4 text-primary" />Your Medications</h3>
          {showForm && (
            <GlassCard hover={false}>
              <h4 className="text-sm font-semibold mb-4">New Medication</h4>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Medication name" required className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dosage *</Label>
                    <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 500mg" required className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Frequency *</Label>
                    <Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="e.g. Twice daily" required className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Times</Label>
                    <Input value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} placeholder="e.g. 08:00, 20:00" className="h-9 text-sm" />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={saving}>
                  {saving ? "Saving..." : "Add Medication"}
                </Button>
              </form>
            </GlassCard>
          )}
          {medications.length === 0 && !showForm && (
            <GlassCard hover={false}>
              <div className="flex flex-col items-center py-8">
                <Pill className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No medications added yet</p>
                <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />Add your first medication
                </Button>
              </div>
            </GlassCard>
          )}
          {medications.map((med, i) => (
            <motion.div
              key={med.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <GlassCard hover={false}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Pill className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{med.name}</p>
                      <p className="text-xs text-muted-foreground">{med.dosage} — {med.frequency}</p>
                      {med.times.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{med.times.join(", ")}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMedication(med.id)}><X className="h-4 w-4" /></Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
