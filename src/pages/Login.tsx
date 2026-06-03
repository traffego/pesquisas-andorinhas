import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Bird, ShieldAlert, ArrowRight, Sparkles } from 'lucide-react'

export const Login: React.FC = () => {
  const { user, isMocked, signInWithMock } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Se o usuário já estiver logado, redireciona
  React.useEffect(() => {
    if (user) {
      navigate('/admin/dashboard')
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    if (isMocked) {
      // Simula login
      signInWithMock(email || 'demo@andorinha.dev')
      setLoading(false)
      navigate('/admin/dashboard')
      return
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome: email.split('@')[0]
            }
          }
        })
        if (error) throw error
        setErrorMsg('Conta criada com sucesso! Verifique seu e-mail de confirmação ou faça o login.')
        setIsSignUp(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        navigate('/admin/dashboard')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar requisição.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = () => {
    signInWithMock('demo@andorinha.dev')
    navigate('/admin/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden text-foreground">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-primary/5 blur-[100px]"></div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-8 shadow-2xl relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary border border-primary/20 mb-4">
            <Bird className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 dark:to-blue-400 bg-clip-text text-transparent">
            Andorinha
          </h2>
          <p className="text-muted-foreground text-sm mt-2 text-center">
            {isMocked 
              ? 'Conectando no modo de simulação offline.'
              : 'Faça login para gerenciar suas pesquisas.'}
          </p>
        </div>

        {errorMsg && (
          <div className={`mb-6 p-4 rounded-xl border flex gap-3 text-sm ${
            errorMsg.includes('sucesso') 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}>
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Endereço de e-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@dominio.com"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
          </div>

          {!isMocked && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha secreta"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
            ) : (
              <>
                {isSignUp ? 'Criar minha conta' : 'Entrar no painel'}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {isMocked && (
          <div className="mt-6 border-t border-border pt-6">
            <button
              onClick={handleDemoLogin}
              className="w-full rounded-xl border border-border bg-background py-3 font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Entrar direto como Admin Demo
            </button>
          </div>
        )}

        {!isMocked && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? 'Já tem conta? Entrar agora' : 'Não tem conta? Cadastrar-se'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
