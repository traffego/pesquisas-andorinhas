import React from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { 
  LayoutDashboard, 
  FolderGit2, 
  Users2, 
  ClipboardList, 
  LogOut, 
  Bird, 
  DatabaseZap,
  Info,
  Sun,
  Moon
} from 'lucide-react'

export const AdminLayout: React.FC = () => {
  const { user, signOut, isMocked } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const menuItems = [
    { label: 'Painel Geral', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Projetos', path: '/admin/projetos', icon: FolderGit2 },
    { label: 'Líderes', path: '/admin/lideres', icon: Users2 },
    { label: 'Pesquisas', path: '/admin/pesquisas', icon: ClipboardList },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-md flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl text-primary border border-primary/20">
            <Bird className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Andorinha
            </h1>
            <p className="text-xs text-muted-foreground">Gestão de Pesquisas</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info / Banner Mock */}
        <div className="p-4 border-t border-border space-y-3">
          {isMocked && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-600 dark:text-amber-300 flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Modo Demo Local</p>
                <p className="opacity-80 mt-0.5">Dados salvos no navegador. Configure o .env para usar Supabase real.</p>
              </div>
            </div>
          )}
          {!isMocked && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <DatabaseZap className="h-4 w-4" />
              <span className="font-medium">Supabase Conectado</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-2">
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.user_metadata?.nome || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto bg-background/50">
        <header className="h-16 border-b border-border bg-card/25 backdrop-blur-sm px-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {menuItems.find(i => isActive(i.path))?.label || 'Painel'}
          </h2>
          <div className="flex items-center gap-4">
            {/* Botão de Alternância de Tema */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
              title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
