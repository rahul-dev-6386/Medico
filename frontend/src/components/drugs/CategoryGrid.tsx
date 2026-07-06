"use client"

import { Layers } from "lucide-react"
import CategoryCard from "./CategoryCard"

const categories = [
  { id: "cardiovascular", name: "Cardiovascular", count: "1,248" },
  { id: "antibiotics", name: "Antibiotics", count: "856" },
  { id: "endocrine", name: "Endocrine", count: "642" },
  { id: "respiratory", name: "Respiratory", count: "764" },
  { id: "pain-inflammation", name: "Pain & Inflammation", count: "1,102" },
  { id: "gi-hepatology", name: "GI & Hepatology", count: "589" },
]

interface CategoryGridProps {
  onCategoryClick?: (name: string) => void
}

export default function CategoryGrid({ onCategoryClick }: CategoryGridProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0EA5A9]/10">
            <Layers size={14} className="text-[#0EA5A9]" />
          </div>
          <h2 className="text-sm font-semibold text-[#EDF2F7]">Browse by Category</h2>
        </div>
        <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-[#8B9BB5]">{categories.length} categories</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((cat, i) => (
          <CategoryCard
            key={cat.id}
            {...cat}
            index={i}
            onClick={() => onCategoryClick?.(cat.name)}
          />
        ))}
      </div>
    </section>
  )
}
