"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

interface User {
  id: number
  email: string
  full_name: string
  avatar_url: string | null
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: boolean
}

const GUEST_USER: User = {
  id: 0,
  email: "guest@medico.app",
  full_name: "Guest User",
  avatar_url: null,
  role: "patient",
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token")
    const storedUser = localStorage.getItem("user")
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    } else {
      localStorage.setItem("access_token", "guest-mode")
      localStorage.setItem("user", JSON.stringify(GUEST_USER))
      setToken("guest-mode")
      setUser(GUEST_USER)
    }
  }, [])

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem("access_token", newToken)
    localStorage.setItem("user", JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    setToken("guest-mode")
    setUser(GUEST_USER)
    window.location.href = "/"
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
