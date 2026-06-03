import React, { useState, useEffect } from 'react'
import { dbService, type Lider } from '../../services/db'
import { Plus, Edit2, Trash2, X, Users, Phone, Mail } from 'lucide-react'

export const Lideres: React.FC = () => {
  const [lideres, setLideres] = useState<Lider[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form states
  const [id, setId] = useState<string | undefined>(undefined)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    loadLideres()
  }, [])

  const loadLideres = async () => {
    setLoading(true)
    try {
      const data = await dbService.getLideres()
      setLideres(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Função simples para aplicar máscara de telefone (XX) XXXXX-XXXX
  const formatPhoneNumber = (value: string) => {
    if (!value) return value
    const phoneNumber = value.replace(/[^\d]/g, '')
    const phoneNumberLength = phoneNumber.length
    if (phoneNumberLength < 3) return phoneNumber
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`
    }
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value)
    setTelefone(formattedValue)
  }

  const handleOpenAdd = () => {
    setId(undefined)
    setNome('')
    setTelefone('')
    setEmail('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (l: Lider) => {
    setId(l.id)
    setNome(l.nome)
    setTelefone(l.telefone || '')
    setEmail(l.email || '')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    try {
      await dbService.saveLider({ id, nome, telefone, email })
      setIsModalOpen(false)
      loadLideres()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este líder? As pesquisas associadas continuarão existindo, mas sem líder.')) return
    try {
      await dbService.deleteLider(id)
      loadLideres()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Líderes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Cadastre seus coordenadores, agentes de campo ou líderes comunitários.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Novo Líder
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : lideres.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/50">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/45 mb-4" />
          <h3 className="font-bold text-muted-foreground text-lg">Nenhum líder cadastrado</h3>
          <p className="text-muted-foreground/80 text-sm mt-1 mb-6">Cadastre os líderes que aplicarão ou coordenarão as pesquisas.</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all cursor-pointer shadow-sm"
          >
            Cadastrar Líder
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lideres.map((l) => (
            <div
              key={l.id}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/20 transition-all group shadow-sm"
            >
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{l.nome}</h3>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  {l.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground/60" />
                      <span>{l.telefone}</span>
                    </div>
                  )}
                  {l.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground/60" />
                      <span className="truncate">{l.email}</span>
                    </div>
                  )}
                  {!l.telefone && !l.email && (
                    <span className="text-muted-foreground italic">Sem informações de contato.</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 border-t border-border pt-4">
                <button
                  onClick={() => handleOpenEdit(l)}
                  className="p-2 rounded-lg bg-muted hover:bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(l.id)}
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
              <h3 className="text-lg font-bold text-foreground">{id ? 'Editar Líder' : 'Cadastrar Novo Líder'}</h3>
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
                  Nome do Líder
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lider@exemplo.com"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
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
                  {id ? 'Salvar Alterações' : 'Cadastrar Líder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
