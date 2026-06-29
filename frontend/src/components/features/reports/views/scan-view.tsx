"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { motion } from "framer-motion"
import { Scan, User, AlertTriangle, Brain, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props { structured: any }

export function ScanView({ structured }: Props) {
  const patient = structured?.patient_info || {}
  const findings = structured?.findings || []
  const impression = structured?.impression || ""
  const bodyPart = structured?.body_part || ""
  const confidence = structured?.confidence || ""
  const recommendations = structured?.recommendations || []
  const diagnosis = structured?.diagnosis || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10"><Scan className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Body Part</p><p className="font-medium">{bodyPart || "Not specified"}</p></div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10"><User className="h-5 w-5 text-blue-400" /></div>
          <div><p className="text-xs text-muted-foreground">Patient</p><p className="font-medium">{patient.name || "N/A"}</p></div>
        </GlassCard>
        {confidence && (
          <GlassCard className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10"><Activity className="h-5 w-5 text-amber-400" /></div>
            <div><p className="text-xs text-muted-foreground">Confidence</p><p className="font-medium">{confidence}</p></div>
          </GlassCard>
        )}
      </div>

      {findings.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-amber-400" /> Findings</h3>
          <div className="space-y-2">
            {findings.map((f: string, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="p-3 rounded-xl bg-muted/30 text-sm text-muted-foreground">{f}</motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {impression && (
        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-2"><Brain className="h-4 w-4 text-primary" /> Impression</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{impression}</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {diagnosis.length > 0 && (
          <GlassCard>
            <h3 className="font-semibold text-sm mb-2">Detected Conditions</h3>
            <ul className="space-y-1">
              {diagnosis.map((d: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span> {d}
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
        {recommendations.length > 0 && (
          <GlassCard>
            <h3 className="font-semibold text-sm mb-2">Recommendations</h3>
            <ul className="space-y-1">
              {recommendations.map((r: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span> {r}
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
