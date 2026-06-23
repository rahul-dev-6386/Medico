"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import {
  Sun, Sparkles, Brain, Activity
} from "lucide-react"

export default function RoutinesPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [dailyRoutine, setDailyRoutine] = useState<any>(null)
  const [loadingDaily, setLoadingDaily] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generateDaily = async () => {
    setLoadingDaily(true)
    try {
      const data = await apiFetch("/routines/generate-daily", { method: "POST" })
      setDailyRoutine(data)
      setGenerated(true)
    } catch (err: any) { alert(err.message) }
    finally { setLoadingDaily(false) }
  }

  if (!isAuthenticated) { router.push("/login"); return null }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Personalized Plans</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-generated daily routines based on your health data</p>
        </div>
        <Button onClick={generateDaily} disabled={loadingDaily} className="gap-2 bg-primary hover:bg-primary/90">
          <Sparkles className="h-4 w-4" />
          {loadingDaily ? "Generating..." : "Generate My Plan"}
        </Button>
      </motion.div>

      {generated && !dailyRoutine && (
        <GlassCard>
          <div className="flex flex-col items-center py-12 text-center">
            <Brain className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground mb-2">Not enough health data to generate a plan yet</p>
            <p className="text-sm text-muted-foreground/60">Log health metrics and medications first</p>
          </div>
        </GlassCard>
      )}

      {dailyRoutine && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">AI-Generated Plan</span>
          </div>
          {Object.entries(dailyRoutine).map(([key, val]) => (
            <div key={key} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-sm capitalize text-muted-foreground min-w-[120px]">{key.replace(/_/g, " ")}</span>
              <span className="text-sm">{String(val || "")}</span>
            </div>
          ))}
        </motion.div>
      )}

      {!generated && !dailyRoutine && (
        <GlassCard glow="primary">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4">
              <Sun className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Your Personalized Plan</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Get an AI-generated daily routine tailored to your health goals, metrics, and medication schedule.
            </p>
            <Button onClick={generateDaily} disabled={loadingDaily} size="lg" className="gap-2 bg-primary hover:bg-primary/90">
              <Sparkles className="h-5 w-5" />
              {loadingDaily ? "Generating..." : "Generate My Personalized Plan"}
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
