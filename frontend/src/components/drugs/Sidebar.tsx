"use client"

import { motion } from "framer-motion"
import {
  LayoutDashboard, MessageSquare, Pill, AlertTriangle, Stethoscope,
  FlaskConical, FileText, Bookmark, Clock, Settings, LogOut,
} from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Home", href: "/" },
  { icon: MessageSquare, label: "Chat AI", href: "/chat" },
  { icon: Pill, label: "Drug Search", href: "/drugs", active: true },
  { icon: AlertTriangle, label: "Drug Interactions", href: "/interactions" },
  { icon: Stethoscope, label: "Diseases", href: "/diseases" },
  { icon: FlaskConical, label: "Lab Tests", href: "/lab-tests" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
  { icon: Clock, label: "History", href: "/history" },
]

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0D1117]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0EA5A9] to-teal-600 shadow-lg shadow-[#0EA5A9]/20">
          <Pill size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#EDF2F7]">Sanjeevni AI</p>
          <p className="text-[10px] text-[#5A6B87]">Medical Assistant</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                item.active
                  ? "bg-[#0EA5A9]/10 text-[#0EA5A9]"
                  : "text-[#8B9BB5] hover:bg-white/[0.04] hover:text-[#EDF2F7]"
              }`}
            >
              <Icon size={18} className={item.active ? "text-[#0EA5A9]" : "text-[#5A6B87]"} />
              <span>{item.label}</span>
              {item.active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0EA5A9]" />}
            </a>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <a
          href="/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#8B9BB5] transition-all hover:bg-white/[0.04] hover:text-[#EDF2F7]"
        >
          <Settings size={18} className="text-[#5A6B87]" />
          <span>Settings</span>
        </a>
        <a
          href="/logout"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#8B9BB5] transition-all hover:bg-white/[0.04] hover:text-red-400"
        >
          <LogOut size={18} className="text-[#5A6B87]" />
          <span>Logout</span>
        </a>
      </div>
    </aside>
  )
}
