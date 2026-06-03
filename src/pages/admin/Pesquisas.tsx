import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dbService, type Pesquisa, type Projeto, type Lider } from '../../services/db'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  ClipboardList, 
  GitFork, 
  Share2, 
  BarChart3, 
  Globe, 
  EyeOff,
  Check
} from 'lucide-react'

export const Pesquisas: React.FC = () => {
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [lideres, setLideres] = useState<Lider[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form states
  const [id, setId] = useState<string | undefined>(undefined)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [projetoId, setProjetoId] = useState<string>('')
  const [liderId, setLiderId] = useState<string>('')
  const [publicada, setPublicada] = useState(false)
  const [flowData, setFlowData] = useState<any>('{}')

  // Quick Add States
  const [isAddingProjeto, setIsAddingProjeto] = useState(false)
  const [novoProjetoNome, setNovoProjetoNome] = useState('')
  const [isAddingLider, setIsAddingLider] = useState(false)
  const [novoLiderNome, setNovoLiderNome] = useState('')

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [pesqData, projData, lidData] = await Promise.all([
        dbService.getPesquisas(),
        dbService.getProjetos(),
        dbService.getLideres()
      ])
      setPesquisas(pesqData)
      setProjetos(projData)
      setLideres(lidData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Gera um token aleatório e seguro
  const generateToken = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let token = ''
    for (let i = 0; i < 10; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  const handleOpenAdd = () => {
    setId(undefined)
    setTitulo('')
    setDescricao('')
    setProjetoId(projetos[0]?.id || '')
    setLiderId('')
    setPublicada(false)
    setFlowData({
      nodes: [
        { id: 'start', type: 'start', position: { x: 250, y: 150 }, data: { label: 'Início' } },
        { id: 'end', type: 'end', position: { x: 250, y: 550 }, data: { label: 'Fim' } }
      ],
      edges: []
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (p: Pesquisa) => {
    setId(p.id)
    setTitulo(p.titulo)
    setDescricao(p.descricao || '')
    setProjetoId(p.projeto_id || '')
    setLiderId(p.lider_id || '')
    setPublicada(p.publicada)
    setFlowData(p.flow_data)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return

    try {
      const token = id ? pesquisas.find(p => p.id === id)?.token || generateToken() : generateToken()
      await dbService.savePesquisa({
        id,
        titulo,
        descricao,
        token,
        publicada,
        projeto_id: projetoId || null,
        lider_id: liderId || null,
        flow_data: typeof flowData === 'string' ? JSON.parse(flowData) : flowData
      })
      setIsModalOpen(false)
      loadAllData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta pesquisa e todo o histórico de respostas?')) return
    try {
      await dbService.deletePesquisa(id)
      loadAllData()
    } catch (err) {
      console.error(err)
    }
  }

  const togglePublicada = async (p: Pesquisa) => {
    try {
      await dbService.savePesquisa({
        ...p,
        publicada: !p.publicada
      })
      loadAllData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveQuickProjeto = async () => {
    if (!novoProjetoNome.trim()) return
    try {
      const novoProj = await dbService.saveProjeto({
        nome: novoProjetoNome,
        descricao: ''
      })
      setProjetos(prev => [novoProj, ...prev])
      setProjetoId(novoProj.id)
      setNovoProjetoNome('')
      setIsAddingProjeto(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveQuickLider = async () => {
    if (!novoLiderNome.trim()) return
    try {
      const novoLid = await dbService.saveLider({
        nome: novoLiderNome,
        telefone: null,
        email: null
      })
      setLideres(prev => [novoLid, ...prev])
      setLiderId(novoLid.id)
      setNovoLiderNome('')
      setIsAddingLider(false)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pesquisas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie seus formulários de pesquisa e conexões de fluxo condicional.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nova Pesquisa
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : pesquisas.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/50">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/45 mb-4" />
          <h3 className="font-bold text-muted-foreground text-lg">Nenhuma pesquisa encontrada</h3>
          <p className="text-muted-foreground/80 text-sm mt-1 mb-6">Crie sua primeira pesquisa para começar a desenhar fluxos de perguntas.</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all cursor-pointer shadow-sm"
          >
            Cadastrar Pesquisa
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4 pl-6">Pesquisa / Projeto</th>
                  <th className="p-4">Líder</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Link Público</th>
                  <th className="p-4 pr-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pesquisas.map((p) => {
                  const proj = projetos.find(pr => pr.id === p.projeto_id)
                  const lid = lideres.find(l => l.id === p.lider_id)

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="p-4 pl-6">
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{p.titulo}</p>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Projeto: {proj?.nome || <span className="italic text-muted-foreground/60">Sem projeto</span>}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {lid?.nome || <span className="italic text-muted-foreground/60 text-xs">Sem líder</span>}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => togglePublicada(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer select-none transition-colors ${
                            p.publicada
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-muted border-border text-muted-foreground hover:border-zinc-400'
                          }`}
                        >
                          {p.publicada ? (
                            <>
                              <Globe className="h-3 w-3" /> Publicada
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" /> Rascunho
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {p.publicada ? (
                          <a 
                            href={`/r/${p.token}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline hover:text-blue-500 font-semibold transition-colors"
                          >
                            /r/{p.token}
                          </a>
                        ) : (
                          <span className="italic text-muted-foreground/65">Falta publicar</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right space-x-1 whitespace-nowrap">
                        <Link
                          to={`/admin/pesquisas/${p.id}/builder`}
                          className="inline-flex items-center gap-1.5 p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground border border-border text-muted-foreground transition-colors text-xs font-semibold cursor-pointer shadow-sm"
                          title="Desenhar Fluxo"
                        >
                          <GitFork className="h-3.5 w-3.5" />
                          <span>Fluxo</span>
                        </Link>

                        <Link
                          to={`/admin/pesquisas/${p.id}/distribuir`}
                          className="inline-flex items-center gap-1.5 p-2 rounded-lg bg-muted hover:bg-blue-600 hover:text-white border border-border text-muted-foreground transition-colors text-xs font-semibold cursor-pointer shadow-sm"
                          title="Compartilhar"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Enviar</span>
                        </Link>

                        <Link
                          to={`/admin/pesquisas/${p.id}/relatorios`}
                          className="inline-flex items-center gap-1.5 p-2 rounded-lg bg-muted hover:bg-emerald-600 hover:text-white border border-border text-muted-foreground transition-colors text-xs font-semibold cursor-pointer shadow-sm"
                          title="Relatórios"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>Métricas</span>
                        </Link>

                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-2 rounded-lg bg-muted hover:bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Editar Info"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 rounded-lg bg-muted hover:bg-destructive/10 border border-border text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-up text-foreground">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
              <h3 className="text-lg font-bold text-foreground">{id ? 'Editar Pesquisa' : 'Criar Nova Pesquisa'}</h3>
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
                  Título da Pesquisa
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Pesquisa Eleitoral Bairro Centro"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Descrição / Objetivo
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva sobre qual tema é esta pesquisa..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {isAddingProjeto ? (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Novo Projeto
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          required
                          placeholder="Nome..."
                          value={novoProjetoNome}
                          onChange={(e) => setNovoProjetoNome(e.target.value)}
                          className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveQuickProjeto}
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer transition-colors"
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingProjeto(false)
                            setNovoProjetoNome('')
                          }}
                          className="p-2 bg-muted hover:bg-card border border-border text-muted-foreground hover:text-foreground rounded-xl cursor-pointer transition-colors"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Projeto Associado
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsAddingProjeto(true)}
                          className="text-[10px] text-primary font-bold hover:opacity-80 cursor-pointer flex items-center gap-0.5"
                        >
                          <Plus className="h-2.5 w-2.5" /> Novo
                        </button>
                      </div>
                      <select
                        value={projetoId}
                        onChange={(e) => setProjetoId(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      >
                        <option value="">Sem projeto</option>
                        {projetos.map(proj => (
                          <option key={proj.id} value={proj.id}>{proj.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  {isAddingLider ? (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Novo Líder
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          required
                          placeholder="Nome..."
                          value={novoLiderNome}
                          onChange={(e) => setNovoLiderNome(e.target.value)}
                          className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveQuickLider}
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer transition-colors"
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingLider(false)
                            setNovoLiderNome('')
                          }}
                          className="p-2 bg-muted hover:bg-card border border-border text-muted-foreground hover:text-foreground rounded-xl cursor-pointer transition-colors"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Líder Associado
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsAddingLider(true)}
                          className="text-[10px] text-primary font-bold hover:opacity-80 cursor-pointer flex items-center gap-0.5"
                        >
                          <Plus className="h-2.5 w-2.5" /> Novo
                        </button>
                      </div>
                      <select
                        value={liderId}
                        onChange={(e) => setLiderId(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      >
                        <option value="">Nenhum líder</option>
                        {lideres.map(lid => (
                          <option key={lid.id} value={lid.id}>{lid.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-muted/50 border border-border p-3 rounded-xl">
                <input
                  type="checkbox"
                  id="publicada"
                  checked={publicada}
                  onChange={(e) => setPublicada(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary bg-background focus:ring-primary focus:ring-offset-background"
                />
                <label htmlFor="publicada" className="text-sm font-semibold text-foreground select-none cursor-pointer">
                  Publicar Pesquisa de imediato?
                </label>
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
                  {id ? 'Salvar Alterações' : 'Criar Pesquisa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
