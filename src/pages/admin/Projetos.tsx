import React, { useState, useEffect } from 'react'
import { dbService, type Projeto } from '../../services/db'
import { Plus, Edit2, Trash2, X, FolderKanban } from 'lucide-react'

export const Projetos: React.FC = () => {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Form states
  const [id, setId] = useState<string | undefined>(undefined)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')

  useEffect(() => {
    loadProjetos()
  }, [])

  const loadProjetos = async () => {
    setLoading(true)
    try {
      const data = await dbService.getProjetos()
      setProjetos(data)
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

  const handleOpenEdit = (p: Projeto) => {
    setId(p.id)
    setNome(p.nome)
    setDescricao(p.descricao || '')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    try {
      await dbService.saveProjeto({ id, nome, descricao })
      setIsModalOpen(false)
      loadProjetos()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este projeto e todas as pesquisas associadas?')) return
    try {
      await dbService.deleteProjeto(id)
      loadProjetos()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Projetos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Agrupe suas pesquisas por projetos de campanha ou cliente.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Novo Projeto
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : projetos.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/50">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/45 mb-4 animate-bounce" />
          <h3 className="font-bold text-muted-foreground text-lg">Nenhum projeto encontrado</h3>
          <p className="text-muted-foreground/80 text-sm mt-1 mb-6">Crie seu primeiro projeto para começar a organizar as pesquisas.</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all cursor-pointer shadow-sm"
          >
            Cadastrar Projeto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projetos.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/20 transition-all group shadow-sm"
            >
              <div>
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{p.nome}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                  {p.descricao || 'Sem descrição cadastrada para este projeto.'}
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-2 rounded-lg bg-muted hover:bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-2 rounded-lg bg-muted hover:bg-destructive/10 border border-border text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-up text-foreground">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
              <h3 className="text-lg font-bold text-foreground">{id ? 'Editar Projeto' : 'Criar Novo Projeto'}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Nome do Projeto
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Campanha Prefeito 2026"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Descrição
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Escreva detalhes sobre o projeto..."
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 rounded-xl shadow-lg shadow-primary/10 transition-all cursor-pointer"
                >
                  {id ? 'Salvar Alterações' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
