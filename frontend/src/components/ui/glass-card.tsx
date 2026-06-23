"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: "primary" | "secondary" | "none"
  onClick?: () => void
}

export function GlassCard({ children, className, hover = true, glow = "none", onClick }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "glass rounded-2xl p-5",
        hover && "glass-hover cursor-pointer",
        glow === "primary" && "glow",
        glow === "secondary" && "glow-secondary",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
    >
      {children}
    </motion.div>
  )
}
