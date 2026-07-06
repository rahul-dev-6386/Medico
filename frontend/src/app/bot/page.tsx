"use client"

import { useState, useRef } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen, Send, Search, FlaskConical, Pill, Stethoscope,
  Loader2, FileText,
} from "lucide-react"

interface Result {
  text: string
  book: string
  chapter: string
  section: string
  page: string
  collection: string
  score: number
}

interface BotResponse {
  query: string
  total: number
  results: Result[]
}

const collectionIcons: Record<string, any> = {
  diseases: Stethoscope,
  laboratory: FlaskConical,
  pharmacology: Pill,
  clinical_practice: BookOpen,
}

const collectionColors: Record<string, string> = {
  diseases: "border-rose-500/30 bg-rose-500/10",
  laboratory: "border-violet-500/30 bg-violet-500/10",
  pharmacology: "border-blue-500/30 bg-blue-500/10",
  clinical_practice: "border-emerald-500/30 bg-emerald-500/10",
}

const collectionLabels: Record<string, string> = {
  diseases: "Diseases",
  laboratory: "Laboratory",
  pharmacology: "Pharmacology",
  clinical_practice: "Clinical Practice",
}

export default function BotPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<BotResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const data = await apiFetch("/bot/ask", {
        method: "POST",
        body: JSON.stringify({ query: query.trim(), top_k: 5 }),
      })
      setResponse(data)
      if (data.total === 0) setError("No results found. Try a different query.")
    } catch (err: any) {
      setError(err.message || "Search failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Offline Medical Bot</h1>
            <p className="text-sm text-muted-foreground">
              Ask any medical question — answers from 16,627 textbook chunks. No API keys, no internet.
            </p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. what is the treatment for hypertension?"
          className="flex-1 h-12 glass border-white/10"
        />
        <Button
          type="submit"
          disabled={loading || !query.trim()}
          className="h-12 px-6 gradient-primary text-white"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>

      {error && (
        <GlassCard className="p-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-400">{error}</p>
        </GlassCard>
      )}

      {response && response.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">
            Found {response.total} results for "{response.query}"
          </p>
          <AnimatePresence>
            {response.results.map((r, i) => {
              const Icon = collectionIcons[r.collection] || FileText
              const colorClass = collectionColors[r.collection] || "border-white/10 bg-white/5"
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <GlassCard className={`p-4 border ${colorClass}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-medium text-primary">
                            {collectionLabels[r.collection] || r.collection}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{r.book}</span>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none mb-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {r.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {!response && !error && !loading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-lg font-bold mb-2">Ask the Medical Library</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Query 16,627 chunks from 8 medical textbooks. Pure vector search + hybrid retrieval — no external calls.
          </p>
        </div>
      )}
    </div>
  )
}
