"use client"

import { motion } from "framer-motion"
import { Pill, Sparkles } from "lucide-react"

const quickSearches = [
  "Metformin", "Amoxicillin", "Lisinopril",
  "Ibuprofen", "Omeprazole",
]

interface HeroCardProps {
  onSearch?: (term: string) => void
}

export default function HeroCard({ onSearch }: HeroCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#0EA5A9]/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-teal-500/5 blur-3xl" />
        <div className="absolute left-1/4 right-1/4 top-0 h-px bg-gradient-to-r from-transparent via-[#0EA5A9]/20 to-transparent" />
        <div className="absolute bottom-0 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      <div className="relative flex flex-col items-center gap-5 px-8 py-12 text-center sm:py-16">
        <div className="relative">
          <div className="absolute -inset-2 rounded-full bg-[#0EA5A9]/10 blur-lg" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0EA5A9]/20 to-[#0EA5A9]/5 shadow-lg shadow-[#0EA5A9]/5">
            <Pill size={30} className="text-[#0EA5A9]" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-[#EDF2F7] lg:text-5xl">
            Drug Information
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-[#8B9BB5] lg:text-base">
            Evidence-based medication information powered by verified medical references.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="flex items-center gap-1 text-xs text-[#8B9BB5]/60">
            <Sparkles size={12} /> Quick access:
          </span>
          {quickSearches.map((term) => (
            <motion.button
              key={term}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSearch?.(term)}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-[#8B9BB5] transition-all hover:border-[#0EA5A9]/30 hover:bg-[#0EA5A9]/[0.04] hover:text-[#EDF2F7]"
            >
              {term}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
