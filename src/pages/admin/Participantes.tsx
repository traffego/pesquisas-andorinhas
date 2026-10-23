import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  dbService, 
  type Objeto, 
  type Pesquisa, 
  type Participante, 
  type ParticipanteComStatus, 
  type ConfigZApi 
} from '../../services/db'
import { ZApiService } from '../../services/zapi'
import { 
  Users, 
  Search, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  MessageSquare, 
  Send, 
  X, 
  AlertCircle, 
  TrendingUp,
  Download,
  Phone
} from 'lucide-react'
import * as XLSX from 'xlsx'

export const Participantes: React.FC = () => {
  const [participantes, setParticipantes] = useState<ParticipanteComStatus[]>([])
  const [objetos, setObjetos] = useState<Objeto[]>([])
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([])
  const [configZApi, setConfigZApi] = useState<ConfigZApi | null>(null)
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroObjeto, setFiltroObjeto] = useState<string>('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'respondeu' | 'pendente'>('todos')
  const [busca, setBusca] = useState<string>('')

  // Modais
  const [modalEditOpen, setModalEditOpen] = useState(false)
  const [modalEnvioIndividualOpen, setModalEnvioIndividualOpen] = useState(false)

  // Participante em edição
  const [participanteAtual, setParticipanteAtual] = useState<Partial<Participante>>({})
  const [salvandoPart, setSalvandoPart] = useState(false)

  // Disparo individual
  const [partParaEnvio, setPartParaEnvio] = useState<ParticipanteComStatus | null>(null)
  const [msgIndividual, setMsgIndividual] = useState('')
  const [enviandoIndividual, setEnviandoIndividual] = useState(false)
  const [statusEnvioIndividual, setStatusEnvioIndividual] = useState<{ sucesso?: boolean; msg?: string } | null>(null)

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  const carregarDadosIniciais = async () => {
    setLoading(true)
    try {
      const [objs, pesqs, zcfg] = await Promise.all([
        dbService.getObjetos(),
        dbService.getPesquisas(),
        dbService.getConfigZApi()
      ])
      setObjetos(objs)
      setPesquisas(pesqs)
      if (zcfg) {
        setConfigZApi(zcfg)
      }
      await carregarParticipantes()
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const carregarParticipantes = async () => {
    try {
      const data = await dbService.getParticipantes({
        objetoId: filtroObjeto || undefined,
        status: filtroStatus,
        busca: busca || undefined
      })
      setParticipantes(data)
    } catch (err) {
      console.error('Erro ao carregar participantes:', err)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarParticipantes()
    }, 250)
    return () => clearTimeout(timer)
  }, [filtroObjeto, filtroStatus, busca])

  // Métricas
  const totalInscritos = participantes.length
  const totalResponderam = useMemo(() => participantes.filter(p => p.respondeu).length, [participantes])
  const totalPendentes = totalInscritos - totalResponderam
  const taxaAdesao = totalInscritos > 0 ? ((totalResponderam / totalInscritos) * 100).toFixed(1) : '0'

  // Achar pesquisa correspondente ao objeto
  const getPesquisaPorObjeto = (objetoId: string) => {
    return pesquisas.find(p => p.objeto_id === objetoId)
  }

  // --- CRUD PARTICIPANTE ---
  const handleNovoParticipante = () => {
    setParticipanteAtual({
      nome: '',
      objeto_id: filtroObjeto || objetos[0]?.id || '',
      cpf: '',
      telefone: '',
      email: '',
      dados_extras: {
        distancia: '5KM',
        camisa: 'M',
        peito: ''
      }
    })
    setModalEditOpen(true)
  }

  const handleEditarParticipante = (p: ParticipanteComStatus) => {
    setParticipanteAtual({
      id: p.id,
      nome: p.nome,
      objeto_id: p.objeto_id,
      cpf: p.cpf || '',
      telefone: p.telefone || '',
      email: p.email || '',
      dados_extras: {
        ...(p.dados_extras || {})
      }
    })
    setModalEditOpen(true)
  }

  const handleSalvarParticipante = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!participanteAtual.nome?.trim() || !participanteAtual.objeto_id) return

    setSalvandoPart(true)
    try {
      await dbService.saveParticipante(participanteAtual)
      setModalEditOpen(false)
      await carregarParticipantes()
    } catch (err: any) {
      alert('Erro ao salvar participante: ' + (err.message || 'Tente novamente.'))
    } finally {
      setSalvandoPart(false)
    }
  }

  const handleExcluirParticipante = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir o participante "${nome}"?`)) return
    try {
      await dbService.deleteParticipante(id)
      await carregarParticipantes()
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  // --- DISPARO INDIVIDUAL WHATSAPP ---
  const handleAbrirEnvioIndividual = (p: ParticipanteComStatus) => {
    const pesq = getPesquisaPorObjeto(p.objeto_id)
    const link = pesq 
      ? `https://pesquisas-andorinhas.vercel.app/r/${pesq.token}`
      : 'https://pesquisas-andorinhas.vercel.app/'
    
    const template = configZApi?.mensagem_padrao || 'Olá, {{primeiro_nome}}! Sua opinião sobre a {{corrida}} é fundamental para nós. Responda a pesquisa oficial no link: {{link}}'
    const msg = ZApiService.personalizarMensagem(template, p, link, p.objeto_nome || 'Corrida de Rua')
    
    setPartParaEnvio(p)
    setMsgIndividual(msg)
    setStatusEnvioIndividual(null)
    setModalEnvioIndividualOpen(true)
  }

  const handleEnviarIndividual = async () => {
    if (!partParaEnvio || !partParaEnvio.telefone) return

    if (!ZApiService.isConfigValida(configZApi)) {
      // Fallback para link wa.me
      const url = ZApiService.gerarLinkWaMe(partParaEnvio.telefone, msgIndividual)
      window.open(url, '_blank')
      setModalEnvioIndividualOpen(false)
      return
    }

    setEnviandoIndividual(true)
    setStatusEnvioIndividual(null)
    try {
      const res = await ZApiService.enviarTexto(configZApi!, partParaEnvio.telefone, msgIndividual)
      if (res.sucesso) {
        setStatusEnvioIndividual({ sucesso: true, msg: 'Mensagem enviada com sucesso pelo WhatsApp!' })
        setTimeout(() => setModalEnvioIndividualOpen(false), 1500)
      } else {
        setStatusEnvioIndividual({ sucesso: false, msg: res.erro || 'Falha ao enviar mensagem.' })
      }
    } catch (err: any) {
      setStatusEnvioIndividual({ sucesso: false, msg: err.message })
    } finally {
      setEnviandoIndividual(false)
    }
  }

  // --- EXPORTAR EXCEL ---
  const handleExportarExcel = () => {
    const rows = participantes.map(p => ({
      'Nº Peito': p.dados_extras?.peito || p.dados_extras?.num || '-',
      'Nome': p.nome,
      'CPF': p.cpf || '-',
      'Telefone': p.telefone || '-',
      'E-mail': p.email || '-',
      'Corrida / Objeto': p.objeto_nome || '-',
      'Distância': p.dados_extras?.distancia || '-',
      'Camisa': p.dados_extras?.camisa || '-',
      'Status': p.respondeu ? 'Respondido' : 'Pendente',
      'Data Resposta': p.resposta_data ? new Date(p.resposta_data).toLocaleString('pt-BR') : '-'
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes')
    XLSX.writeFile(wb, `participantes_${filtroObjeto || 'geral'}_${Date.now()}.xlsx`)
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-12">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Participantes & Inscritos
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gerencie a base de corredores, acompanhe adesão e envie pesquisas via WhatsApp com Z-API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/whatsapp"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground transition-all cursor-pointer shadow-sm"
          >
            <MessageSquare className="h-4 w-4 text-emerald-500" />
            <span>WhatsApp & Disparos</span>
          </Link>

          <button
            onClick={handleNovoParticipante}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Novo Atleta
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total de Atletas</span>
          <p className="text-2xl font-black text-foreground">{totalInscritos}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Responderam
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalResponderam}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Pendentes
          </span>
          <p className="text-2xl font-black text-amber-500">{totalPendentes}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> Taxa de Adesão
          </span>
          <p className="text-2xl font-black text-primary">{taxaAdesao}%</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          {/* Busca por texto */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, CPF ou telefone..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Filtro por Corrida / Objeto */}
          <select
            value={filtroObjeto}
            onChange={e => setFiltroObjeto(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="">Todas as Corridas / Projetos</option>
            {objetos.map(obj => (
              <option key={obj.id} value={obj.id}>{obj.nome}</option>
            ))}
          </select>

          {/* Filtro por Status */}
          <div className="flex items-center rounded-xl border border-border bg-background p-1 text-xs font-semibold">
            <button
              onClick={() => setFiltroStatus('todos')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filtroStatus === 'todos' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroStatus('pendente')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filtroStatus === 'pendente' ? 'bg-amber-500 text-white font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFiltroStatus('respondeu')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filtroStatus === 'respondeu' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Respondidos
            </button>
          </div>
        </div>

        {/* Exportar Excel */}
        <button
          onClick={handleExportarExcel}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer shadow-sm"
        >
          <Download className="h-4 w-4 text-primary" /> Exportar Planilha
        </button>
      </div>

      {/* Tabela de Participantes */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase font-extrabold text-muted-foreground tracking-wider">
              <tr>
                <th className="p-4 w-16 text-center">Nº</th>
                <th className="p-4">Atleta</th>
                <th className="p-4">Contato</th>
                <th className="p-4">CPF</th>
                <th className="p-4">Corrida / Objeto</th>
                <th className="p-4">Prova / Camisa</th>
                <th className="p-4 text-center">Pesquisa</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5 animate-spin text-primary" />
                      Carregando participantes...
                    </div>
                  </td>
                </tr>
              ) : participantes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Nenhum participante encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                participantes.map((p) => {
                  const peito = p.dados_extras?.peito || p.dados_extras?.num || '-'
                  const distancia = p.dados_extras?.distancia || '5KM'
                  const camisa = p.dados_extras?.camisa || '-'

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-center font-mono font-bold text-xs text-muted-foreground">
                        #{peito}
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        {p.nome}
                        {p.dados_extras?.equipe && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            🏅 {p.dados_extras.equipe}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs font-mono">
                        {p.telefone ? (
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-500" /> {p.telefone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 italic">Sem telefone</span>
                        )}
                        {p.email && <span className="block text-muted-foreground truncate max-w-[160px]">{p.email}</span>}
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground">
                        {p.cpf ? p.cpf : <span className="italic text-muted-foreground/50">-</span>}
                      </td>
                      <td className="p-4 text-xs font-medium text-foreground">
                        {p.objeto_nome || '-'}
                      </td>
                      <td className="p-4 text-xs">
                        <span className="font-bold text-foreground">{distancia}</span>
                        <span className="text-muted-foreground block text-[11px]">Camisa {camisa}</span>
                      </td>
                      <td className="p-4 text-center">
                        {p.respondeu ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Respondido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <Clock className="h-3.5 w-3.5" /> Pendente
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.telefone && (
                            <button
                              onClick={() => handleAbrirEnvioIndividual(p)}
                              className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors cursor-pointer"
                              title="Enviar pesquisa via WhatsApp"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditarParticipante(p)}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Editar dados do atleta"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleExcluirParticipante(p.id, p.nome)}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            title="Excluir atleta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: EDITAR / CRIAR PARTICIPANTE */}
      {modalEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-black text-foreground">
                {participanteAtual.id ? 'Editar Atleta' : 'Novo Participante'}
              </h3>
              <button onClick={() => setModalEditOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarParticipante} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={participanteAtual.nome || ''}
                  onChange={e => setParticipanteAtual(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do atleta"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Corrida / Projeto *</label>
                <select
                  required
                  value={participanteAtual.objeto_id || ''}
                  onChange={e => setParticipanteAtual(prev => ({ ...prev, objeto_id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Selecione o Projeto / Corrida...</option>
                  {objetos.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">CPF</label>
                  <input
                    type="text"
                    value={participanteAtual.cpf || ''}
                    onChange={e => setParticipanteAtual(prev => ({ ...prev, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground font-mono focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Celular / WhatsApp</label>
                  <input
                    type="text"
                    value={participanteAtual.telefone || ''}
                    onChange={e => setParticipanteAtual(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground font-mono focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Nº Peito</label>
                  <input
                    type="text"
                    value={participanteAtual.dados_extras?.peito || participanteAtual.dados_extras?.num || ''}
                    onChange={e => setParticipanteAtual(prev => ({
                      ...prev,
                      dados_extras: { ...prev.dados_extras, peito: e.target.value }
                    }))}
                    placeholder="Ex: 105"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground font-mono focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Distância</label>
                  <input
                    type="text"
                    value={participanteAtual.dados_extras?.distancia || '5KM'}
                    onChange={e => setParticipanteAtual(prev => ({
                      ...prev,
                      dados_extras: { ...prev.dados_extras, distancia: e.target.value }
                    }))}
                    placeholder="5KM"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Camisa</label>
                  <input
                    type="text"
                    value={participanteAtual.dados_extras?.camisa || 'M'}
                    onChange={e => setParticipanteAtual(prev => ({
                      ...prev,
                      dados_extras: { ...prev.dados_extras, camisa: e.target.value }
                    }))}
                    placeholder="P, M, G..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Equipe / Assessoria</label>
                <input
                  type="text"
                  value={participanteAtual.dados_extras?.equipe || ''}
                  onChange={e => setParticipanteAtual(prev => ({
                    ...prev,
                    dados_extras: { ...prev.dados_extras, equipe: e.target.value }
                  }))}
                  placeholder="Nome da equipe ou assessoria"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalEditOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoPart}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {salvandoPart ? 'Salvando...' : 'Salvar Atleta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ENVIO INDIVIDUAL */}
      {modalEnvioIndividualOpen && partParaEnvio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-500" /> Enviar Pesquisa via WhatsApp
                </h3>
                <p className="text-xs text-muted-foreground">Destinatário: <strong>{partParaEnvio.nome}</strong></p>
              </div>
              <button onClick={() => setModalEnvioIndividualOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-muted/40 p-3 rounded-xl border border-border flex items-center justify-between">
                <span>Telefone de Envio:</span>
                <strong className="font-mono text-foreground font-bold">{partParaEnvio.telefone}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">Mensagem a ser enviada:</label>
                <textarea
                  rows={4}
                  value={msgIndividual}
                  onChange={e => setMsgIndividual(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {statusEnvioIndividual && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  statusEnvioIndividual.sucesso ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
                }`}>
                  {statusEnvioIndividual.sucesso ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{statusEnvioIndividual.msg}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setModalEnvioIndividualOpen(false)}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviarIndividual}
                disabled={enviandoIndividual}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {enviandoIndividual ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {enviandoIndividual ? 'Disparando...' : 'Enviar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
