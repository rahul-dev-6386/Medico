"use client"

import { useState, useRef, useCallback } from "react"
import { apiFetch, cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Search, FileText, BookOpen,
  Loader2, ChevronDown, AlertCircle, Layers,
  X, ArrowRight,
} from "lucide-react"

interface SourceContext {
  content: string
  source: string
  title: string
  similarity: number
  report_id?: number
  report_type?: string
  report_date?: string
  collection?: string
}

interface SearchResponse {
  query: string
  contexts: SourceContext[]
  prioritization: string[]
  source_counts: Record<string, number>
  textbooks_used: string[]
}

const SOURCE_META: Record<string, { icon: any; label: string; badgeClass: string }> = {
  user_report_chunks: {
    icon: FileText,
    label: "Your Record",
    badgeClass: "medical-badge-blue",
  },
  textbook: {
    icon: BookOpen,
    label: "Reference",
    badgeClass: "medical-badge-teal",
  },
  textbook_library: {
    icon: BookOpen,
    label: "Reference",
    badgeClass: "medical-badge-teal",
  },
}

const SUGGESTIONS = [
  "What do my latest lab results mean?",
  "Summarize my health trends this month",
  "Compare my recent blood work to past results",
  "What biomarkers should I monitor?",
  "Check my medications against my conditions",
]

function SourceBadge({ source }: { source: string }) {
  const meta = SOURCE_META[source] || { icon: Layers, label: source, badgeClass: "medical-badge" }
  return (
    <span className={`${meta.badgeClass} inline-flex items-center gap-1`}>
      <meta.icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}

function ContextCard({ ctx }: { ctx: SourceContext }) {
  const [expanded, setExpanded] = useState(false)
  const meta = SOURCE_META[ctx.source] || { icon: Layers }

  return (
    <div className="clinical-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 text-left"
      >
        <meta.icon className="h-4 w-4 text-[#8B9BB5] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <SourceBadge source={ctx.source} />
            {ctx.report_type && (
              <span className="text-[10px] text-[#8B9BB5]/60">{ctx.report_type}</span>
            )}
            {ctx.report_date && (
              <span className="text-[10px] text-[#8B9BB5]/60">
                {new Date(ctx.report_date).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            )}
          </div>
          <p className="text-sm text-[#D1D9E8] leading-relaxed line-clamp-2">
            {ctx.content}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-[#8B9BB5]/40">
              Relevance {(ctx.similarity * 100).toFixed(0)}%
            </span>
            <ChevronDown className={cn(
              "h-3 w-3 text-[#8B9BB5]/40 transition-transform ml-auto",
              expanded && "rotate-180"
            )} />
          </div>
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-[#2B364A] clinical-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {ctx.content}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = useCallback(async (q?: string) => {
    const searchQuery = q ?? query
    if (!searchQuery.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setHasSearched(true)

    try {
      const data = await apiFetch("/rag/query", {
        method: "POST",
        body: JSON.stringify({ query: searchQuery.trim(), top_k_textbooks: 6, top_k_user: 5 }),
      })
      setResult(data)
    } catch (e: any) {
      setError(e.message || "Search failed")
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const userResults = result?.contexts.filter(c => c.source === "user_report_chunks") || []
  const textbookResults = result?.contexts.filter(c => c.source !== "user_report_chunks") || []
  const totalCount = result?.contexts.length || 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="space-y-8">
        {/* Section label — quiet, clinical */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#0EA5A9] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">S</span>
          </div>
          <span className="clinical-label">Smart Search</span>
        </div>

        {/* Health Lens — the signature element */}
        <div className={cn(
          "transition-all duration-700",
          hasSearched ? "mb-2" : "pt-[12vh] pb-4"
        )}>
          <div className={cn(
            "mx-auto transition-all duration-700",
            hasSearched ? "w-full" : "w-full max-w-2xl"
          )}>
            {!hasSearched && (
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-[#EDF2F7] mb-3 tracking-tight">
                  Illuminate your health data
                </h1>
                <p className="text-sm text-[#8B9BB5] max-w-md mx-auto leading-relaxed">
                  One search across your medical records and trusted clinical references.
                </p>
              </div>
            )}

            {/* The Lens */}
            <div className="relative group lens-breathe">
              <div className="relative flex items-center bg-[#181E2E] rounded-xl border border-[#2B364A] group-focus-within:border-[#0EA5A9]/40 group-focus-within:ring-2 group-focus-within:ring-[#0EA5A9]/15 transition-all overflow-hidden">
                <div className="pl-4 pr-3">
                  <Search className="h-4 w-4 text-[#0EA5A9]" />
                </div>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search your records and medical references..."
                  className="flex-1 bg-transparent h-12 text-sm text-[#EDF2F7] placeholder:text-[#8B9BB5]/40 outline-none"
                />
                <div className="flex items-center gap-1.5 pr-2">
                  {query && (
                    <button
                      onClick={() => { setQuery(""); setResult(null); setHasSearched(false) }}
                      className="p-1.5 rounded hover:bg-[#252F40] transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-[#8B9BB5]" />
                    </button>
                  )}
                  <button
                    onClick={() => handleSearch()}
                    disabled={loading || !query.trim()}
                    className="h-8 px-3 rounded-lg bg-[#0EA5A9] text-white text-xs font-medium flex items-center gap-1.5 hover:bg-[#0D9498] transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        Search
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Source hints */}
            {!hasSearched && (
              <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-[#8B9BB5]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Your medical records
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5A9]" />
                  Clinical references
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-3 w-24 skeleton" />
            <div className="h-20 skeleton" />
            <div className="h-20 skeleton" />
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* Summary bar */}
            <div className="flex items-center gap-4 text-xs text-[#8B9BB5] pb-2 border-b border-[#2B364A]">
              <span className="font-medium text-[#EDF2F7]">{totalCount} results</span>
              {userResults.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  {userResults.length} from your records
                </span>
              )}
              {textbookResults.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5A9]" />
                  {textbookResults.length} from references
                </span>
              )}
            </div>

            {/* Your Records */}
            {userResults.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-[#EDF2F7]">Your Records</span>
                  <span className="text-[10px] text-[#8B9BB5]">({userResults.length})</span>
                </div>
                <div className="space-y-2">
                  {userResults.map((ctx, i) => (
                    <ContextCard key={`user-${i}`} ctx={ctx} />
                  ))}
                </div>
              </section>
            )}

            {/* Clinical References */}
            {textbookResults.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-[#0EA5A9]" />
                  <span className="text-sm font-medium text-[#EDF2F7]">Clinical References</span>
                  <span className="text-[10px] text-[#8B9BB5]">({textbookResults.length})</span>
                </div>
                <div className="space-y-2">
                  {textbookResults.map((ctx, i) => (
                    <ContextCard key={`text-${i}`} ctx={ctx} />
                  ))}
                </div>
              </section>
            )}

            {/* Textbooks used */}
            {result.textbooks_used.length > 0 && (
              <div className="clinical-card !p-3">
                <div className="flex items-center gap-2 text-[10px] text-[#8B9BB5]">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>References:</span>
                  <div className="flex flex-wrap gap-1">
                    {result.textbooks_used.map((book, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#252F40] text-[#8B9BB5]">
                        {book}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Suggestions */}
        {!hasSearched && !loading && (
          <div className="text-center">
            <p className="clinical-label mb-3">Try searching</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setQuery(suggestion)
                    handleSearch(suggestion)
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#181E2E] border border-[#2B364A] text-[#8B9BB5] hover:text-[#EDF2F7] hover:border-[#3B4A63] transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
