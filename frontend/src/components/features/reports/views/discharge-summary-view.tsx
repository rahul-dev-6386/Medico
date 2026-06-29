"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { motion } from "framer-motion"
import { Calendar, Building2, Heart, Stethoscope, Pill, ArrowRight } from "lucide-react"

interface Props { structured: any }

export function DischargeSummaryView({ structured }: Props) {
  const patient = structured?.patient_info || {}
  const diagnoses = structured?.diagnosis || []
  const procedures = structured?.procedures || []
  const medications = structured?.medications || []
  const followUpPlan = structured?.follow_up_plan || ""
  const recommendations = structured?.recommendations || []
  const admissionDate = structured?.admission_date || ""
  const dischargeDate = structured?.discharge_date || ""

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {admissionDate && (
          <GlassCard className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10"><Calendar className="h-5 w-5 text-red-400" /></div>
            <div><p className="text-xs text-muted-foreground">Admission</p><p className="font-medium">{admissionDate}</p></div>
          </GlassCard>
        )}
        {dischargeDate && (
          <GlassCard className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10"><Calendar className="h-5 w-5 text-emerald-400" /></div>
            <div><p className="text-xs text-muted-foreground">Discharge</p><p className="font-medium">{dischargeDate}</p></div>
          </GlassCard>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {diagnoses.length > 0 && (
          <GlassCard>
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Heart className="h-4 w-4 text-red-400" /> Diagnoses</h3>
            <ul className="space-y-1">
              {diagnoses.map((d: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-red-400 mt-0.5">•</span> {d}</li>
              ))}
            </ul>
          </GlassCard>
        )}
        {procedures.length > 0 && (
          <GlassCard>
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Stethoscope className="h-4 w-4 text-blue-400" /> Procedures</h3>
            <ul className="space-y-1">
              {procedures.map((p: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> {p}</li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>

      {medications.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Pill className="h-4 w-4 text-purple-400" /> Discharge Medications</h3>
          <div className="space-y-2">
            {medications.map((med: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div><p className="text-sm font-medium">{med.name}</p><p className="text-xs text-muted-foreground">{med.dosage}</p></div>
                <span className="text-xs text-primary font-mono">{med.frequency}</span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {followUpPlan && (
        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-2"><ArrowRight className="h-4 w-4 text-primary" /> Follow-up Plan</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{followUpPlan}</p>
        </GlassCard>
      )}

      {recommendations.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold text-sm mb-2">Recommendations</h3>
          <ul className="space-y-1">
            {recommendations.map((r: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">•</span> {r}</li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  )
}
