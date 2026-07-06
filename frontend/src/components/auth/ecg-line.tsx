"use client"

import { useEffect, useRef } from "react"

export function EcgLine({ className }: { className?: string }) {
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    const animate = () => {
      path.style.transition = "stroke-dashoffset 3s ease-in-out"
      path.style.strokeDashoffset = "0"
    }
    const timer = setTimeout(animate, 500)
    const interval = setInterval(() => {
      path.style.transition = "none"
      path.style.strokeDashoffset = `${length}`
      requestAnimationFrame(() => {
        path.style.transition = "stroke-dashoffset 3s ease-in-out"
        path.style.strokeDashoffset = "0"
      })
    }, 5000)
    return () => { clearTimeout(timer); clearInterval(interval) }
  }, [])

  return (
    <svg
      viewBox="0 0 400 80"
      className={cn("w-full h-16 opacity-20", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ecg-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0EA5A9" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#22C55E" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0EA5A9" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        d="M0,40 L60,40 L80,40 L90,10 L100,70 L110,40 L140,40 L160,40 L170,35 L180,45 L190,40 L220,40 L240,40 L250,15 L260,65 L270,40 L300,40 L320,40 L330,38 L340,42 L350,40 L400,40"
        fill="none"
        stroke="url(#ecg-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}
