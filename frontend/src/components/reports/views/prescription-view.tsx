"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { motion } from "framer-motion"
import { Pill, Calendar, User, Stethoscope, Clock, AlertCircle } from "lucide-react"

interface Props { structured: any }

export function PrescriptionView({ structured }: Props) {
  const patient = structured?.patient_info || {}
  const diagnosis = structured?.diagnosis || []
  const medications = structured?.medications || []
  const recommendations = structured?.recommendations || []
  const doctor = structured?.doctor_info || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><User className="h-4 w-4 text-primary" /> Patient Details</h3>
          <div className="space-y-2">
            {patient.name && <p className="text-sm"><span className="text-muted-foreground">Name:</span> {patient.name}</p>}
            {patient.age && <p className="text-sm"><span className="text-muted-foreground">Age:</span> {patient.age}</p>}
            {patient.sex && <p className="text-sm"><span className="text-muted-foreground">Sex:</span> {patient.sex}</p>}
          </div>
        </GlassCard>
        {doctor.name && (
          <GlassCard>
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Stethoscope className="h-4 w-4 text-secondary" /> Prescribed By</h3>
            <p className="text-sm">{doctor.name}</p>
            {doctor.registration && <p className="text-xs text-muted-foreground">Reg: {doctor.registration}</p>}
          </GlassCard>
        )}
      </div>

      {diagnosis.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><AlertCircle className="h-4 w-4 text-amber-400" /> Diagnosis</h3>
          <div className="flex flex-wrap gap-2">
            {diagnosis.map((d: string, i: number) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">{d}</span>
            ))}
          </div>
        </GlassCard>
      )}

      {medications.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-4"><Pill className="h-4 w-4 text-purple-400" /> Prescribed Medicines</h3>
          <div className="space-y-3">
            {medications.map((med: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-4 border-l-4 border-l-purple-500">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{med.name}</p>
                    {med.dosage && <p className="text-sm text-muted-foreground">{med.dosage}</p>}
                  </div>
                  {med.frequency && (
                    <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">{med.frequency}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {med.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{med.duration}</span>}
                  {med.instructions && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{med.instructions}</span>}
                </div>
              </motion.div>
            ))}
          </div>
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
  )
}
