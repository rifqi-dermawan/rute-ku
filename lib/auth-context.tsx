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
  login: (emailOrPhone: string, password?: string) => Promise<{ success: boolean; user?: AuthUser; error?: string }>
  register: (data: { name: string; email: string; phone: string; password?: string }) => Promise<{ success: boolean; user?: AuthUser; error?: string }>
  logout: () => void
  isAuthModalOpen: boolean
  authModalConfig: AuthModalConfig | null
  openAuthModal: (config?: AuthModalConfig) => void
  closeAuthModal: () => void
  sendOtp: (email: string) => Promise<{ success: boolean; message?: string; devCode?: string; error?: string }>
  loginWithOtp: (email: string, otp: string, name?: string) => Promise<{ success: boolean; user?: AuthUser; error?: string }>
  loginWithGoogle: (email?: string, name?: string, options?: { returnTo?: string }) => Promise<{ success: boolean; user?: AuthUser; error?: string; redirecting?: boolean; isConfigMissing?: boolean }>
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
      document.cookie = `ruteku_user_id=${userData.id}; path=/; max-age=604800; SameSite=Lax`
      document.cookie = `ruteku_user_email=${encodeURIComponent(userData.email)}; path=/; max-age=604800; SameSite=Lax`
      document.cookie = `ruteku_user_role=${userData.role || 'USER'}; path=/; max-age=604800; SameSite=Lax`
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'))
        window.dispatchEvent(new CustomEvent('ruteku_auth_change', { detail: userData }))
      }
    } catch (e) {
      console.error('Failed to save user session:', e)
    }
  }

  const login = useCallback(async (emailOrPhone: string, _password?: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
    setIsLoading(true)
    try {
      await new Promise(r => setTimeout(r, 300))

      const normalized = emailOrPhone.trim().toLowerCase()

      // 1. Check demo users
      const demoMatch = DEMO_USERS.find(
        u => u.email.toLowerCase() === normalized || u.phone === normalized || u.name.toLowerCase() === normalized
      )
      if (demoMatch) {
        saveUserSession(demoMatch)
        return { success: true, user: demoMatch }
      }

      // 2. Check registered users in localStorage
      let customUsers: (AuthUser & { password?: string })[] = []
      try {
        const stored = localStorage.getItem(USERS_STORAGE_KEY)
        if (stored) customUsers = JSON.parse(stored)
      } catch {}

      const customMatch = customUsers.find(
        u => u.email.toLowerCase() === normalized || u.phone === normalized
      )
      if (customMatch) {
        if (_password && customMatch.password && customMatch.password !== _password) {
          return { success: false, error: 'Kata sandi yang Anda masukkan salah.' }
        }
        const { password: _, ...userData } = customMatch
        saveUserSession(userData)
        return { success: true, user: userData }
      }

      // 3. Fallback: jika belum terdaftar, buat akun instan
      const newInstantUser: AuthUser = {
        id: `usr-${Date.now()}`,
        name: normalized.includes('@') ? normalized.split('@')[0] : 'Pengguna RuteKu',
        email: normalized.includes('@') ? normalized : `${normalized}@ruteku.id`,
        phone: !normalized.includes('@') ? normalized : '081234567890',
        role: 'USER',
      }
      saveUserSession(newInstantUser)
      return { success: true, user: newInstantUser }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal masuk akun.' }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (data: { name: string; email: string; phone: string; password?: string }): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
    setIsLoading(true)
    try {
      const normalizedEmail = data.email.trim().toLowerCase()
      const normalizedPhone = data.phone.trim()

      let customUsers: (AuthUser & { password?: string })[] = []
      try {
        const stored = localStorage.getItem(USERS_STORAGE_KEY)
        if (stored) customUsers = JSON.parse(stored)
      } catch {}

      const exists = customUsers.some(
        u => u.email.toLowerCase() === normalizedEmail || u.phone === normalizedPhone
      )
      if (exists) {
        return { success: false, error: 'Email atau nomor HP ini sudah terdaftar. Silakan Masuk.' }
      }

      const newUser: AuthUser & { password?: string } = {
        id: `usr-${Date.now()}`,
        name: data.name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        role: 'USER',
        password: data.password || 'password123',
      }

      customUsers.push(newUser)
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(customUsers))

      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newUser, noCookie: true }),
        })
      } catch (e) {
        console.warn('Sync register API skipped:', e)
      }

      return { success: true, user: newUser }
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
      document.cookie = 'ruteku_user_email=; path=/; max-age=0'
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

  const sendOtp = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      return data
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengirim kode verifikasi.' }
    }
  }, [])

  const loginWithOtp = useCallback(async (email: string, otp: string, name?: string) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, name }),
      })
      const data = await res.json()
      if (data.success && data.user) {
        saveUserSession(data.user)
        return { success: true, user: data.user }
      }
      return { success: false, error: data.error || 'Verifikasi kode gagal.' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Kendala jaringan verifikasi.' }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loginWithGoogle = useCallback(async (
    email?: string, 
    name?: string, 
    options?: { returnTo?: string }
  ) => {
    setIsLoading(true)
    try {
      // 1. Jika ada email manual yang diberikan
      if (email && email.trim()) {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name }),
        })
        const data = await res.json()
        if (data.success && data.user) {
          saveUserSession(data.user)
          return { success: true, user: data.user }
        }
        return { success: false, error: data.error || 'Autentikasi Google gagal.' }
      }

      // 2. Minta URL otorisasi Google OAuth resmi dari backend
      const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'
      const browserOrigin = typeof window !== 'undefined' ? window.location.origin : ''
      const targetReturn = options?.returnTo || currentPath
      const urlRes = await fetch(`/api/auth/google/url?returnTo=${encodeURIComponent(targetReturn)}&origin=${encodeURIComponent(browserOrigin)}`)
      const urlData = await urlRes.json()

      // Jika Google OAuth sudah terkonfigurasi, arahkan pengguna ke halaman login Google resmi
      if (urlData.success && urlData.url) {
        if (typeof window !== 'undefined') {
          window.location.href = urlData.url
        }
        return { success: true, redirecting: true }
      }

      return {
        success: false,
        isConfigMissing: true,
        error: urlData.error || 'Google OAuth belum dikonfigurasi di file .env. Silakan gunakan form Masuk / Daftar di bawah.',
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal terhubung ke layanan Google.' }
    } finally {
      setIsLoading(false)
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
        sendOtp,
        loginWithOtp,
        loginWithGoogle,
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
