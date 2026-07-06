"use client"

import { motion } from "framer-motion"
import {
  BookOpen,
  BrainCircuit,
  Pill,
  Activity,
  ShieldCheck,
  Database,
  HeartPulse,
  Lock,
} from "lucide-react"
import { EcgLine } from "./ecg-line"
import { FloatingParticles } from "./floating-particles"

const container = {
  animate: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

const cardFade = {
  initial: { opacity: 0, y: 20, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

const features = [
  { icon: BookOpen, title: "Evidence-Based Knowledge", desc: "Curated from trusted medical literature and clinical guidelines" },
  { icon: BrainCircuit, title: "AI Clinical Assistant", desc: "Intelligent reasoning powered by advanced language models" },
  { icon: Pill, title: "Drug Intelligence", desc: "Comprehensive data from DailyMed and FDA sources" },
  { icon: Activity, title: "Clinical Decision Support", desc: "Real-time analysis for informed clinical decisions" },
  { icon: Lock, title: "Privacy First", desc: "HIPAA-ready with enterprise-grade data encryption" },
  { icon: Database, title: "DailyMed Integration", desc: "Direct access to official SPL drug labeling data" },
]

const trustBadges = [
  "HIPAA Ready",
  "Clinical Grade",
  "AI Powered",
  "Verified Literature",
  "DailyMed",
  "Secure Auth",
  "Medical Knowledge",
]

function CrossPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.012]" aria-hidden="true">
      <defs>
        <pattern id="med-crosses" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M30 26 v12 M24 32 h12" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#med-crosses)" />
    </svg>
  )
}

function GlowOrb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={cn("absolute rounded-full blur-[120px] animate-pulse-glow pointer-events-none", className)}
      style={{ animationDelay: `${delay}s` }}
    />
  )
}

export function AuthBrandingPanel() {
  return (
    <div className="relative hidden lg:flex w-[55%] min-h-screen flex-col justify-between overflow-hidden bg-[#040810]">
      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060C1A] via-[#091528] to-[#0B1A2E]" />

      {/* Mesh orbs */}
      <GlowOrb className="top-[-15%] left-[-8%] w-[55%] h-[55%] bg-teal-500/5" />
      <GlowOrb className="bottom-[-12%] right-[-8%] w-[45%] h-[45%] bg-emerald-500/4" delay={2.5} />
      <GlowOrb className="top-[35%] right-[-3%] w-[30%] h-[30%] bg-cyan-500/3" delay={5} />
      <GlowOrb className="bottom-[25%] left-[-3%] w-[25%] h-[25%] bg-teal-400/3" delay={1.5} />

      {/* Radial overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_20%,rgba(14,165,169,0.06),transparent_60%),radial-gradient(ellipse_at_75%_80%,rgba(34,197,94,0.03),transparent_50%)]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <CrossPattern />

      <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay bg-noise" />

      <FloatingParticles count={35} />

      <motion.div
        className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16 2xl:p-20"
        variants={container}
        initial="initial"
        animate="animate"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} className="flex items-center gap-3.5">
          <div className="relative">
            <div className="absolute -inset-2 bg-teal-500/15 blur-xl rounded-2xl" />
            <div className="relative w-12 h-12 rounded-[14px] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-teal-500/20">
              <HeartPulse className="h-[24px] w-[24px] text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Sanjeevni AI</h2>
            <p className="text-[11px] text-white/35 font-medium tracking-wider uppercase">Intelligent Medical Assistant</p>
          </div>
        </motion.div>

        {/* Center */}
        <div className="space-y-10">
          {/* Hero */}
          <div className="space-y-6">
            <motion.h1
              variants={fadeUp}
              className="text-[clamp(2.8rem,5.5vw,4.75rem)] font-bold text-white leading-[1.05] tracking-[-0.02em]"
            >
              Intelligent{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Healthcare
              </span>
              .<br />
              Powered by{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                AI
              </span>
              .
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-base xl:text-lg text-white/45 leading-relaxed max-w-[480px]"
            >
              Evidence-based medical intelligence powered by trusted medical literature, DailyMed drug information, AI reasoning, clinical decision support, and secure patient workflows.
            </motion.p>
          </div>

          {/* Feature Cards */}
          <motion.div
            variants={container}
            className="grid grid-cols-2 gap-3"
            style={{ perspective: "800px" }}
          >
            {features.map((f) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  variants={cardFade}
                  whileHover={{
                    scale: 1.02,
                    transition: { duration: 0.25, ease: "easeOut" },
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.025] backdrop-blur-[2px] p-[18px] transition-all duration-500 hover:bg-white/[0.05] hover:border-white/[0.1] hover:shadow-[0_0_35px_-10px_rgba(14,165,169,0.1)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 via-transparent to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative z-10 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.05] flex items-center justify-center shrink-0 transition-all duration-500 group-hover:border-teal-500/20 group-hover:bg-teal-500/8 group-hover:shadow-[0_0_18px_-6px_rgba(14,165,169,0.12)]">
                      <Icon className="h-[19px] w-[19px] text-white/50 transition-colors duration-500 group-hover:text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white/85 mb-0.5">{f.title}</p>
                      <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* Bottom */}
        <motion.div variants={fadeUp} className="space-y-6">
          {/* Trust badges */}
          <div className="flex flex-wrap gap-2">
            {trustBadges.map((badge) => (
              <span
                key={badge}
                className="px-3.5 py-1.5 text-[11px] font-medium rounded-full border border-white/[0.05] bg-white/[0.02] text-white/40 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.05] hover:border-teal-500/15 hover:text-teal-300/80"
              >
                {badge}
              </span>
            ))}
          </div>

          <div>
            <EcgLine className="opacity-12 mb-4" />
            <div className="flex items-center gap-6 text-xs text-white/25">
              <span className="flex items-center gap-2">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-400/50 animate-pulse-soft" />
                HIPAA Compliant
              </span>
              <span className="flex items-center gap-2">
                <span className="w-[5px] h-[5px] rounded-full bg-teal-400/50 animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
                Clinical Security
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}
