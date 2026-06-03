import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ShieldAlert, ArrowRight } from 'lucide-react'
import logoImg from '../assets/logo.png'

export const Login: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    if (user) navigate('/admin/dashboard')
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/admin/dashboard')
    } catch (err: any) {
      setErrorMsg('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden text-foreground">
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-primary/5 blur-[100px]"></div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <img src={logoImg} alt="Andorinha Logo" className="h-14 w-auto object-contain mb-4 dark:bg-white dark:rounded-xl dark:p-2" />
          <p className="text-muted-foreground text-sm text-center">
            Acesso restrito. Faça login para continuar.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl border flex gap-3 text-sm bg-destructive/10 border-destructive/20 text-destructive">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
            ) : (
              <>
                Entrar no painel
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
