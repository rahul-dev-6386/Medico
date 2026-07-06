"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  HeartPulse,
  Brain,
  Pill,
  FileText,
  Activity,
  MessageCircle,
  Shield,
  Sparkles,
  ChevronRight,
  BookOpen,
  Stethoscope,
  ArrowRight,
} from "lucide-react"
import { useAuth } from "@/store/auth-context"

const features = [
  {
    icon: Brain,
    title: "AI Health Assistant",
    desc: "Chat with an AI that understands your health data, lab results, and medical history. Get personalized insights.",
    gradient: "from-[#22C55E] to-emerald-500",
  },
  {
    icon: FileText,
    title: "Medical Reports",
    desc: "Upload lab reports and medical documents. AI extracts values, flags abnormalities, and tracks trends over time.",
    gradient: "from-[#06B6D4] to-cyan-500",
  },
  {
    icon: Activity,
    title: "Health Metrics",
    desc: "Track vitals, symptoms, and daily metrics. Visualize trends with intelligent charts and pattern detection.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Pill,
    title: "Medication Manager",
    desc: "Log medications, set reminders, and track adherence. Check drug interactions across your entire profile.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: BookOpen,
    title: "Medical Library",
    desc: "Search 16K+ textbook chunks from Harrison's, Merck Manual, Oxford Handbook, and more. AI-powered answers.",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    icon: Stethoscope,
    title: "Health Score",
    desc: "A unified score combining biomarkers, vitals, adherence, and lifestyle. Track your progress over time.",
    gradient: "from-[#22C55E] to-teal-500",
  },
]

const stats = [
  { value: "16K+", label: "Textbook Chunks" },
  { value: "8", label: "Medical Textbooks" },
  { value: "100+", label: "Biomarkers Tracked" },
  { value: "Real-time", label: "AI Analysis" },
]

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [mounted, isLoading, isAuthenticated, router])

  if (isLoading || (mounted && isAuthenticated)) {
    return (
      <div className="min-h-screen bg-[#090B10] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#22C55E] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090B10]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#090B10]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <HeartPulse className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#F9FAFB]">Sanjeevni AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[#94A3B8] hover:text-[#F9FAFB] transition-colors px-4 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-[#22C55E] text-white hover:bg-emerald-600 transition-all active:scale-[0.97]"
            >
              Get started
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-sm font-medium mb-8">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Health Assistant
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#F9FAFB] leading-tight mb-6">
              Your personal{" "}
              <span className="text-gradient">health intelligence</span>
              <br />
              platform
            </h1>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto leading-relaxed mb-10">
              Sanjeevni AI combines AI with trusted medical knowledge to help you
              understand lab results, manage medications, track health metrics,
              and get answers from 8 medical textbooks.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-base font-medium px-6 py-3 rounded-xl bg-[#22C55E] text-white hover:bg-emerald-600 transition-all active:scale-[0.97] shadow-lg shadow-[#22C55E]/20"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-base font-medium px-6 py-3 rounded-xl bg-white/[0.06] text-[#F9FAFB] border border-white/[0.08] hover:bg-white/[0.1] transition-all active:scale-[0.97]"
              >
                Sign in
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass rounded-2xl p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold text-gradient mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[#94A3B8]">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#F9FAFB] mb-4">
              Everything you need to manage your health
            </h2>
            <p className="text-[#94A3B8] max-w-xl mx-auto">
              From lab report analysis to medication tracking — Sanjeevni AI brings
              all your health data into one intelligent dashboard.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl p-6 hover:bg-[#111827]/80 transition-all duration-300 group"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}
                >
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-[#F9FAFB] mb-2 group-hover:text-[#22C55E] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12"
          >
            <Shield className="h-10 w-10 text-[#22C55E] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-[#F9FAFB] mb-4">
              Your health data stays yours
            </h2>
            <p className="text-[#94A3B8] mb-8 max-w-lg mx-auto">
              All analysis happens server-side with industry-standard encryption.
              No sharing, no selling. Period.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-base font-medium px-6 py-3 rounded-xl bg-[#22C55E] text-white hover:bg-emerald-600 transition-all active:scale-[0.97]"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-[#22C55E]" />
            Sanjeevni AI
          </div>
          <p>&copy; {new Date().getFullYear()} Sanjeevni AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
