"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Bot,
  BarChart3,
  FileText,
  Pill,
  Calendar,
  BookOpen,
  Settings,
  LogOut,
  ChevronLeft,
  Activity,
  Sun,
  TrendingUp,
} from "lucide-react"
import { useAuth } from "@/store/auth-context"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Chat", icon: Bot },
  { href: "/metrics", label: "Health Metrics", icon: BarChart3 },
  { href: "/analytics", label: "Health Trends", icon: TrendingUp },
  { href: "/reports", label: "Medical Reports", icon: FileText },
  { href: "/medications", label: "Medications", icon: Pill },
  { href: "/timeline", label: "Timeline", icon: Calendar },
  { href: "/library", label: "Medical Library", icon: BookOpen },
  { href: "/drugs", label: "Drug Info", icon: Pill },
  { href: "/routines", label: "Daily Plans", icon: Sun },
]

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40",
        "bg-[#0B0E14]/95 backdrop-blur-xl border-r border-white/[0.06]",
        "flex flex-col overflow-hidden"
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-white/[0.06] shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#22C55E] to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-[#22C55E]/20">
            <Activity className="h-4.5 w-4.5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="font-bold text-base text-[#F9FAFB] tracking-tight"
              >
                Medico
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            "btn-icon ml-auto",
            collapsed && "mx-auto"
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block"
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-[#22C55E]"
                    : "text-[#94A3B8] hover:text-[#F9FAFB]",
                  collapsed && "justify-center px-2"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {!isActive && hoveredItem === item.href && (
                  <motion.div
                    layoutId="hoverNav"
                    className="absolute inset-0 rounded-xl bg-white/[0.04]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-3">
                  <item.icon className="h-5 w-5 shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className={cn("px-2 py-2 border-t border-white/[0.06] space-y-0.5", collapsed && "flex flex-col items-center")}>
        {bottomItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-[#22C55E] bg-[#22C55E]/10"
                    : "text-[#94A3B8] hover:text-[#F9FAFB] hover:bg-white/[0.04]",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
            </Link>
          )
        })}
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full",
            "text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="truncate">Sign Out</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#22C55E] to-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {(user?.full_name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#F9FAFB] truncate">{user?.full_name || "Guest User"}</p>
              <p className="text-[10px] text-[#94A3B8] truncate">{user?.email || ""}</p>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  )
}
