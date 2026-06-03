import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dbService, type Fluxo } from '../../services/db'
import { Plus, Edit2, Trash2, X, GitFork, ArrowRight } from 'lucide-react'

export const Fluxos: React.FC = () => {
  const [fluxos, setFluxos] = useState<Fluxo[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form states
  const [id, setId] = useState<string | undefined>(undefined)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')

  useEffect(() => {
    loadFluxos()
  }, [])

  const loadFluxos = async () => {
    setLoading(true)
    try {
      const data = await dbService.getFluxos()
      setFluxos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setId(undefined)
    setNome('')
    setDescricao('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (f: Fluxo) => {
    setId(f.id)
    setNome(f.nome)
    setDescricao(f.descricao || '')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    try {
      const defaultFlowData = {
        nodes: [
          { id: 'start', type: 'start', position: { x: 250, y: 150 }, data: { label: 'Início' } },
          { id: 'end', type: 'end', position: { x: 250, y: 550 }, data: { label: 'Fim' } }
        ],
        edges: []
      }

      const existingFlow = id ? fluxos.find(f => f.id === id) : null
      const flowData = existingFlow ? existingFlow.flow_data : defaultFlowData

      await dbService.saveFluxo({ 
        id, 
        nome, 
        descricao,
        flow_data: flowData
      })
      setIsModalOpen(false)
      loadFluxos()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (flowId: string) => {
    if (!confirm('Deseja realmente excluir este fluxo? Pesquisas associadas podem parar de funcionar.')) return
    try {
      await dbService.deleteFluxo(flowId)
      loadFluxos()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fluxos de Pesquisa</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Crie e gerencie as estruturas lógicas de perguntas reutilizáveis para suas pesquisas.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Novo Fluxo
        </button>
      </div>

      {fluxos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-2xl bg-card/20 backdrop-blur-sm">
          <GitFork className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground">Nenhum fluxo encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Comece criando um fluxo de perguntas clicando no botão "Novo Fluxo" acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fluxos.map((f) => (
            <div
              key={f.id}
              className="group relative rounded-2xl border border-border bg-card/45 hover:bg-card hover:border-zinc-800 transition-all duration-300 p-6 flex flex-col justify-between shadow-sm overflow-hidden"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/15">
                    <GitFork className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(f)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      title="Editar Detalhes"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                      title="Excluir Fluxo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {f.nome}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {f.descricao || 'Sem descrição cadastrada.'}
                  </p>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 mt-5 flex justify-between items-center gap-4">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Criado em {f.created_at ? new Date(f.created_at).toLocaleDateString() : '--'}
                </span>
                
                <Link
                  to={`/admin/fluxos/${f.id}/builder`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover hover:gap-1.5 transition-all"
                >
                  <span>Desenhar Fluxo</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-5">
              <h3 className="text-lg font-bold text-zinc-100">
                {id ? 'Editar Detalhes do Fluxo' : 'Novo Fluxo de Perguntas'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Nome do Fluxo
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Censo Demográfico Comunitário"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 focus:border-primary focus:outline-none transition-colors text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Descrição
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o propósito ou as regras gerais deste fluxo."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 focus:border-primary focus:outline-none transition-colors text-sm resize-none shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-lg shadow-primary/20 transition-all"
                >
                  {id ? 'Salvar Detalhes' : 'Criar e Prosseguir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
