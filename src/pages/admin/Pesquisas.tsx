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
  EyeOff 
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Pesquisas</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Gerencie seus formulários de pesquisa e conexões de fluxo condicional.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all cursor-pointer"
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
        <div className="text-center py-20 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10">
          <ClipboardList className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
          <h3 className="font-bold text-zinc-400 text-lg">Nenhuma pesquisa encontrada</h3>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Crie sua primeira pesquisa para começar a desenhar fluxos de perguntas.</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800/80 transition-all cursor-pointer"
          >
            Cadastrar Pesquisa
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Pesquisa / Projeto</th>
                  <th className="p-4">Líder</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Link Público</th>
                  <th className="p-4 pr-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {pesquisas.map((p) => {
                  const proj = projetos.find(pr => pr.id === p.projeto_id)
                  const lid = lideres.find(l => l.id === p.lider_id)

                  return (
                    <tr key={p.id} className="hover:bg-zinc-900/20 transition-colors group">
                      <td className="p-4 pl-6">
                        <div>
                          <p className="font-semibold text-zinc-200 group-hover:text-primary transition-colors">{p.titulo}</p>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            Projeto: {proj?.nome || <span className="italic text-zinc-600">Sem projeto</span>}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400 text-sm">
                        {lid?.nome || <span className="italic text-zinc-600 text-xs">Sem líder</span>}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => togglePublicada(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer select-none transition-colors ${
                            p.publicada
                              ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400'
                              : 'bg-zinc-800/40 border-zinc-850 text-zinc-400 hover:border-zinc-700'
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
                      <td className="p-4 text-sm text-zinc-500">
                        {p.publicada ? (
                          <a 
                            href={`/r/${p.token}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline hover:text-violet-400 transition-colors"
                          >
                            /r/{p.token}
                          </a>
                        ) : (
                          <span className="italic text-zinc-600">Falta publicar</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right space-x-1 whitespace-nowrap">
                        <Link
                          to={`/admin/pesquisas/${p.id}/builder`}
                          className="inline-flex items-center gap-1.5 p-2 rounded-lg bg-zinc-850 hover:bg-primary hover:text-white text-zinc-400 transition-colors text-xs font-semibold"
                          title="Desenhar Fluxo"
                        >
                          <GitFork className="h-3.5 w-3.5" />
                          <span>Fluxo</span>
                        </Link>

                        <Link
                          to={`/admin/pesquisas/${p.id}/distribuir`}
                          className="inline-flex items-center gap-1.5 p-2 rounded-lg bg-zinc-850 hover:bg-blue-600 hover:text-white text-zinc-400 transition-colors text-xs font-semibold"
                          title="Compartilhar"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Enviar</span>
                        </Link>

                        <Link
                          to={`/admin/pesquisas/${p.id}/relatorios`}
                          className="inline-flex items-center gap-1.5 p-2 rounded-lg bg-zinc-850 hover:bg-emerald-600 hover:text-white text-zinc-400 transition-colors text-xs font-semibold"
                          title="Relatórios"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>Métricas</span>
                        </Link>

                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                          title="Editar Info"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 rounded-lg bg-zinc-850 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition-colors"
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
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-5">
              <h3 className="text-lg font-bold text-zinc-100">{id ? 'Editar Pesquisa' : 'Criar Nova Pesquisa'}</h3>
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
                  Título da Pesquisa
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Pesquisa Eleitoral Bairro Centro"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-primary focus:outline-none transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Descrição / Objetivo
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva sobre qual tema é esta pesquisa..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-primary focus:outline-none transition-colors text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Projeto Associado
                  </label>
                  <select
                    value={projetoId}
                    onChange={(e) => setProjetoId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-200 focus:border-primary focus:outline-none transition-colors text-sm"
                  >
                    <option value="">Sem projeto</option>
                    {projetos.map(proj => (
                      <option key={proj.id} value={proj.id}>{proj.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Líder Associado
                  </label>
                  <select
                    value={liderId}
                    onChange={(e) => setLiderId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-200 focus:border-primary focus:outline-none transition-colors text-sm"
                  >
                    <option value="">Nenhum líder</option>
                    {lideres.map(lid => (
                      <option key={lid.id} value={lid.id}>{lid.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-800 p-3 rounded-xl">
                <input
                  type="checkbox"
                  id="publicada"
                  checked={publicada}
                  onChange={(e) => setPublicada(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-800 text-primary bg-zinc-950 focus:ring-primary focus:ring-offset-zinc-900"
                />
                <label htmlFor="publicada" className="text-sm font-semibold text-zinc-300 select-none cursor-pointer">
                  Publicar Pesquisa de imediato?
                </label>
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
