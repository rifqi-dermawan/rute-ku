'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role?: 'USER' | 'ADMIN'
}

export interface AuthModalBannerInfo {
  title: string
  description: string
  actionLabel?: string
  accentColor?: string
}

export interface AuthModalConfig {
  mode?: 'login' | 'register'
  redirectTo?: string
  bannerInfo?: AuthModalBannerInfo
  onSuccess?: () => void
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (emailOrPhone: string, password?: string) => Promise<{ success: boolean; user?: AuthUser; error?: string }>
  register: (data: { name: string; email: string; phone: string; password?: string }) => Promise<{ success: boolean; user?: AuthUser; error?: string }>
  logout: () => void
  isAuthModalOpen: boolean
  authModalConfig: AuthModalConfig | null
  openAuthModal: (config?: AuthModalConfig) => void
  closeAuthModal: () => void
  loginWithGoogle: () => Promise<{ success: boolean; redirecting?: boolean; isConfigMissing?: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'ruteku_auth_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalConfig, setAuthModalConfig] = useState<AuthModalConfig | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to parse stored user:', e)
    }
  }, [])

  const login = useCallback(async (_emailOrPhone: string, _password?: string) => {
    return { success: false, error: 'Sistem menggunakan model pemesanan Tamu (Guest Booking) tanpa login.' }
  }, [])

  const register = useCallback(async () => {
    return { success: false, error: 'Pendaftaran akun dinonaktifkan. Silakan gunakan pemesanan langsung sebagai Tamu.' }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
      document.cookie = 'ruteku_user_id=; path=/; max-age=0'
      document.cookie = 'ruteku_user_role=; path=/; max-age=0'
    } catch (e) {
      console.error('Failed to clear user session:', e)
    }
  }, [])

  const openAuthModal = useCallback((config?: AuthModalConfig) => {
    setAuthModalConfig(config || null)
    setIsAuthModalOpen(false)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    return {
      success: false,
      isConfigMissing: true,
      error: 'Sistem reservasi beroperasi dalam mode Tamu tanpa login.',
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthModalOpen,
        authModalConfig,
        openAuthModal,
        closeAuthModal,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
