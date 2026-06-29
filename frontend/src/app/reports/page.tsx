"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  FileText, Upload, Plus, Sparkles, Activity,
  AlertCircle, TrendingUp, Download, Trash2,
  ChevronRight, Search, Clock, ArrowUpRight,
  HeartPulse, FlaskRound, Pill, Stethoscope,
  BarChart3, Loader2, Eye,
} from "lucide-react"

interface Report {
  id: number
  title: string | null
  original_filename: string
  document_type: string | null
  processed: boolean
  uploaded_at: string
  risk_level?: string | null
  health_score?: number | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

function UploadZone({ onUpload }: { onUpload: (file: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.type === "application/pdf" || file.name.endsWith(".pdf"))) {
      setUploading(true)
      onUpload(file)
    }
  }, [onUpload])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
        dragging
          ? "border-[#22C55E] bg-[#22C55E]/5"
          : "border-white/[0.08] hover:border-[#22C55E]/40 hover:bg-white/[0.02]"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
        }}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-[#22C55E] animate-spin" />
          <p className="text-sm text-[#94A3B8]">Analyzing your report...</p>
        </div>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-[#22C55E]/10 flex items-center justify-center mx-auto mb-4">
            <Upload className="h-6 w-6 text-[#22C55E]" />
          </div>
          <h3 className="text-lg font-semibold text-[#F9FAFB] mb-2">Upload Medical Report</h3>
          <p className="text-sm text-[#94A3B8] mb-4">
            Drag & drop your PDF or image, or click to browse
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-[#94A3B8]/60">
            <FileText className="h-3.5 w-3.5" />
            Supports PDF, JPG, PNG — HIPAA-compliant processing
          </div>
        </>
      )}
    </div>
  )
}

function ReportCard({ report, onDelete }: { report: Report; onDelete: (id: number) => void }) {
  const router = useRouter()
  const riskColor = report.risk_level === "high" ? "text-[#EF4444]" : report.risk_level === "moderate" ? "text-[#F59E0B]" : "text-[#22C55E]"
  const TypeIcon = report.document_type === "prescription" ? Pill : report.document_type === "lab" ? FlaskRound : FileText

  return (
    <motion.button
      whileHover={{ y: -1 }}
      onClick={() => router.push(`/reports/${report.id}`)}
      className="w-full glass rounded-2xl p-4 text-left hover:border-white/[0.12] transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#06B6D4] to-cyan-600 flex items-center justify-center shrink-0 shadow-lg">
          <TypeIcon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-[#F9FAFB] truncate">
                {report.title || report.original_filename}
              </p>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {report.uploaded_at ? new Date(report.uploaded_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric"
                }) : ""}
                {report.document_type && ` • ${report.document_type}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {report.risk_level && (
                <span className={cn("badge", riskColor.replace("text-", "bg-").replace("]", "/10]"), riskColor)}>
                  {report.risk_level}
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(report.id) }}
                className="btn-icon !p-1 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
          </div>
          {report.processed && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                Analyzed
              </span>
              {report.health_score != null && (
                <span className="text-xs text-[#94A3B8]">Score: {report.health_score}</span>
              )}
            </div>
          )}
          {!report.processed && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-soft" />
              </div>
              <span className="text-xs text-amber-400">Processing</span>
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-[#94A3B8] group-hover:text-[#22C55E] transition-colors shrink-0 mt-3" />
      </div>
    </motion.button>
  )
}

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchReports = useCallback(async () => {
    try {
      const data = await apiFetch("/reports")
      setReports(Array.isArray(data) ? data : [])
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    try {
      await apiFetch("/reports/upload", {
        method: "POST",
        headers: {},
        body: formData,
      })
      fetchReports()
    } catch (e) {
      console.error("Upload failed", e)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/reports/${id}`, { method: "DELETE" })
      setReports((prev) => prev.filter((r) => r.id !== id))
    } catch {}
  }

  const filtered = reports.filter((r) =>
    (r.title || r.original_filename).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const processedCount = reports.filter((r) => r.processed).length
  const highRiskCount = reports.filter((r) => r.risk_level === "high").length

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 skeleton rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>
        <div className="h-40 skeleton rounded-2xl" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F9FAFB]">Medical Reports</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Upload, analyze, and compare your medical reports</p>
        </div>
        <button
          onClick={() => router.push("/reports/comparison")}
          className="btn-secondary text-xs"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Compare Reports
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F9FAFB]">{reports.length}</p>
              <p className="text-xs text-[#94A3B8]">Total Reports</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-[#06B6D4]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F9FAFB]">{processedCount}</p>
              <p className="text-xs text-[#94A3B8]">Analyzed</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F9FAFB]">{highRiskCount}</p>
              <p className="text-xs text-[#94A3B8]">Needs Attention</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Upload Zone */}
      <motion.div variants={itemVariants}>
        <UploadZone onUpload={handleUpload} />
      </motion.div>

      {/* Reports List */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">
            {reports.length > 0 ? "All Reports" : "No reports yet"}
          </h2>
          {reports.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 w-48 text-xs"
              />
            </div>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <FileText className="h-7 w-7 text-[#94A3B8]/40" />
            </div>
            <h3 className="text-lg font-semibold text-[#F9FAFB] mb-2">No Reports Yet</h3>
            <p className="text-sm text-[#94A3B8] mb-6 max-w-md mx-auto">
              Upload your first medical report to get AI-powered analysis, biomarker extraction, risk assessment, and historical comparison.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()} className="btn-primary">
                <Upload className="h-4 w-4" />
                Upload Report
              </button>
              <button onClick={() => router.push("/chat")} className="btn-secondary">
                <Sparkles className="h-4 w-4" />
                Ask AI First
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#94A3B8]">
                No reports match your search
              </div>
            ) : (
              filtered.map((report) => (
                <ReportCard key={report.id} report={report} onDelete={handleDelete} />
              ))
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
