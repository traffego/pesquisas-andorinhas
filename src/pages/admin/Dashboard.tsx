import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dbService, type Objeto, type Lider, type Pesquisa } from '../../services/db'
import { 
  FolderGit2, 
  Users2, 
  ClipboardList, 
  ArrowUpRight, 
  CheckCircle,
  XCircle,
  FilePlus,
  Play
} from 'lucide-react'

export const Dashboard: React.FC = () => {
  const [objetos, setObjetos] = useState<Objeto[]>([])
  const [lideres, setLideres] = useState<Lider[]>([])
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([])
  const [loading, setLoading] = useState(true)

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
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const metricas = [
    { label: 'Objetos', valor: objetos.length, icon: FolderGit2, color: 'from-blue-500/10 to-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', path: '/admin/objetos' },
    { label: 'Líderes', valor: lideres.length, icon: Users2, color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', path: '/admin/lideres' },
    { label: 'Pesquisas', valor: pesquisas.length, icon: ClipboardList, color: 'from-primary/10 to-violet-500/10 text-primary border-primary/20', path: '/admin/pesquisas' },
  ]

  return (
    <div className="space-y-8 animate-fade-in text-foreground">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card to-card/60 p-8 shadow-xl">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
            Olá, seja bem-vindo ao Andorinha
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Crie fluxos de perguntas dinâmicos, conecte múltiplos ramais e filtre respostas em tempo real. Tudo isso desenhado de forma visual e interativa com nosso construtor inteligente de fluxos.
          </p>
          <div className="flex gap-4">
            <Link
              to="/admin/pesquisas"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <FilePlus className="h-4 w-4" />
              Criar Pesquisa
            </Link>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metricas.map((met, i) => {
          const Icon = met.icon
          return (
            <Link 
              key={i} 
              to={met.path}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover:border-primary/30 transition-all duration-300 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{met.label}</p>
                  <p className="text-3xl font-extrabold text-foreground">{met.valor}</p>
                </div>
                <div className={`rounded-xl p-3 bg-gradient-to-br border ${met.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                <span>Ver detalhes</span>
                <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Pesquisas */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <h3 className="font-bold text-foreground">Pesquisas Recentes</h3>
            <Link to="/admin/pesquisas" className="text-xs text-primary hover:underline font-semibold">Ver todas</Link>
          </div>

          {pesquisas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              Nenhuma pesquisa cadastrada ainda.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pesquisas.slice(0, 5).map((p) => {
                const obj = objetos.find(obj => obj.id === p.objeto_id)
                return (
                  <div key={p.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0 group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {p.titulo}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {obj && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium border border-border">
                            {obj.tipo === 'projeto' ? '📁' : '📅'} {obj.nome}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.created_at || '').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {p.publicada ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg font-medium">
                          <CheckCircle className="h-3 w-3" /> Publicada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted border border-border px-2 py-1 rounded-lg font-medium">
                          <XCircle className="h-3 w-3" /> Rascunho
                        </span>
                      )}
                      <Link 
                        to={`/admin/pesquisas/${p.id}/builder`}
                        className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground border border-border transition-colors cursor-pointer"
                        title="Editar Fluxo"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Objetos Rápidos */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <h3 className="font-bold text-foreground">Objetos Ativos</h3>
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
                  <div key={obj.id} className="p-3 bg-muted/50 rounded-xl border border-border flex items-center justify-between">
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
  )
}
