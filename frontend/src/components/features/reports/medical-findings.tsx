"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MedicalFinding } from "./types"

const sectionIcons: Record<string, string> = {
  "Primary Conditions": "🫀",
  "Abnormal Findings": "⚠️",
  "Risk Factors": "🔴",
  "Recommended Actions": "✅",
  "Questions For Doctor": "❓",
  "Lifestyle Recommendations": "🏃",
}

export function MedicalFindings({ findings }: { findings: MedicalFinding[] }) {
  const [openSection, setOpenSection] = useState<string | null>(
    findings.length > 0 ? findings[0].section : null
  )

  return (
    <div className="space-y-2">
      {findings.map((section, i) => {
        const isOpen = openSection === section.section
        return (
          <motion.div
            key={section.section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard hover={false}>
              <button
                onClick={() => setOpenSection(isOpen ? null : section.section)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sectionIcons[section.section] || "📋"}</span>
                  <span className="text-sm font-semibold">{section.section}</span>
                  <span className="text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                    {section.items.length}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-1.5">
                      {section.items.map((item, j) => (
                        <div key={j} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20">
                          <span className="text-xs text-muted-foreground mt-0.5">{j + 1}.</span>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        )
      })}
    </div>
  )
}
