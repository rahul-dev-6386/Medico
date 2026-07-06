import { Shield } from "lucide-react"

export default function SafetyBanner() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[#0EA5A9]/15 bg-gradient-to-r from-[#0EA5A9]/[0.04] to-transparent px-5 py-4">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#0EA5A9]/10" />
        <Shield size={17} className="relative text-[#0EA5A9]" />
      </div>
      <div className="pt-0.5">
        <p className="text-sm font-semibold text-[#0EA5A9]">Safety Reminder</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#8B9BB5]">
          Always consult your healthcare professional before starting, stopping, or changing any medication.
          This information is for reference purposes only and does not constitute medical advice.
        </p>
      </div>
    </div>
  )
}
