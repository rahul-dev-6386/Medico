"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { ArrowLeft, BarChart3, ArrowUp, ArrowDown, Minus, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ComparisonItem } from "@/components/reports/types"

export default function ComparisonPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return }
    loadData()
  }, [isAuthenticated, router])

  const loadData = async () => {
    try {
      const res = await apiFetch("/reports").catch(() => [])
      const reportIds = (Array.isArray(res) ? res : []).map((r: any) => r.id)
      if (reportIds.length === 0) { setLoading(false); return }

      const comps: ComparisonItem[] = []
      const results = await Promise.allSettled(
        reportIds.slice(0, 5).map((id: number) =>
          apiFetch(`/intelligence/reports/${id}/comparison`).catch(() => null)
        )
      )
      for (const r of results) {
        if (r.status === "fulfilled" && r.value?.comparisons) {
          comps.push(...r.value.comparisons)
        }
      }
      const seen = new Set<string>()
      setComparisons(comps.filter((c) => {
        const key = c.biomarker
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }))
    } finally {
      setLoading(false)
    }
  }

  const filtered = comparisons.filter((c) =>
    c.biomarker.toLowerCase().includes(search.toLowerCase())
  )

  const statusConfig = {
    improved: { icon: ArrowDown, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Improved" },
    stable: { icon: Minus, color: "text-muted-foreground", bg: "bg-muted/30", label: "Stable" },
    worsened: { icon: ArrowUp, color: "text-red-400", bg: "bg-red-500/10", label: "Worsened" },
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/reports")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Report Comparison
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track biomarker changes across reports</p>
        </div>
        <div className="ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search biomarkers..." className="pl-9 w-48 h-9 text-sm" />
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              {comparisons.length === 0
                ? "No comparison data available. Upload multiple reports with the same biomarkers."
                : "No biomarkers match your search."}
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((comp, i) => {
            const cfg = statusConfig[comp.status]
            return (
              <motion.div key={comp.biomarker} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{comp.biomarker}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span className="text-muted-foreground/60">Previous:</span>
                        <span>{comp.previous} {comp.unit}</span>
                        <span className="text-muted-foreground/40">→</span>
                        <span className="font-medium text-foreground">{comp.current} {comp.unit}</span>
                        {comp.change !== "N/A" && comp.change !== "0" && (
                          <span className={cn("text-xs ml-1", comp.status === "worsened" ? "text-red-400" : "text-emerald-400")}>
                            ({comp.change} {comp.unit})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0", cfg.bg, cfg.color)}>
                      <cfg.icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
