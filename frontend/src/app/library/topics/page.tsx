"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { apiFetch } from "@/lib/utils"
import { Tags, AlertCircle, Stethoscope, FlaskConical, Pill, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface TopicInfo {
  name: string
  count: number
  collections: string[]
}

const collectionIcons: Record<string, React.ElementType> = {
  diseases: Stethoscope,
  laboratory: FlaskConical,
  pharmacology: Pill,
  clinical_practice: BookOpen,
}

const collectionColors: Record<string, string> = {
  diseases: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  laboratory: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  pharmacology: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  clinical_practice: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

export default function LibraryTopicsPage() {
  const [topics, setTopics] = useState<TopicInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch("/library/topics")
      .then((data) => {
        if (data?.topics) setTopics(data.topics)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Medical Topics</h1>
        <p className="text-muted-foreground mt-1">
          Browse knowledge by medical topic area
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((topic, i) => (
            <GlassCard key={i} hover className="p-5">
              <Link href={`/library/search?q=${encodeURIComponent(topic.name)}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Tags className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{topic.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {topic.count} chunks
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {topic.collections.map((col) => {
                        const Icon = collectionIcons[col] || Tags
                        return (
                          <span
                            key={col}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                              collectionColors[col] || "bg-muted/30 text-muted-foreground"
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {col.replace(/_/g, " ")}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Link>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
