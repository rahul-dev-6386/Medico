"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  BookOpen, Search, ChevronRight, Sparkles,
  Heart, FlaskRound, Pill, Stethoscope,
  ArrowRight, TrendingUp, Clock, FileText,
} from "lucide-react"

const collectionMeta: Record<string, { icon: any; color: string; desc: string }> = {
  diseases: { icon: Heart, color: "from-rose-500 to-pink-600", desc: "Disease knowledge & pathophysiology" },
  laboratory: { icon: FlaskRound, color: "from-violet-500 to-purple-600", desc: "Lab values & diagnostic tests" },
  pharmacology: { icon: Pill, color: "from-amber-500 to-orange-600", desc: "Drug information & therapeutics" },
  clinical_practice: { icon: Stethoscope, color: "from-[#06B6D4] to-cyan-600", desc: "Clinical guidelines & practice" },
}

const topics = [
  { name: "Diabetes Mellitus", count: 340, icon: "blood-glucose" },
  { name: "Hypertension", count: 280, icon: "heart" },
  { name: "Cardiovascular Disease", count: 420, icon: "heart-pulse" },
  { name: "Infectious Diseases", count: 510, icon: "virus" },
  { name: "Respiratory Disorders", count: 190, icon: "lung" },
  { name: "Endocrinology", count: 260, icon: "gland" },
  { name: "Gastroenterology", count: 230, icon: "stomach" },
  { name: "Neurology", count: 180, icon: "brain" },
]

const popularSearches = [
  "Type 2 diabetes treatment guidelines",
  "ACE inhibitor mechanism of action",
  "Liver function test interpretation",
  " Antibiotic spectrum of activity",
  "Heart failure management 2025",
  "Chronic kidney disease staging",
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

export default function LibraryPage() {
  const router = useRouter()
  const [collections, setCollections] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [recentSearches] = useState<string[]>([])

  useEffect(() => {
    apiFetch("/library/sources").then((data: any) => {
      if (data?.collections) {
        const map: Record<string, number> = {}
        data.collections.forEach((c: any) => { map[c.name] = c.chunk_count })
        setCollections(map)
      }
    }).catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/library/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const totalChunks = Object.values(collections).reduce((a, b) => a + b, 0)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 max-w-7xl mx-auto space-y-8"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22C55E] to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-[#22C55E]/20">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-[#F9FAFB] mb-2">Medical Library</h1>
        <p className="text-[#94A3B8] max-w-xl mx-auto">
          Search across {totalChunks.toLocaleString()} medical textbook excerpts from Harrison&apos;s, Merck Manual, Oxford Handbook, and more.
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants}>
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search diseases, medications, lab values, treatments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[#111827] border border-white/[0.08] text-[#F9FAFB] text-base outline-none transition-all focus:border-[#22C55E]/40 focus:ring-2 focus:ring-[#22C55E]/10 placeholder:text-[#94A3B8]/60"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-[#22C55E] text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </motion.div>

      {/* Collections Grid */}
      <motion.div variants={itemVariants}>
        <h2 className="section-title">Browse by Collection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(collectionMeta).map(([key, meta]) => {
            const count = collections[key] || 0
            return (
              <motion.button
                key={key}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/library/books?collection=${key}`)}
                className="glass rounded-2xl p-5 text-left hover:border-white/[0.12] transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center mb-3 shadow-lg`}>
                  <meta.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-[#F9FAFB] mb-1 capitalize">
                  {key.replace("_", " ")}
                </h3>
                <p className="text-xs text-[#94A3B8] mb-3">{meta.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8]">{count.toLocaleString()} excerpts</span>
                  <ArrowRight className="h-4 w-4 text-[#22C55E] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Two Column: Recent + Popular */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Topics */}
        <motion.div variants={itemVariants}>
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#F9FAFB] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#06B6D4]" />
                Popular Topics
              </h3>
              <button onClick={() => router.push("/library/topics")} className="btn-ghost text-xs">
                View All <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-1">
              {topics.map((topic, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/library/search?q=${encodeURIComponent(topic.name)}`)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-[#94A3B8] group-hover:text-[#22C55E] transition-colors" />
                    <span className="text-sm text-[#94A3B8] group-hover:text-[#F9FAFB] transition-colors">{topic.name}</span>
                  </div>
                  <span className="text-xs text-[#94A3B8]/60">{topic.count}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Popular Searches */}
        <motion.div variants={itemVariants}>
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#F9FAFB] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#22C55E]" />
                Popular Searches
              </h3>
            </div>
            <div className="space-y-1">
              {popularSearches.map((search, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/library/search?q=${encodeURIComponent(search)}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
                >
                  <Search className="h-4 w-4 text-[#94A3B8] group-hover:text-[#22C55E] transition-colors shrink-0" />
                  <span className="text-sm text-[#94A3B8] group-hover:text-[#F9FAFB] transition-colors text-left">{search}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      {recentSearches.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#F9FAFB] flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-[#94A3B8]" />
              Recent Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((s, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/library/search?q=${encodeURIComponent(s)}`)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] text-[#94A3B8] hover:text-[#F9FAFB] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
