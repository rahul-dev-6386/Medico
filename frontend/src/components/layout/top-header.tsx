"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Bell,
  Command,
  MessageSquare,
  Activity,
  Pill,
  FileText,
  BookOpen,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

const quickLinks = [
  { href: "/chat", label: "Open AI Chat", icon: MessageSquare, desc: "Ask anything about your health" },
  { href: "/dashboard", label: "View Dashboard", icon: Activity, desc: "Your health overview" },
  { href: "/medications", label: "Check Medications", icon: Pill, desc: "Your medication schedule" },
  { href: "/reports", label: "Upload Report", icon: FileText, desc: "Analyze a medical report" },
  { href: "/library", label: "Search Library", icon: BookOpen, desc: "Browse medical knowledge" },
]

export function TopHeader() {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications] = useState(true)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === "Escape") {
        setSearchOpen(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    if (searchOpen) {
      document.addEventListener("mousedown", handler)
    }
    return () => document.removeEventListener("mousedown", handler)
  }, [searchOpen])

  const filteredLinks = quickLinks.filter(
    (l) => l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.desc.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <header className="h-16 flex items-center justify-end px-6 border-b border-[#2B364A] bg-[#0B0F1A]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-[#94A3B8] hover:text-[#F9FAFB] hover:bg-white/[0.06] transition-all w-48"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span>Search...</span>
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[#94A3B8] flex items-center gap-0.5">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <button className="btn-icon relative" title="Notifications">
            <Bell className="h-5 w-5" />
            {notifications && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#22C55E] ring-2 ring-[#090B10]" />
            )}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
          >
            <motion.div
              ref={searchRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="w-full max-w-lg bg-[#111827] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <Search className="h-4 w-4 text-[#94A3B8] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search pages, actions, and more..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-[#F9FAFB] outline-none placeholder:text-[#94A3B8]/60"
                />
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[#94A3B8]">ESC</kbd>
              </div>
              <div className="p-2 max-h-64 overflow-y-auto">
                {filteredLinks.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[#94A3B8]">
                    No results found
                  </div>
                ) : (
                  filteredLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => {
                        setSearchOpen(false)
                        router.push(link.href)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover:bg-[#22C55E]/10 transition-colors">
                        <link.icon className="h-4 w-4 text-[#94A3B8] group-hover:text-[#22C55E] transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F9FAFB]">{link.label}</p>
                        <p className="text-xs text-[#94A3B8]">{link.desc}</p>
                      </div>
                      <Bot className="h-3.5 w-3.5 text-[#22C55E] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
