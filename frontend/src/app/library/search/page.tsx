"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { apiFetch, cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  Search, BookOpen, FlaskConical, Pill, Stethoscope,
  Loader2, BookMarked, FileText, Sparkles, AlertCircle,
  Clock, Layers, BadgeCheck, ChevronDown, ChevronUp,
  ExternalLink, Copy, Check,
} from "lucide-react"

interface Source {
  book: string
  chapter: string
  section: string
  page: string
  text: string
  score: number
  collection?: string
}

interface Metrics {
  latency_ms: number
  collection_searched: string
  chunks_retrieved: number
  collections_used: string[]
  collection_breakdown: Record<string, number>
}

interface SearchResponse {
  query: string
  collection: string | null
  mode: string
  answer: string | null
  metrics?: Metrics
  sources: Source[]
}

const collectionFilters = [
  { value: "", label: "All Collections", icon: Search },
  { value: "diseases", label: "Diseases", icon: Stethoscope },
  { value: "laboratory", label: "Laboratory", icon: FlaskConical },
  { value: "pharmacology", label: "Pharmacology", icon: Pill },
  { value: "clinical_practice", label: "Clinical Practice", icon: BookOpen },
]

const collectionColors: Record<string, string> = {
  diseases: "from-rose-500 to-pink-600",
  laboratory: "from-violet-500 to-purple-600",
  pharmacology: "from-amber-500 to-orange-600",
  clinical_practice: "from-[#06B6D4] to-cyan-600",
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

export default function LibrarySearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get("q") || ""
  const initialCollection = searchParams.get("collection") || ""

  const [query, setQuery] = useState(initialQuery)
  const [collection, setCollection] = useState(initialCollection)
  const [mode, setMode] = useState<"search_with_ai" | "search_only">("search_with_ai")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery, initialCollection)
    }
  }, [])

  const toggleExpand = (index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleSearch = useCallback(async (q?: string, coll?: string) => {
    const searchQuery = q ?? query
    const searchCollection = coll ?? collection
    if (!searchQuery.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setExpandedCards(new Set())

    try {
      const params = new URLSearchParams({ q: searchQuery.trim(), top_k: "5", mode })
      if (searchCollection) params.set("collection", searchCollection)
      const data = await apiFetch(`/library/search?${params}`)
      setResult(data)
      router.replace(`/library/search?q=${encodeURIComponent(searchQuery.trim())}${searchCollection ? `&collection=${searchCollection}` : ""}`, { scroll: false })
    } catch (e: any) {
      setError(e.message || "Search failed")
    } finally {
      setLoading(false)
    }
  }, [query, collection, mode, router])

  const copyText = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(index)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const activeFilter = collectionFilters.find(f => f.value === collection)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-1">
          {activeFilter && activeFilter.value ? (
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${collectionColors[collection] || "from-[#22C55E] to-emerald-500"} flex items-center justify-center`}>
              <activeFilter.icon className="h-4 w-4 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22C55E] to-emerald-500 flex items-center justify-center">
              <Search className="h-4 w-4 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-[#F9FAFB]">
            {activeFilter?.value
              ? `${activeFilter.label} Search`
              : "Medical Library Search"}
          </h1>
        </div>
        <p className="text-sm text-[#94A3B8] ml-11">
          Search across 8 medical textbooks for evidence-based answers
        </p>
      </motion.div>

      {/* Search Bar + Filters */}
      <motion.div variants={itemVariants} className="glass rounded-2xl p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search diseases, symptoms, treatments, medications..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-[#F9FAFB] placeholder:text-[#94A3B8]/60 outline-none transition-all focus:border-[#22C55E]/40 focus:ring-2 focus:ring-[#22C55E]/10"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="btn-primary h-11"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {collectionFilters.map((f) => {
            const Icon = f.icon
            const isActive = collection === f.value
            return (
              <button
                key={f.value}
                onClick={() => setCollection(f.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  isActive
                    ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20"
                    : "bg-white/[0.04] text-[#94A3B8] hover:text-[#F9FAFB] border border-white/[0.06]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            )
          })}
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setMode("search_with_ai")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                mode === "search_with_ai"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-white/[0.04] text-[#94A3B8] hover:text-[#F9FAFB] border border-white/[0.06]"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Summary
            </button>
            <button
              onClick={() => setMode("search_only")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                mode === "search_only"
                  ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20"
                  : "bg-white/[0.04] text-[#94A3B8] hover:text-[#F9FAFB] border border-white/[0.06]"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              Search Only
            </button>
          </div>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div variants={itemVariants} className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 skeleton rounded-2xl" />
          ))}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* AI Answer */}
          {result.answer && (
            <div className="glass rounded-2xl p-6 space-y-3 glow-green">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#22C55E]" />
                <h2 className="text-sm font-semibold text-[#F9FAFB]">AI-Generated Answer</h2>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-[#94A3B8]">
                {result.answer}
              </div>
            </div>
          )}

          {result.answer === null && result.mode === "ai_failed" && (
            <div className="glass rounded-2xl p-4">
              <p className="text-sm text-[#94A3B8]">
                AI summarization unavailable. Showing raw retrieval results below.
              </p>
            </div>
          )}

          {/* Sources */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#F9FAFB] flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-[#22C55E]" />
                Sources ({result.sources.length})
              </h2>
              {result.metrics && (
                <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {result.metrics.latency_ms}ms
                  </span>
                  {result.metrics.collections_used.length > 1 && (
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {result.metrics.collections_used.join(", ")}
                    </span>
                  )}
                </div>
              )}
            </div>

            {result.metrics && result.metrics.collections_used.length > 1 && (
              <div className="flex items-center gap-2 mb-3 text-xs">
                <span className="text-[#94A3B8]">Collection breakdown:</span>
                {Object.entries(result.metrics.collection_breakdown).map(([coll, count]) => (
                  <span key={coll} className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                    coll === "diseases" ? "bg-rose-500/10 text-rose-400" :
                    coll === "laboratory" ? "bg-violet-500/10 text-violet-400" :
                    coll === "pharmacology" ? "bg-amber-500/10 text-amber-400" :
                    coll === "clinical_practice" ? "bg-[#06B6D4]/10 text-[#06B6D4]" :
                    "bg-white/[0.04] text-[#94A3B8]"
                  )}>
                    {coll}: {count}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {result.sources.map((source, i) => {
                const isExpanded = expandedCards.has(i)
                const truncated = source.text.length > 300
                const col = source.collection || "diseases"
                const color = collectionColors[col] || "from-[#22C55E] to-emerald-500"
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass rounded-2xl p-4 space-y-2 hover:border-white/[0.12] transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-1.5 h-full min-h-[3rem] rounded-full bg-gradient-to-b ${color} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-[#94A3B8] mb-1">
                          <BadgeCheck className="h-3 w-3 text-[#22C55E]" />
                          <span className="font-medium text-[#F9FAFB]">
                            {source.score.toFixed(3)}
                          </span>
                          {source.collection && (
                            <>
                              <span className="text-[#94A3B8]/40">|</span>
                              <span className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                                col === "diseases" ? "bg-rose-500/10 text-rose-400" :
                                col === "laboratory" ? "bg-violet-500/10 text-violet-400" :
                                col === "pharmacology" ? "bg-amber-500/10 text-amber-400" :
                                col === "clinical_practice" ? "bg-[#06B6D4]/10 text-[#06B6D4]" :
                                "bg-white/[0.04] text-[#94A3B8]"
                              )}>
                                {source.collection}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-[#94A3B8]">
                          {isExpanded || !truncated
                            ? source.text
                            : source.text.slice(0, 300) + "..."}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {truncated && (
                            <button
                              onClick={() => toggleExpand(i)}
                              className="text-xs text-[#22C55E] hover:underline inline-flex items-center gap-0.5"
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isExpanded ? "Show less" : "Show more"}
                            </button>
                          )}
                          <button
                            onClick={() => copyText(source.text, i)}
                            className="text-xs text-[#94A3B8] hover:text-[#22C55E] transition-colors inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100"
                          >
                            {copiedId === i ? <Check className="h-3 w-3 text-[#22C55E]" /> : <Copy className="h-3 w-3" />}
                            {copiedId === i ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#94A3B8]/60">
                          {source.book && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {source.book}
                            </span>
                          )}
                          {source.chapter && <span>Ch: {source.chapter}</span>}
                          {source.section && <span>Sec: {source.section}</span>}
                          {source.page && <span>Pg: {source.page}</span>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!result && !loading && !error && !initialQuery && (
        <motion.div variants={itemVariants} className="empty-state">
          <div className="empty-state-icon">
            <Search className="h-8 w-8 text-[#94A3B8]/40" />
          </div>
          <h3 className="empty-state-title">Search the Medical Library</h3>
          <p className="empty-state-text">
            Enter a query above to search across 8 medical textbooks covering diseases, laboratory values, pharmacology, and clinical practice.
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {[
              "Type 2 diabetes treatment",
              "ACE inhibitors mechanism",
              "Liver function tests",
              "Heart failure management",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion)
                  handleSearch(suggestion)
                }}
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
