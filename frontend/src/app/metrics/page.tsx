"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { motion } from "framer-motion"
import {
  Activity, Moon, Droplets, Weight, Heart, TrendingUp,
  Brain, Plus, Gauge, Thermometer, Flame
} from "lucide-react"

const metricCards = [
  { key: "sleep_hours", label: "Sleep", icon: Moon, unit: "hours", color: "text-indigo-400", gradient: "from-indigo-500 to-purple-500" },
  { key: "water_ml", label: "Water", icon: Droplets, unit: "ml", color: "text-cyan-400", gradient: "from-cyan-500 to-blue-500" },
  { key: "exercise_min", label: "Exercise", icon: Activity, unit: "min", color: "text-emerald-400", gradient: "from-emerald-500 to-green-500" },
  { key: "weight_kg", label: "Weight", icon: Weight, unit: "kg", color: "text-amber-400", gradient: "from-amber-500 to-orange-500" },
  { key: "steps", label: "Steps", icon: Flame, unit: "steps", color: "text-orange-400", gradient: "from-orange-500 to-red-500" },
  { key: "mood", label: "Mood", icon: Heart, unit: "/10", color: "text-rose-400", gradient: "from-rose-500 to-pink-500" },
  { key: "blood_pressure_sys", label: "Systolic BP", icon: Gauge, unit: "mmHg", color: "text-red-400", gradient: "from-red-500 to-rose-500" },
  { key: "blood_sugar", label: "Blood Sugar", icon: Thermometer, unit: "mg/dL", color: "text-violet-400", gradient: "from-violet-500 to-purple-500" },
]

const insights = [
  { icon: Droplets, text: "Hydration dropped 22% this week. Try setting hourly water reminders.", color: "text-cyan-400", severity: "warning" },
  { icon: Moon, text: "Sleep consistency improved 15% compared to last week.", color: "text-indigo-400", severity: "positive" },
  { icon: Heart, text: "Resting heart rate is 3 BPM higher than your baseline.", color: "text-rose-400", severity: "info" },
]

export default function MetricsPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [recentMetrics, setRecentMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({
    date: new Date().toISOString().split("T")[0],
    sleep_hours: "", water_ml: "", weight_kg: "", exercise_min: "",
    steps: "", mood: "", blood_pressure_sys: "", blood_pressure_dia: "", blood_sugar: "",
  })

  useEffect(() => {
    Promise.all([
      apiFetch("/metrics/stats").catch(() => null),
      apiFetch("/metrics?days=7").catch(() => []),
    ]).then(([s, m]) => { setStats(s); setRecentMetrics(m) }).finally(() => setLoading(false))
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = {}
      Object.entries(form).forEach(([key, val]) => { if (val !== "") payload[key] = isNaN(Number(val)) ? val : Number(val) })
      await apiFetch("/metrics", { method: "POST", body: JSON.stringify(payload) })
      setForm((p) => ({ ...p, sleep_hours: "", water_ml: "", weight_kg: "", exercise_min: "", steps: "", mood: "" }))
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
          <Activity className="h-6 w-6 text-white animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading metrics...</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Health Metrics</h1>
        <p className="text-muted-foreground text-sm mt-1">Track and analyze your health data</p>
      </motion.div>

      {stats && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Avg Sleep", value: `${stats.avg_sleep_hours ?? "—"}h`, icon: Moon, color: "text-indigo-400" },
            { label: "Avg Water", value: `${stats.avg_water_ml ?? "—"}ml`, icon: Droplets, color: "text-cyan-400" },
            { label: "Avg Exercise", value: `${stats.avg_exercise_min ?? "—"}min`, icon: Activity, color: "text-emerald-400" },
            { label: "Avg HR", value: `${stats.avg_heart_rate ?? "—"}bpm`, icon: Heart, color: "text-rose-400" },
          ].map((stat, i) => (
            <GlassCard key={stat.label} hover={false}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted/50`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Log Today&apos;s Metrics
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {metricCards.map((metric) => (
                <div key={metric.key}>
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                    <metric.icon className={`h-3 w-3 ${metric.color}`} />
                    {metric.label}
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={form[metric.key] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [metric.key]: e.target.value }))}
                    placeholder={metric.unit}
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
            <Button type="submit" className="w-full gradient-primary text-white" disabled={saving}>
              {saving ? "Saving..." : "Log Metrics"}
            </Button>
          </form>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <GlassCard>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Weekly Trends
          </h3>
          <div className="space-y-4">
            {[
              { metric: "Sleep", values: [7.2, 6.8, 7.5, 6.5, 8.0, 7.8, 7.0], color: "bg-indigo-500" },
              { metric: "Water (L)", values: [1.8, 1.5, 2.0, 1.2, 1.6, 2.2, 1.4], color: "bg-cyan-500" },
              { metric: "Exercise (min)", values: [30, 45, 20, 0, 40, 35, 25], color: "bg-emerald-500" },
            ].map((item) => {
              const max = Math.max(...item.values)
              return (
                <div key={item.metric}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>{item.metric}</span>
                    <span className="text-muted-foreground">{item.values[item.values.length - 1]} avg</span>
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {item.values.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(v / max) * 100}%` }}
                          transition={{ delay: 0.4 + i * 0.05, duration: 0.4 }}
                          className={`w-full rounded-sm ${item.color} opacity-80 hover:opacity-100 transition-opacity`}
                        />
                        <span className="text-[10px] text-muted-foreground">{["M","T","W","T","F","S","S"][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className={`p-3 rounded-xl border ${
                  insight.severity === "warning" ? "bg-yellow-500/5 border-yellow-500/20" :
                  insight.severity === "positive" ? "bg-emerald-500/5 border-emerald-500/20" :
                  "bg-blue-500/5 border-blue-500/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <insight.icon className={`h-4 w-4 mt-0.5 ${insight.color}`} />
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {insight.text}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
