"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { apiFetch } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  ArrowLeft, FileText, Brain, Loader2, AlertTriangle,
  FlaskConical, Shield, TrendingUp, BarChart3, Activity,
  Clock, Calendar, User, Pill, ScanLine, Scan, Building2,
  ChevronDown, ChevronUp, ExternalLink, Download,
} from "lucide-react"
import type { StructuredData, TimelineEventItem, AIInsightItem, ComparisonItem } from "@/components/features/reports/types"

const DOC_TYPE_META: Record<string, { icon: any; color: string }> = {
  "Blood Test Report": { icon: FlaskConical, color: "from-emerald-500 to-teal-600" },
  "Prescription": { icon: Pill, color: "from-purple-500 to-pink-600" },
  "X-Ray": { icon: ScanLine, color: "from-blue-500 to-cyan-600" },
  "MRI": { icon: Scan, color: "from-indigo-500 to-blue-600" },
  "CT Scan": { icon: Scan, color: "from-sky-500 to-blue-600" },
  "ECG": { icon: Activity, color: "from-rose-500 to-red-600" },
  "Discharge Summary": { icon: Building2, color: "from-amber-500 to-orange-600" },
  "Vaccination Record": { icon: FileText, color: "from-[#22C55E] to-emerald-600" },
  "Medical Certificate": { icon: FileText, color: "from-[#94A3B8] to-gray-600" },
  "Insurance Document": { icon: FileText, color: "from-[#06B6D4] to-cyan-600" },
  "General Medical Report": { icon: FileText, color: "from-[#22C55E] to-emerald-600" },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? "bg-[#22C55E]/10 text-[#22C55E]"
          : "text-[#94A3B8] hover:text-[#F9FAFB] hover:bg-white/[0.04]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

function LabCard({ lab }: { lab: any }) {
  const isAbnormal = lab.is_abnormal || lab.flag === "HIGH" || lab.flag === "LOW"
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 border-l-2 transition-all hover:border-white/[0.12]"
      style={{ borderLeftColor: isAbnormal ? "#EF4444" : "#22C55E" }}
    >
      <p className="text-xs text-[#94A3B8]">{lab.test_name || lab.marker}</p>
      <p className="text-lg font-bold text-[#F9FAFB] mt-0.5">
        {lab.value_text || lab.value}
        <span className="text-xs font-normal text-[#94A3B8] ml-1">{lab.unit}</span>
      </p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[#94A3B8]/60">{lab.reference_range || lab.range}</span>
        {lab.flag && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            lab.flag === "NORMAL"
              ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            {lab.flag}
          </span>
        )}
      </div>
    </motion.div>
  )
}

export default function ReportDetailPage() {
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadAll() }, [])

  const handleExportPdf = async () => {
    if (!contentRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const { default: jsPDF } = await import("jspdf")
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: "#090B10",
        scale: 2,
        useCORS: true,
      })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const imgWidth = pageWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 10

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight)
      heightLeft -= pdf.internal.pageSize.getHeight() - 20

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight)
        heightLeft -= pdf.internal.pageSize.getHeight() - 20
      }

      pdf.save(`${summary?.title || "report"}-${new Date().toISOString().split("T")[0]}.pdf`)
    } catch {
      console.error("PDF export failed")
    } finally {
      setExporting(false)
    }
  }

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-2xl shadow-[#22C55E]/20">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
          <p className="text-sm text-[#94A3B8]">Loading report analysis...</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="glass rounded-2xl p-10 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#F9FAFB] mb-2">Report not found</h3>
          <button onClick={() => router.push("/reports")} className="btn-primary mt-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </button>
        </div>
      </div>
    )
  }

  const docType = summary.document_type || "General Medical Report"
  const meta = DOC_TYPE_META[docType] || { icon: FileText, color: "from-[#22C55E] to-emerald-600" }
  const TypeIcon = meta.icon
  const docColor = meta.color
  const isBlood = docType === "Blood Test Report"
  const isPrescription = docType === "Prescription"

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

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-4">
            {/* AI Summary */}
            {summary.ai_summary && (
              <div className="glass rounded-2xl p-5 glow-green">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-[#22C55E]" />
                  <span className="text-xs font-medium text-[#22C55E] uppercase tracking-wider">AI Analysis</span>
                </div>
                <p className="text-sm leading-relaxed text-[#94A3B8]">{summary.ai_summary}</p>
              </div>
            )}

            {/* Health Score Ring */}
            {summary.health_score != null && (
              <div className="glass rounded-2xl p-5 flex items-center gap-5">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 health-ring-base" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                    <circle
                      cx="36" cy="36" r="30" fill="none"
                      stroke={summary.health_score >= 70 ? "#22C55E" : summary.health_score >= 40 ? "#F59E0B" : "#EF4444"}
                      strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={188.5}
                      strokeDashoffset={188.5 - (188.5 * summary.health_score) / 100}
                      className="health-ring-base"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-[#F9FAFB]">{summary.health_score}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F9FAFB]">Health Score</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {summary.health_score >= 70 ? "Good overall health indicators" :
                     summary.health_score >= 40 ? "Moderate — some values need attention" :
                     "Low — consult your healthcare provider"}
                  </p>
                </div>
              </div>
            )}

            {/* Patient Info */}
            {structured.patient_info && (
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-[#F9FAFB] mb-3">Patient Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {structured.patient_info.name && (
                    <div className="flex items-center gap-2 text-[#94A3B8]">
                      <User className="h-4 w-4" />
                      {structured.patient_info.name}
                    </div>
                  )}
                  {structured.patient_info.age && (
                    <span className="text-[#94A3B8]">Age: {structured.patient_info.age}</span>
                  )}
                  {structured.patient_info.gender && (
                    <span className="text-[#94A3B8]">Gender: {structured.patient_info.gender}</span>
                  )}
                  {structured.patient_info.date_of_birth && (
                    <span className="text-[#94A3B8]">DOB: {structured.patient_info.date_of_birth}</span>
                  )}
                </div>
              </div>
            )}

            {/* Structured Data Sections */}
            {structured.sections && structured.sections.map((section: any, i: number) => (
              <div key={i} className="glass rounded-2xl p-5">
                <button
                  onClick={() => toggleSection(`section-${i}`)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-semibold text-[#F9FAFB]">{section.title || section.section}</h3>
                  {expandedSections.has(`section-${i}`) ? (
                    <ChevronUp className="h-4 w-4 text-[#94A3B8]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
                  )}
                </button>
                {expandedSections.has(`section-${i}`) && (
                  <p className="text-sm text-[#94A3B8] mt-2 whitespace-pre-wrap">{section.content}</p>
                )}
              </div>
            ))}
          </div>
        )

      case "labs":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {labValues.length === 0 ? (
              <div className="col-span-full text-center py-8 text-sm text-[#94A3B8]">No lab values found</div>
            ) : (
              labValues.map((lab, i) => <LabCard key={i} lab={lab} />)
            )}
          </div>
        )

      case "findings":
        return (
          <div className="space-y-3">
            {findings.map((section, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-[#F9FAFB] mb-3">{section.section}</h3>
                {section.items?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {section.items.map((item: string, j: number) => (
                      <li key={j} className="text-sm text-[#94A3B8] flex items-start gap-2">
                        <span className="text-[#22C55E] mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#94A3B8]/60">None identified</p>
                )}
              </div>
            ))}
          </div>
        )

      case "risks":
        return (
          <div className="space-y-3">
            {riskScores?.ml_predictions?.map((p: any, i: number) => (
              <div key={i} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-[#F9FAFB]">{p.condition}</p>
                    <p className="text-xs text-[#94A3B8]">{p.source}</p>
                  </div>
                  <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
                    p.risk_level === "high" ? "text-red-400 bg-red-500/10" :
                    p.risk_level === "moderate" ? "text-amber-400 bg-amber-500/10" :
                    "text-[#22C55E] bg-[#22C55E]/10"
                  }`}>
                    {p.risk_level.toUpperCase()} {p.risk_score ? `(${p.risk_score}%)` : ""}
                  </span>
                </div>
                {p.message && <p className="text-sm text-[#94A3B8]">{p.message}</p>}
                {p.source_url && (
                  <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#22C55E] hover:underline mt-2">
                    <ExternalLink className="h-3 w-3" />
                    Source
                  </a>
                )}
              </div>
            ))}
          </div>
        )

      case "insights":
        return (
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl p-4 flex items-start gap-3"
              >
                <div className={`p-1.5 rounded-lg ${
                  insight.severity === "critical" ? "bg-red-500/10" :
                  insight.severity === "warning" || insight.severity === "attention" ? "bg-amber-500/10" :
                  "bg-[#22C55E]/10"
                }`}>
                  <TrendingUp className={`h-4 w-4 ${
                    insight.severity === "critical" ? "text-red-400" :
                    insight.severity === "warning" || insight.severity === "attention" ? "text-amber-400" :
                    "text-[#22C55E]"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#F9FAFB]">{insight.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      insight.severity === "critical" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                      insight.severity === "warning" || insight.severity === "attention" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20"
                    }`}>{insight.severity}</span>
                  </div>
                  {insight.description && <p className="text-xs text-[#94A3B8] mt-1">{insight.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        )

      case "biomarkers":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {biomarkers.map((b, i) => (
              <div key={i} className="glass rounded-2xl p-4">
                <p className="text-xs text-[#94A3B8]">{b.name}</p>
                <p className={`text-lg font-bold mt-0.5 ${b.is_abnormal ? "text-red-400" : "text-[#22C55E]"}`}>
                  {b.value_text || b.value}
                  <span className="text-xs font-normal text-[#94A3B8] ml-1">{b.unit}</span>
                </p>
                {b.reference_range && (
                  <p className="text-[10px] text-[#94A3B8]/60 mt-1">Range: {b.reference_range}</p>
                )}
              </div>
            ))}
          </div>
        )

      case "comparison":
        return (
          <div className="space-y-2">
            {comparisons.map((comp, i) => (
              <div key={i} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#F9FAFB]">{comp.biomarker}</p>
                    <div className="flex items-center gap-2 text-xs text-[#94A3B8] mt-0.5">
                      <span>{comp.previous} {comp.unit}</span>
                      <span className="text-[#94A3B8]/40">→</span>
                      <span className="font-medium text-[#F9FAFB]">{comp.current} {comp.unit}</span>
                      {comp.change !== "N/A" && comp.change !== "0" && (
                        <span className={comp.status === "worsened" ? "text-red-400" : "text-[#22C55E]"}>
                          ({comp.change} {comp.unit})
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                    comp.status === "improved" ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20" :
                    comp.status === "worsened" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    "bg-white/[0.04] text-[#94A3B8] border border-white/[0.06]"
                  }`}>{comp.status}</span>
                </div>
              </div>
            ))}
          </div>
        )

      case "timeline":
        return (
          <div className="relative">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/[0.06]" />
            <div className="space-y-4">
              {timeline.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative pl-10"
                >
                  <div className={`absolute left-[14px] top-[18px] w-3 h-3 rounded-full border-2 ${
                    event.severity === "critical" ? "border-red-400 bg-red-500/20" :
                    event.severity === "warning" ? "border-amber-400 bg-amber-500/20" :
                    "border-[#22C55E] bg-[#22C55E]/20"
                  }`} />
                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[#F9FAFB]">{event.title}</p>
                      {event.date && (
                        <span className="text-[10px] text-[#94A3B8]">
                          {new Date(event.date).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric"
                          })}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-[#94A3B8]">{event.description}</p>
                    )}
                  </div>
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button onClick={() => router.push("/reports")} className="btn-icon">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${docColor} flex items-center justify-center shrink-0 shadow-lg`}>
            <TypeIcon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#F9FAFB] truncate">{summary.title}</h1>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${docColor} text-white shrink-0`}>
                {docType}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Uploaded {summary.uploaded_at ? new Date(summary.uploaded_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric"
              }) : "Unknown date"}
            </p>
          </div>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="btn-secondary text-xs"
          title="Export as PDF"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? "Exporting..." : "Export PDF"}
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/[0.06] scrollbar-hide">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            icon={tab.icon}
            label={tab.label}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        ref={contentRef}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderTab()}
      </motion.div>
    </motion.div>
  )
}
