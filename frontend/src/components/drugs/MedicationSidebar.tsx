"use client"

import { motion } from "framer-motion"
import {
  Plus, Clock, Bell, AlertTriangle, ExternalLink,
  Pill, History, Shield, X, Loader2, Zap, ChevronRight,
  Tag, Layers, HeartPulse, Syringe, ShoppingBag, ClipboardCheck,
} from "lucide-react"

const CATEGORY_NAMES = new Set([
  "Cardiovascular", "Antibiotics", "Endocrine", "Respiratory",
  "Pain & Inflammation", "Gi & Hepatology",
])

interface MedicationSidebarProps {
  myDrugs: string[]
  drugInput: string
  onDrugInputChange: (val: string) => void
  onAddDrug: () => void
  onRemoveDrug: (name: string) => void
  onCheckInteractions: () => void
  checkingInteractions: boolean
  recentSearches: string[]
  savedDrugs: string[]
  onRecentClick: (term: string) => void
  currentDrugName?: string
  currentDrugClass?: string
  brandNames?: string[]
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

interface SnapshotRowProps {
  icon: typeof Pill
  label: string
  value: string
}

function SnapshotRow({ icon: Icon, label, value }: SnapshotRowProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
        <Icon size={12} className="text-[#5A6B87]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-[#5A6B87]">{label}</p>
        <p className="truncate text-xs font-medium text-[#EDF2F7]">{value || "—"}</p>
      </div>
    </div>
  )
}

export default function MedicationSidebar({
  myDrugs, drugInput, onDrugInputChange, onAddDrug, onRemoveDrug,
  onCheckInteractions, checkingInteractions,
  recentSearches, savedDrugs, onRecentClick,
  currentDrugName, currentDrugClass, brandNames,
}: MedicationSidebarProps) {
  const normalizedRecent = Array.from(new Set(recentSearches.map(titleCase)))
    .filter((s) => !CATEGORY_NAMES.has(s))
  const hasMyDrugs = myDrugs.length > 0

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto lg:w-[280px]"
    >
      {/* Medication Snapshot */}
      {currentDrugName && (
        <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0EA5A9]/10">
              <ClipboardCheck size={13} className="text-[#0EA5A9]" />
            </div>
            <p className="text-xs font-semibold text-[#EDF2F7]">Medication Snapshot</p>
          </div>
          <div className="-mx-2.5 space-y-0">
            <SnapshotRow icon={Tag} label="Generic Name" value={titleCase(currentDrugName)} />
            <SnapshotRow icon={Layers} label="Drug Class" value={currentDrugClass || "—"} />
            <SnapshotRow icon={HeartPulse} label="Indication" value="See drug details below" />
            <SnapshotRow icon={Syringe} label="Route" value="See drug details below" />
            <SnapshotRow icon={ShoppingBag} label="Availability" value="Prescription only" />
            <SnapshotRow icon={Shield} label="Prescription" value="Rx Required" />
          </div>
        </div>
      )}

      {/* My Medications */}
      <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0EA5A9]/10">
              <Pill size={13} className="text-[#0EA5A9]" />
            </div>
            <p className="text-xs font-semibold text-[#EDF2F7]">My Medications</p>
          </div>
          {hasMyDrugs && <span className="text-[10px] text-[#8B9BB5]">{myDrugs.length} added</span>}
        </div>

        {hasMyDrugs ? (
          <>
            <div className="mb-3 flex min-h-[24px] flex-wrap gap-1.5">
              {myDrugs.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400"
                >
                  {name}
                  <button onClick={() => onRemoveDrug(name)} className="transition-colors hover:text-red-400">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={drugInput}
                onChange={(e) => onDrugInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onAddDrug() }}
                placeholder="Add medication..."
                className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs text-[#EDF2F7] placeholder:text-[#8B9BB5]/60 outline-none focus:border-[#0EA5A9]/40"
              />
              <button
                onClick={onAddDrug}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] transition-colors hover:bg-white/[0.1]"
              >
                <Plus size={13} className="text-[#8B9BB5]" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02]">
              <Plus size={15} className="text-[#5A6B87]" />
            </div>
            <p className="text-[11px] text-[#5A6B87]">No medications added</p>
            <div className="flex w-full gap-1">
              <input
                type="text"
                value={drugInput}
                onChange={(e) => onDrugInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onAddDrug() }}
                placeholder="Add your first medication..."
                className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs text-[#EDF2F7] placeholder:text-[#8B9BB5]/60 outline-none focus:border-[#0EA5A9]/40"
              />
              <button
                onClick={onAddDrug}
                className="flex h-8 items-center gap-1 rounded-lg bg-[#0EA5A9] px-3 text-xs font-medium text-white transition-colors hover:bg-[#0D9498]"
              >
                <Plus size={12} />
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06]">
            <Zap size={13} className="text-[#8B9BB5]" />
          </div>
          <p className="text-xs font-semibold text-[#EDF2F7]">Quick Actions</p>
        </div>
        <div className="space-y-0.5">
          <motion.button
            whileHover={{ x: 2 }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
          >
            <Bell size={14} className="shrink-0 text-[#5A6B87]" />
            <div className="flex-1">
              <p className="text-xs font-medium text-[#EDF2F7]">Medication Reminders</p>
              <p className="text-[10px] text-[#5A6B87]">Set up dose alerts</p>
            </div>
            <ChevronRight size={13} className="shrink-0 text-[#5A6B87]" />
          </motion.button>

          <motion.button
            whileHover={myDrugs.length >= 2 && !checkingInteractions ? { x: 2 } : {}}
            onClick={onCheckInteractions}
            disabled={myDrugs.length < 2 || checkingInteractions}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
          >
            {checkingInteractions ? (
              <Loader2 size={14} className="shrink-0 animate-spin text-[#5A6B87]" />
            ) : (
              <AlertTriangle size={14} className="shrink-0 text-[#5A6B87]" />
            )}
            <div className="flex-1">
              <p className="text-xs font-medium text-[#EDF2F7]">Interaction Checker</p>
              <p className="text-[10px] text-[#5A6B87]">
                {myDrugs.length < 2 ? "Add 2+ medications to check" : `Check ${myDrugs.length} drugs`}
              </p>
            </div>
            <ChevronRight size={13} className="shrink-0 text-[#5A6B87]" />
          </motion.button>
        </div>
      </div>

      {/* Recent Searches */}
      {normalizedRecent.length > 0 && (
        <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06]">
                <History size={13} className="text-[#8B9BB5]" />
              </div>
              <p className="text-xs font-semibold text-[#EDF2F7]">Recent Searches</p>
            </div>
            <button className="text-[10px] text-[#0EA5A9] transition-colors hover:text-[#0D9498]">
              Clear all
            </button>
          </div>
          <div className="space-y-0.5">
            {normalizedRecent.slice(0, 5).map((s) => (
              <button
                key={s}
                onClick={() => onRecentClick(s)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all hover:bg-white/[0.04]"
              >
                <Clock size={12} className="shrink-0 text-[#5A6B87]" />
                <span className="text-xs text-[#8B9BB5] transition-colors hover:text-[#EDF2F7]">{s}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bookmarks */}
      {savedDrugs.length > 0 && (
        <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06]">
              <Shield size={13} className="text-amber-400/70" />
            </div>
            <p className="text-xs font-semibold text-[#EDF2F7]">Bookmarks</p>
          </div>
          <div className="space-y-0.5">
            {savedDrugs.slice(0, 4).map((s) => (
              <button
                key={s}
                onClick={() => onRecentClick(s)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all hover:bg-white/[0.04]"
              >
                <Shield size={12} className="shrink-0 text-amber-400/60" />
                <span className="text-xs text-[#8B9BB5] transition-colors hover:text-[#EDF2F7]">{s}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filler */}
      <div className="flex-1" />
    </motion.aside>
  )
}
