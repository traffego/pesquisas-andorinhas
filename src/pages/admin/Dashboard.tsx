import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { dbService, type Objeto, type Lider, type Pesquisa } from '../../services/db'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  FolderGit2, 
  Users2, 
  ArrowUpRight, 
  FilePlus,
  MessageSquare,
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
  const [periodo, setPeriodo] = useState<'7d' | '30d'>('30d')
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

  // 1. Respostas por dia filtrado por período
  const respostasPorDia = useMemo(() => {
    const dias = periodo === '7d' ? 7 : 30
    const map: Record<string, number> = {}
    for (let i = dias - 1; i >= 0; i--) {
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
  }, [respostas, periodo])

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

      {/* Seção de Gráficos Principais (NO TOPO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Histórico */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="font-bold text-foreground">Volume de Respostas</h3>
              <p className="text-xs text-muted-foreground">Envio diário no período selecionado</p>
            </div>
            <div className="flex bg-muted p-1 rounded-xl gap-1 self-start sm:self-auto">
              <button
                onClick={() => setPeriodo('7d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  periodo === '7d' 
                    ? 'bg-card text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                7 dias
              </button>
              <button
                onClick={() => setPeriodo('30d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  periodo === '30d' 
                    ? 'bg-card text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                30 dias
              </button>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">{respostas.length}</span>
            <span className="text-xs text-muted-foreground font-medium">respostas coletadas no total</span>
          </div>

          <div className="h-[280px] w-full pt-2">
            {respostas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <span>Sem dados de respostas para o período.</span>
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
                    strokeWidth={2.5}
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

      {/* Gráficos Secundários: Barras Horizontais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 3: Respostas por Objeto */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="border-b border-border pb-4">
            <h3 className="font-bold text-foreground">Distribuição por Objeto</h3>
            <p className="text-xs text-muted-foreground">Projetos ou eventos com maior engajamento (Top 5)</p>
          </div>
          <div className="h-[220px] w-full pt-4">
            {respostas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <FolderGit2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <span>Nenhum objeto com respostas.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={respostasPorObjeto} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#1f2937' : '#e5e7eb'} />
                  <XAxis 
                    type="number"
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                    width={100}
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
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 4: Respostas por Líder */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="border-b border-border pb-4">
            <h3 className="font-bold text-foreground">Liderança de Campo</h3>
            <p className="text-xs text-muted-foreground">Respostas coletadas por líder de campo (Top 5)</p>
          </div>
          <div className="h-[220px] w-full pt-4">
            {respostas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                <Users2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <span>Nenhum líder com respostas.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={respostasPorLider} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#1f2937' : '#e5e7eb'} />
                  <XAxis 
                    type="number"
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                    width={100}
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
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recentes e Resumo (EMBAIXO) */}
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

        {/* Resumo do Sistema */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-foreground border-b border-border pb-4">Resumo Geral</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/40 rounded-xl border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Pesquisas</p>
                <p className="text-xl font-extrabold text-foreground mt-1">{pesquisas.length}</p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{totalPublicadas} ativas</p>
              </div>
              <div className="p-4 bg-muted/40 rounded-xl border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Líderes</p>
                <p className="text-xl font-extrabold text-foreground mt-1">{lideres.length}</p>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Cadastrados</p>
              </div>
              <div className="p-4 bg-muted/40 rounded-xl border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Objetos</p>
                <p className="text-xl font-extrabold text-foreground mt-1">{objetos.length}</p>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Projetos/Eventos</p>
              </div>
              <div className="p-4 bg-muted/40 rounded-xl border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Engajamento</p>
                <p className="text-xl font-extrabold text-foreground mt-1">{taxaEngajamento}</p>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Resp./pesquisa</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
