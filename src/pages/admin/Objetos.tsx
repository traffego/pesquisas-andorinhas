import React, { useState, useEffect } from 'react'
import { dbService, type Objeto } from '../../services/db'
import { Plus, Edit2, Trash2, X, FolderGit2, Calendar, FileText, Code, Tag, Info } from 'lucide-react'

export const Objetos: React.FC = () => {
  const [objetos, setObjetos] = useState<Objeto[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form states
  const [id, setId] = useState<string | undefined>(undefined)
  const [tipo, setTipo] = useState<'projeto' | 'evento'>('projeto')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [termoFomento, setTermoFomento] = useState('')
  const [codigoObjeto, setCodigoObjeto] = useState('')
  const [codigoPrograma, setCodigoPrograma] = useState('')
  const [nomePrograma, setNomePrograma] = useState('')

  useEffect(() => {
    loadObjetos()
  }, [])

  const loadObjetos = async () => {
    setLoading(true)
    try {
      const data = await dbService.getObjetos()
      setObjetos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setId(undefined)
    setTipo('projeto')
    setNome('')
    setDescricao('')
    setTermoFomento('')
    setCodigoObjeto('')
    setCodigoPrograma('')
    setNomePrograma('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (obj: Objeto) => {
    setId(obj.id)
    setTipo(obj.tipo)
    setNome(obj.nome)
    setDescricao(obj.descricao || '')
    setTermoFomento(obj.termo_fomento || '')
    setCodigoObjeto(obj.codigo_objeto || '')
    setCodigoPrograma(obj.codigo_programa || '')
    setNomePrograma(obj.nome_programa || '')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    try {
      await dbService.saveObjeto({
        id,
        tipo,
        nome,
        descricao: descricao || null,
        termo_fomento: termoFomento || null,
        codigo_objeto: codigoObjeto || null,
        codigo_programa: codigoPrograma || null,
        nome_programa: nomePrograma || null
      })
      setIsModalOpen(false)
      loadObjetos()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este objeto e todas as pesquisas associadas?')) return
    try {
      await dbService.deleteObjeto(id)
      loadObjetos()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Objetos (Projetos & Eventos)</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie os projetos e eventos da sua organização, integrando termos de fomento e programas.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Novo Objeto
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : objetos.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/50">
          <FolderGit2 className="h-12 w-12 mx-auto text-muted-foreground/45 mb-4 animate-bounce" />
          <h3 className="font-bold text-muted-foreground text-lg">Nenhum objeto encontrado</h3>
          <p className="text-muted-foreground/80 text-sm mt-1 mb-6">Cadastre seu primeiro projeto ou evento para começar a estruturar as pesquisas.</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all cursor-pointer shadow-sm"
          >
            Cadastrar Objeto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {objetos.map((obj) => (
            <div
              key={obj.id}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/20 transition-all group shadow-sm relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    obj.tipo === 'projeto' 
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                      : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                  }`}>
                    {obj.tipo === 'projeto' ? <FolderGit2 className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                    {obj.tipo}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">{obj.nome}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {obj.descricao || 'Sem descrição cadastrada.'}
                  </p>
                </div>

                <div className="border-t border-border pt-3 space-y-2 text-xs text-muted-foreground">
                  {obj.termo_fomento && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      <span>Fomento: <strong className="text-foreground">{obj.termo_fomento}</strong></span>
                    </div>
                  )}
                  {obj.codigo_objeto && (
                    <div className="flex items-center gap-2">
                      <Code className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      <span>Cód. Objeto: <strong className="text-foreground">{obj.codigo_objeto}</strong></span>
                    </div>
                  )}
                  {(obj.codigo_programa || obj.nome_programa) && (
                    <div className="flex gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/50 mt-1">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground/75">Programa</div>
                        {obj.codigo_programa && <div className="font-semibold text-foreground">{obj.codigo_programa}</div>}
                        {obj.nome_programa && <div className="text-[11px] line-clamp-2 leading-tight text-muted-foreground">{obj.nome_programa}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
                <button
                  onClick={() => handleOpenEdit(obj)}
                  className="p-2 rounded-lg bg-muted hover:bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(obj.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md my-8 rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-up text-foreground">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
              <h3 className="text-lg font-bold text-foreground">{id ? 'Editar Objeto' : 'Criar Novo Objeto'}</h3>
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
                  Tipo de Objeto
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo('projeto')}
                    className={`py-2 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      tipo === 'projeto' 
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' 
                        : 'bg-background border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Projeto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('evento')}
                    className={`py-2 px-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      tipo === 'evento' 
                        ? 'bg-purple-500/10 text-purple-500 border-purple-500/30' 
                        : 'bg-background border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Evento
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Nome do {tipo === 'projeto' ? 'Projeto' : 'Evento'}
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={`Ex: ${tipo === 'projeto' ? 'Campanha Esporte Amador 2026' : 'Semana da Inclusão Social'}`}
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
                  placeholder="Escreva detalhes sobre o objeto..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Termo de Fomento
                  </label>
                  <input
                    type="text"
                    value={termoFomento}
                    onChange={(e) => setTermoFomento(e.target.value)}
                    placeholder="Ex: 979754"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Código do Objeto
                  </label>
                  <input
                    type="text"
                    value={codigoObjeto}
                    onChange={(e) => setCodigoObjeto(e.target.value)}
                    placeholder="Ex: 10245"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Info className="h-3.5 w-3.5" />
                  Programa Associado
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Código do Programa
                    </label>
                    <input
                      type="text"
                      value={codigoPrograma}
                      onChange={(e) => setCodigoPrograma(e.target.value)}
                      placeholder="Ex: 5100020250028"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Nome do Programa
                    </label>
                    <textarea
                      value={nomePrograma}
                      onChange={(e) => setNomePrograma(e.target.value)}
                      placeholder="Ex: Desenvolvimento de Atividades e Apoio..."
                      rows={2}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                    />
                  </div>
                </div>
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
                  {id ? 'Salvar Alterações' : 'Criar Objeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
