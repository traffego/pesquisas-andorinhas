import React, { useState, useEffect } from 'react'
import { dbService, type CategoriaCampo } from '../../services/db'
import { Plus, Pencil, Trash2, X, Tag, Layers } from 'lucide-react'

const CATEGORIAS_BASE = [
  'Dados pessoais',
  'Sexo',
  'Idade',
  'Renda',
  'Faixa etária',
  'Local',
]

export const CategoriasCampo: React.FC = () => {
  const [categorias, setCategorias] = useState<CategoriaCampo[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>(undefined)
  const [nome, setNome] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCategorias()
  }, [])

  const loadCategorias = async () => {
    setLoading(true)
    try {
      const data = await dbService.getCategorias()
      setCategorias(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeedBase = async () => {
    setSeeding(true)
    try {
      for (const nome of CATEGORIAS_BASE) {
        await dbService.saveCategoria({ nome })
      }
      await loadCategorias()
    } catch (err) {
      console.error(err)
    } finally {
      setSeeding(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingId(undefined)
    setNome('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (c: CategoriaCampo) => {
    setEditingId(c.id)
    setNome(c.nome)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setSaving(true)
    try {
      await dbService.saveCategoria({ id: editingId, nome: nome.trim() })
      setIsModalOpen(false)
      await loadCategorias()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, nomeCat: string) => {
    if (!confirm(`Deseja excluir a categoria "${nomeCat}"? Perguntas vinculadas perderão a categoria.`)) return
    try {
      await dbService.deleteCategoria(id)
      await loadCategorias()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Categorias de Campos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Classifique as perguntas dos fluxos para filtros avançados nos relatórios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {categorias.length === 0 && (
            <button
              onClick={handleSeedBase}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer disabled:opacity-50"
            >
              <Layers className="h-3.5 w-3.5" />
              {seeding ? 'Carregando...' : 'Inserir Categorias Base'}
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Categoria
          </button>
        </div>
      </div>

      {/* Lista */}
      {categorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed border-border rounded-2xl bg-card/20">
          <Tag className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-foreground">Nenhuma categoria criada</h3>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            Clique em "Inserir Categorias Base" para adicionar as categorias padrão, ou crie uma nova manualmente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categorias.map((cat) => (
            <div
              key={cat.id}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-zinc-700 transition-all duration-200 px-4 py-3.5 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/15 shrink-0">
                  <Tag className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-foreground truncate">{cat.nome}</span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.nome)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Badge contador */}
      {categorias.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {categorias.length} {categorias.length === 1 ? 'categoria' : 'categorias'} cadastrada{categorias.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-5">
              <h3 className="text-base font-bold text-zinc-100">
                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Dados pessoais"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 focus:border-primary focus:outline-none transition-colors text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
