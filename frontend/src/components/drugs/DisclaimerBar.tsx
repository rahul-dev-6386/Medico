"use client"

import { Info, ChevronDown } from "lucide-react"
import { useState } from "react"

export default function DisclaimerBar() {
  const [showSources, setShowSources] = useState(false)

  return (
    <div className="sticky bottom-0 z-30 border-t border-white/[0.06] bg-[#0D1117]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2 text-xs text-[#8B9BB5]">
          <Info size={14} className="shrink-0 text-[#5A6B87]" />
          <span>
            AI-generated content can make mistakes. Always consult a healthcare professional
            before making any medical decisions.
          </span>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-[#8B9BB5] transition-all hover:border-white/[0.12] hover:text-[#EDF2F7]"
          >
            Sources
            <ChevronDown size={12} className={`transition-transform ${showSources ? "rotate-180" : ""}`} />
          </button>
          {showSources && (
            <div className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-white/[0.08] bg-[#1A1F2E] p-3 shadow-xl">
              <p className="text-[11px] font-medium text-[#EDF2F7]">Data Sources</p>
              <ul className="mt-1.5 space-y-1">
                {["FDA Label Database", "PubMed Central", "DrugBank", "OpenFDA"].map((src) => (
                  <li key={src} className="flex items-center gap-2 text-[10px] text-[#8B9BB5]">
                    <div className="h-1 w-1 rounded-full bg-[#0EA5A9]" />
                    {src}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
