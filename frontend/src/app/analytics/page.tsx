"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch, cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts"
import {
  Activity, Moon, Droplets, TrendingUp, Brain,
  Heart, Flame, Loader2, ChevronDown, Calendar,
  ArrowUp, ArrowDown, Minus, AlertCircle, Sparkles,
  Clock, Gauge,
} from "lucide-react"

const METRIC_CONFIG: Record<string, { label: string; icon: any; color: string; unit: string }> = {
  sleep_hours: { label: "Sleep", icon: Moon, color: "#818CF8", unit: "hours" },
  water_ml: { label: "Water", icon: Droplets, color: "#22D3EE", unit: "ml" },
  exercise_min: { label: "Exercise", icon: Activity, color: "#34D399", unit: "min" },
  steps: { label: "Steps", icon: Flame, color: "#FB923C", unit: "steps" },
  weight_kg: { label: "Weight", icon: Gauge, color: "#FBBF24", unit: "kg" },
}

const METRIC_KEYS = Object.keys(METRIC_CONFIG)

const DAYS_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs space-y-1">
      <p className="text-[#94A3B8]">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

export default function AnalyticsPage() {
  const [selectedMetric, setSelectedMetric] = useState("sleep_hours")
  const [days, setDays] = useState(30)
  const [trendData, setTrendData] = useState<any[]>([])
  const [scores, setScores] = useState<any>(null)
  const [patterns, setPatterns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [trendRes, scoresRes, patternsRes] = await Promise.allSettled([
        apiFetch(`/analytics/trends?type=${selectedMetric}&days=${days}`),
        apiFetch(`/analytics/scores?days=${days}`),
        apiFetch("/analytics/patterns"),
      ])

      if (trendRes.status === "fulfilled") setTrendData(trendRes.value || [])
      if (scoresRes.status === "fulfilled") setScores(scoresRes.value)
      if (patternsRes.status === "fulfilled") {
        const p = patternsRes.value
        setPatterns(Array.isArray(p) ? p : p.patterns || [])
      }
    } finally {
      setLoading(false)
    }
  }, [selectedMetric, days])

  useEffect(() => { loadData() }, [loadData])

  const metricMeta = METRIC_CONFIG[selectedMetric]
  const MetricIcon = metricMeta.icon

  const currentValue = trendData.length > 0
    ? trendData[trendData.length - 1]?.value ?? trendData.reduce((sum: number, d: any) => sum + (d.value || 0), 0) / trendData.length
    : 0
  const prevValue = trendData.length > 7
    ? trendData.slice(-7).reduce((sum: number, d: any) => sum + (d.value || 0), 0) / 7
    : 0
  const trend = prevValue > 0
    ? ((currentValue - prevValue) / prevValue * 100).toFixed(1)
    : "0"

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06B6D4] to-cyan-600 flex items-center justify-center shadow-lg shadow-[#06B6D4]/20">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#F9FAFB]">Health Trends</h1>
          </div>
          <p className="text-sm text-[#94A3B8] ml-12">Track your health metrics over time</p>
        </div>
        <div className="flex gap-2">
          {DAYS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                days === opt.value
                  ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20"
                  : "bg-white/[0.04] text-[#94A3B8] hover:text-[#F9FAFB] border border-white/[0.06]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Metric Selector */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        {METRIC_KEYS.map((key) => {
          const meta = METRIC_CONFIG[key]
          const Icon = meta.icon
          const isActive = key === selectedMetric
          return (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                isActive
                  ? "bg-white/[0.08] text-[#F9FAFB] border border-white/[0.12]"
                  : "bg-white/[0.03] text-[#94A3B8] hover:text-[#F9FAFB] border border-transparent"
              )}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
              {meta.label}
            </button>
          )
        })}
      </motion.div>

      {/* Score Cards */}
      {scores && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Sleep Score", value: scores.sleep_score, icon: Moon, color: "#818CF8" },
            { label: "Hydration", value: scores.hydration_score, icon: Droplets, color: "#22D3EE" },
            { label: "Exercise Consistency", value: scores.exercise_consistency, icon: Activity, color: "#34D399" },
            { label: "Days Tracked", value: scores.days_tracked, icon: Calendar, color: "#F9FAFB" },
          ].map((stat, i) => (
            <div key={i} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                <span className={cn(
                  "text-xs font-medium",
                  (stat.value ?? 0) >= 70 ? "text-[#22C55E]" :
                  (stat.value ?? 0) >= 40 ? "text-amber-400" :
                  "text-red-400"
                )}>
                  {stat.value ?? "—"}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(stat.value ?? 0, 100)}%`,
                    backgroundColor: stat.color,
                  }}
                />
              </div>
              <p className="text-xs text-[#94A3B8] mt-2">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Trend Chart */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/[0.04]">
              <MetricIcon className="h-5 w-5" style={{ color: metricMeta.color }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F9FAFB]">{metricMeta.label} Trend</h3>
              <p className="text-xs text-[#94A3B8]">Last {days} days</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#94A3B8]">Avg:</span>
                <span className="font-medium text-[#F9FAFB]">{currentValue.toFixed(1)} {metricMeta.unit}</span>
                <span className={cn(
                  "inline-flex items-center gap-0.5 ml-1",
                  Number(trend) > 0 ? "text-[#22C55E]" : Number(trend) < 0 ? "text-red-400" : "text-[#94A3B8]"
                )}>
                  {Number(trend) > 0 ? <ArrowUp className="h-3 w-3" /> : Number(trend) < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {trend}%
                </span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="h-64 skeleton rounded-xl" />
        ) : trendData.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Activity className="h-8 w-8 text-[#94A3B8]/40 mx-auto mb-2" />
              <p className="text-sm text-[#94A3B8]">No data yet. Start tracking your metrics!</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metricMeta.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={metricMeta.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return `${d.getMonth() + 1}/${d.getDate()}`
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={metricMeta.color}
                strokeWidth={2}
                fill="url(#trendGradient)"
                name={metricMeta.label}
                dot={false}
                activeDot={{ r: 4, fill: metricMeta.color, stroke: "#090B10", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Patterns + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patterns */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-[#06B6D4]" />
            <h3 className="text-sm font-semibold text-[#F9FAFB]">AI Pattern Detection</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
            </div>
          ) : patterns.length === 0 ? (
            <div className="text-center py-6">
              <Sparkles className="h-6 w-6 text-[#94A3B8]/40 mx-auto mb-2" />
              <p className="text-xs text-[#94A3B8]">
                Not enough data to detect patterns. Track at least 7 days.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {patterns.map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <AlertCircle className="h-4 w-4 text-[#06B6D4] mt-0.5 shrink-0" />
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {typeof p === "string" ? p : p.message || p.pattern || JSON.stringify(p)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Monthly Report */}
        <motion.div variants={itemVariants} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-[#22C55E]" />
            <h3 className="text-sm font-semibold text-[#F9FAFB]">Monthly Report</h3>
          </div>
          <MonthlyReportCard />
        </motion.div>
      </div>
    </motion.div>
  )
}

function MonthlyReportCard() {
  const [report, setReport] = useState<any>(null)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())

  const loadMonth = useCallback(async () => {
    setLoadingMonth(true)
    try {
      const data = await apiFetch(`/analytics/monthly-report?month=${month}&year=${year}`)
      setReport(data)
    } catch {
      setReport(null)
    } finally {
      setLoadingMonth(false)
    }
  }, [month, year])

  useEffect(() => { loadMonth() }, [loadMonth])

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setMonth((m) => Math.max(1, m - 1))}
          className="btn-icon !p-1"
        >
          <ChevronDown className="h-3 w-3 rotate-90" />
        </button>
        <span className="text-xs font-medium text-[#F9FAFB]">{monthNames[month - 1]} {year}</span>
        <button
          onClick={() => setMonth((m) => Math.min(12, m + 1))}
          className="btn-icon !p-1"
        >
          <ChevronDown className="h-3 w-3 -rotate-90" />
        </button>
        <button
          onClick={() => setMonth(new Date().getMonth() + 1)}
          className="ml-auto text-xs text-[#22C55E] hover:underline"
        >
          Current
        </button>
      </div>

      {loadingMonth ? (
        <div className="h-32 skeleton rounded-xl" />
      ) : !report ? (
        <div className="text-center py-6">
          <Calendar className="h-6 w-6 text-[#94A3B8]/40 mx-auto mb-2" />
          <p className="text-xs text-[#94A3B8]">No report available for this month</p>
        </div>
      ) : (
        <div className="space-y-3">
          {report.summary && (
            <div className="p-3 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/10">
              <p className="text-xs text-[#94A3B8] leading-relaxed">{report.summary}</p>
            </div>
          )}
          {report.stats && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(report.stats).slice(0, 4).map(([key, val]: [string, any]) => (
                <div key={key} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-[#94A3B8] capitalize">{key.replace(/_/g, " ")}</p>
                  <p className="text-sm font-medium text-[#F9FAFB]">{val}</p>
                </div>
              ))}
            </div>
          )}
          {report.recommendations && report.recommendations.length > 0 && (
            <div>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-2">Recommendations</p>
              <ul className="space-y-1">
                {report.recommendations.map((r: string, i: number) => (
                  <li key={i} className="text-xs text-[#94A3B8] flex items-start gap-2">
                    <Sparkles className="h-3 w-3 text-[#22C55E] mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
