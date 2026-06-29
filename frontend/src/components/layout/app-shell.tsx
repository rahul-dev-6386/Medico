"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./sidebar"
import { TopHeader } from "./top-header"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

const publicPaths = ["/login", "/register"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isPublic = publicPaths.includes(pathname)

  if (!mounted) {
    return <div className="min-h-screen bg-[#090B10]">{children}</div>
  }

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#090B10]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className={cn(
          "transition-all duration-300 min-h-screen flex flex-col",
          collapsed ? "ml-[72px]" : "ml-sidebar"
        )}
      >
        <TopHeader />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex-1"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}
