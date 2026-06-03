import React from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, 
  FolderGit2, 
  Users2, 
  ClipboardList, 
  LogOut, 
  Bird, 
  DatabaseZap,
  Info
} from 'lucide-react'

export const AdminLayout: React.FC = () => {
  const { user, signOut, isMocked } = useAuth()
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
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-xl text-primary border border-primary/30">
            <Bird className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
              Andorinha
            </h1>
            <p className="text-xs text-zinc-500">Gestão de Pesquisas</p>
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
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-100'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info / Banner Mock */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          {isMocked && (
            <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3 text-xs text-amber-300 flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Modo Demo Local</p>
                <p className="text-amber-400/80 mt-0.5">Dados salvos no navegador. Configure o .env para usar Supabase real.</p>
              </div>
            </div>
          )}
          {!isMocked && (
            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 text-xs text-emerald-400 flex items-center gap-2">
              <DatabaseZap className="h-4 w-4 text-emerald-400" />
              <span className="font-medium">Supabase Conectado</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-2">
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-zinc-200 truncate">
                {user?.user_metadata?.nome || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-zinc-400 hover:bg-red-950/30 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="h-16 border-b border-zinc-900 bg-zinc-900/20 backdrop-blur-sm px-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-300">
            {menuItems.find(i => isActive(i.path))?.label || 'Painel'}
          </h2>
          <div className="flex items-center gap-4">
            {/* Espaço para ações globais se necessário */}
          </div>
        </header>

        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
