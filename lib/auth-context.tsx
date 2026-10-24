'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role?: string
  avatar?: string
}

export interface AuthModalBannerInfo {
  seats?: string[]
  timeLeftFormatted?: string
  from?: string
  to?: string
}

export interface AuthModalConfig {
  mode?: 'login' | 'register'
  title?: string
  description?: string
  bannerInfo?: AuthModalBannerInfo
  onSuccess?: (user: AuthUser) => void
  redirectUrl?: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (emailOrPhone: string, password?: string) => Promise<{ success: boolean; error?: string }>
  register: (data: { name: string; email: string; phone: string; password?: string }) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAuthModalOpen: boolean
  authModalConfig: AuthModalConfig | null
  openAuthModal: (config?: AuthModalConfig) => void
  closeAuthModal: () => void
}

const DEMO_USERS: AuthUser[] = [
  {
    id: 'usr-demo-1',
    name: 'Dini Sartika',
    email: 'dini@ruteku.id',
    phone: '081234567890',
    role: 'USER',
  },
  {
    id: 'usr-demo-2',
    name: 'Rifqi Dermawan',
    email: 'rifqidermawan15@gmail.com',
    phone: '082122334455',
    role: 'USER',
  },
  {
    id: 'usr-demo-3',
    name: 'Budi Santoso',
    email: 'budi.santoso@gmail.com',
    phone: '081398765432',
    role: 'USER',
  },
  {
    id: 'usr-admin-1',
    name: 'Admin Operasional RuteKu',
    email: 'admin@ruteku.id',
    phone: '081199998888',
    role: 'ADMIN',
  },
]

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'ruteku_auth_user'
const USERS_STORAGE_KEY = 'ruteku_registered_users'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalConfig, setAuthModalConfig] = useState<AuthModalConfig | null>(null)

  // Initialize auth state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to parse stored user:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveUserSession = (userData: AuthUser) => {
    setUser(userData)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
      // Also sync cookies for server component & middleware checks
      document.cookie = `ruteku_user_id=${userData.id}; path=/; max-age=604800`
      document.cookie = `ruteku_user_role=${userData.role || 'USER'}; path=/; max-age=604800`
    } catch (e) {
      console.error('Failed to save user session:', e)
    }
  }

  const login = useCallback(async (emailOrPhone: string, _password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      // Simulate network latency for realistic feel
      await new Promise(r => setTimeout(r, 400))

      const normalized = emailOrPhone.trim().toLowerCase()

      // 1. Check demo users
      const demoMatch = DEMO_USERS.find(
        u => u.email.toLowerCase() === normalized || u.phone === normalized || u.name.toLowerCase() === normalized
      )
      if (demoMatch) {
        if (demoMatch.role === 'ADMIN') {
          if (!_password || _password !== 'admin123') {
            return { success: false, error: 'Kata sandi staf Administrator salah. (Gunakan kata sandi admin yang telah ditentukan).' }
          }
        }
        saveUserSession(demoMatch)
        return { success: true }
      }

      // 2. Check registered users in localStorage
      let customUsers: AuthUser[] = []
      try {
        const stored = localStorage.getItem(USERS_STORAGE_KEY)
        if (stored) customUsers = JSON.parse(stored)
      } catch {}

      const customMatch = customUsers.find(
        u => u.email.toLowerCase() === normalized || u.phone === normalized
      )
      if (customMatch) {
        saveUserSession(customMatch)
        return { success: true }
      }

      // 3. If email looks valid, allow creating / logging into a dynamic user session
      if (normalized.includes('@') && normalized.includes('.')) {
        const namePart = normalized.split('@')[0]
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1)
        const newUser: AuthUser = {
          id: `usr-${Date.now()}`,
          name: formattedName,
          email: normalized,
          phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
          role: 'USER',
        }
        customUsers.push(newUser)
        try {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(customUsers))
        } catch {}
        saveUserSession(newUser)
        return { success: true }
      }

      // If just phone number given (>= 10 digits)
      const digits = emailOrPhone.replace(/\D/g, '')
      if (digits.length >= 10) {
        const newUser: AuthUser = {
          id: `usr-${Date.now()}`,
          name: `Pengguna ${digits.slice(-4)}`,
          email: `user_${digits.slice(-6)}@ruteku.id`,
          phone: digits,
          role: 'USER',
        }
        customUsers.push(newUser)
        try {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(customUsers))
        } catch {}
        saveUserSession(newUser)
        return { success: true }
      }

      return { success: false, error: 'Email atau nomor HP tidak valid.' }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Terjadi kesalahan saat masuk.' }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (data: {
    name: string
    email: string
    phone: string
    password?: string
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      await new Promise(r => setTimeout(r, 450))

      if (!data.name.trim() || data.name.trim().length < 2) {
        return { success: false, error: 'Nama lengkap minimal 2 karakter.' }
      }
      if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        return { success: false, error: 'Format email tidak valid.' }
      }
      const phoneDigits = data.phone.replace(/\D/g, '')
      if (phoneDigits.length < 10) {
        return { success: false, error: 'Nomor HP minimal 10 digit angka.' }
      }

      let customUsers: AuthUser[] = []
      try {
        const stored = localStorage.getItem(USERS_STORAGE_KEY)
        if (stored) customUsers = JSON.parse(stored)
      } catch {}

      // Check duplicate email
      const existing = customUsers.find(u => u.email.toLowerCase() === data.email.trim().toLowerCase())
      if (existing) {
        return { success: false, error: 'Email sudah terdaftar. Silakan gunakan tab Masuk.' }
      }

      const newUser: AuthUser = {
        id: `usr-${Date.now()}`,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        role: 'USER',
      }

      customUsers.push(newUser)
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(customUsers))
      } catch {}

      saveUserSession(newUser)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal mendaftarkan akun.' }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
      document.cookie = 'ruteku_user_id=; path=/; max-age=0'
      document.cookie = 'ruteku_user_role=; path=/; max-age=0'
    } catch (e) {
      console.error('Failed to remove user session:', e)
    }
  }, [])

  const openAuthModal = useCallback((config?: AuthModalConfig) => {
    setAuthModalConfig(config || null)
    setIsAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false)
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { DEMO_USERS }
