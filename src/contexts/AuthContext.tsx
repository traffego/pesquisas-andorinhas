import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | { id: string; email: string; user_metadata: { nome: string } } | null
  loading: boolean
  isMocked: boolean
  signOut: () => Promise<void>
  signInWithMock: (email: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMocked, setIsMocked] = useState(false)

  // Verifica se o Supabase está configurado corretamente
  const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    return url && url !== 'https://placeholder-url.supabase.co' && key && key !== 'placeholder-key'
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsMocked(true)
      // Tenta recuperar usuário mockado do localStorage
      const mockUserStr = localStorage.getItem('andorinha_mock_user')
      if (mockUserStr) {
        setUser(JSON.parse(mockUserStr))
      }
      setLoading(false)
      return
    }

    // Fluxo real com Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    if (isMocked) {
      localStorage.removeItem('andorinha_mock_user')
      setUser(null)
      return
    }
    await supabase.auth.signOut()
  }

  const signInWithMock = (email: string) => {
    const mockUser = {
      id: 'mock-user-uuid-1234-5678',
      email,
      user_metadata: { nome: 'Administrador Demo' }
    }
    localStorage.setItem('andorinha_mock_user', JSON.stringify(mockUser))
    setUser(mockUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isMocked, signOut, signInWithMock }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
