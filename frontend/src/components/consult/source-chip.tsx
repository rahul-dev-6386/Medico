"use client"

import { BookOpen, ExternalLink } from "lucide-react"

const SOURCE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Goodman & Gilman": { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400" },
  "Harrison": { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  "Merck Manual": { bg: "bg-sky-500/10", border: "border-sky-500/20", text: "text-sky-400" },
  "DailyMed": { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
  "OpenFDA": { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
  "RxNorm": { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400" },
  "DrugBank": { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400" },
  "WHO Guideline": { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-400" },
  "ADA Guideline": { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400" },
}

function getSourceStyle(source: string) {
  for (const [key, val] of Object.entries(SOURCE_COLORS)) {
    if (source.includes(key) || key.includes(source)) return val
  }
  return { bg: "bg-white/[0.04]", border: "border-white/[0.06]", text: "text-[#94A3B8]" }
}

export function SourceChip({ name }: { name: string }) {
  const style = getSourceStyle(name)
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors hover:brightness-125",
      style.bg, style.border, style.text,
    )}>
      <BookOpen className="h-3 w-3" />
      {name}
    </span>
  )
}

export function SourceList({ sources }: { sources: string[] }) {
  if (!sources || sources.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Sources Used</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <SourceChip key={s} name={s} />
        ))}
      </div>
    </div>
  )
}

export function ReferenceCard({ reference }: { reference: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <ExternalLink className="h-3.5 w-3.5 text-[#0EA5A9] shrink-0 mt-0.5" />
      <span className="text-xs text-[#94A3B8] leading-relaxed">{reference}</span>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}
