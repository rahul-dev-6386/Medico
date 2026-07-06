"use client"

import { useState } from "react"
import { Copy, Bookmark, Share2, Check, ArrowLeftRight, AlertTriangle, Sparkles, ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickActionsProps {
  onCompare?: () => void
  onCheckInteractions?: () => void
  onExplainSimply?: () => void
  onSummarize?: () => void
  content?: string
}

export function QuickActions({ onCompare, onCheckInteractions, onExplainSimply, onSummarize, content }: QuickActionsProps) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleCopy = async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* */ }
  }

  const handleSave = () => {
    setSaved(!saved)
  }

  const actions = [
    { icon: onCompare ? ArrowLeftRight : undefined, label: "Compare", onClick: onCompare },
    { icon: onCheckInteractions ? AlertTriangle : undefined, label: "Interactions", onClick: onCheckInteractions },
    { icon: onExplainSimply ? Sparkles : undefined, label: "Explain Simply", onClick: onExplainSimply },
    { icon: onSummarize ? ListChecks : undefined, label: "Summarize", onClick: onSummarize },
    { icon: Copy, label: copied ? "Copied!" : "Copy", onClick: handleCopy, active: copied },
    { icon: Bookmark, label: saved ? "Saved" : "Save", onClick: handleSave, active: saved },
    { icon: Share2, label: "Share", onClick: () => {} },
  ].filter((a) => a.icon)

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((a) => {
        const Icon = a.icon as React.ElementType
        return (
          <button
            key={a.label}
            onClick={a.onClick}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200",
              a.active
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-white/[0.03] border-white/[0.08] text-[#64748B] hover:bg-white/[0.06] hover:border-white/[0.15] hover:text-[#F1F5F9]",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {a.label}
          </button>
        )
      })}
    </div>
  )
}
