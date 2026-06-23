"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import {
  ArrowLeft, FileText, Brain, Loader2, AlertTriangle,
  FlaskConical, Shield, TrendingUp, BarChart3, Activity,
  Clock, Calendar, User, Pill,   ScanLine, Scan, Building2,
} from "lucide-react"
import { BloodReportView } from "@/components/reports/views/blood-report-view"
import { PrescriptionView } from "@/components/reports/views/prescription-view"
import { ScanView } from "@/components/reports/views/scan-view"
import { DischargeSummaryView } from "@/components/reports/views/discharge-summary-view"
import type { StructuredData, TimelineEventItem, AIInsightItem, ComparisonItem, BiomarkerTimeline } from "@/components/reports/types"

const DOC_TYPE_ICONS: Record<string, any> = {
  "Blood Test Report": FlaskConical,
  "Prescription": Pill,
  "X-Ray": ScanLine,
  "MRI": Scan,
  "CT Scan": Scan,
  "ECG": Activity,
  "Vaccination Record": FileText,
  "Discharge Summary": Building2,
  "Medical Certificate": FileText,
  "Insurance Document": FileText,
  "General Medical Report": FileText,
}

const DOC_TYPE_COLORS: Record<string, string> = {
  "Blood Test Report": "from-emerald-500 to-teal-500",
  "Prescription": "from-purple-500 to-pink-500",
  "X-Ray": "from-blue-500 to-cyan-500",
  "MRI": "from-indigo-500 to-blue-500",
  "CT Scan": "from-sky-500 to-blue-500",
  "ECG": "from-rose-500 to-red-500",
  "Discharge Summary": "from-amber-500 to-orange-500",
}

export default function ReportDetailPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const params = useParams()
  const reportId = Number(params.id)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [structured, setStructured] = useState<any>(null)
  const [labValues, setLabValues] = useState<any[]>([])
  const [findings, setFindings] = useState<any[]>([])
  const [riskScores, setRiskScores] = useState<any>(null)
  const [insights, setInsights] = useState<AIInsightItem[]>([])
  const [timeline, setTimeline] = useState<TimelineEventItem[]>([])
  const [biomarkers, setBiomarkers] = useState<any[]>([])
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([])
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return }
    loadAll()
  }, [isAuthenticated, reportId])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [summaryData, labData, findingsData, riskData, insightData, timelineData, bioData, compData] = await Promise.allSettled([
        apiFetch(`/intelligence/reports/${reportId}/summary`),
        apiFetch(`/intelligence/reports/${reportId}/lab-values`),
        apiFetch(`/intelligence/reports/${reportId}/findings`),
        apiFetch(`/intelligence/reports/${reportId}/risk-scores`),
        apiFetch(`/intelligence/reports/${reportId}/insights`),
        apiFetch(`/intelligence/reports/${reportId}/timeline`),
        apiFetch(`/intelligence/reports/${reportId}/biomarkers`),
        apiFetch(`/intelligence/reports/${reportId}/comparison`),
      ])

      if (summaryData.status === "fulfilled") {
        setSummary(summaryData.value)
        setStructured(summaryData.value.structured_data || {})
      }
      if (labData.status === "fulfilled") setLabValues(labData.value.lab_values || [])
      if (findingsData.status === "fulfilled") setFindings(findingsData.value.findings || [])
      if (riskData.status === "fulfilled") setRiskScores(riskData.value)
      if (insightData.status === "fulfilled") setInsights(insightData.value.insights || [])
      if (timelineData.status === "fulfilled") setTimeline(timelineData.value.timeline || [])
      if (bioData.status === "fulfilled") setBiomarkers(bioData.value.biomarkers || [])
      if (compData.status === "fulfilled") setComparisons(compData.value.comparisons || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading report analysis...</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <GlassCard>
          <div className="flex flex-col items-center py-12">
            <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
            <p className="text-lg font-medium">Report not found</p>
            <Button className="mt-4" onClick={() => router.push("/reports")}>Back to Reports</Button>
          </div>
        </GlassCard>
      </div>
    )
  }

  const docType = summary.document_type || "General Medical Report"
  const TypeIcon = DOC_TYPE_ICONS[docType] || FileText
  const docColor = DOC_TYPE_COLORS[docType] || "from-primary to-secondary"
  const isBlood = docType === "Blood Test Report"
  const isPrescription = docType === "Prescription"
  const isScan = ["X-Ray", "MRI", "CT Scan"].includes(docType)
  const isDischarge = docType === "Discharge Summary"

  const tabs = [
    { id: "overview", label: "Overview", icon: Brain },
    ...(isBlood || labValues.length > 0 ? [{ id: "labs", label: "Lab Values", icon: FlaskConical }] : []),
    { id: "findings", label: "Findings", icon: AlertTriangle },
    ...(riskScores ? [{ id: "risks", label: "Risk Scores", icon: Shield }] : []),
    ...(insights.length > 0 ? [{ id: "insights", label: "Insights", icon: TrendingUp }] : []),
    ...(biomarkers.length > 0 ? [{ id: "biomarkers", label: "Biomarkers", icon: Activity }] : []),
    ...(comparisons.length > 0 ? [{ id: "comparison", label: "Comparison", icon: BarChart3 }] : []),
    ...(timeline.length > 0 ? [{ id: "timeline", label: "Timeline", icon: Calendar }] : []),
  ]

  const renderContentView = () => {
    switch (activeTab) {
      case "overview":
        if (isBlood) return <BloodReportView structured={structured} labValues={labValues} riskScores={summary.risk_scores} healthScore={summary.health_score} />
        if (isPrescription) return <PrescriptionView structured={structured} />
        if (isScan) return <ScanView structured={structured} />
        if (isDischarge) return <DischargeSummaryView structured={structured} />
        return <BloodReportView structured={structured} labValues={labValues} riskScores={summary.risk_scores} healthScore={summary.health_score} />
      case "labs":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {labValues.map((lab: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="glass rounded-xl p-4 border-l-2"
                style={{ borderLeftColor: lab.is_abnormal || lab.flag === "HIGH" || lab.flag === "LOW" ? "rgb(239 68 68)" : "rgb(52 211 153)" }}>
                <p className="text-xs text-muted-foreground">{lab.test_name || lab.marker}</p>
                <p className="text-lg font-bold mt-0.5">
                  {lab.value_text || lab.value}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{lab.unit}</span>
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">{lab.reference_range || lab.range}</span>
                  {lab.flag && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      lab.flag === "NORMAL" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>{lab.flag}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )
      case "findings":
        return (
          <div className="space-y-4">
            {findings.map((section: any, i: number) => (
              <GlassCard key={i}>
                <h3 className="font-semibold text-sm mb-2">{section.section}</h3>
                {section.items.length > 0 ? (
                  <ul className="space-y-1">
                    {section.items.map((item: string, j: number) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span> {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">None identified</p>
                )}
              </GlassCard>
            ))}
          </div>
        )
      case "risks":
        return (
          <div className="space-y-4">
            {riskScores?.ml_predictions?.map((p: any, i: number) => (
              <GlassCard key={i}>
                <div className="flex items-center justify-between mb-2">
                  <div><p className="font-medium">{p.condition}</p><p className="text-xs text-muted-foreground">{p.source}</p></div>
                  <span className={`text-sm font-bold ${
                    p.risk_level === "high" ? "text-red-400" : p.risk_level === "moderate" ? "text-yellow-400" : "text-emerald-400"
                  }`}>{p.risk_level.toUpperCase()} {p.risk_score ? `(${p.risk_score}%)` : ""}</span>
                </div>
                {p.message && <p className="text-sm text-muted-foreground">{p.message}</p>}
                {p.source_url && <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">Source</a>}
              </GlassCard>
            ))}
          </div>
        )
      case "insights":
        return (
          <div className="space-y-3">
            {insights.map((insight: AIInsightItem, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    insight.severity === "critical" ? "bg-red-500/10" : insight.severity === "warning" || insight.severity === "attention" ? "bg-yellow-500/10" : "bg-primary/10"
                  }`}>
                    <TrendingUp className={`h-4 w-4 ${
                      insight.severity === "critical" ? "text-red-400" : insight.severity === "warning" || insight.severity === "attention" ? "text-yellow-400" : "text-primary"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{insight.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        insight.severity === "critical" ? "bg-red-500/10 text-red-400" : insight.severity === "warning" || insight.severity === "attention" ? "bg-yellow-500/10 text-yellow-400" : "bg-emerald-500/10 text-emerald-400"
                      }`}>{insight.severity}</span>
                    </div>
                    {insight.description && <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )
      case "biomarkers":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {biomarkers.map((b: any, i: number) => (
              <GlassCard key={i}>
                <p className="text-xs text-muted-foreground">{b.name}</p>
                <p className={`text-lg font-bold ${b.is_abnormal ? "text-red-400" : "text-emerald-400"}`}>
                  {b.value_text || b.value}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{b.unit}</span>
                </p>
                {b.reference_range && <p className="text-[10px] text-muted-foreground">Range: {b.reference_range}</p>}
              </GlassCard>
            ))}
          </div>
        )
      case "comparison":
        return (
          <div className="space-y-3">
            {comparisons.map((comp: ComparisonItem, i: number) => (
              <GlassCard key={i}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{comp.biomarker}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{comp.previous} {comp.unit}</span>
                      <span>→</span>
                      <span className="font-medium text-foreground">{comp.current} {comp.unit}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                    comp.status === "improved" ? "bg-emerald-500/10 text-emerald-400" :
                    comp.status === "worsened" ? "bg-red-500/10 text-red-400" :
                    "bg-muted/30 text-muted-foreground"
                  }`}>{comp.status}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )
      case "timeline":
        return (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-6">
              {timeline.map((event: TimelineEventItem, i: number) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="relative pl-10">
                  <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${
                    event.severity === "critical" ? "border-red-400 bg-red-500/20" :
                    event.severity === "warning" ? "border-yellow-400 bg-yellow-500/20" :
                    "border-primary bg-primary/20"
                  }`} />
                  <GlassCard>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <span className="text-[10px] text-muted-foreground">{event.date ? new Date(event.date).toLocaleDateString() : ""}</span>
                    </div>
                    {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/reports")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${docColor} flex items-center justify-center shrink-0`}>
            <TypeIcon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">{summary.title}</h1>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${docColor} text-white`}>
                {docType}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Uploaded {summary.uploaded_at ? new Date(summary.uploaded_at).toLocaleDateString() : "Unknown"}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/5">
        {tabs.map((tab) => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}>
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {summary.ai_summary && activeTab === "overview" && (
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">AI Analysis</span>
          </div>
          <p className="text-sm leading-relaxed">{summary.ai_summary}</p>
        </div>
      )}

      <motion.div key={activeTab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {renderContentView()}
      </motion.div>
    </div>
  )
}
