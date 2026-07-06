"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch, cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  Activity, Moon, Droplets, Brain, Sparkles,
  TrendingUp, MessageSquare, Heart, Pill, Footprints,
  ArrowUpRight, ChevronRight, Bot, Zap, Clock,
  Thermometer, Watch, Weight, Droplet, HeartPulse,
  Wine, Plus, AlertCircle, CalendarDays, BarChart3,
  FileText, BookOpen, Sun, Lightbulb,
} from "lucide-react"
import { HealthCoachSidebar } from "@/components/features/health-coach-sidebar"

const greetings = () => {
  const h = new Date().getHours()
  if (h < 12) return { text: "Good Morning", icon: Sun }
  if (h < 17) return { text: "Good Afternoon", icon: Sun }
  return { text: "Good Evening", icon: Moon }
}

const quickActions = [
  { href: "/chat", label: "AI Consultation", icon: Bot, desc: "Chat with your health AI", gradient: "from-[#22C55E] to-emerald-600" },
  { href: "/metrics", label: "Log Health", icon: Activity, desc: "Track daily metrics", gradient: "from-[#06B6D4] to-cyan-600" },
  { href: "/medications", label: "Medications", icon: Pill, desc: "Manage your meds", gradient: "from-violet-500 to-purple-600" },
  { href: "/reports", label: "Upload Report", icon: FileText, desc: "Analyze lab results", gradient: "from-amber-500 to-orange-600" },
]

const suggestedPrompts = [
  "What do my latest lab results mean?",
  "Should I be worried about my blood pressure?",
  "Summarize my health this week",
  "Check my medication interactions",
]

const metricsConfig = [
  { key: "sleep_hours", label: "Sleep", icon: Moon, unit: "hrs", target: 8, color: "#22C55E" },
  { key: "water_ml", label: "Hydration", icon: Droplets, unit: "ml", target: 2000, color: "#06B6D4" },
  { key: "exercise_min", label: "Exercise", icon: Footprints, unit: "min", target: 30, color: "#F59E0B" },
  { key: "steps", label: "Steps", icon: Activity, unit: "", target: 8000, color: "#22C55E" },
]

const riskColors: Record<string, string> = {
  low: "text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20",
  moderate: "text-[#F59E0B] bg-amber-500/10 border-amber-500/20",
  high: "text-[#EF4444] bg-red-500/10 border-red-500/20",
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) return
    const duration = 800
    const steps = 30
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplay(value)
        clearInterval(timer)
      } else {
        setDisplay(Math.round(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])
  return <>{display}{suffix}</>
}

function MetricRing({ value, max, label, icon, color }: { value: number; max: number; label: string; icon: React.ReactNode; color: string }) {
  const pct = Math.min(value / max, 1)
  const circumference = 2 * Math.PI * 32
  const offset = circumference * (1 - pct)
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="76" height="76" className="transform -rotate-90">
        <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
        <motion.circle
          cx="38" cy="38" r="32" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: 76, height: 76 }}>
        <div className="text-sm font-bold text-[#F9FAFB]">
          <AnimatedCounter value={value} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
        {icon}
        <span>{label}</span>
      </div>
    </div>
  )
}

function SkeletonDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 skeleton rounded-2xl" />
        <div className="h-64 skeleton rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 skeleton rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-48 skeleton rounded-2xl" />
        <div className="h-48 skeleton rounded-2xl" />
      </div>
    </div>
  )
}

function EmptyDashboard({ userName }: { userName: string }) {
  const router = useRouter()
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto p-6"
    >
      <motion.div variants={itemVariants} className="text-center py-16">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#22C55E] to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#22C55E]/20">
          <HeartPulse className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-[#F9FAFB] mb-3">Welcome to Sanjeevni AI, {userName}</h1>
        <p className="text-[#94A3B8] max-w-lg mx-auto mb-10 text-lg leading-relaxed">
          Your AI-powered health companion. Start tracking your health metrics,<br />
          chatting with your AI assistant, or uploading medical reports.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {quickActions.map((action) => (
            <motion.button
              key={action.href}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(action.href)}
              className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-[#181E2E] border border-[#2B364A] hover:border-[#3B4A63] transition-all text-left group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#F9FAFB]">{action.label}</p>
                <p className="text-xs text-[#94A3B8]">{action.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[#94A3B8] group-hover:text-[#22C55E] transition-colors ml-2" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-8">
        <div className="clinical-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#22C55E]" />
            <h3 className="text-sm font-semibold text-[#F9FAFB]">Try asking me</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => router.push(`/chat?prompt=${encodeURIComponent(prompt)}`)}
                className="text-left text-sm px-4 py-3 rounded-lg bg-[#181E2E] hover:bg-[#252F40] border border-[#2B364A] hover:border-[#3B4A63] transition-all text-[#94A3B8] hover:text-[#F9FAFB]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [scores, setScores] = useState<any>(null)
  const [latestMetrics, setLatestMetrics] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [medications, setMedications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)

  const firstName = user?.full_name?.split(" ")[0] || "there"
  const greeting = greetings()

  useEffect(() => {
    Promise.all([
      apiFetch("/analytics/scores").catch(() => null),
      apiFetch("/metrics/latest").catch(() => null),
      apiFetch("/analytics/patterns").catch(() => []),
      apiFetch("/reports").catch(() => []),
      apiFetch("/medications").catch(() => []),
    ]).then(([scoresData, metricsData, patternsData, reportsData, medsData]) => {
      setScores(scoresData)
      setLatestMetrics(metricsData)
      setRecommendations(Array.isArray(patternsData) ? patternsData : [])
      setReports(Array.isArray(reportsData) ? reportsData : [])
      setMedications(Array.isArray(medsData) ? medsData : [])
      if (scoresData || metricsData) setHasData(true)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <SkeletonDashboard />

  if (!hasData) return <EmptyDashboard userName={firstName} />

  const hasScores = scores && (scores.sleep_score != null || scores.hydration_score != null)
  const scoreValues = [
    scores?.sleep_score, scores?.hydration_score,
    scores?.exercise_consistency, scores?.medication_adherence,
  ].filter((s: number | null) => s != null) as number[]
  const overallScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
    : null

  const getRiskLevel = (score: number | null) => {
    if (score === null) return { label: "Unknown", color: "text-[#94A3B8]" }
    if (score >= 80) return { label: "Excellent", color: "text-[#22C55E]" }
    if (score >= 60) return { label: "Good", color: "text-[#06B6D4]" }
    if (score >= 40) return { label: "Fair", color: "text-[#F59E0B]" }
    return { label: "Needs Attention", color: "text-[#EF4444]" }
  }

  const risk = getRiskLevel(overallScore)

  const metricValues = latestMetrics ? [
    { value: latestMetrics.sleep_hours || 0, max: 8, label: "Sleep", icon: <Moon className="h-3 w-3" />, color: "#22C55E" },
    { value: Math.round((latestMetrics.water_ml || 0) / 100) * 100, max: 2000, label: "Water", icon: <Droplets className="h-3 w-3" />, color: "#06B6D4" },
    { value: latestMetrics.exercise_min || 0, max: 60, label: "Exercise", icon: <Footprints className="h-3 w-3" />, color: "#F59E0B" },
    { value: latestMetrics.steps || 0, max: 10000, label: "Steps", icon: <Activity className="h-3 w-3" />, color: "#22C55E" },
  ] : []

  const pendingMeds = medications?.filter((m: any) => !m.taken_today) || []
  const hasPendingMeds = pendingMeds.length > 0

  return (
    <div className="flex flex-1 min-h-0">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 min-w-0 p-6"
      >
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Section: Greeting + Health Score + Today */}
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={() => setCoachOpen(!coachOpen)}
              className="btn-clinical-ghost text-xs gap-1.5"
            >
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              {coachOpen ? "Close Coach" : "AI Coach"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <div className="clinical-card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#22C55E]/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <greeting.icon className="h-4 w-4 text-[#F59E0B]" />
                      <span className="text-sm text-[#94A3B8]">{greeting.text}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#F9FAFB] tracking-tight">
                      {firstName}
                    </h1>
                    <p className="text-[#94A3B8] text-sm mt-1">Here&apos;s your health summary</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-[#22C55E]" />
                    <span className="text-xs font-medium text-[#22C55E]">Sanjeevni AI</span>
                  </div>
                </div>

                {latestMetrics && (
                  <div className="bg-[#181E2E] rounded-xl p-4 border border-[#2B364A] mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-[#06B6D4]" />
                      <span className="text-xs font-semibold text-[#06B6D4] uppercase tracking-wider">Daily Insight</span>
                    </div>
                    <p className="text-sm text-[#94A3B8] leading-relaxed">
                      {latestMetrics.sleep_hours
                        ? `You slept ${latestMetrics.sleep_hours}h last night. `
                        : ""}
                      {latestMetrics.water_ml
                        ? `Hydration at ${Math.round((latestMetrics.water_ml / 2000) * 100)}% of goal. `
                        : ""}
                      {latestMetrics.mood
                        ? `Mood score: ${latestMetrics.mood}/10. `
                        : ""}
                      {!latestMetrics.sleep_hours && !latestMetrics.water_ml && !latestMetrics.mood
                        ? "Log your first metrics to see personalised insights."
                        : "Keep up the great work!"}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {quickActions.map((action) => (
                    <motion.button
                      key={action.href}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => router.push(action.href)}
                      className="clinical-card-hover !p-3 text-center group"
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                        <action.icon className="h-4.5 w-4.5 text-white" />
                      </div>
                      <p className="text-xs font-medium text-[#F9FAFB]">{action.label}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">{action.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="clinical-card h-full flex flex-col items-center justify-center">
              <div className="relative mb-4">
                <svg width="160" height="160" className="transform -rotate-90">
                  <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                  {overallScore != null && (
                    <motion.circle
                      cx="80" cy="80" r="68" fill="none" stroke="#22C55E" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 68}
                      initial={{ strokeDashoffset: 2 * Math.PI * 68 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 68 * (1 - overallScore / 100) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      style={{ filter: "drop-shadow(0 0 12px rgba(34,197,94,0.3))" }}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {overallScore != null ? (
                    <>
                      <span className="text-4xl font-bold text-[#F9FAFB]">
                        <AnimatedCounter value={overallScore} />
                      </span>
                      <span className="text-xs text-[#94A3B8] mt-1">Health Score</span>
                    </>
                  ) : (
                    <>
                      <Activity className="h-10 w-10 text-[#94A3B8]/40" />
                      <span className="text-xs text-[#94A3B8] mt-2">No data yet</span>
                    </>
                  )}
                </div>
              </div>
              {overallScore != null && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${risk.color.replace("text-", "bg-")}`} />
                  <span className={`text-sm font-medium ${risk.color}`}>{risk.label}</span>
                </div>
              )}
              <button
                onClick={() => router.push("/chat")}
                className="btn-clinical-secondary mt-4 w-full text-xs"
              >
                <Bot className="h-3.5 w-3.5" />
                AI Health Consultation
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Health Metrics Rings */}
        {metricValues.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="clinical-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-[#F9FAFB]">Today&apos;s Metrics</h3>
              <button onClick={() => router.push("/metrics")} className="btn-clinical-ghost text-xs">
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {metricValues.map((m, i) => (
                <div key={i} className="relative flex flex-col items-center">
                  <MetricRing value={m.value} max={m.max} label={m.label} icon={m.icon} color={m.color} />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Middle Section: AI Insights + Medications + Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Insights */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="clinical-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#F9FAFB] flex items-center gap-2">
                  <Brain className="h-4 w-4 text-[#22C55E]" />
                  AI Insights
                </h3>
                <button onClick={() => router.push("/chat")} className="btn-clinical-ghost text-xs gap-1">
                  Chat <MessageSquare className="h-3 w-3" />
                </button>
              </div>
              {recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.slice(0, 4).map((rec: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-[#181E2E] hover:bg-[#252F40] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                        <Zap className="h-4 w-4 text-[#22C55E]" />
                      </div>
                      <p className="text-sm text-[#94A3B8] leading-relaxed">{rec.message || rec}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-[#181E2E] flex items-center justify-center mx-auto mb-3">
                    <Brain className="h-6 w-6 text-[#94A3B8]/40" />
                  </div>
                  <p className="text-sm text-[#94A3B8]">Log more data to see AI insights</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Column: Pending Meds + Latest Reports */}
          <motion.div variants={itemVariants} className="space-y-4">
            {hasPendingMeds && (
              <div className="clinical-card !p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Pill className="h-4 w-4 text-[#F59E0B]" />
                  <h3 className="text-sm font-semibold text-[#F9FAFB]">Medications Due</h3>
                </div>
                <div className="space-y-2">
                  {pendingMeds.slice(0, 3).map((med: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#181E2E]">
                      <div>
                        <p className="text-sm font-medium text-[#F9FAFB]">{med.name}</p>
                        <p className="text-xs text-[#94A3B8]">{med.dosage} • {med.frequency}</p>
                      </div>
                      <span className="medical-badge-amber text-[10px]">Pending</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => router.push("/medications")} className="btn-clinical-ghost w-full text-xs mt-2">
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {reports.length > 0 && (
              <div className="clinical-card !p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-[#06B6D4]" />
                  <h3 className="text-sm font-semibold text-[#F9FAFB]">Latest Reports</h3>
                </div>
                <div className="space-y-2">
                  {reports.slice(0, 3).map((r: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => router.push(`/reports/${r.id}`)}
                      className="w-full text-left p-2.5 rounded-lg bg-[#181E2E] hover:bg-[#252F40] transition-colors"
                    >
                      <p className="text-sm font-medium text-[#F9FAFB] truncate">{r.title || r.original_filename}</p>
                      <p className="text-xs text-[#94A3B8]">{r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString() : ""}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom: AI Health Coach Card */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#22C55E]/10 via-[#06B6D4]/5 to-[#181E2E] border border-[#22C55E]/20 p-6 sm:p-8">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#22C55E]/10 rounded-full blur-3xl" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#22C55E] to-emerald-600 flex items-center justify-center shadow-2xl shadow-[#22C55E]/30 shrink-0">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[#F9FAFB] mb-1">AI Health Consultation</h2>
                <p className="text-sm text-[#94A3B8] mb-4">
                  Get instant answers about your health. Ask about symptoms, medications, lab results, or anything else.
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => router.push(`/chat?prompt=${encodeURIComponent(prompt)}`)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#181E2E] hover:bg-[#252F40] border border-[#2B364A] text-[#94A3B8] hover:text-[#F9FAFB] transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => router.push("/chat")}
                className="btn-clinical shrink-0"
              >
                <MessageSquare className="h-4 w-4" />
                Start Chat
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      </motion.div>
      <HealthCoachSidebar open={coachOpen} onToggle={() => setCoachOpen(false)} />
    </div>
  )
}
