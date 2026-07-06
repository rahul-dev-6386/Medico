import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

/* ── Cookie helpers ── */

export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : undefined
}

export function removeCookie(name: string, path: string = "/") {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; Max-Age=0; path=${path}; SameSite=Lax`
}

/* ── Auth header ── */

function getAccessToken(): string | undefined {
  // Try in-memory tokens first (set by AuthContext after login)
  if (typeof window !== "undefined") {
    const stored = (window as any).__auth_tokens
    if (stored?.access_token) return stored.access_token
  }
  return getCookie("access_token")
}

// Expose setter for AuthContext to push tokens in-memory
export function setAuthTokensInMemory(tokens: { access_token: string; refresh_token: string } | null) {
  if (typeof window !== "undefined") {
    (window as any).__auth_tokens = tokens
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/* ── API fetch with auto-refresh ── */

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function attemptRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise
  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const refresh = getCookie("refresh_token")
      if (!refresh) return false
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      if (!res.ok) return false
      const data = await res.json()
      // Update in-memory tokens
      setAuthTokensInMemory({ access_token: data.access_token, refresh_token: data.refresh_token })
      return true
    } catch {
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()
  return refreshPromise
}

/* ── Drug name formatting ── */

const LOWERCASE_WORDS = new Set([
  "and", "with", "for", "the", "a", "an", "of", "in", "on", "at",
  "to", "by", "or", "as", "vs",
])

const UNITS = new Set([
  "mg", "ml", "mcg", "g", "kg", "iu", "meq", "mm", "cm", "mcg",
])

const ROMAN_NUMERALS = new Set([
  "ii", "iii", "iv", "vi", "vii", "viii", "ix", "xi", "xii",
])

export function formatDrugName(name: string): string {
  if (!name) return name

  const lower = name.toLowerCase().trim()
  const words = lower.split(/\s+/)

  return words
    .map((word, i) => {
      if (word.includes("'"))
        return word.charAt(0).toUpperCase() + word.slice(1)
      if (UNITS.has(word)) return word
      if (ROMAN_NUMERALS.has(word)) return word.toUpperCase()
      if (i > 0 && LOWERCASE_WORDS.has(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}

const MANUFACTURER_PATTERN = /\b(inc\.?|llc|ltd\.?|corp\.?|corporation|pharma\.?|laboratories|laboratory|lab\.?|therapeutics|biosciences|biotech|healthcare|pharmaceuticals|repack|remedyrepack|solutions|group|holdings|company|co\.?)\b/i

export interface SuggestionItem {
  primary: string
  subtitle: string
}

export function processAutocompleteSuggestions(items: string[], query: string): SuggestionItem[] {
  interface Entry {
    primary: string
    subtitle: string
    isManufacturer: boolean
    raw: string
    formatted: string
  }

  const q = query.toLowerCase().trim()

  const entries: Entry[] = items.map((raw) => {
    const formatted = formatDrugName(raw)
    const isManufacturer = MANUFACTURER_PATTERN.test(raw)
      && (raw.split(/\s+/).length <= 4)
    return {
      primary: formatted,
      subtitle: isManufacturer ? "Manufacturer" : "Medication",
      isManufacturer,
      raw,
      formatted,
    }
  })

  const seen = new Set<string>()
  const deduped: Entry[] = []

  for (const e of entries) {
    const key = e.formatted.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      if (!e.isManufacturer) deduped.push(e)
    }
  }
  for (const e of entries) {
    const key = e.formatted.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(e)
    }
  }

  deduped.sort((a, b) => {
    const aLower = a.primary.toLowerCase()
    const bLower = b.primary.toLowerCase()

    const aExact = aLower === q ? 0 : 1
    const bExact = bLower === q ? 0 : 1
    if (aExact !== bExact) return aExact - bExact

    const aStarts = aLower.startsWith(q) ? 0 : 1
    const bStarts = bLower.startsWith(q) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts

    const aContains = aLower.includes(q) ? 0 : 1
    const bContains = bLower.includes(q) ? 0 : 1
    if (aContains !== bContains) return aContains - bContains

    return a.primary.length - b.primary.length
  })

  return deduped.slice(0, 5).map(({ primary, subtitle }) => ({ primary, subtitle }))
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  }
  // Don't override content-type for FormData
  if (options.body instanceof FormData) {
    delete headers["Content-Type"]
  }
  Object.assign(headers, options.headers)

  let response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })

  // Auto-refresh on 401
  if (response.status === 401) {
    const refreshed = await attemptRefresh()
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`
      response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
    }
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      removeCookie("access_token", "/")
      removeCookie("refresh_token", "/")
      window.location.href = "/"
    }
    const error = await response.json().catch(() => ({ detail: "Request failed" }))
    throw new Error(error.detail || "Request failed")
  }

  return response.json()
}
