"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Activity, Bot, BarChart3, FileText, Pill, Calendar,
  Sun, Settings, LogOut, ChevronLeft
} from "lucide-react"
import { useAuth } from "@/store/auth-context"
import { motion } from "framer-motion"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Activity },
  { href: "/chat", label: "AI Health Coach", icon: Bot },
  { href: "/metrics", label: "Health Metrics", icon: BarChart3 },
  { href: "/reports", label: "Medical Reports", icon: FileText },
  { href: "/reports/comparison", label: "Report Comparison", icon: BarChart3 as any },
  { href: "/medications", label: "Medications", icon: Pill },
  { href: "/timeline", label: "Health Timeline", icon: Calendar },
  { href: "/routines", label: "Personalized Plans", icon: Sun },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 glass border-r border-white/5 flex flex-col transition-all duration-300",
        collapsed ? "w-[72px]" : "w-sidebar"
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-bold text-lg truncate"
            >
              HealthAI
            </motion.span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            "ml-auto p-1.5 rounded-lg hover:bg-muted/50 transition-colors",
            collapsed && "ml-0 mx-auto"
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <motion.div
                    layoutId="activeNav"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className={cn("p-3 border-t border-white/5 space-y-1", collapsed && "flex flex-col items-center")}>
        <Link href="/settings">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/30",
            collapsed && "justify-center px-2"
          )}>
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </div>
        </Link>
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
