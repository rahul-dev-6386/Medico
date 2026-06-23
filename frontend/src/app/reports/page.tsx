"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { apiFetch, API_URL, getAuthHeaders } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText, Upload, Trash2, Loader2, File, Image,
  Calendar, CheckCircle2, Clock, X, Search,
  Brain, FileSpreadsheet, Activity, FlaskConical,
  ChevronDown, ChevronUp, Sparkles, AlertTriangle,
  BarChart3, TrendingUp, Shield
} from "lucide-react"
import { LabValueCard } from "@/components/reports/lab-value-card"
import { MedicalFindings } from "@/components/reports/medical-findings"
import { RiskScoreCard } from "@/components/reports/risk-score-card"
import { InsightCards } from "@/components/reports/insight-cards"
import { BiomarkerTimeline } from "@/components/reports/biomarker-timeline"
import { HistoricalComparison } from "@/components/reports/historical-comparison"
import type {
  LabValue, MedicalFinding, RiskScore,
  ComparisonItem, ReportInsight, BiomarkerTimeline as BT
} from "@/components/reports/types"

interface Report {
  id: number
  title: string | null
  document_type: string | null
  file_type: string
  original_filename: string
  extracted_text: string | null
  ai_summary: string | null
  health_score: number | null
  processed: boolean
  uploaded_at: string
}

const DOC_TYPE_COLORS: Record<string, string> = {
  "Blood Test Report": "bg-emerald-500/10 text-emerald-400",
  "Prescription": "bg-purple-500/10 text-purple-400",
  "X-Ray": "bg-blue-500/10 text-blue-400",
  "MRI": "bg-indigo-500/10 text-indigo-400",
  "CT Scan": "bg-sky-500/10 text-sky-400",
  "ECG": "bg-rose-500/10 text-rose-400",
  "Discharge Summary": "bg-amber-500/10 text-amber-400",
  "Vaccination Record": "bg-teal-500/10 text-teal-400",
  "Medical Certificate": "bg-gray-500/10 text-gray-400",
  "Insurance Document": "bg-orange-500/10 text-orange-400",
}

const INTELLIGENCE_ENDPOINTS = {
  labValues: (id: number) => `/intelligence/reports/${id}/lab-values`,
  findings: (id: number) => `/intelligence/reports/${id}/findings`,
  riskScore: (id: number) => `/intelligence/reports/${id}/risk-score`,
  comparison: (id: number) => `/intelligence/reports/${id}/comparison`,
  insights: (id: number) => `/intelligence/reports/${id}/insights`,
  biomarkers: (id: number) => `/intelligence/reports/${id}/biomarkers`,
}

export default function ReportsPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [slideOverReport, setSlideOverReport] = useState<Report | null>(null)
  const [showExtracted, setShowExtracted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dragOver, setDragOver] = useState(false)
  const [intelligenceTab, setIntelligenceTab] = useState<string>("findings")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [labValues, setLabValues] = useState<LabValue[]>([])
  const [findings, setFindings] = useState<MedicalFinding[]>([])
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null)
  const [history, setHistory] = useState<ComparisonItem[]>([])
  const [insights, setInsights] = useState<ReportInsight[]>([])
  const [biomarkers, setBiomarkers] = useState<BT[]>([])
  const [intelLoading, setIntelLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return }
    loadReports()
  }, [isAuthenticated, router])

  const loadReports = async () => {
    try {
      const data = await apiFetch("/reports")
      setReports(data)
    } finally {
      setLoading(false)
    }
  }

  const loadIntelligence = async (reportId: number) => {
    setIntelLoading(true)
    setLabValues([])
    setFindings([])
    setRiskScore(null)
    setHistory([])
    setInsights([])
    setBiomarkers([])

    const results = await Promise.allSettled([
      apiFetch(INTELLIGENCE_ENDPOINTS.labValues(reportId)).catch(() => null),
      apiFetch(INTELLIGENCE_ENDPOINTS.findings(reportId)).catch(() => null),
      apiFetch(INTELLIGENCE_ENDPOINTS.riskScore(reportId)).catch(() => null),
      apiFetch(INTELLIGENCE_ENDPOINTS.comparison(reportId)).catch(() => null),
      apiFetch(INTELLIGENCE_ENDPOINTS.insights(reportId)).catch(() => null),
      apiFetch(INTELLIGENCE_ENDPOINTS.biomarkers(reportId)).catch(() => null),
    ])

    if (results[0].status === "fulfilled" && results[0].value) setLabValues(results[0].value.lab_values ?? results[0].value)
    if (results[1].status === "fulfilled" && results[1].value) setFindings(results[1].value.findings ?? results[1].value)
    if (results[2].status === "fulfilled" && results[2].value) setRiskScore(results[2].value)
    if (results[3].status === "fulfilled" && results[3].value) setHistory(results[3].value.comparisons ?? results[3].value)
    if (results[4].status === "fulfilled" && results[4].value) setInsights(results[4].value.insights ?? results[4].value)
    if (results[5].status === "fulfilled" && results[5].value) setBiomarkers(results[5].value.biomarkers ?? results[5].value)

    setIntelLoading(false)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const headers = getAuthHeaders()
      delete headers["Content-Type"]
      const response = await fetch(`${API_URL}/reports/upload`, { method: "POST", headers, body: formData })
      if (!response.ok) throw new Error("Upload failed")
      const data = await response.json()
      setReports((prev) => [data, ...prev])
    } catch (err: any) { alert(err.message) }
    finally { setUploading(false) }
  }

  const deleteReport = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Delete this report?")) return
    try {
      await apiFetch(`/reports/${id}`, { method: "DELETE" })
      setReports((prev) => prev.filter((r) => r.id !== id))
      if (slideOverReport?.id === id) { setSlideOverReport(null); setShowExtracted(false) }
    } catch (err: any) { alert(err.message) }
  }

  const filteredReports = useMemo(() =>
    reports.filter((r) => {
      const name = (r.title || r.original_filename).toLowerCase()
      return name.includes(searchQuery.toLowerCase()) &&
        (typeFilter === "all" || r.file_type.startsWith(typeFilter)) &&
        (statusFilter === "all" || (statusFilter === "processed" && r.processed) || (statusFilter === "processing" && !r.processed))
    }), [reports, searchQuery, typeFilter, statusFilter])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [])

  const openSlideOver = (report: Report) => {
    setSlideOverReport(report)
    setShowExtracted(false)
    setIntelligenceTab("findings")
    if (report.processed) loadIntelligence(report.id)
  }

  const getFileIcon = (t: string, cn = "h-5 w-5") =>
    t.startsWith("image") ? <Image className={cn} /> : t === "application/pdf" ? <FileText className={cn} /> : <File className={cn} />

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
          <FileText className="h-6 w-6 text-white animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Loading reports...</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medical Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered report analysis with lab detection, risk scoring, and biomarker tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Search reports..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="w-48 lg:w-64 h-9 text-sm" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
        <GlassCard hover={false}
          className={`border-2 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-white/10"}`}>
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
          <div className="flex flex-col items-center justify-center py-8 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <Upload className={`h-6 w-6 text-primary ${uploading ? "animate-bounce" : ""}`} />
            </div>
            <p className="font-medium mb-1">{uploading ? "Uploading..." : "Upload medical report for AI analysis"}</p>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG — Lab values, biomarkers, and risk factors extracted automatically</p>
          </div>
        </GlassCard>
      </motion.div>

      <div className="flex gap-3">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-xl glass border-white/10 px-3 text-xs">
          <option value="all">All Types</option>
          <option value="application/pdf">PDF</option>
          <option value="image">Image</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-xl glass border-white/10 px-3 text-xs">
          <option value="all">All Status</option>
          <option value="processed">Processed</option>
          <option value="processing">Processing</option>
        </select>
      </div>

      {filteredReports.length === 0 ? (
        <GlassCard hover={false}>
          <div className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              {reports.length === 0 ? "No reports uploaded yet" : "No reports match your filters"}
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report, i) => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className="h-full flex flex-col" onClick={() => router.push(`/reports/${report.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                      {getFileIcon(report.file_type, "h-4 w-4")}
                    </div>
                    <span className="text-sm font-medium truncate">{report.title || report.original_filename}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => deleteReport(report.id, e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>

                {report.document_type && (
                  <div className="mb-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${DOC_TYPE_COLORS[report.document_type] || "bg-muted/30 text-muted-foreground"}`}>
                      {report.document_type}
                    </span>
                  </div>
                )}

                <div className="flex-1">
                  {report.ai_summary ? (
                    <div className="bg-primary/5 rounded-xl p-3 mb-3 border border-primary/10">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Brain className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">AI Summary</span>
                      </div>
                      <p className="text-sm leading-relaxed line-clamp-3">{report.ai_summary}</p>
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-xl p-3 mb-3 text-center">
                      {report.processed
                        ? <p className="text-sm text-muted-foreground">No AI summary</p>
                        : <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />Analyzing...
                          </div>
                      }
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-lg">
                    {report.file_type.startsWith("image") ? "Image" : report.file_type === "application/pdf" ? "PDF" : report.file_type}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />{new Date(report.uploaded_at).toLocaleDateString()}
                  </span>
                  {report.health_score != null && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                      report.health_score >= 75 ? "text-emerald-400 bg-emerald-500/10" :
                      report.health_score >= 50 ? "text-yellow-400 bg-yellow-500/10" :
                      "text-red-400 bg-red-500/10"
                    }`}>
                      <Activity className="h-3 w-3" />{report.health_score}
                    </span>
                  )}
                  {report.processed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      <CheckCircle2 className="h-3 w-3" />Processed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                      <Clock className="h-3 w-3" />Processing
                    </span>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {slideOverReport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40" onClick={() => { setSlideOverReport(null); setShowExtracted(false) }} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-background border-l border-white/10 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                      {getFileIcon(slideOverReport.file_type, "h-5 w-5")}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold truncate">{slideOverReport.title || slideOverReport.original_filename}</h2>
                      <p className="text-xs text-muted-foreground">{slideOverReport.original_filename}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => deleteReport(slideOverReport.id, e)}><Trash2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { setSlideOverReport(null); setShowExtracted(false) }}><X className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="glass rounded-xl p-4 grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium ml-1">{slideOverReport.file_type.startsWith("image") ? "Image" : "PDF"}</span></div>
                  <div><span className="text-muted-foreground">Uploaded:</span> <span className="font-medium ml-1">{new Date(slideOverReport.uploaded_at).toLocaleDateString()}</span></div>
                  <div><span className="text-muted-foreground">Status:</span>
                    <span className="ml-1">{slideOverReport.processed ? <span className="text-emerald-400">Processed</span> : <span className="text-amber-400">Processing</span>}</span>
                  </div>
                </div>

                {slideOverReport.processed && (
                  <>
                    <div className="flex gap-1 border-b border-white/5 pb-2 overflow-x-auto">
                      {[
                        { id: "findings", label: "Findings", icon: Brain },
                        { id: "lab", label: "Lab Values", icon: FlaskConical },
                        { id: "risk", label: "Risk Score", icon: Shield },
                        { id: "insights", label: "Insights", icon: TrendingUp },
                        { id: "history", label: "History", icon: BarChart3 },
                        { id: "biomarkers", label: "Biomarkers", icon: Activity },
                      ].map((tab) => (
                        <button key={tab.id}
                          onClick={() => setIntelligenceTab(tab.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            intelligenceTab === tab.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                          }`}>
                          <tab.icon className="h-3.5 w-3.5" />
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {intelLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Loading intelligence data...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {intelligenceTab === "findings" && (
                          <div className="space-y-4">
                            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain className="h-4 w-4 text-primary" />
                                <span className="text-xs font-medium text-primary uppercase tracking-wide">AI Analysis</span>
                              </div>
                              {slideOverReport.ai_summary ? (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{slideOverReport.ai_summary}</p>
                              ) : (
                                <p className="text-sm text-muted-foreground">No AI analysis available</p>
                              )}
                            </div>
                            {findings.length > 0 ? (
                              <MedicalFindings findings={findings} />
                            ) : (
                              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 text-sm text-muted-foreground">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <p>Structured medical findings not yet available. AI summary is shown above.</p>
                              </div>
                            )}
                          </div>
                        )}

                        {intelligenceTab === "lab" && (
                          labValues.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {labValues.map((lab, i) => (
                                <LabValueCard key={lab.marker} lab={lab} index={i} />
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 text-sm text-muted-foreground">
                              <FlaskConical className="h-4 w-4 shrink-0" />
                              <p>Lab values not yet extracted. The intelligence pipeline will detect biomarkers automatically.</p>
                            </div>
                          )
                        )}

                        {intelligenceTab === "risk" && (
                          riskScore ? (
                            <RiskScoreCard risk={riskScore} />
                          ) : (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 text-sm text-muted-foreground">
                              <Shield className="h-4 w-4 shrink-0" />
                              <p>Risk scoring not yet available. Lab values and biomarkers are required for risk assessment.</p>
                            </div>
                          )
                        )}

                        {intelligenceTab === "insights" && (
                          insights.length > 0 ? (
                            <InsightCards insights={insights} />
                          ) : (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 text-sm text-muted-foreground">
                              <TrendingUp className="h-4 w-4 shrink-0" />
                              <p>Health insights not yet available. Multiple reports with lab data are needed for trend analysis.</p>
                            </div>
                          )
                        )}

                        {intelligenceTab === "history" && (
                          history.length > 0 ? (
                            <HistoricalComparison comparisons={history as any} />
                          ) : (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 text-sm text-muted-foreground">
                              <BarChart3 className="h-4 w-4 shrink-0" />
                              <p>Historical comparison not yet available. Multiple reports with the same biomarkers are required.</p>
                            </div>
                          )
                        )}

                        {intelligenceTab === "biomarkers" && (
                          biomarkers.length > 0 ? (
                            <BiomarkerTimeline timelines={biomarkers} />
                          ) : (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 text-sm text-muted-foreground">
                              <Activity className="h-4 w-4 shrink-0" />
                              <p>Biomarker timelines not yet available. Multiple reports with longitudinal data are required.</p>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </>
                )}

                {slideOverReport.extracted_text && (
                  <div className="border-t border-white/5 pt-4">
                    <button onClick={() => setShowExtracted(!showExtracted)}
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      {showExtracted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Extracted Text
                    </button>
                    {showExtracted && (
                      <pre className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-xl p-4 max-h-60 overflow-y-auto">
                        {slideOverReport.extracted_text}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
