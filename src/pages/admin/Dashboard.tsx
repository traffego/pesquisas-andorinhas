import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { dbService, type Objeto, type Lider, type Pesquisa } from '../../services/db'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  FolderGit2, 
  Users2, 
  ClipboardList, 
  ArrowUpRight, 
  FilePlus,
  MessageSquare,
  TrendingUp,
  Clock,
  Calendar
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts'

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e']

export const Dashboard: React.FC = () => {
  const [objetos, setObjetos] = useState<Objeto[]>([])
  const [lideres, setLideres] = useState<Lider[]>([])
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([])
  const [respostas, setRespostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    async function loadData() {
      try {
        const [objData, lidData, pesqData] = await Promise.all([
          dbService.getObjetos(),
          dbService.getLideres(),
          dbService.getPesquisas()
        ])
        setObjetos(objData)
        setLideres(lidData)
        setPesquisas(pesqData)

        const pesqIds = pesqData.map(p => p.id)
        if (pesqIds.length > 0) {
          const { respostas: respData } = await dbService.getRelatoriosGlobais(pesqIds)
          setRespostas(respData || [])
        } else {
          setRespostas([])
        }
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // 1. Respostas por dia nos últimos 30 dias
  const respostasPorDia = useMemo(() => {
    const map: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      map[key] = 0
    }
    
    respostas.forEach(r => {
      if (!r.created_at) return
      const key = new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (map[key] !== undefined) {
        map[key]++
      }
    })
    
    return Object.entries(map).map(([data, total]) => ({ data, total }))
  }, [respostas])

  // 2. Respostas por Pesquisa (Top 5)
  const respostasPorPesquisa = useMemo(() => {
    const map: Record<string, number> = {}
    respostas.forEach(r => {
      const key = r.pesquisa_titulo || 'Sem Título'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [respostas])

  // 3. Respostas por Objeto (Top 5)
  const respostasPorObjeto = useMemo(() => {
    const map: Record<string, number> = {}
    respostas.forEach(r => {
      const key = r.objeto_nome || 'Sem Objeto'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [respostas])

  // 4. Respostas por Líder (Top 5)
  const respostasPorLider = useMemo(() => {
    const map: Record<string, number> = {}
    respostas.forEach(r => {
      const key = r.lider_nome || 'Sem Líder'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [respostas])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const totalPublicadas = pesquisas.filter(p => p.publicada).length
  const taxaEngajamento = pesquisas.length > 0 ? (respostas.length / pesquisas.length).toFixed(1) : '0'

  const metricas = [
    { 
      label: 'Total de Respostas', 
      valor: respostas.length, 
      sub: `${taxaEngajamento} por pesquisa`, 
      icon: MessageSquare, 
      color: 'from-blue-500/10 to-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', 
      path: '/admin/relatorios' 
    },
    { 
      label: 'Pesquisas Ativas', 
      valor: `${totalPublicadas}/${pesquisas.length}`, 
      sub: `${pesquisas.length - totalPublicadas} rascunhos`, 
      icon: ClipboardList, 
      color: 'from-primary/10 to-violet-500/10 text-primary border-primary/20', 
      path: '/admin/pesquisas' 
    },
    { 
      label: 'Líderes Cadastrados', 
      valor: lideres.length, 
      sub: 'Mapeamento de campo', 
      icon: Users2, 
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', 
      path: '/admin/lideres' 
    },
    { 
      label: 'Objetos Ativos', 
      valor: objetos.length, 
      sub: 'Projetos e eventos', 
      icon: FolderGit2, 
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', 
      path: '/admin/objetos' 
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in text-foreground">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Painel Geral</h1>
          <p className="text-xs text-muted-foreground">Estatísticas e monitoramento em tempo real</p>
        </div>
        <Link
          to="/admin/pesquisas"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
        >
          <FilePlus className="h-4 w-4" />
          Nova Pesquisa
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricas.map((met, i) => {
          const Icon = met.icon
          return (
            <Link 
              key={i} 
              to={met.path}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.01]"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{met.label}</p>
                  <p className="text-3xl font-extrabold text-foreground tracking-tight">{met.valor}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{met.sub}</p>
                </div>
                <div className={`rounded-xl p-3 bg-gradient-to-br border ${met.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-primary transition-colors font-medium">
                <span>Ver detalhes</span>
                <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Seção de Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Histórico */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-bold text-foreground">Volume de Respostas</h3>
              <p className="text-xs text-muted-foreground">Respostas recebidas por dia nos últimos 30 dias</p>
            </div>
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="h-[300px] w-full pt-4">
            {respostas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <span>Sem dados de respostas nos últimos 30 dias.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={respostasPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRespostas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1f2937' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="data" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? 'hsl(var(--card))' : '#ffffff',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="var(--color-primary)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRespostas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Participação por Pesquisa */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="border-b border-border pb-4">
            <h3 className="font-bold text-foreground">Top Pesquisas</h3>
            <p className="text-xs text-muted-foreground">Distribuição das respostas por pesquisa</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center py-4">
            {respostas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <span>Nenhuma resposta disponível.</span>
              </div>
            ) : (
              <>
                <div className="h-[180px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={respostasPorPesquisa}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {respostasPorPesquisa.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDark ? 'hsl(var(--card))' : '#ffffff',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.75rem',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex flex-col gap-2 mt-4 max-h-[140px] overflow-y-auto pr-1">
                  {respostasPorPesquisa.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-muted-foreground truncate font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-foreground ml-2 shrink-0">
                        {item.value} ({((item.value / (respostas.length || 1)) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos Secundários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 3: Respostas por Objeto */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="border-b border-border pb-4">
            <h3 className="font-bold text-foreground">Top Objetos</h3>
            <p className="text-xs text-muted-foreground">Total de respostas por projeto ou evento (Top 5)</p>
          </div>
          <div className="h-[260px] w-full pt-4">
            {respostas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <FolderGit2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <span>Nenhum objeto com respostas.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={respostasPorObjeto} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1f2937' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                    contentStyle={{
                      backgroundColor: isDark ? 'hsl(var(--card))' : '#ffffff',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 4: Respostas por Líder */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="border-b border-border pb-4">
            <h3 className="font-bold text-foreground">Top Líderes</h3>
            <p className="text-xs text-muted-foreground">Total de respostas por líder de campo (Top 5)</p>
          </div>
          <div className="h-[260px] w-full pt-4">
            {respostas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <Users2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <span>Nenhum líder com respostas.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={respostasPorLider} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1f2937' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                    contentStyle={{
                      backgroundColor: isDark ? 'hsl(var(--card))' : '#ffffff',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recentes e Objetos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividades Recentes */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <div>
              <h3 className="font-bold text-foreground">Respostas Recentes</h3>
              <p className="text-xs text-muted-foreground">Últimas participações enviadas no sistema</p>
            </div>
            <Link to="/admin/relatorios" className="text-xs text-primary hover:underline font-semibold">Ver todas</Link>
          </div>

          {respostas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              Nenhuma resposta registrada no momento.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {respostas.slice(0, 5).map((r) => (
                <div key={r.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0 group">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {r.pesquisa_titulo}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {r.objeto_nome && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium border border-border">
                          📁 {r.objeto_nome}
                        </span>
                      )}
                      {r.lider_nome && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium border border-border">
                          👤 {r.lider_nome}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(r.created_at).toLocaleDateString('pt-BR')} às {new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <Link 
                    to={`/admin/pesquisas/${r.pesquisa_id}/relatorios`}
                    className="inline-flex items-center gap-1 text-xs text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground border border-primary/20 px-2.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer"
                  >
                    Relatório
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Objetos Rápidos */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-foreground">Objetos Ativos</h3>
                <p className="text-xs text-muted-foreground">Projetos e eventos cadastrados</p>
              </div>
              <Link to="/admin/objetos" className="text-xs text-primary hover:underline font-semibold">Ver todos</Link>
            </div>

            {objetos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum objeto cadastrado.
              </div>
            ) : (
              <div className="space-y-3">
                {objetos.slice(0, 4).map((obj) => {
                  const count = pesquisas.filter(pesq => pesq.objeto_id === obj.id).length
                  return (
                    <div key={obj.id} className="p-3 bg-muted/50 rounded-xl border border-border flex items-center justify-between hover:border-primary/20 transition-all">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-foreground truncate">
                          {obj.tipo === 'projeto' ? '📁' : '📅'} {obj.nome}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{obj.descricao || 'Sem descrição'}</p>
                      </div>
                      <span className="text-xs bg-card text-primary border border-border px-2.5 py-1 rounded-lg font-bold shrink-0">
                        {count} {count === 1 ? 'Pesq.' : 'Pesqs.'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
