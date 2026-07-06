"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, ShieldCheck } from "lucide-react"

interface PopularDrugCardProps {
  name: string
  drugClass: string
  index: number
  onClick?: () => void
}

export default function PopularDrugCard({ name, drugClass, index, onClick }: PopularDrugCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(14,165,169,0.08)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition-all hover:border-[#0EA5A9]/30 hover:bg-[#0EA5A9]/[0.04] hover:shadow-lg hover:shadow-[#0EA5A9]/5"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#EDF2F7]">{name}</p>
          <ShieldCheck size={13} className="text-[#0EA5A9]" />
        </div>
        <p className="mt-0.5 text-xs text-[#8B9BB5]">{drugClass}</p>
      </div>
      <ArrowUpRight
        size={16}
        className="shrink-0 text-[#5A6B87] transition-colors group-hover:text-[#0EA5A9]"
      />
    </motion.button>
  )
}
