"use client"

import { motion } from "framer-motion"
import { Heart, Bug, FlaskRound, Wind, Flame, Stethoscope, type LucideIcon } from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  cardiovascular: Heart,
  antibiotics: Bug,
  endocrine: FlaskRound,
  respiratory: Wind,
  "pain-inflammation": Flame,
  "gi-hepatology": Stethoscope,
}

const colorMap: Record<string, string> = {
  cardiovascular: "text-rose-400 bg-rose-500/10",
  antibiotics: "text-blue-400 bg-blue-500/10",
  endocrine: "text-amber-400 bg-amber-500/10",
  respiratory: "text-cyan-400 bg-cyan-500/10",
  "pain-inflammation": "text-orange-400 bg-orange-500/10",
  "gi-hepatology": "text-[#0EA5A9] bg-[#0EA5A9]/10",
}

interface CategoryCardProps {
  id: string
  name: string
  count: string
  index: number
  onClick?: () => void
}

export default function CategoryCard({ id, name, count, index, onClick }: CategoryCardProps) {
  const Icon = iconMap[id] || Heart
  const colors = colorMap[id] || "text-slate-400 bg-slate-500/10"

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(14,165,169,0.12)" }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-6 text-center transition-all hover:border-[#0EA5A9]/30 hover:bg-[#0EA5A9]/[0.04] hover:shadow-lg hover:shadow-[#0EA5A9]/5"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${colors}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#EDF2F7]">{name}</p>
        <p className="mt-0.5 text-xs text-[#8B9BB5]">{count} drugs</p>
      </div>
    </motion.button>
  )
}
