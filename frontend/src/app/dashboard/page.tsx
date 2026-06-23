"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { ProgressRing } from "@/components/ui/progress-ring"
import { HealthScore } from "@/components/ui/health-score"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import {
  Activity, Moon, Droplets, Brain, Sparkles,
  TrendingUp, MessageSquare, Heart,
  Pill, Footprints, ArrowUpRight
} from "lucide-react"

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return "Good Morning"
  if (h < 17) return "Good Afternoon"
  return "Good Evening"
}

const quickActions = [
  { href: "/chat", label: "AI Chat", icon: MessageSquare, gradient: "from-primary to-emerald-500" },
  { href: "/metrics", label: "Log Health", icon: Activity, gradient: "from-secondary to-blue-500" },
  { href: "/medications", label: "Medications", icon: Pill, gradient: "from-purple-500 to-pink-500" },
  { href: "/reports", label: "Upload Report", icon: Footprints, gradient: "from-amber-500 to-orange-500" },
]

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [scores, setScores] = useState<any>(null)
  const [latestMetrics, setLatestMetrics] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    Promise.all([
      apiFetch("/analytics/scores").catch(() => null),
      apiFetch("/metrics/latest").catch(() => null),
      apiFetch("/analytics/patterns").catch(() => []),
      apiFetch("/reports").catch(() => []),
    ])
      .then(([scoresData, metricsData, patternsData, reportsData]) => {
        setScores(scoresData)
        setLatestMetrics(metricsData)
        setRecommendations(Array.isArray(patternsData) ? patternsData : [])
        if (scoresData || metricsData || (Array.isArray(reportsData) && reportsData.length > 0)) setHasData(true)
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
            <Activity className="h-6 w-6 text-white animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your health data...</p>
        </div>
      </div>
    )
  }

  const hasScores = scores && (scores.sleep_score != null || scores.hydration_score != null || scores.exercise_consistency != null)
  const scoreValues = [
    scores?.sleep_score,
    scores?.hydration_score,
    scores?.exercise_consistency,
    scores?.medication_adherence,
  ].filter((s) => s != null) as number[]
  const overallScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
    : null

  if (!hasData && !hasScores) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{greeting()}, {user?.full_name?.split(" ")[0] || "there"}</h1>
            <p className="text-muted-foreground text-sm mt-1">Let&apos;s start your health journey</p>
          </div>
        </motion.div>
        <GlassCard glow="primary">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Welcome to HealthAI</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Start by logging your first health metrics, chatting with your AI health coach, or uploading a medical report.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {quickActions.map((action) => (
                <Button key={action.href} onClick={() => router.push(action.href)}
                  className="gap-2 bg-primary hover:bg-primary/90">
                  <action.icon className="h-4 w-4" />{action.label}
                </Button>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    )
  }

  const scoreItems = [
    { value: scores?.sleep_score, label: "Sleep", icon: Moon, trend: null as string | null },
    { value: scores?.hydration_score, label: "Hydration", icon: Droplets, trend: null },
    { value: scores?.exercise_consistency, label: "Activity", icon: Activity, trend: null },
    { value: scores?.medication_adherence, label: "Medications", icon: Pill, trend: null },
  ].filter((s) => s.value != null)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6" glow="primary">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">
                  {greeting()}, {user?.full_name?.split(" ")[0] || "there"}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Here&apos;s your health summary for today
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">AI-Powered</span>
              </div>
            </div>

            {latestMetrics && (
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">Daily Insight</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {latestMetrics.sleep_hours
                    ? `You slept ${latestMetrics.sleep_hours} hours last night. `
                    : ""}
                  {latestMetrics.water_ml
                    ? `Hydration is at ${Math.round((latestMetrics.water_ml / 2000) * 100)}% of daily goal. `
                    : ""}
                  {latestMetrics.mood
                    ? `Your mood score is ${latestMetrics.mood}/10. `
                    : ""}
                  {!latestMetrics.sleep_hours && !latestMetrics.water_ml && !latestMetrics.mood
                    ? "Log your first metrics to see daily insights here."
                    : "Keep up the great work on your health journey!"}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <motion.button
                  key={action.href}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(action.href)}
                  className="glass rounded-xl p-3 text-center hover:border-white/20 transition-all"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center mx-auto mb-2`}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-medium">{action.label}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </GlassCard>

        <GlassCard className="p-6 flex flex-col items-center justify-center" glow="secondary">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            className="flex flex-col items-center"
          >
            {overallScore != null ? (
              <>
                <ProgressRing value={overallScore} size={140} strokeWidth={10} />
                <p className="text-sm text-muted-foreground mt-6">Overall Health</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 gap-1 text-primary"
                  onClick={() => router.push("/chat")}
                >
                  Get AI Advice
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <div className="w-[140px] h-[140px] rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <Activity className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">Log metrics to see your overall health score</p>
              </>
            )}
          </motion.div>
        </GlassCard>
      </div>

      {scoreItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {scoreItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <HealthScore
                score={item.value}
                label={item.label}
                icon={<item.icon className="h-4 w-4" />}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <GlassCard>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              AI Insights
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec: any, i: number) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="p-1.5 rounded-lg bg-muted/50">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {rec.message || rec}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  )
}
