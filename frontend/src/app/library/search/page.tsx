"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { apiFetch, cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, BookOpen, Sparkles, Loader2, ChevronDown,
  ChevronRight, X, Check, AlertCircle,
} from "lucide-react"

interface Source {
  book: string
  text: string
}

interface SearchResponse {
  query: string
  answer: string | null
  mode: string
  references: string[]
  sources: Source[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

const RELATED_TOPICS = [
  "Liver function tests interpretation",
  "Hepatitis diagnosis",
  "Jaundice workup",
  "Elevated liver enzymes causes",
  "Hepatic panel components",
]

export default function LibrarySearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [selectedRef, setSelectedRef] = useState<Source | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery)
    }
  }, [])

  const handleSearch = useCallback(async (q?: string) => {
    const searchQuery = q ?? query
    if (!searchQuery.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setEvidenceOpen(false)
    setSelectedRef(null)

    try {
      const params = new URLSearchParams({ q: searchQuery.trim(), top_k: "5", mode: "search_with_ai" })
      const data = await apiFetch(`/library/search?${params}`)
      setResult(data)
      router.replace(`/library/search?q=${encodeURIComponent(searchQuery.trim())}`, { scroll: false })
    } catch (e: any) {
      setError(e.message || "Search failed")
    } finally {
      setLoading(false)
    }
  }, [query, router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const uniqueBooks = result?.references?.length
    ? result.references
    : result?.sources
      ? Array.from(new Set(result.sources.map((s) => s.book).filter(Boolean)))
      : []

  const hasResults = result && !loading

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] px-6 md:px-10 lg:px-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Search Bar */}
          <motion.div
            variants={itemVariants}
            className={cn(
              "transition-all duration-500 w-full",
              hasResults
                ? "pt-6 pb-0"
                : "pt-[15vh] md:pt-[20vh] pb-4",
            )}
          >
            <div className={cn(
              "mx-auto transition-all duration-500",
              hasResults ? "w-full" : "w-full max-w-3xl",
            )}>
              {!hasResults && (
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#22C55E] to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#22C55E]/20">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-[#F9FAFB] mb-2">Medical Library</h1>
                  <p className="text-sm text-[#94A3B8]">
                    Ask a medical question. Get answers from 8 textbooks.
                  </p>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a medical question..."
                  className="w-full h-12 pl-10 pr-12 rounded-xl bg-[#111827] border border-white/[0.08] text-sm text-[#F9FAFB] placeholder:text-[#94A3B8]/50 outline-none transition-all focus:border-[#22C55E]/40 focus:ring-2 focus:ring-[#22C55E]/10"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={loading || !query.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#22C55E] hover:bg-[#22C55E]/90 disabled:opacity-40 flex items-center justify-center transition-all"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-white" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div variants={itemVariants} className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-3xl">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <motion.div variants={itemVariants} className="space-y-4 animate-pulse w-full max-w-4xl">
              <div className="h-5 w-1/4 skeleton rounded-lg" />
              <div className="h-4 w-full skeleton rounded-lg" />
              <div className="h-4 w-5/6 skeleton rounded-lg" />
              <div className="h-4 w-3/4 skeleton rounded-lg" />
              <div className="h-4 w-full skeleton rounded-lg" />
              <div className="h-4 w-2/3 skeleton rounded-lg" />
              <div className="h-4 w-4/5 skeleton rounded-lg" />
              <div className="h-4 w-full skeleton rounded-lg" />
            </motion.div>
          )}

          {/* Results */}
          {result && !loading && (
            <motion.div variants={itemVariants} className="mt-6 space-y-8">
              {/* Question */}
              <div className="flex items-start gap-4 w-full max-w-4xl">
                <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-[#22C55E]">Q</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#94A3B8] mb-1.5 font-medium uppercase tracking-wider">Question</p>
                  <p className="text-xl font-semibold text-[#F9FAFB] leading-relaxed">
                    {result.query}
                  </p>
                </div>
              </div>

              {/* AI Answer */}
              {result.answer ? (
                <div className="flex items-start gap-4 w-full max-w-[90%] 2xl:max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#94A3B8] mb-2 font-medium uppercase tracking-wider">Answer</p>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.answer}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : result.mode === "ai_failed" ? (
                <div className="flex items-start gap-4 w-full max-w-4xl">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  </div>
                  <p className="text-sm text-[#94A3B8] py-2">
                    Could not generate an AI answer at this time.
                  </p>
                </div>
              ) : null}

              {/* Divider */}
              {result.sources.length > 0 && (
                <hr className="border-white/[0.06] w-full max-w-[90%] 2xl:max-w-[85%]" />
              )}

              {/* Evidence Used */}
              {result.sources.length > 0 && (
                <div className="w-full max-w-[90%] 2xl:max-w-[85%]">
                  <button
                    onClick={() => setEvidenceOpen(!evidenceOpen)}
                    className="flex items-center gap-2 text-sm text-[#94A3B8] hover:text-[#F9FAFB] transition-colors w-full text-left"
                  >
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      evidenceOpen ? "rotate-0" : "-rotate-90",
                    )} />
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>Evidence Used</span>
                    <span className="text-xs text-[#94A3B8]/50">({uniqueBooks.length} references)</span>
                  </button>

                  <AnimatePresence>
                    {evidenceOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-1 pl-6">
                          {uniqueBooks.map((book, i) => {
                            const sourcesForBook = result.sources.filter((s) => s.book === book)
                            return (
                              <button
                                key={i}
                                onClick={() => setSelectedRef(sourcesForBook[0])}
                                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
                              >
                                <Check className="h-3.5 w-3.5 text-[#22C55E] shrink-0" />
                                <span className="text-sm text-[#94A3B8] group-hover:text-[#F9FAFB] transition-colors">
                                  {book}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Related Topics */}
              <hr className="border-white/[0.06] w-full max-w-[90%] 2xl:max-w-[85%]" />
              <div className="w-full max-w-[90%] 2xl:max-w-[85%]">
                <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider mb-3">Related</p>
                <div className="flex flex-wrap gap-2">
                  {RELATED_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => {
                        setQuery(topic)
                        handleSearch(topic)
                      }}
                      className="text-sm px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[#94A3B8] hover:text-[#F9FAFB] transition-all"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Empty State — suggestion chips */}
          {!result && !loading && !error && !initialQuery && (
            <motion.div variants={itemVariants} className="text-center pt-8">
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {[
                  "What are the causes of elevated liver enzymes?",
                  "How is type 2 diabetes managed?",
                  "Explain ACE inhibitor mechanism",
                  "Diagnostic criteria for heart failure",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setQuery(suggestion)
                      handleSearch(suggestion)
                    }}
                    className="text-sm px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] text-[#94A3B8] hover:text-[#F9FAFB] transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Side Panel — reference detail */}
      <AnimatePresence>
        {selectedRef && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRef(null)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-[#090B10] border-l border-white/[0.06] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-[#F9FAFB]">Reference</h3>
                  <button
                    onClick={() => setSelectedRef(null)}
                    className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4 text-[#94A3B8]" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider mb-2">Source</p>
                    <div className="flex items-center gap-2 text-sm text-[#F9FAFB]">
                      <BookOpen className="h-4 w-4 text-[#22C55E] shrink-0" />
                      {selectedRef.book}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[#94A3B8] font-medium uppercase tracking-wider mb-2">Excerpt</p>
                    <div className="glass rounded-xl p-4 prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedRef.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
