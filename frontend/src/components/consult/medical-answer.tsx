"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface MedicalAnswerProps {
  title: string
  summary: string
  sections: { heading: string; content: string }[]
  references: string[]
  followUpQuestions: string[]
  sourcesUsed: string[]
  confidence: string
  patientMode: boolean
  onFollowUpClick: (question: string) => void
}

function Section({ heading, content, defaultOpen = true }: { heading: string; content: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-4 text-left group"
      >
        <span className="text-sm font-semibold text-[#F1F5F9] group-hover:text-[#0EA5A9] transition-colors">{heading}</span>
        <ChevronDown className={cn("h-4 w-4 text-[#64748B] transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="pb-5 text-sm text-[#D1D9E8] leading-relaxed prose prose-invert max-w-none">
              <MarkdownContent content={content} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let inList = false
  let listItems: React.ReactNode[] = []

  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inList && listItems.length > 0) {
        elements.push(<ul key={`ul-${i}`} className="list-disc pl-5 mb-3 space-y-1">{listItems}</ul>)
        listItems = []
        inList = false
      }
      return
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true
      listItems.push(<li key={`li-${i}`} className="text-sm text-[#D1D9E8]">{trimmed.slice(2)}</li>)
      return
    }

    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      elements.push(<p key={`p-${i}`} className="text-sm font-semibold text-[#F1F5F9] mb-2">{trimmed.replace(/\*\*/g, "")}</p>)
      return
    }

    // Simple markdown: bold and italic
    const rendered = trimmed
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#F1F5F9] font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-[#D1D9E8]">$1</em>')

    if (inList && listItems.length > 0) {
      elements.push(<ul key={`ul-${i}`} className="list-disc pl-5 mb-3 space-y-1">{listItems}</ul>)
      listItems = []
      inList = false
    }

    elements.push(
      <p key={`p-${i}`} className="text-sm text-[#D1D9E8] mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: rendered }} />
    )
  })

  if (inList && listItems.length > 0) {
    elements.push(<ul key="ul-final" className="list-disc pl-5 mb-3 space-y-1">{listItems}</ul>)
  }

  return <>{elements}</>
}

export function MedicalAnswer({
  title,
  summary,
  sections,
  references,
  followUpQuestions,
  sourcesUsed,
  confidence,
  patientMode,
  onFollowUpClick,
}: MedicalAnswerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Title */}
      <h2 className="text-xl font-bold text-[#F1F5F9] tracking-tight">{title}</h2>

      {/* Summary */}
      <p className="text-sm text-[#D1D9E8] leading-relaxed">{summary}</p>

      {/* Sections */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        {sections.map((s, i) => (
          <Section key={i} heading={s.heading} content={s.content} defaultOpen={i === 0} />
        ))}
      </div>

      {/* Sources */}
      {sourcesUsed && sourcesUsed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Sources Used</p>
          <div className="flex flex-wrap gap-1.5">
            {sourcesUsed.map((s) => {
              const colors: Record<string, string> = {
                "Goodman & Gilman": "bg-violet-500/10 border-violet-500/20 text-violet-400",
                "Harrison": "bg-blue-500/10 border-blue-500/20 text-blue-400",
                "Merck Manual": "bg-sky-500/10 border-sky-500/20 text-sky-400",
                "DailyMed": "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                "OpenFDA": "bg-amber-500/10 border-amber-500/20 text-amber-400",
                "RxNorm": "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
                "DrugBank": "bg-rose-500/10 border-rose-500/20 text-rose-400",
              }
              const style = Object.entries(colors).find(([k]) => s.includes(k) || k.includes(s))?.[1] || "bg-white/[0.04] border-white/[0.06] text-[#94A3B8]"
              return (
                <span key={s} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium", style)}>
                  {s}
                </span>
              )
            })}
          </div>
          <p className="text-[10px] text-[#64748B] mt-1">Generated by Sanjeevni AI</p>
        </div>
      )}

      {/* References */}
      {references && references.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">References</p>
          <div className="space-y-1.5">
            {references.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[10px] font-mono text-[#64748B] shrink-0 mt-0.5">{i + 1}.</span>
                <span className="text-xs text-[#94A3B8] leading-relaxed">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up questions */}
      {followUpQuestions && followUpQuestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">You may also want to ask</p>
          <div className="space-y-1.5">
            {followUpQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUpClick(q)}
                className="flex items-center gap-2 w-full text-left p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5A9]/60 shrink-0" />
                <span className="text-sm text-[#94A3B8] group-hover:text-[#F1F5F9] transition-colors">{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
