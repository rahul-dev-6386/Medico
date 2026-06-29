"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  ArrowLeft, BarChart3, ArrowUp, ArrowDown, Minus,
  Search, Loader2, TrendingUp, AlertCircle,
} from "lucide-react"
import type { ComparisonItem } from "@/components/features/reports/types"

const statusConfig = {
  improved: { icon: ArrowDown, color: "text-[#22C55E]", bg: "bg-[#22C55E]/10", border: "border-[#22C55E]/20", label: "Improved" },
  stable: { icon: Minus, color: "text-[#94A3B8]", bg: "bg-white/[0.04]", border: "border-white/[0.06]", label: "Stable" },
  worsened: { icon: ArrowUp, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Worsened" },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

export default function ComparisonPage() {
  const router = useRouter()
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => { loadData() }, [])

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

  const improvedCount = comparisons.filter((c) => c.status === "improved").length
  const worsenedCount = comparisons.filter((c) => c.status === "worsened").length

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <button onClick={() => router.push("/reports")} className="btn-icon">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[#F9FAFB] flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#22C55E]" />
            Report Comparison
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">Track biomarker changes across reports</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search biomarkers..."
            className="input-field pl-9 w-44 text-xs h-9"
          />
        </div>
      </motion.div>

      {/* Summary Stats */}
      {comparisons.length > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#F9FAFB]">{comparisons.length}</p>
            <p className="text-xs text-[#94A3B8]">Tracked</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#22C55E]">{improvedCount}</p>
            <p className="text-xs text-[#94A3B8]">Improved</p>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{worsenedCount}</p>
            <p className="text-xs text-[#94A3B8]">Worsened</p>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#22C55E]" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <motion.div variants={itemVariants} className="glass rounded-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-7 w-7 text-[#94A3B8]/40" />
          </div>
          <h3 className="text-lg font-semibold text-[#F9FAFB] mb-2">
            {comparisons.length === 0 ? "No Comparison Data" : "No Matches"}
          </h3>
          <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
            {comparisons.length === 0
              ? "Upload multiple reports with the same biomarkers to track changes over time."
              : "No biomarkers match your search."}
          </p>
          {comparisons.length === 0 && (
            <button onClick={() => router.push("/reports")} className="btn-primary mt-6">
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </button>
          )}
        </motion.div>
      )}

      {/* Comparison List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((comp, i) => {
            const cfg = statusConfig[comp.status]
            return (
              <motion.div
                key={comp.biomarker}
                variants={itemVariants}
                className="glass rounded-2xl p-4 hover:border-white/[0.12] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#F9FAFB]">{comp.biomarker}</p>
                      <TrendingUp className={`h-3.5 w-3.5 ${cfg.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#94A3B8] mt-0.5">
                      <span className="text-[#94A3B8]/60">Previous:</span>
                      <span>{comp.previous} {comp.unit}</span>
                      <span className="text-[#94A3B8]/40">→</span>
                      <span className="font-medium text-[#F9FAFB]">{comp.current} {comp.unit}</span>
                      {comp.change !== "N/A" && comp.change !== "0" && (
                        <span className={`text-xs ml-0.5 ${comp.status === "worsened" ? "text-red-400" : "text-[#22C55E]"}`}>
                          ({comp.change} {comp.unit})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                    <cfg.icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
