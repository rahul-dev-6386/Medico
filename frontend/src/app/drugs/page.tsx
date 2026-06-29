"use client"

import { useState, useCallback, useRef } from "react"
import { apiFetch, cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  Pill, Search, AlertTriangle, Loader2, Plus, X,
  BookOpen, AlertCircle, Shield, ChevronRight,
  FlaskConical, Heart, ExternalLink, Sparkles,
  CheckCircle, MinusCircle,
} from "lucide-react"

interface DrugInfo {
  generic_name: string | null
  brand_name: string | null
  drug_class: string | null
  indications: string | null
  contraindications: string | null
  side_effects: string | null
  dosage_info: string | null
  interactions: string | null
  pregnancy_category: string | null
  score?: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

function DrugSection({ title, content, icon: Icon, color }: { title: string; content: string | null; icon: any; color: string }) {
  if (!content) return null
  const [expanded, setExpanded] = useState(false)
  const truncated = content.length > 200

  return (
    <div className="glass rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <h4 className="text-xs font-semibold text-[#F9FAFB] uppercase tracking-wider">{title}</h4>
      </div>
      <p className={cn("text-sm text-[#94A3B8] leading-relaxed", !expanded && truncated && "line-clamp-3")}>
        {content}
      </p>
      {truncated && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[#22C55E] hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  )
}

export default function DrugsPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<DrugInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<DrugInfo | null>(null)
  const [myDrugs, setMyDrugs] = useState<string[]>([])
  const [drugInput, setDrugInput] = useState("")
  const [source, setSource] = useState<string | null>(null)
  const [searchInitiated, setSearchInitiated] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = useCallback(async (q?: string) => {
    const searchTerm = (q || query).trim()
    if (!searchTerm) return
    setLoading(true)
    setSearchInitiated(true)
    setSelected(null)
    try {
      const data = await apiFetch(`/drugs/search?q=${encodeURIComponent(searchTerm)}`)
      setResults(data.drugs || [])
      setSource(data.source || null)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const selectDrug = (drug: DrugInfo) => {
    setSelected(drug)
    if (drug.generic_name && !myDrugs.includes(drug.generic_name)) {
      setMyDrugs((prev) => [...prev, drug.generic_name!])
    }
  }

  const addCustomDrug = () => {
    const name = drugInput.trim()
    if (name && !myDrugs.includes(name)) {
      setMyDrugs((prev) => [...prev, name])
      setDrugInput("")
    }
  }

  const removeDrug = (name: string) => {
    setMyDrugs((prev) => prev.filter((d) => d !== name))
  }

  const checkInteractions = () => {
    if (myDrugs.length >= 2) {
      setQuery(myDrugs.join(", "))
      handleSearch(myDrugs.join(" + "))
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-amber-500/20">
          <Pill className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#F9FAFB] mb-1">Drug Information & Interactions</h1>
        <p className="text-sm text-[#94A3B8] max-w-xl mx-auto">
          Search drug information, side effects, contraindications, and check for interactions between your medications.
        </p>
      </motion.div>

      {/* Drug Search */}
      <motion.div variants={itemVariants} className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by drug name, e.g. Metformin, Lisinopril, Atorvastatin..."
            className="w-full h-13 pl-12 pr-14 rounded-2xl bg-[#111827] border border-white/[0.08] text-[#F9FAFB] text-base outline-none transition-all focus:border-[#22C55E]/40 focus:ring-2 focus:ring-[#22C55E]/10 placeholder:text-[#94A3B8]/60"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-[#22C55E] text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </button>
        </div>
      </motion.div>

      {/* My Medications (Interaction Checker) */}
      <motion.div variants={itemVariants} className="max-w-2xl mx-auto">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-[#F9FAFB]">Interaction Checker</h3>
          </div>
          <p className="text-xs text-[#94A3B8] mb-3">
            Add medications to check for potential interactions.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {myDrugs.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                {name}
                <button onClick={() => removeDrug(name)} className="hover:text-red-400 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={drugInput}
              onChange={(e) => setDrugInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCustomDrug() }}
              placeholder="Add a medication..."
              className="flex-1 input-field text-xs h-9"
            />
            <button onClick={addCustomDrug} className="btn-secondary text-xs h-9">
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
            <button
              onClick={checkInteractions}
              disabled={myDrugs.length < 2}
              className="btn-primary text-xs h-9"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Check
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search Results */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 skeleton rounded-2xl" />
          <div className="h-48 skeleton rounded-2xl" />
        </div>
      )}

      {!loading && searchInitiated && results.length === 0 && (
        <motion.div variants={itemVariants} className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-amber-400/60 mx-auto mb-3" />
          <p className="text-sm text-[#94A3B8]">No drug information found for &quot;{query}&quot;</p>
          <p className="text-xs text-[#94A3B8]/60 mt-1">Try searching by generic name (e.g., Metformin) or brand name (e.g., Glucophage)</p>
        </motion.div>
      )}

      {/* Drug Detail */}
      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.generic_name || "detail"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Drug Header */}
            <div className="glass rounded-2xl p-6 glow-cyan">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-lg">
                  <Pill className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[#F9FAFB]">
                    {selected.brand_name || selected.generic_name}
                  </h2>
                  {selected.generic_name && selected.brand_name && (
                    <p className="text-sm text-[#94A3B8]">Generic: {selected.generic_name}</p>
                  )}
                  {selected.drug_class && (
                    <p className="text-xs text-[#94A3B8] mt-1">Class: {selected.drug_class}</p>
                  )}
                </div>
                {source && (
                  <span className={cn(
                    "badge",
                    source === "openfda" ? "badge-amber" : "badge-green"
                  )}>
                    {source === "openfda" ? "FDA Data" : "Local DB"}
                  </span>
                )}
              </div>
            </div>

            {/* Drug Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DrugSection
                title="Indications"
                content={selected.indications}
                icon={Heart}
                color="#22C55E"
              />
              <DrugSection
                title="Contraindications"
                content={selected.contraindications}
                icon={MinusCircle}
                color="#EF4444"
              />
              <DrugSection
                title="Side Effects"
                content={selected.side_effects}
                icon={AlertTriangle}
                color="#F59E0B"
              />
              <DrugSection
                title="Dosage Information"
                content={selected.dosage_info}
                icon={FlaskConical}
                color="#06B6D4"
              />
              {selected.pregnancy_category && (
                <DrugSection
                  title="Pregnancy Category"
                  content={selected.pregnancy_category}
                  icon={Heart}
                  color="#EC4899"
                />
              )}
            </div>

            {/* Interactions */}
            {selected.interactions && (
              <div className="glass rounded-2xl p-5 border-l-4" style={{ borderLeftColor: "#EF4444" }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h3 className="text-sm font-semibold text-[#F9FAFB]">Drug Interactions</h3>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed whitespace-pre-wrap">
                  {selected.interactions}
                </p>
              </div>
            )}

            {!selected.interactions && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-[#22C55E]" />
                  <p className="text-sm text-[#F9FAFB]">No specific interaction data available</p>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Always consult your healthcare provider or pharmacist about potential drug interactions.
                </p>
              </div>
            )}

            {/* Search Source Hint */}
            <p className="text-xs text-[#94A3B8]/50 text-center">
              Data sourced from {source === "openfda" ? "OpenFDA" : "local drug database"}.
              Always verify critical medication information with a healthcare professional.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial results list */}
      {!loading && results.length > 0 && !selected && (
        <motion.div variants={itemVariants} className="space-y-2">
          <p className="text-xs text-[#94A3B8] mb-2">
            Found {results.length} result{results.length > 1 ? "s" : ""}
            {source && <span> ({source === "openfda" ? "from OpenFDA" : "from local database"})</span>}
          </p>
          {results.map((drug, i) => (
            <motion.button
              key={drug.generic_name || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => selectDrug(drug)}
              className="w-full glass rounded-2xl p-4 text-left hover:border-white/[0.12] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-lg">
                  <Pill className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F9FAFB]">
                    {drug.brand_name || drug.generic_name}
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {drug.generic_name && drug.brand_name ? `Generic: ${drug.generic_name}` : drug.drug_class || "Drug"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {drug.score != null && (
                    <span className="text-xs text-[#94A3B8]">{(drug.score * 100).toFixed(0)}%</span>
                  )}
                  <ChevronRight className="h-4 w-4 text-[#94A3B8] group-hover:text-[#22C55E] transition-colors" />
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && !searchInitiated && (
        <motion.div variants={itemVariants} className="text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-7 w-7 text-[#94A3B8]/40" />
          </div>
          <h3 className="text-lg font-semibold text-[#F9FAFB] mb-2">Drug Information Database</h3>
          <p className="text-sm text-[#94A3B8] max-w-md mx-auto mb-6">
            Search for a medication to view detailed information including indications, side effects, contraindications, and drug interactions sourced from OpenFDA.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Metformin", "Lisinopril", "Atorvastatin", "Omeprazole", "Albuterol"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => { setQuery(suggestion); handleSearch(suggestion) }}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] text-[#94A3B8] hover:text-[#F9FAFB] transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
