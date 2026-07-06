"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, BarChart3, Search, Loader2, AlertCircle,
  Sparkles, Bot, X, FlaskRound,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

const BIOMARKER_SUGGESTIONS = [
  ["Hemoglobin", "WBC", "Platelets"],
  ["Glucose", "HbA1c", "Cholesterol"],
  ["Creatinine", "BUN", "eGFR"],
  ["ALT", "AST", "ALP"],
  ["TSH", "T3", "T4"],
  ["Sodium", "Potassium", "Chloride"],
]

export default function ComparisonPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [biomarkerInput, setBiomarkerInput] = useState("")
  const [biomarkers, setBiomarkers] = useState<string[]>([])
  const [result, setResult] = useState<{ query: string; response: string; sources: any[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const handleCompare = async () => {
    if (biomarkers.length === 0) return
    setLoading(true)
    setError(null)
    setResult(null)
    setShowSuggestions(false)

    try {
      const data = await apiFetch("/reports/compare", {
        method: "POST",
        body: JSON.stringify({ biomarker_names: biomarkers }),
      })
      setResult(data)
    } catch (e: any) {
      setError(e.message || "Comparison failed")
    } finally {
      setLoading(false)
    }
  }

  const addBiomarker = (name: string) => {
    if (!biomarkers.includes(name)) {
      setBiomarkers([...biomarkers, name])
    }
  }

  const removeBiomarker = (name: string) => {
    setBiomarkers(biomarkers.filter((b) => b !== name))
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && biomarkerInput.trim()) {
      addBiomarker(biomarkerInput.trim())
      setBiomarkerInput("")
    }
    if (e.key === "Backspace" && !biomarkerInput && biomarkers.length > 0) {
      removeBiomarker(biomarkers[biomarkers.length - 1])
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <button onClick={() => router.push("/reports")} className="btn-clinical-icon">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#0EA5A9] flex items-center justify-center">
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
            <h1 className="text-base font-bold text-[#EDF2F7]">AI Biomarker Comparison</h1>
          </div>
          <p className="text-xs text-[#8B9BB5] ml-8 mt-0.5">Compare biomarkers across reports with AI analysis</p>
        </div>
      </motion.div>

      {/* Biomarker Input */}
      <motion.div variants={itemVariants} className="clinical-card">
        <label className="clinical-label mb-2">Select biomarkers to compare</label>
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-[#181E2E] border border-[#2B364A] min-h-[44px] focus-within:border-[#0EA5A9]/40 focus-within:ring-1 focus-within:ring-[#0EA5A9]/15 transition-all">
          {biomarkers.map((bio) => (
            <span key={bio} className="medical-badge-teal inline-flex items-center gap-1">
              {bio}
              <button onClick={() => removeBiomarker(bio)} className="hover:text-red-400 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={biomarkerInput}
            onChange={(e) => setBiomarkerInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={biomarkers.length === 0 ? "Type biomarkers and press Enter (e.g., Hemoglobin, Glucose)" : ""}
            className="flex-1 bg-transparent text-sm text-[#EDF2F7] outline-none min-w-[120px] placeholder:text-[#8B9BB5]/50"
          />
          <button
            onClick={handleCompare}
            disabled={loading || biomarkers.length === 0}
            className="h-7 px-3 rounded-lg bg-[#0EA5A9] text-white text-xs font-medium flex items-center gap-1.5 hover:bg-[#0D9498] transition-all disabled:opacity-40 shrink-0"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <><Sparkles className="h-3.5 w-3.5" /> Analyze</>
            )}
          </button>
        </div>

        {/* Suggestions */}
        <AnimatePresence>
          {showSuggestions && biomarkers.length === 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-[#2B364A]">
                <p className="text-[10px] text-[#8B9BB5] font-medium mb-2">Common biomarker groups</p>
                <div className="flex flex-wrap gap-1.5">
                  {BIOMARKER_SUGGESTIONS.map((group, i) => (
                    <button
                      key={i}
                      onClick={() => group.forEach((b) => addBiomarker(b))}
                      className="text-[10px] px-2 py-1 rounded-md bg-[#181E2E] hover:bg-[#252F40] text-[#8B9BB5] hover:text-[#EDF2F7] border border-[#2B364A] transition-all"
                    >
                      {group.join(", ")}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Loading */}
      {loading && (
        <motion.div variants={itemVariants} className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#0EA5A9]" />
            <p className="text-xs text-[#8B9BB5]">Analyzing biomarkers across your reports...</p>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div variants={itemVariants} className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </motion.div>
      )}

      {/* AI Results */}
      {result && !loading && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="clinical-card">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="clinical-label mb-2">AI Analysis</p>
                <div className="clinical-prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {result.response}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>

          {/* Sources */}
          {result.sources.length > 0 && (
            <div className="clinical-card !p-4">
              <div className="flex items-center gap-2 mb-3">
                <FlaskRound className="h-4 w-4 text-[#0EA5A9]" />
                <span className="text-xs font-semibold text-[#EDF2F7]">Supporting Data ({result.sources.length})</span>
              </div>
              <div className="space-y-1.5">
                {result.sources.map((src, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#181E2E] text-xs text-[#8B9BB5]">
                    <span className="text-[#0EA5A9] font-medium shrink-0">#{src.report_id}</span>
                    <span className="line-clamp-2">{src.content?.substring(0, 200)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty */}
      {!loading && !result && biomarkers.length === 0 && !error && (
        <motion.div variants={itemVariants} className="clinical-card !p-10 text-center">
          <div className="w-12 h-12 rounded-lg bg-[#181E2E] flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-6 w-6 text-[#8B9BB5]/40" />
          </div>
          <h3 className="text-base font-semibold text-[#EDF2F7] mb-2">AI-Powered Comparison</h3>
          <p className="text-sm text-[#8B9BB5] max-w-md mx-auto">
            Select biomarkers above to get an AI analysis of how they've changed across all your medical reports.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}
