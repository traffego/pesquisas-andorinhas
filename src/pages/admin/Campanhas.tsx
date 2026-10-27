import React, { useState, useEffect, useMemo, useRef } from 'react'
import { 
  dbService, 
  type Objeto, 
  type Pesquisa, 
  type CampanhaDisparo, 
  type DisparoLog, 
  type ParticipanteComStatus, 
  type ConfigZApi 
} from '../../services/db'
import { ZApiService } from '../../services/zapi'
import { 
  Megaphone,
  Plus, 
  Send, 
  CheckCheck, 
  Check, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  RefreshCw, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  FolderGit2, 
  ClipboardList, 
  Phone, 
  MessageSquare, 
  X,
  Shield,
  ShieldCheck,
  Zap,
  Coffee,
  Pause,
  Play,
  StopCircle
} from 'lucide-react'

// Configurações dos Perfis de Segurança Anti-Bloqueio
export const PERFIS_SEGURANCA = {
  rapido: {
    id: 'rapido' as const,
    titulo: 'Rápido (Atual)',
    icone: Zap,
    delayTexto: '6 a 8s',
    minDelay: 6000,
    maxDelay: 8000,
    tamanhoLote: 9999, // sem pausas de lote
    tempoDescansoSegundos: 0,
    nivelRisco: 'alto',
    badgeRisco: 'Alto Risco',
    corBadge: 'bg-destructive/10 text-destructive border-destructive/20',
    descricao: 'Intervalo curto de 6–8s sem pausas. Use apenas em chips antigos com alta reputação.'
  },
  moderado: {
    id: 'moderado' as const,
    titulo: 'Moderado (Recomendado)',
    icone: ShieldCheck,
    delayTexto: '12 a 22s',
    minDelay: 12000,
    maxDelay: 22000,
    tamanhoLote: 25, // descanso a cada 25 mensagens
    tempoDescansoSegundos: 120, // 2 minutos de resfriamento
    nivelRisco: 'baixo',
    badgeRisco: 'Recomendado',
    corBadge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    descricao: 'Intervalo dinâmico de 12–22s com jitter humano + descanso de 2 min a cada 25 envios.'
  },
  ultra_seguro: {
    id: 'ultra_seguro' as const,
    titulo: 'Ultra Seguro',
    icone: Shield,
    delayTexto: '20 a 40s',
    minDelay: 20000,
    maxDelay: 40000,
    tamanhoLote: 20, // descanso a cada 20 mensagens
    tempoDescansoSegundos: 180, // 3 minutos de resfriamento
    nivelRisco: 'minimo',
    badgeRisco: 'Máxima Blindagem',
    corBadge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    descricao: 'Intervalo espaçado de 20–40s + descanso de 3 min a cada 20 envios. Ideal para chips recém-reativados.'
  }
}

export type PerfilSegurancaId = keyof typeof PERFIS_SEGURANCA

export const calcularTempoEstimado = (qtd: number, perfilId: PerfilSegurancaId) => {
  if (qtd <= 0) return '0 min'
  const p = PERFIS_SEGURANCA[perfilId]
  const delayMedioSegundos = (p.minDelay + p.maxDelay) / 2000
  const tempoDisparos = qtd * delayMedioSegundos
  const qtdPausas = p.tamanhoLote < 9999 ? Math.floor((qtd - 1) / p.tamanhoLote) : 0
  const tempoPausas = qtdPausas * p.tempoDescansoSegundos
  const totalSegundos = Math.round(tempoDisparos + tempoPausas)

  const horas = Math.floor(totalSegundos / 3600)
  const minutos = Math.ceil((totalSegundos % 3600) / 60)

  if (horas > 0) {
    return `~${horas}h ${minutos}min`
  }
  return `~${minutos} min`
}

export const Campanhas: React.FC = () => {
  const [campanhas, setCampanhas] = useState<CampanhaDisparo[]>([])
  const [objetos, setObjetos] = useState<Objeto[]>([])
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([])
  const [configZApi, setConfigZApi] = useState<ConfigZApi | null>(null)
  const [loading, setLoading] = useState(true)

  // Filtros Globais
  const [filtroObjeto, setFiltroObjeto] = useState<string>('')
  const [filtroPesquisa, setFiltroPesquisa] = useState<string>('')

  // Campanha Selecionada para Detalhes
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<CampanhaDisparo | null>(null)
  const [logsCampanha, setLogsCampanha] = useState<DisparoLog[]>([])
  const [carregandoLogs, setCarregandoLogs] = useState(false)

  // Filtros da Listagem de Disparos
  const [buscaDisparo, setBuscaDisparo] = useState('')
  const [filtroStatusDisparo, setFiltroStatusDisparo] = useState<'todos' | 'lido' | 'entregue' | 'enviado' | 'respondido' | 'erro'>('todos')
  const [disparosExpandidos, setDisparosExpandidos] = useState<Set<string>>(new Set())

  // Modal: Nova Campanha
  const [modalNovaCampanhaOpen, setModalNovaCampanhaOpen] = useState(false)
  const [nomeNovaCampanha, setNomeNovaCampanha] = useState('')
  const [objetoNovaCampanha, setObjetoNovaCampanha] = useState('')
  const [pesquisaNovaCampanhaId, setPesquisaNovaCampanhaId] = useState('')
  const [filtroPublicoNovaCampanha, setFiltroPublicoNovaCampanha] = useState<'todos' | 'pendentes' | 'nao_lidos'>('todos')
  const [perfilSegurancaNovaCampanha, setPerfilSegurancaNovaCampanha] = useState<PerfilSegurancaId>('moderado')
  const [mensagemNovaCampanha, setMensagemNovaCampanha] = useState('')
  const [salvandoCampanha, setSalvandoCampanha] = useState(false)
  const [participantesDisparo, setParticipantesDisparo] = useState<ParticipanteComStatus[]>([])

  // Modal: Confirmação & Ajuste de Perfil (Sem alertas nativos)
  const [modalConfirmarDisparoOpen, setModalConfirmarDisparoOpen] = useState(false)
  const [campanhaParaDisparar, setCampanhaParaDisparar] = useState<CampanhaDisparo | null>(null)
  const [participantesAptosConfirmacao, setParticipantesAptosConfirmacao] = useState<ParticipanteComStatus[]>([])
  const [perfilConfirmacao, setPerfilConfirmacao] = useState<PerfilSegurancaId>('moderado')

  // Modal: Progresso Disparo em Lote
  const [modalLoteOpen, setModalLoteOpen] = useState(false)
  const [emLoteProcessando, setEmLoteProcessando] = useState(false)
  const [emLotePausado, setEmLotePausado] = useState(false)
  const [progressoLote, setProgressoLote] = useState({ total: 0, atual: 0, enviados: 0, erros: 0 })
  const [perfilExecutando, setPerfilExecutando] = useState<PerfilSegurancaId>('moderado')
  const [statusResfriamento, setStatusResfriamento] = useState<{ emPausa: boolean; segundosRestantes: number }>({ emPausa: false, segundosRestantes: 0 })
  const [metricasAoVivoLote, setMetricasAoVivoLote] = useState({ entregues: 0, lidos: 0, respondidos: 0 })

  const pausadoRef = useRef(false)
  const cancelarLoteRef = useRef(false)

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
      if (zcfg) setConfigZApi(zcfg)

      const camps = await dbService.getCampanhas()
      setCampanhas(camps)
      if (camps.length > 0) {
        selecionarCampanha(camps[0])
      }
    } catch (err) {
      console.error('Erro ao carregar dados de campanhas:', err)
    } finally {
      setLoading(false)
    }
  }

  // Recarregar campanhas com filtros aplicados
  const carregarListaCampanhas = async (pesqId?: string, objId?: string) => {
    try {
      const camps = await dbService.getCampanhas(pesqId || undefined, objId || undefined)
      setCampanhas(camps)
      if (campanhaSelecionada) {
        const atual = camps.find(c => c.id === campanhaSelecionada.id)
        if (atual) setCampanhaSelecionada(atual)
        else if (camps.length > 0) selecionarCampanha(camps[0])
        else {
          setCampanhaSelecionada(null)
          setLogsCampanha([])
        }
      } else if (camps.length > 0) {
        selecionarCampanha(camps[0])
      }
    } catch (e) {
      console.error('Erro ao atualizar campanhas:', e)
    }
  }

  // Selecionar campanha e carregar logs
  const selecionarCampanha = async (camp: CampanhaDisparo) => {
    setCampanhaSelecionada(camp)
    setCarregandoLogs(true)
    try {
      const logs = await dbService.getLogsCampanha(camp.id)
      setLogsCampanha(logs)
    } catch (err) {
      console.error('Erro ao carregar logs da campanha:', err)
    } finally {
      setCarregandoLogs(false)
    }
  }

  // Polling automático dos logs a cada 4 segundos para atualizar status de leitura em tempo real
  useEffect(() => {
    if (!campanhaSelecionada) return
    const timer = setInterval(async () => {
      try {
        const logs = await dbService.getLogsCampanha(campanhaSelecionada.id)
        setLogsCampanha(logs)
      } catch (err) {
        console.error('Erro no auto-refresh de logs:', err)
      }
    }, 4000)
    return () => clearInterval(timer)
  }, [campanhaSelecionada?.id])

  // Filtragem de campanhas por objeto e pesquisa
  const campanhasFiltradas = useMemo(() => {
    return campanhas.filter(c => {
      if (filtroObjeto && c.objeto_id !== filtroObjeto) return false
      if (filtroPesquisa && c.pesquisa_id !== filtroPesquisa) return false
      return true
    })
  }, [campanhas, filtroObjeto, filtroPesquisa])

  // Pesquisas do projeto selecionado para filtro
  const pesquisasDoObjeto = useMemo(() => {
    if (!filtroObjeto) return pesquisas
    return pesquisas.filter(p => p.objeto_id === filtroObjeto)
  }, [pesquisas, filtroObjeto])

  // Toggle expansão de detalhes do disparo
  const toggleExpansaoDisparo = (id: string) => {
    setDisparosExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Estatísticas da campanha selecionada
  const metricasCampanha = useMemo(() => {
    if (!campanhaSelecionada) {
      return { total: 0, enviados: 0, entregues: 0, lidos: 0, respondidos: 0, pctEntregues: 0, pctLidos: 0, pctResp: 0 }
    }
    const total = logsCampanha.length || campanhaSelecionada.total_destinatarios || 0
    const respondidos = logsCampanha.filter(l => l.respondeu).length
    const lidos = logsCampanha.filter(l => l.status === 'lido' || l.respondeu).length
    const entregues = logsCampanha.filter(l => l.status === 'entregue' || l.status === 'lido' || l.respondeu).length
    const enviados = logsCampanha.filter(l => l.status !== 'erro').length

    const pctEntregues = total > 0 ? Math.round((entregues / total) * 100) : 0
    const pctLidos = total > 0 ? Math.round((lidos / total) * 100) : 0
    const pctResp = total > 0 ? Math.round((respondidos / total) * 100) : 0

    return { total, enviados, entregues, lidos, respondidos, pctEntregues, pctLidos, pctResp }
  }, [campanhaSelecionada, logsCampanha])

  // Lista filtrada de disparos executados
  const disparosFiltrados = useMemo(() => {
    return logsCampanha.filter(l => {
      // Filtro de busca (Nome, Telefone, CPF)
      if (buscaDisparo.trim()) {
        const termo = buscaDisparo.trim().toLowerCase()
        const digitos = termo.replace(/\D/g, '')
        const nomeMatch = (l.participante?.nome || '').toLowerCase().includes(termo)
        const telMatch = digitos.length >= 3 && (l.telefone || '').includes(digitos)
        const cpfMatch = digitos.length >= 3 && (l.participante?.cpf || '').includes(digitos)
        if (!nomeMatch && !telMatch && !cpfMatch) return false
      }

      // Filtro de status
      if (filtroStatusDisparo === 'lido' && l.status !== 'lido' && !l.respondeu) return false
      if (filtroStatusDisparo === 'entregue' && l.status !== 'entregue' && l.status !== 'lido' && !l.respondeu) return false
      if (filtroStatusDisparo === 'enviado' && l.status !== 'enviado') return false
      if (filtroStatusDisparo === 'respondido' && !l.respondeu) return false
      if (filtroStatusDisparo === 'erro' && l.status !== 'erro') return false

      return true
    })
  }, [logsCampanha, buscaDisparo, filtroStatusDisparo])

  // --- MODAL NOVA CAMPANHA ---
  const handleAbrirNovaCampanha = async () => {
    const objId = filtroObjeto || objetos[0]?.id || ''
    setObjetoNovaCampanha(objId)
    const pesqs = pesquisas.filter(p => p.objeto_id === objId)
    const pId = pesqs[0]?.id || ''
    setPesquisaNovaCampanhaId(pId)

    const numOnda = campanhas.length + 1
    setNomeNovaCampanha(`${numOnda}ª Onda: Envio de Pesquisa`)
    setFiltroPublicoNovaCampanha('todos')
    setPerfilSegurancaNovaCampanha('moderado')

    const obj = objetos.find(o => o.id === objId)
    setMensagemNovaCampanha(`Olá, {{primeiro_nome}}! Sua opinião sobre a ${obj?.nome || 'nossa corrida'} é fundamental. Responda no link oficial: {{link}}`)

    // Carregar participantes do objeto para estimativa
    if (objId) {
      const parts = await dbService.getParticipantes({ objetoId: objId, pesquisaId: pId || undefined })
      setParticipantesDisparo(parts)
    }

    setModalNovaCampanhaOpen(true)
  }

  const handleSalvarCampanha = async (iniciarDisparo: boolean = false) => {
    if (!nomeNovaCampanha.trim()) {
      alert('Informe o nome da campanha.')
      return
    }
    if (!pesquisaNovaCampanhaId) {
      alert('Selecione a pesquisa de destino.')
      return
    }
    if (!mensagemNovaCampanha.trim()) {
      alert('Informe o texto da mensagem.')
      return
    }

    setSalvandoCampanha(true)
    try {
      let destCount = participantesDisparo.length
      if (filtroPublicoNovaCampanha === 'pendentes') {
        destCount = participantesDisparo.filter(p => !p.respondeu).length
      } else if (filtroPublicoNovaCampanha === 'nao_lidos') {
        destCount = participantesDisparo.filter(p => !p.respondeu && p.status_whatsapp !== 'lido').length
      }

      const nova = await dbService.saveCampanha({
        objeto_id: objetoNovaCampanha,
        pesquisa_id: pesquisaNovaCampanhaId,
        nome: nomeNovaCampanha.trim(),
        mensagem_texto: mensagemNovaCampanha,
        filtro_publico: filtroPublicoNovaCampanha,
        perfil_seguranca: perfilSegurancaNovaCampanha,
        status: iniciarDisparo ? 'enviando' : 'rascunho',
        total_destinatarios: destCount,
        enviados_count: 0,
        entregues_count: 0,
        lidos_count: 0,
        respondidos_count: 0,
        disparado_em: iniciarDisparo ? new Date().toISOString() : null
      })

      setModalNovaCampanhaOpen(false)
      await carregarListaCampanhas(filtroPesquisa, filtroObjeto)
      await selecionarCampanha(nova)

      if (iniciarDisparo) {
        setTimeout(() => {
          handleIniciarDisparo(nova)
        }, 300)
      }
    } catch (err: any) {
      alert('Erro ao criar campanha: ' + err.message)
    } finally {
      setSalvandoCampanha(false)
    }
  }

  // --- DISPARO EM LOTE ---
  // Abre o modal de confirmação e seleção de perfil (sem alert)
  const handleIniciarDisparo = async (camp: CampanhaDisparo) => {
    if (!ZApiService.isConfigValida(configZApi)) {
      alert('Por favor, configure suas credenciais da Z-API na aba WhatsApp antes de iniciar o envio.')
      return
    }

    // Carrega participantes frescos do objeto
    const parts = await dbService.getParticipantes({ 
      objetoId: camp.objeto_id, 
      pesquisaId: camp.pesquisa_id 
    })

    const logsAtuais = await dbService.getLogsCampanha(camp.id)
    const jaNotificadosIds = new Set(logsAtuais.map(l => l.participante_id))

    let aptos = parts.filter(p => !p.respondeu && !jaNotificadosIds.has(p.id) && p.telefone && p.telefone.replace(/\D/g, '').length >= 10)
    if (camp.filtro_publico === 'nao_lidos') {
      aptos = parts.filter(p => !p.respondeu && p.telefone && p.status_whatsapp !== 'lido')
    }

    if (aptos.length === 0) {
      alert('Nenhum participante apto para envio (pendente e com telefone válido) encontrado nesta seleção.')
      return
    }

    setCampanhaParaDisparar(camp)
    setParticipantesAptosConfirmacao(aptos)
    setPerfilConfirmacao((camp.perfil_seguranca as PerfilSegurancaId) || 'moderado')
    setModalConfirmarDisparoOpen(true)
  }

  // Executa o disparo após confirmação pelo modal
  const handleExecutarDisparoConfirmado = async () => {
    if (!campanhaParaDisparar) return
    const camp = campanhaParaDisparar
    const aptos = participantesAptosConfirmacao
    const perfilId = perfilConfirmacao
    const perfil = PERFIS_SEGURANCA[perfilId] || PERFIS_SEGURANCA.moderado

    setModalConfirmarDisparoOpen(false)
    setPerfilExecutando(perfilId)

    // Atualiza o perfil na campanha se mudou
    if (camp.perfil_seguranca !== perfilId) {
      await dbService.saveCampanha({ id: camp.id, perfil_seguranca: perfilId }).catch(() => {})
      camp.perfil_seguranca = perfilId
    }

    cancelarLoteRef.current = false
    setEmLotePausado(false)
    pausadoRef.current = false

    setEmLoteProcessando(true)
    setModalLoteOpen(true)
    setStatusResfriamento({ emPausa: false, segundosRestantes: 0 })
    setProgressoLote({ total: aptos.length, atual: 0, enviados: 0, erros: 0 })
    setMetricasAoVivoLote({ entregues: 0, lidos: 0, respondidos: 0 })

    const pesq = pesquisas.find(p => p.id === camp.pesquisa_id)
    const linkPesq = pesq?.token ? `https://pesquisas-andorinhas.vercel.app/r/${pesq.token}` : 'https://pesquisas-andorinhas.vercel.app/'
    const obj = objetos.find(o => o.id === camp.objeto_id)

    for (let i = 0; i < aptos.length; i++) {
      if (cancelarLoteRef.current) break

      // Controle de Pausa do Usuário
      while (pausadoRef.current && !cancelarLoteRef.current) {
        await new Promise(r => setTimeout(r, 400))
      }
      if (cancelarLoteRef.current) break

      const p = aptos[i]
      const msg = ZApiService.personalizarMensagem(
        camp.mensagem_texto,
        p,
        linkPesq,
        obj?.nome || 'Corrida'
      )

      try {
        const res = await ZApiService.enviarTexto(configZApi!, p.telefone!, msg)
        if (res.sucesso) {
          await dbService.registrarDisparo({
            participanteId: p.id,
            pesquisaId: camp.pesquisa_id,
            objetoId: camp.objeto_id,
            telefone: p.telefone!,
            status: 'enviado',
            campanhaId: camp.id,
            messageId: res.messageId,
            zaapId: res.zaapId
          })
          setProgressoLote(prev => ({ ...prev, atual: i + 1, enviados: prev.enviados + 1 }))
        } else {
          await dbService.registrarDisparo({
            participanteId: p.id,
            pesquisaId: camp.pesquisa_id,
            objetoId: camp.objeto_id,
            telefone: p.telefone!,
            status: 'erro',
            campanhaId: camp.id,
            erro: res.erro || 'Falha Z-API'
          })
          setProgressoLote(prev => ({ ...prev, atual: i + 1, erros: prev.erros + 1 }))
        }
      } catch (err: any) {
        setProgressoLote(prev => ({ ...prev, atual: i + 1, erros: prev.erros + 1 }))
      }

      // Atualiza métricas ao vivo do funil a cada 2 mensagens
      if ((i + 1) % 2 === 0 || i === aptos.length - 1) {
        try {
          const logsAtuais = await dbService.getLogsCampanha(camp.id)
          const resp = logsAtuais.filter(l => l.respondeu).length
          const lid = logsAtuais.filter(l => l.status === 'lido' || l.respondeu).length
          const ent = logsAtuais.filter(l => l.status === 'entregue' || l.status === 'lido' || l.respondeu).length
          setMetricasAoVivoLote({ entregues: ent, lidos: lid, respondidos: resp })
          setLogsCampanha(logsAtuais)
        } catch {}
      }

      if (i < aptos.length - 1 && !cancelarLoteRef.current) {
        const enviadosAteAgora = i + 1
        // Pausa de resfriamento em lote (Cooling)
        if (perfil.tamanhoLote < 9999 && enviadosAteAgora % perfil.tamanhoLote === 0 && perfil.tempoDescansoSegundos > 0) {
          for (let seg = perfil.tempoDescansoSegundos; seg > 0; seg--) {
            if (cancelarLoteRef.current) break
            while (pausadoRef.current && !cancelarLoteRef.current) {
              await new Promise(r => setTimeout(r, 400))
            }
            setStatusResfriamento({ emPausa: true, segundosRestantes: seg })
            await new Promise(r => setTimeout(r, 1000))
          }
          setStatusResfriamento({ emPausa: false, segundosRestantes: 0 })
        } else {
          // Delay dinâmico aleatório com jitter anti-robô
          const delayRandom = Math.floor(Math.random() * (perfil.maxDelay - perfil.minDelay + 1)) + perfil.minDelay
          const fatias = Math.ceil(delayRandom / 200)
          for (let f = 0; f < fatias; f++) {
            if (cancelarLoteRef.current) break
            while (pausadoRef.current && !cancelarLoteRef.current) {
              await new Promise(r => setTimeout(r, 400))
            }
            await new Promise(r => setTimeout(r, 200))
          }
        }
      }
    }

    setEmLoteProcessando(false)
    setEmLotePausado(false)
    pausadoRef.current = false
    setStatusResfriamento({ emPausa: false, segundosRestantes: 0 })

    await dbService.saveCampanha({
      id: camp.id,
      status: 'concluido',
      disparado_em: new Date().toISOString()
    })
    await carregarListaCampanhas(filtroPesquisa, filtroObjeto)
    await selecionarCampanha(camp)
  }

  const handleTogglePausarLote = () => {
    const novo = !emLotePausado
    setEmLotePausado(novo)
    pausadoRef.current = novo
  }

  const handleCancelarLote = () => {
    cancelarLoteRef.current = true
    pausadoRef.current = false
    setEmLotePausado(false)
  }

  const handleExcluirCampanha = async (id: string, nome: string) => {
    if (!confirm(`Deseja excluir a campanha "${nome}"?\n\nOs registros individuais de disparo permanecerão preservados no histórico do participante.`)) {
      return
    }
    try {
      await dbService.deleteCampanha(id)
      await carregarListaCampanhas(filtroPesquisa, filtroObjeto)
    } catch (err: any) {
      alert('Erro ao excluir campanha: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-muted-foreground gap-2">
        <Clock className="h-6 w-6 animate-spin text-primary" />
        <span className="font-bold">Carregando painel de campanhas...</span>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* ============================================================ */}
      {/* CABEÇALHO PRINCIPAL DA PÁGINA */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                Campanhas & Disparos
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Gerencie ondas de envio no WhatsApp com rastreamento de entrega, leitura em tempo real e conversão.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAbrirNovaCampanha}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nova Onda / Campanha
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* BARRA DE FILTROS GLOBAIS (PROJETO & PESQUISA) */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-3xl p-5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5 text-primary" />
              Filtrar por Projeto / Corrida:
            </label>
            <select
              value={filtroObjeto}
              onChange={e => {
                const val = e.target.value
                setFiltroObjeto(val)
                setFiltroPesquisa('')
                carregarListaCampanhas(undefined, val)
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">Todos os Projetos e Corridas</option>
              {objetos.map(obj => (
                <option key={obj.id} value={obj.id}>{obj.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />
              Filtrar por Pesquisa:
            </label>
            <select
              value={filtroPesquisa}
              onChange={e => {
                const val = e.target.value
                setFiltroPesquisa(val)
                carregarListaCampanhas(val, filtroObjeto)
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">Todas as Pesquisas</option>
              {pesquisasDoObjeto.map(p => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => carregarListaCampanhas(filtroPesquisa, filtroObjeto)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              Atualizar Dados
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SELETOR / CARDS DE CAMPANHAS CADASTRADAS */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-foreground flex items-center gap-2">
            Ondas de Disparo Cadastradas
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {campanhasFiltradas.length}
            </span>
          </h2>
        </div>

        {campanhasFiltradas.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-3xl bg-muted/10 space-y-4">
            <div className="inline-flex p-4 rounded-3xl bg-primary/10 text-primary">
              <Megaphone className="h-8 w-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-black text-foreground">Nenhuma campanha encontrada</h3>
              <p className="text-xs text-muted-foreground">
                Crie sua primeira onda de disparo para notificar os atletas pelo WhatsApp e acompanhar a entrega e leitura.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAbrirNovaCampanha}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Criar 1ª Campanha
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {campanhasFiltradas.map(camp => {
              const selecionada = campanhaSelecionada?.id === camp.id
              const pctEntr = camp.total_destinatarios && camp.total_destinatarios > 0
                ? Math.round(((camp.entregues_count || 0) / camp.total_destinatarios) * 100)
                : 0
              const pctLido = camp.total_destinatarios && camp.total_destinatarios > 0
                ? Math.round(((camp.lidos_count || 0) / camp.total_destinatarios) * 100)
                : 0

              return (
                <div
                  key={camp.id}
                  onClick={() => selecionarCampanha(camp)}
                  className={`bg-card border rounded-3xl p-5 shadow-xs transition-all space-y-4 cursor-pointer flex flex-col justify-between ${
                    selecionada
                      ? 'border-primary ring-2 ring-primary/20 shadow-md'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        camp.status === 'concluido'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : camp.status === 'enviando'
                          ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {camp.status === 'concluido' && <CheckCheck className="h-3 w-3 text-emerald-500" />}
                        {camp.status === 'enviando' && <Clock className="h-3 w-3 animate-spin text-blue-500" />}
                        {camp.status === 'rascunho' && <Clock className="h-3 w-3 text-muted-foreground" />}
                        {camp.status === 'concluido' ? 'Concluída' : camp.status === 'enviando' ? 'Enviando...' : 'Rascunho'}
                      </span>

                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleExcluirCampanha(camp.id, camp.nome)}
                          title="Excluir campanha"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-foreground line-clamp-1">
                        {camp.nome}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5 line-clamp-1">
                        {camp.objeto_nome || 'Projeto Geral'} • {camp.pesquisa_titulo || 'Pesquisa'}
                      </p>
                    </div>

                    {/* Mini Badges de Funil */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/60 text-center">
                      <div className="p-2 rounded-xl bg-muted/40">
                        <span className="text-[9px] font-bold text-muted-foreground block uppercase">Env.</span>
                        <span className="text-xs font-black text-foreground">{camp.enviados_count || 0}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-muted/40">
                        <span className="text-[9px] font-bold text-muted-foreground block uppercase">Entr.</span>
                        <span className="text-xs font-black text-foreground">{camp.entregues_count || 0}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <span className="text-[9px] font-bold text-blue-600 block uppercase">Lidos</span>
                        <span className="text-xs font-black text-blue-600">{camp.lidos_count || 0}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[9px] font-bold text-emerald-600 block uppercase">Resp.</span>
                        <span className="text-xs font-black text-emerald-600">{camp.respondidos_count || 0}</span>
                      </div>
                    </div>

                    {/* Barra de Progresso Entregue e Lido */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>Leitura WhatsApp: {pctLido}%</span>
                        <span>Entregas: {pctEntr}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                        <div style={{ width: `${pctLido}%` }} className="bg-blue-500 h-full transition-all" />
                        <div style={{ width: `${Math.max(0, pctEntr - pctLido)}%` }} className="bg-emerald-500 h-full transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-primary font-bold inline-flex items-center gap-1">
                      {selecionada ? '✓ Visualizando Disparos' : 'Clique para ver disparos'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleIniciarDisparo(camp)
                      }}
                      className="px-3 py-1 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold cursor-pointer"
                    >
                      Disparar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SEÇÃO DETALHADA: DISPAROS DA CAMPANHA (ESTILO RELATÓRIOS) */}
      {/* ============================================================ */}
      {campanhaSelecionada && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          {/* Header da Campanha Ativa */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                  Campanha Selecionada
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  ID: {campanhaSelecionada.id.substring(0, 8)}...
                </span>
              </div>
              <h2 className="text-xl font-black text-foreground mt-1">
                {campanhaSelecionada.nome}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {campanhaSelecionada.objeto_nome} • {campanhaSelecionada.pesquisa_titulo} • Disparado em {campanhaSelecionada.disparado_em ? new Date(campanhaSelecionada.disparado_em).toLocaleString('pt-BR') : 'Rascunho'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selecionarCampanha(campanhaSelecionada)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-primary ${carregandoLogs ? 'animate-spin' : ''}`} />
                Atualizar Status
              </button>
              <button
                type="button"
                onClick={() => handleIniciarDisparo(campanhaSelecionada)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Retomar / Disparar
              </button>
            </div>
          </div>

          {/* Cards de Métricas do Funil da Campanha */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider block">1. Total de Envios</span>
              <div className="text-2xl font-black text-foreground">
                {metricasCampanha.enviados}
                <span className="text-xs font-bold text-muted-foreground ml-1.5">/ {metricasCampanha.total}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Disparadas pela Z-API</p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider block">2. Entregues no Celular</span>
              <div className="text-2xl font-black text-foreground">
                {metricasCampanha.entregues}
                <span className="text-xs font-bold text-muted-foreground ml-1.5">({metricasCampanha.pctEntregues}%)</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Recebidas no aparelho</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider block">3. Lidos no WhatsApp</span>
              <div className="text-2xl font-black text-blue-600">
                {metricasCampanha.lidos}
                <span className="text-xs font-bold text-blue-500 ml-1.5">({metricasCampanha.pctLidos}%)</span>
              </div>
              <p className="text-[10px] text-blue-600/80">Check azul confirmado</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider block">4. Formulários Respondidos</span>
              <div className="text-2xl font-black text-emerald-600">
                {metricasCampanha.respondidos}
                <span className="text-xs font-bold text-emerald-500 ml-1.5">({metricasCampanha.pctResp}%)</span>
              </div>
              <p className="text-[10px] text-emerald-600/80">Taxa de conversão final</p>
            </div>
          </div>

          {/* Barra de Filtro e Busca dos Disparos Executados */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={buscaDisparo}
                onChange={e => setBuscaDisparo(e.target.value)}
                placeholder="Buscar por atleta, telefone ou CPF..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setFiltroStatusDisparo('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  filtroStatusDisparo === 'todos'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                Todos ({logsCampanha.length})
              </button>

              <button
                type="button"
                onClick={() => setFiltroStatusDisparo('lido')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filtroStatusDisparo === 'lido'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20'
                }`}
              >
                <CheckCheck className="h-3 w-3" /> Lidos ({metricasCampanha.lidos})
              </button>

              <button
                type="button"
                onClick={() => setFiltroStatusDisparo('entregue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filtroStatusDisparo === 'entregue'
                    ? 'bg-zinc-700 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <CheckCheck className="h-3 w-3" /> Entregues ({metricasCampanha.entregues})
              </button>

              <button
                type="button"
                onClick={() => setFiltroStatusDisparo('respondido')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filtroStatusDisparo === 'respondido'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" /> Respondidos ({metricasCampanha.respondidos})
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* TABELA SINTÉTICA DE DISPAROS (PADRÃO RELATÓRIOS COM BADGES) */}
          {/* ============================================================ */}
          <div className="border border-border rounded-2xl overflow-hidden bg-background">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                    <th className="p-3 pl-4">Data / Hora</th>
                    <th className="p-3">Atleta / Contato</th>
                    <th className="p-3">Status WhatsApp</th>
                    <th className="p-3">Formulário</th>
                    <th className="p-3 pr-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {carregandoLogs ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        Atualizando registros de disparos...
                      </td>
                    </tr>
                  ) : disparosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Nenhum disparo encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    disparosFiltrados.map((log, idx) => {
                      const logId = log.id || `log-${idx}`
                      const expandido = disparosExpandidos.has(logId)

                      return (
                        <React.Fragment key={logId}>
                          {/* Linha Principal com Badges */}
                          <tr
                            onClick={() => toggleExpansaoDisparo(logId)}
                            className={`hover:bg-primary/5 transition-colors cursor-pointer group ${
                              expandido ? 'bg-primary/5' : ''
                            }`}
                          >
                            <td className="p-3 pl-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                              {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              <span className="font-bold text-foreground block group-hover:text-primary transition-colors">
                                {log.participante?.nome || 'Atleta sem nome'}
                              </span>
                              <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3 text-emerald-500" />
                                {log.telefone}
                                {log.participante?.cpf && ` • CPF: ${log.participante.cpf}`}
                              </span>
                            </td>

                            {/* Badge do Ciclo de Vida do WhatsApp */}
                            <td className="p-3 whitespace-nowrap">
                              {log.status === 'lido' || log.respondeu ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-xs">
                                  <CheckCheck className="h-3.5 w-3.5" />
                                  {log.status === 'lido' && log.lido_em
                                    ? `Lido às ${new Date(log.lido_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                                    : 'Lido (Confirmado)'}
                                </span>
                              ) : log.status === 'entregue' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-muted text-foreground border border-border">
                                  <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                  Entregue {log.entregue_em ? `às ${new Date(log.entregue_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                </span>
                              ) : log.status === 'enviado' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-muted text-muted-foreground border border-border">
                                  <Check className="h-3.5 w-3.5" />
                                  Enviado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Falha no Envio
                                </span>
                              )}
                            </td>

                            {/* Badge de Conversão / Resposta */}
                            <td className="p-3 whitespace-nowrap">
                              {log.respondeu ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Respondido
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium text-muted-foreground bg-muted/30">
                                  Aguardando Resposta
                                </span>
                              )}
                            </td>

                            {/* Ações */}
                            <td className="p-3 pr-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleExpansaoDisparo(logId)
                                }}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                  expandido
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                    : 'border-border bg-card hover:bg-muted text-foreground'
                                }`}
                              >
                                {expandido ? 'Recolher' : 'Ver Detalhes'}
                                {expandido ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            </td>
                          </tr>

                          {/* Linha Expansível (Accordion Inline com Todos os Detalhes) */}
                          {expandido && (
                            <tr className="bg-muted/15 border-b border-border animate-in fade-in duration-150">
                              <td colSpan={5} className="p-4 pl-6 pr-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Caixa da Mensagem Enviada */}
                                  <div className="p-3.5 rounded-2xl bg-card border border-border space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        Mensagem Enviada ao Atleta
                                      </span>
                                      <span className="text-[10px] font-mono text-muted-foreground">
                                        {log.message_id ? `ID Z-API: ${log.message_id}` : ''}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground font-mono bg-muted/30 p-3 rounded-xl border border-border leading-relaxed whitespace-pre-wrap">
                                      {campanhaSelecionada.mensagem_texto || 'Mensagem padrão com link da pesquisa'}
                                    </p>
                                  </div>

                                  {/* Linha do Tempo Técnica da Mensagem */}
                                  <div className="p-3.5 rounded-2xl bg-card border border-border space-y-2">
                                    <span className="text-[10px] font-black uppercase text-foreground tracking-wider flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-primary" />
                                      Rastreamento Técnico do Webhook
                                    </span>

                                    <div className="space-y-2 text-xs pt-1">
                                      <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                          <Check className="h-3.5 w-3.5 text-muted-foreground" />
                                          1. Disparo Inicial:
                                        </span>
                                        <span className="font-mono font-bold text-foreground">
                                          {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                          <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                          2. Entregue no Celular:
                                        </span>
                                        <span className="font-mono font-bold text-foreground">
                                          {log.entregue_em ? new Date(log.entregue_em).toLocaleString('pt-BR') : 'Pendente de recepção'}
                                        </span>
                                      </div>

                                      <div className={`flex items-center justify-between p-2 rounded-xl font-bold border ${
                                        log.status === 'lido' || log.lido_em || log.respondeu
                                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                          : 'bg-muted/20 text-muted-foreground border-border'
                                      }`}>
                                        <span className="flex items-center gap-1.5">
                                          <CheckCheck className="h-3.5 w-3.5" />
                                          3. Lido no WhatsApp:
                                        </span>
                                        <span className="font-mono">
                                          {log.lido_em 
                                            ? new Date(log.lido_em).toLocaleString('pt-BR') 
                                            : log.respondeu 
                                            ? 'Confirmado via resposta' 
                                            : 'Ainda não visualizado'}
                                        </span>
                                      </div>

                                      {log.respondeu && (
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                                          <span className="flex items-center gap-1.5">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            4. Pesquisa Respondida:
                                          </span>
                                          <span className="font-mono">
                                            {log.respondeu_em ? new Date(log.respondeu_em).toLocaleString('pt-BR') : 'Sim'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: NOVA CAMPANHA / ONDA */}
      {/* ============================================================ */}
      {modalNovaCampanhaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-black text-foreground">
                  Nova Campanha de Disparo (Onda)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Crie uma onda isolada para enviar mensagens e acompanhar leitura e respostas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaCampanhaOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Nome da Campanha:</label>
                <input
                  type="text"
                  value={nomeNovaCampanha}
                  onChange={e => setNomeNovaCampanha(e.target.value)}
                  placeholder="Ex: 1ª Onda: Convite Geral, 2ª Onda: Lembrete..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Projeto / Corrida:</label>
                  <select
                    value={objetoNovaCampanha}
                    onChange={async e => {
                      const val = e.target.value
                      setObjetoNovaCampanha(val)
                      const pesqs = pesquisas.filter(p => p.objeto_id === val)
                      const pId = pesqs[0]?.id || ''
                      setPesquisaNovaCampanhaId(pId)
                      const parts = await dbService.getParticipantes({ objetoId: val, pesquisaId: pId || undefined })
                      setParticipantesDisparo(parts)
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
                  >
                    {objetos.map(o => (
                      <option key={o.id} value={o.id}>{o.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Pesquisa de Destino:</label>
                  <select
                    value={pesquisaNovaCampanhaId}
                    onChange={e => setPesquisaNovaCampanhaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
                  >
                    {pesquisas
                      .filter(p => !objetoNovaCampanha || p.objeto_id === objetoNovaCampanha)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.titulo}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Segmentação do Público:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFiltroPublicoNovaCampanha('todos')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer ${
                      filtroPublicoNovaCampanha === 'todos'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Todos os Inscritos
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroPublicoNovaCampanha('pendentes')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer ${
                      filtroPublicoNovaCampanha === 'pendentes'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Apenas Pendentes
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroPublicoNovaCampanha('nao_lidos')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer ${
                      filtroPublicoNovaCampanha === 'nao_lidos'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Não Lidos no Zap
                  </button>
                </div>
              </div>

              {/* Perfil de Segurança Anti-Bloqueio */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Perfil de Segurança Anti-Bloqueio:
                  </label>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    Tempo estimado ({participantesDisparo.length || 0} contatos): <strong className="text-foreground">{calcularTempoEstimado(participantesDisparo.length || 0, perfilSegurancaNovaCampanha)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(PERFIS_SEGURANCA) as PerfilSegurancaId[]).map(key => {
                    const perfil = PERFIS_SEGURANCA[key]
                    const Icone = perfil.icone
                    const selecionado = perfilSegurancaNovaCampanha === key

                    return (
                      <div
                        key={key}
                        onClick={() => setPerfilSegurancaNovaCampanha(key)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 flex flex-col justify-between ${
                          selecionado
                            ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'bg-card border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black text-foreground flex items-center gap-1">
                              <Icone className={`h-3.5 w-3.5 ${selecionado ? 'text-primary' : 'text-muted-foreground'}`} />
                              {perfil.titulo.split(' ')[0]}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${perfil.corBadge}`}>
                              {perfil.badgeRisco}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            Intervalo: <strong className="text-foreground">{perfil.delayTexto}</strong>
                            {perfil.tamanhoLote < 9999 ? ' • Pausa a cada ' + perfil.tamanhoLote : ' • Sem pausas'}
                          </p>
                        </div>

                        <div className="pt-1.5 text-[10px] font-bold text-primary flex items-center justify-between border-t border-border/50">
                          <span>{calcularTempoEstimado(participantesDisparo.length || 100, key)}</span>
                          <span className={selecionado ? 'font-black underline' : 'text-muted-foreground'}>
                            {selecionado ? '✓ Ativo' : 'Selecionar'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Texto da Mensagem:</label>
                <textarea
                  value={mensagemNovaCampanha}
                  onChange={e => setMensagemNovaCampanha(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                />
                
                {/* Botões de inserção de tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground self-center mr-1">Tags permitidas:</span>
                  {['{{primeiro_nome}}', '{{nome}}', '{{corrida}}', '{{link}}', '{{distancia}}', '{{peito}}'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setMensagemNovaCampanha(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + tag + ' ')}
                      className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-[10px] font-mono text-foreground border border-border cursor-pointer transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Previsão Real da Mensagem (Balão WhatsApp) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    Previsão de Envio (Preview no WhatsApp):
                  </label>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Simulação em tempo real
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-bold border-b border-emerald-500/20 pb-1.5">
                    <span>Para: {participantesDisparo[0]?.nome || 'Lucas Silva'}</span>
                    <span className="font-mono text-[10px]">{participantesDisparo[0]?.telefone || '(21) 98161-2199'}</span>
                  </div>
                  <p className="text-xs text-foreground font-sans leading-relaxed whitespace-pre-wrap">
                    {ZApiService.personalizarMensagem(
                      mensagemNovaCampanha,
                      participantesDisparo[0] || ({ id: '1', nome: 'Lucas Silva', dados_extras: { peito: '421', distancia: '10km' } } as any),
                      pesquisas.find(p => p.id === pesquisaNovaCampanhaId)?.token 
                        ? `https://pesquisas-andorinhas.vercel.app/r/${pesquisas.find(p => p.id === pesquisaNovaCampanhaId)?.token}` 
                        : 'https://pesquisas-andorinhas.vercel.app/r/exemplo',
                      objetos.find(o => o.id === objetoNovaCampanha)?.nome || 'Corrida'
                    )}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-700/80 dark:text-emerald-400 font-mono pt-1">
                    <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setModalNovaCampanhaOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-bold text-foreground cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSalvarCampanha(false)}
                disabled={salvandoCampanha}
                className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground cursor-pointer"
              >
                Salvar Rascunho
              </button>
              <button
                type="button"
                onClick={() => handleSalvarCampanha(true)}
                disabled={salvandoCampanha}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Salvar e Disparar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRMAÇÃO DE DISPARO & SELEÇÃO DE PERFIL */}
      {/* ============================================================ */}
      {modalConfirmarDisparoOpen && campanhaParaDisparar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    Confirmar Envio da Campanha
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Revise os parâmetros e selecione o perfil de segurança ideal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmarDisparoOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Resumo da Rodada */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Campanha:</span>
                <span className="font-black text-foreground">{campanhaParaDisparar.nome}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Destinatários Aptos:</span>
                <span className="font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {participantesAptosConfirmacao.length} atletas pendentes
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border/40">
                <span className="text-muted-foreground font-medium">Tempo Estimado de Conclusão:</span>
                <span className="font-black text-primary font-mono text-sm">
                  {calcularTempoEstimado(participantesAptosConfirmacao.length, perfilConfirmacao)}
                </span>
              </div>
            </div>

            {/* Seletor Visual dos 3 Perfis */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Nível de Proteção Anti-Bloqueio:
              </label>

              <div className="space-y-2">
                {(Object.keys(PERFIS_SEGURANCA) as PerfilSegurancaId[]).map(key => {
                  const perfil = PERFIS_SEGURANCA[key]
                  const Icone = perfil.icone
                  const selecionado = perfilConfirmacao === key

                  return (
                    <div
                      key={key}
                      onClick={() => setPerfilConfirmacao(key)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        selecionado
                          ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-xs'
                          : 'bg-card border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${perfil.corBadge}`}>
                          <Icone className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-foreground">{perfil.titulo}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${perfil.corBadge}`}>
                              {perfil.badgeRisco}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                            {perfil.descricao}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-primary block font-mono">
                          {calcularTempoEstimado(participantesAptosConfirmacao.length, key)}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {selecionado ? '✓ Ativo' : 'Selecionar'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setModalConfirmarDisparoOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-bold text-foreground cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecutarDisparoConfirmado}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer transition-all"
              >
                <Send className="h-4 w-4" />
                Iniciar Disparo ({calcularTempoEstimado(participantesAptosConfirmacao.length, perfilConfirmacao)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PROGRESSO DO DISPARO EM LOTE (COM PAUSA & MÉTRICAS) */}
      {/* ============================================================ */}
      {modalLoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
                <Send className={`h-8 w-8 ${emLotePausado ? '' : 'animate-pulse'}`} />
              </div>
              <h3 className="text-lg font-black text-foreground">
                {emLotePausado ? 'Disparo Pausado' : 'Disparo em Andamento'}
              </h3>
              
              {/* Badge do perfil de segurança ativo */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-muted/40 border-border">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Perfil: {PERFIS_SEGURANCA[perfilExecutando]?.titulo || 'Moderado'}</span>
                <span className="text-[10px] text-muted-foreground">({PERFIS_SEGURANCA[perfilExecutando]?.delayTexto})</span>
              </div>
            </div>

            {/* Banner de Pausa pelo Usuário */}
            {emLotePausado && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 animate-pulse">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  <Pause className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider">
                    Envio Pausado pelo Usuário
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    O robô está congelado. Clique em <strong>Retomar Envio</strong> quando quiser prosseguir.
                  </p>
                </div>
              </div>
            )}

            {/* Aviso de Resfriamento / Pausa Anti-Bloqueio Automática */}
            {!emLotePausado && statusResfriamento.emPausa && (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3 animate-pulse">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-700 dark:text-blue-400">
                  <Coffee className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-blue-800 dark:text-blue-300 tracking-wider">
                    Pausa de Resfriamento Anti-Spam
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Descanso programado para proteger o chip. Retomando em{' '}
                    <strong className="text-foreground font-mono font-bold">
                      {Math.floor(statusResfriamento.segundosRestantes / 60)}:
                      {(statusResfriamento.segundosRestantes % 60).toString().padStart(2, '0')}
                    </strong>
                  </p>
                </div>
              </div>
            )}

            {/* Barra de Progresso */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span>Progresso do Envio</span>
                <span>{progressoLote.atual} / {progressoLote.total}</span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  style={{ width: `${progressoLote.total > 0 ? (progressoLote.atual / progressoLote.total) * 100 : 0}%` }}
                  className="h-full bg-emerald-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Cockpit de Métricas ao Vivo no Próprio Modal */}
            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-[9px] font-extrabold uppercase text-muted-foreground block">Env.</span>
                <span className="text-sm font-black text-foreground">{progressoLote.enviados}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-[9px] font-extrabold uppercase text-muted-foreground block">Entr.</span>
                <span className="text-sm font-black text-foreground">{metricasAoVivoLote.entregues}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-[9px] font-extrabold uppercase text-blue-600 block">Lidos</span>
                <span className="text-sm font-black text-blue-600">{metricasAoVivoLote.lidos}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[9px] font-extrabold uppercase text-emerald-600 block">Resp.</span>
                <span className="text-sm font-black text-emerald-600">{metricasAoVivoLote.respondidos}</span>
              </div>
            </div>

            {/* Botões de Controle (Pausar / Retomar / Cancelar) */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              {emLoteProcessando ? (
                <>
                  <button
                    type="button"
                    onClick={handleTogglePausarLote}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      emLotePausado
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                    }`}
                  >
                    {emLotePausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {emLotePausado ? 'Retomar Envio' : 'Pausar Envio'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelarLote}
                    className="px-3.5 py-2.5 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <StopCircle className="h-3.5 w-3.5" />
                    Parar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalLoteOpen(false)}
                  className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md cursor-pointer"
                >
                  Concluir e Ver Relatório
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
