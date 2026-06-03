import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dbService, type Projeto, type Lider, type Pesquisa } from '../../services/db'
import { 
  FolderGit2, 
  Users2, 
  ClipboardList, 
  ArrowUpRight, 
  Sparkles,
  CheckCircle,
  XCircle,
  FilePlus,
  Play
} from 'lucide-react'

export const Dashboard: React.FC = () => {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [lideres, setLideres] = useState<Lider[]>([])
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [projData, lidData, pesqData] = await Promise.all([
          dbService.getProjetos(),
          dbService.getLideres(),
          dbService.getPesquisas()
        ])
        setProjetos(projData)
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
    { label: 'Projetos', valor: projetos.length, icon: FolderGit2, color: 'from-blue-500/20 to-cyan-500/20 text-cyan-400', path: '/admin/projetos' },
    { label: 'Líderes', valor: lideres.length, icon: Users2, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400', path: '/admin/lideres' },
    { label: 'Pesquisas', valor: pesquisas.length, icon: ClipboardList, color: 'from-primary/20 to-violet-500/20 text-violet-400', path: '/admin/pesquisas' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-900/60 p-8 shadow-xl">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="h-4 w-4" />
            <span>Fluxo Condicional Inteligente</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Olá, seja bem-vindo ao Andorinha
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            Crie fluxos de perguntas dinâmicos, conecte múltiplos ramais e filtre respostas em tempo real. Tudo isso desenhando de forma visual com React Flow.
          </p>
          <div className="flex gap-4">
            <Link
              to="/admin/pesquisas"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all"
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
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-zinc-700/80 transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">{met.label}</p>
                  <p className="text-3xl font-extrabold text-zinc-100">{met.valor}</p>
                </div>
                <div className={`rounded-xl p-3 bg-gradient-to-br ${met.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
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
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <h3 className="font-bold text-zinc-200">Pesquisas Recentes</h3>
            <Link to="/admin/pesquisas" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>

          {pesquisas.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              <ClipboardList className="h-12 w-12 mx-auto text-zinc-700 mb-3" />
              Nenhuma pesquisa cadastrada ainda.
            </div>
          ) : (
            <div className="divide-y divide-zinc-900">
              {pesquisas.slice(0, 5).map((p) => {
                const proj = projetos.find(proj => proj.id === p.projeto_id)
                return (
                  <div key={p.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0 group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-200 group-hover:text-primary transition-colors truncate">
                        {p.titulo}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {proj && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-medium">
                            {proj.nome}
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">
                          {new Date(p.created_at || '').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {p.publicada ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-1 rounded-lg">
                          <CheckCircle className="h-3 w-3" /> Publicada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800/40 border border-zinc-850 px-2 py-1 rounded-lg">
                          <XCircle className="h-3 w-3" /> Rascunho
                        </span>
                      )}
                      <Link 
                        to={`/admin/pesquisas/${p.id}/builder`}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-primary hover:text-white transition-colors"
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

        {/* Projetos Rápidos */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <h3 className="font-bold text-zinc-200">Projetos Ativos</h3>
            <Link to="/admin/projetos" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>

          {projetos.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              Nenhum projeto cadastrado.
            </div>
          ) : (
            <div className="space-y-3">
              {projetos.slice(0, 4).map((p) => {
                const count = pesquisas.filter(pesq => pesq.projeto_id === p.id).length
                return (
                  <div key={p.id} className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-zinc-300">{p.nome}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{p.descricao || 'Sem descrição'}</p>
                    </div>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg font-bold">
                      {count} {count === 1 ? 'Pesquisa' : 'Pesquisas'}
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
