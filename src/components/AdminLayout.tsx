import React from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import logoImg from '../assets/logo.png'
import { 
  LayoutDashboard, 
  FolderGit2, 
  Users2, 
  ClipboardList, 
  LogOut,
  Sun,
  Moon,
  GitFork,
  BarChart2
} from 'lucide-react'

export const AdminLayout: React.FC = () => {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const menuItems = [
    { label: 'Painel Geral', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Objetos', path: '/admin/objetos', icon: FolderGit2 },
    { label: 'Líderes', path: '/admin/lideres', icon: Users2 },
    { label: 'Fluxos', path: '/admin/fluxos', icon: GitFork },
    { label: 'Pesquisas', path: '/admin/pesquisas', icon: ClipboardList },
    { label: 'Relatórios', path: '/admin/relatorios', icon: BarChart2 },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-md flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-border flex items-center justify-center">
          <img src={logoImg} alt="Andorinha Logo" className="h-10 w-auto object-contain dark:bg-white dark:rounded-lg dark:p-1" />
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

        {/* User Info */}
        <div className="p-4 border-t border-border space-y-3">
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
