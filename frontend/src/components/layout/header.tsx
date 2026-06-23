"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/store/auth-context"
import { useTheme } from "@/store/theme-context"
import { Button } from "@/components/ui/button"
import {
  Activity,
  MessageSquare,
  BarChart3,
  Pill,
  FileText,
  Calendar,
  LogOut,
  Sun,
  Moon,
  Settings,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Activity },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/medications", label: "Medications", icon: Pill },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/routines", label: "Routines", icon: Calendar },
]

export function Header() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  if (!user || pathname === "/login" || pathname === "/register") return null

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl shrink-0">
          <Activity className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">HealthAI</span>
        </Link>

        <nav className="flex items-center gap-1 ml-2 sm:ml-8 overflow-x-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5 whitespace-nowrap"
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link href="/settings">
            <Button variant="ghost" size="icon" title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground hidden md:inline max-w-[120px] truncate">
            {user.full_name}
          </span>
          <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
