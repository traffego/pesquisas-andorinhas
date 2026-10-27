import React, { useState, useEffect, useMemo, useRef } from 'react'
import { 
  dbService, 
  type Objeto, 
  type Pesquisa, 
  type ParticipanteComStatus, 
  type ConfigZApi,
  type MensagemTemplateObjeto,
  type CampanhaDisparo,
  type DisparoLog
} from '../../services/db'
import { ZApiService, type StatusZApiResultado } from '../../services/zapi'
import { 
  Smartphone, 
  QrCode, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Key, 
  FolderGit2, 
  ClipboardList,
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  ExternalLink,
  Power,
  RotateCcw,
  Clock,
  Sparkles,
  Copy,
  Check,
  CheckCheck,
  ArrowLeft,
  History as HistoryIcon,
  Eye,
  Layers,
  Search
} from 'lucide-react'

export const WhatsAppPage: React.FC = () => {
  const [tabAtiva, setTabAtiva] = useState<'conexao' | 'mensagens' | 'disparos'>('conexao')

  // Dados do sistema
  const [objetos, setObjetos] = useState<Objeto[]>([])
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([])
  const [configZApi, setConfigZApi] = useState<ConfigZApi | null>(null)
  const [templates, setTemplates] = useState<MensagemTemplateObjeto[]>([])
  const [loading, setLoading] = useState(true)

  // Status de Conexão Z-API
  const [statusConexao, setStatusConexao] = useState<StatusZApiResultado | null>(null)
  const [verificandoStatus, setVerificandoStatus] = useState(false)
  const [qrCodeImg, setQrCodeImg] = useState<string | null>(null)
  const [carregandoQr, setCarregandoQr] = useState(false)
  const [qrErro, setQrErro] = useState<string | null>(null)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [acaoInstancia, setAcaoInstancia] = useState<'reiniciar' | 'desconectar' | null>(null)

  // Polling automático do QR Code
  const pollingRef = useRef<any>(null)

  // Formulário de Configuração Z-API
  const [formConfig, setFormConfig] = useState({
    instance_id: '',
    instance_token: '',
    client_token: ''
  })
  const [msgConfigSalva, setMsgConfigSalva] = useState<string | null>(null)

  // Aba Mensagens por Projeto e Pesquisa
  const [objetoSelecionadoMsg, setObjetoSelecionadoMsg] = useState<string>('')
  const [pesquisaFiltroMsg, setPesquisaFiltroMsg] = useState<string>('')
  const [modalTemplateOpen, setModalTemplateOpen] = useState(false)
  const [templateEdicao, setTemplateEdicao] = useState<Partial<MensagemTemplateObjeto>>({})
  const [salvandoTemplate, setSalvandoTemplate] = useState(false)

  // Aba Disparos
  const [objetoDisparo, setObjetoDisparo] = useState<string>('')
  const [pesquisaDisparoId, setPesquisaDisparoId] = useState<string>('')
  const [mensagemCustomizadaDisparo, setMensagemCustomizadaDisparo] = useState<string>('')
  const [participantesDisparo, setParticipantesDisparo] = useState<ParticipanteComStatus[]>([])
  const [carregandoParticipantes, setCarregandoParticipantes] = useState(false)

  // Feedback de Cópia
  const [copiadoLink, setCopiadoLink] = useState(false)

  // Modal e Progresso de Disparo em Lote
  const [modalLoteOpen, setModalLoteOpen] = useState(false)
  const [emLoteProcessando, setEmLoteProcessando] = useState(false)
  const [cancelarLote, setCancelarLote] = useState(false)
  const [progressoLote, setProgressoLote] = useState<{ total: number; atual: number; enviados: number; erros: number }>({
    total: 0,
    atual: 0,
    enviados: 0,
    erros: 0
  })
  const [limpandoLogs, setLimpandoLogs] = useState(false)

  // Teste individual
  const [telefoneTeste, setTelefoneTeste] = useState('')
  const [enviandoTeste, setEnviandoTeste] = useState(false)
  const [feedbackTeste, setFeedbackTeste] = useState<{ sucesso: boolean; msg: string } | null>(null)

  // --- GESTÃO DE CAMPANHAS DE DISPARO ---
  const [campanhas, setCampanhas] = useState<CampanhaDisparo[]>([])
  const [campanhaAtiva, setCampanhaAtiva] = useState<CampanhaDisparo | null>(null)
  const [carregandoCampanhas, setCarregandoCampanhas] = useState(false)
  const [modalNovaCampanhaOpen, setModalNovaCampanhaOpen] = useState(false)
  const [filtroPublicoNovaCampanha, setFiltroPublicoNovaCampanha] = useState<'todos' | 'pendentes' | 'nao_lidos'>('todos')
  const [nomeNovaCampanha, setNomeNovaCampanha] = useState('')
  const [pesquisaNovaCampanhaId, setPesquisaNovaCampanhaId] = useState('')
  const [mensagemNovaCampanha, setMensagemNovaCampanha] = useState('')
  const [salvandoCampanha, setSalvandoCampanha] = useState(false)
  const [filtroStatusCockpit, setFiltroStatusCockpit] = useState<'todos' | 'lido' | 'entregue' | 'enviado' | 'respondido' | 'pendente'>('todos')
  const [buscaCockpit, setBuscaCockpit] = useState('')
  const [logsCampanhaAtiva, setLogsCampanhaAtiva] = useState<DisparoLog[]>([])

  // Webhook Z-API
  const [webhookConfigurando, setWebhookConfigurando] = useState(false)
  const [webhookFeedback, setWebhookFeedback] = useState<{ sucesso: boolean; msg: string } | null>(null)

  // Timeline / Histórico do Atleta
  const [atletaTimeline, setAtletaTimeline] = useState<ParticipanteComStatus | null>(null)
  const [historicoTimeline, setHistoricoTimeline] = useState<any[]>([])
  const [carregandoTimeline, setCarregandoTimeline] = useState(false)
  const [modalTimelineOpen, setModalTimelineOpen] = useState(false)

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    carregarTudo()
    return () => {
      pararPolling()
    }
  }, [])

  const carregarTudo = async () => {
    setLoading(true)
    try {
      const [objs, pesqs, zcfg, tpls] = await Promise.all([
        dbService.getObjetos(),
        dbService.getPesquisas(),
        dbService.getConfigZApi(),
        dbService.getMensagensTemplates()
      ])

      setObjetos(objs)
      setPesquisas(pesqs)
      setTemplates(tpls)

      if (objs.length > 0) {
        setObjetoSelecionadoMsg(objs[0].id)
        setObjetoDisparo(objs[0].id)

        // Inicializa pesquisa do primeiro objeto
        const pesqsPrimeiro = pesqs.filter(p => p.objeto_id === objs[0].id)
        if (pesqsPrimeiro.length > 0) {
          setPesquisaDisparoId(pesqsPrimeiro[0].id)
          carregarCampanhas(pesqsPrimeiro[0].id, objs[0].id)
        }
      }

      if (zcfg) {
        setConfigZApi(zcfg)
        setFormConfig({
          instance_id: zcfg.instance_id || '',
          instance_token: zcfg.instance_token || '',
          client_token: zcfg.client_token || ''
        })

        if (ZApiService.isConfigValida(zcfg)) {
          consultarStatus(zcfg)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // --- GERENCIAMENTO DE CONEXÃO & QR CODE ---
  const consultarStatus = async (cfg?: ConfigZApi) => {
    const config = cfg || configZApi
    if (!config || !ZApiService.isConfigValida(config)) return

    setVerificandoStatus(true)
    try {
      const res = await ZApiService.obterStatus(config)
      setStatusConexao(res)
      if (res.connected) {
        setQrCodeImg(null)
        setQrErro(null)
        pararPolling()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setVerificandoStatus(false)
    }
  }

  const gerarQrCode = async () => {
    if (!configZApi || !ZApiService.isConfigValida(configZApi)) {
      alert('Preencha e salve suas credenciais da Z-API (Instance ID, Token e Client-Token) antes de gerar o QR Code.')
      return
    }

    setCarregandoQr(true)
    setQrErro(null)
    setQrCodeImg(null)

    try {
      const res = await ZApiService.obterQrCode(configZApi)
      if (res.sucesso && res.qrCodeBase64) {
        setQrCodeImg(res.qrCodeBase64)
        iniciarPolling()
      } else {
        setQrErro(res.erro || 'Falha ao buscar QR Code da Z-API.')
      }
    } catch (err: any) {
      setQrErro(err.message || 'Erro inesperado ao gerar QR Code.')
    } finally {
      setCarregandoQr(false)
    }
  }

  const iniciarPolling = () => {
    pararPolling()
    pollingRef.current = setInterval(async () => {
      if (!configZApi) return
      const res = await ZApiService.obterStatus(configZApi)
      setStatusConexao(res)
      if (res.connected) {
        pararPolling()
        setQrCodeImg(null)
      }
    }, 4000)
  }

  const pararPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoConfig(true)
    setMsgConfigSalva(null)
    try {
      await dbService.saveConfigZApi({
        instance_id: formConfig.instance_id.trim(),
        instance_token: formConfig.instance_token.trim(),
        client_token: formConfig.client_token.trim(),
        ativo: true
      })
      const atualizado = await dbService.getConfigZApi()
      setConfigZApi(atualizado)
      setMsgConfigSalva('Credenciais salvas com sucesso!')
      setTimeout(() => setMsgConfigSalva(null), 3000)
      if (atualizado && ZApiService.isConfigValida(atualizado)) {
        consultarStatus(atualizado)
      }
    } catch (err: any) {
      alert('Erro ao salvar credenciais: ' + err.message)
    } finally {
      setSalvandoConfig(false)
    }
  }

  const handleReiniciarInstancia = async () => {
    if (!configZApi || !ZApiService.isConfigValida(configZApi)) return
    if (!confirm('Deseja reiniciar a instância na Z-API? Isso reestabelece a conexão sem deslogar o aparelho.')) return

    setAcaoInstancia('reiniciar')
    try {
      const res = await ZApiService.reiniciarInstancia(configZApi)
      if (res.sucesso) {
        alert('Instância reiniciada com sucesso!')
        setTimeout(() => consultarStatus(), 2000)
      } else {
        alert('Erro ao reiniciar: ' + (res.erro || 'Desconhecido'))
      }
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setAcaoInstancia(null)
    }
  }

  const handleDesconectarInstancia = async () => {
    if (!configZApi || !ZApiService.isConfigValida(configZApi)) return
    if (!confirm('Tem certeza de que deseja desconectar o WhatsApp da instância? Será necessário ler o QR Code novamente para reconectar.')) return

    setAcaoInstancia('desconectar')
    try {
      const res = await ZApiService.desconectarInstancia(configZApi)
      if (res.sucesso) {
        alert('Instância desconectada com sucesso!')
        consultarStatus()
      } else {
        alert('Erro ao desconectar: ' + (res.erro || 'Desconhecido'))
      }
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setAcaoInstancia(null)
    }
  }

  // --- MENSAGENS POR PROJETO E PESQUISA ---
  const pesquisasDoObjetoMsg = useMemo(() => {
    if (!objetoSelecionadoMsg) return []
    return pesquisas.filter(p => p.objeto_id === objetoSelecionadoMsg)
  }, [pesquisas, objetoSelecionadoMsg])

  const templatesDoObjeto = useMemo(() => {
    if (!objetoSelecionadoMsg) return []
    return templates.filter(t => {
      const matchObj = t.objeto_id === objetoSelecionadoMsg
      if (!matchObj) return false
      if (pesquisaFiltroMsg) {
        return !t.pesquisa_id || t.pesquisa_id === pesquisaFiltroMsg
      }
      return true
    })
  }, [templates, objetoSelecionadoMsg, pesquisaFiltroMsg])

  const getLinkPorPesquisa = (pesqId?: string | null, objId?: string): string => {
    if (pesqId) {
      const p = pesquisas.find(item => item.id === pesqId)
      if (p?.token) return `https://pesquisas-andorinhas.vercel.app/r/${p.token}`
    }
    if (objId) {
      const p = pesquisas.find(item => item.objeto_id === objId)
      if (p?.token) return `https://pesquisas-andorinhas.vercel.app/r/${p.token}`
    }
    return 'https://pesquisas-andorinhas.vercel.app/'
  }

  const handleAbrirNovoTemplate = () => {
    const obj = objetos.find(o => o.id === objetoSelecionadoMsg)
    const primeiraPesq = pesquisasDoObjetoMsg[0]
    setTemplateEdicao({
      objeto_id: objetoSelecionadoMsg,
      pesquisa_id: pesquisaFiltroMsg || (primeiraPesq ? primeiraPesq.id : null),
      titulo: 'Novo Convite',
      mensagem: `Olá, {{primeiro_nome}}! Sua opinião sobre a ${obj?.nome || 'nossa corrida'} é muito importante para nós. Responda a pesquisa oficial no link: {{link}}`,
      ativo: true
    })
    setModalTemplateOpen(true)
  }

  const handleAbrirEditarTemplate = (tpl: MensagemTemplateObjeto) => {
    setTemplateEdicao({ ...tpl })
    setModalTemplateOpen(true)
  }

  const handleSalvarTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateEdicao.titulo || !templateEdicao.mensagem) {
      alert('Preencha o título e a mensagem.')
      return
    }
    setSalvandoTemplate(true)
    try {
      await dbService.saveMensagemTemplate(templateEdicao)
      const tpls = await dbService.getMensagensTemplates()
      setTemplates(tpls)
      setModalTemplateOpen(false)
    } catch (err: any) {
      alert('Erro ao salvar template: ' + err.message)
    } finally {
      setSalvandoTemplate(false)
    }
  }

  const handleExcluirTemplate = async (id: string) => {
    if (!confirm('Deseja realmente excluir este template de mensagem?')) return
    try {
      await dbService.deleteMensagemTemplate(id)
      setTemplates(templates.filter(t => t.id !== id))
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  const inserirTag = (tag: string) => {
    setTemplateEdicao(prev => ({
      ...prev,
      mensagem: (prev.mensagem || '') + tag
    }))
  }

  // --- DISPARO EM MASSA POR PROJETO E PESQUISA ---
  const pesquisasDoObjetoDisparo = useMemo(() => {
    if (!objetoDisparo) return []
    return pesquisas.filter(p => p.objeto_id === objetoDisparo)
  }, [pesquisas, objetoDisparo])

  // Quando o objeto de disparo muda, ajusta a pesquisa padrão
  useEffect(() => {
    if (objetoDisparo) {
      const pesqs = pesquisas.filter(p => p.objeto_id === objetoDisparo)
      if (pesqs.length > 0) {
        setPesquisaDisparoId(pesqs[0].id)
      } else {
        setPesquisaDisparoId('')
      }
    }
  }, [objetoDisparo, pesquisas])

  // Recarrega participantes e template sempre que muda o Objeto ou a Pesquisa
  useEffect(() => {
    if (objetoDisparo) {
      carregarParticipantesDoObjeto(objetoDisparo, pesquisaDisparoId)
      carregarCampanhas(pesquisaDisparoId, objetoDisparo)
      
      const tpls = templates.filter(t => {
        if (t.objeto_id !== objetoDisparo) return false
        if (pesquisaDisparoId && t.pesquisa_id) {
          return t.pesquisa_id === pesquisaDisparoId
        }
        return true
      })

      if (tpls.length > 0) {
        setMensagemCustomizadaDisparo(tpls[0].mensagem)
      } else {
        const obj = objetos.find(o => o.id === objetoDisparo)
        setMensagemCustomizadaDisparo(`Olá, {{primeiro_nome}}! Sua opinião sobre a ${obj?.nome || 'nossa corrida'} é fundamental. Responda no link oficial: {{link}}`)
      }
    }
  }, [objetoDisparo, pesquisaDisparoId, templates])

  // Carrega campanhas da pesquisa/objeto
  const carregarCampanhas = async (pesqId?: string, objId?: string) => {
    setCarregandoCampanhas(true)
    try {
      const data = await dbService.getCampanhas(pesqId || undefined, objId || undefined)
      setCampanhas(data)
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err)
    } finally {
      setCarregandoCampanhas(false)
    }
  }

  // Configura Webhook da Z-API com a URL da Edge Function Supabase
  const handleConfigurarWebhookAutomatico = async () => {
    if (!configZApi || !ZApiService.isConfigValida(configZApi)) {
      alert('Preencha e salve suas credenciais da Z-API antes de configurar o webhook.')
      return
    }

    setWebhookConfigurando(true)
    setWebhookFeedback(null)
    const webhookUrl = 'https://jvthahyjloffkoiroejy.supabase.co/functions/v1/zapi-webhook'

    try {
      const res = await ZApiService.configurarWebhookMessageStatus(configZApi, webhookUrl)
      if (res.sucesso) {
        setWebhookFeedback({
          sucesso: true,
          msg: 'Webhook ativado na Z-API com sucesso! As mensagens agora serão atualizadas em tempo real para Entregue e Lido (Check Azul).'
        })
      } else {
        setWebhookFeedback({
          sucesso: false,
          msg: res.erro || 'Falha ao ativar webhook na Z-API.'
        })
      }
    } catch (err: any) {
      setWebhookFeedback({
        sucesso: false,
        msg: err.message || 'Erro ao conectar webhook.'
      })
    } finally {
      setWebhookConfigurando(false)
    }
  }

  const handleAbrirCockpit = async (camp: CampanhaDisparo) => {
    setCampanhaAtiva(camp)
    try {
      const logs = await dbService.getLogsCampanha(camp.id)
      setLogsCampanhaAtiva(logs)
    } catch (e) {
      console.error(e)
    }
  }

  // Polling automático de logs e status em tempo real enquanto o cockpit estiver aberto
  useEffect(() => {
    if (!campanhaAtiva) return
    const timer = setInterval(async () => {
      try {
        const logs = await dbService.getLogsCampanha(campanhaAtiva.id)
        setLogsCampanhaAtiva(logs)
      } catch (e) {
        console.error('Erro no auto-refresh do cockpit:', e)
      }
    }, 4000)
    return () => clearInterval(timer)
  }, [campanhaAtiva?.id])

  const handleVoltarListaCampanhas = () => {
    setCampanhaAtiva(null)
    setLogsCampanhaAtiva([])
    carregarCampanhas(pesquisaDisparoId, objetoDisparo)
  }

  const handleAbrirModalNovaCampanha = (preFiltro?: 'todos' | 'pendentes' | 'nao_lidos') => {
    const qtdCampanhas = campanhas.length
    const numOnda = qtdCampanhas + 1
    const sugerido = numOnda === 1 
      ? '1ª Onda: Convite Geral Pós-Prova' 
      : `${numOnda}ª Onda: Lembrete Retardatários`
    
    setNomeNovaCampanha(sugerido)
    setFiltroPublicoNovaCampanha(preFiltro || (numOnda === 1 ? 'todos' : 'pendentes'))
    setPesquisaNovaCampanhaId(pesquisaDisparoId || pesquisasDoObjetoDisparo[0]?.id || '')

    const obj = objetos.find(o => o.id === objetoDisparo)
    const tplPadrao = templates.find(t => t.objeto_id === objetoDisparo)
    const txtPadrao = tplPadrao?.mensagem || `Olá, {{primeiro_nome}}! Sua opinião sobre a ${obj?.nome || 'nossa corrida'} é fundamental. Responda no link oficial: {{link}}`
    setMensagemNovaCampanha(txtPadrao)

    setModalNovaCampanhaOpen(true)
  }

  const handleSalvarNovaCampanha = async (iniciarDisparo: boolean = false) => {
    if (!nomeNovaCampanha.trim()) {
      alert('Informe o nome da campanha.')
      return
    }
    if (!pesquisaNovaCampanhaId) {
      alert('Selecione a pesquisa vinculada.')
      return
    }
    if (!mensagemNovaCampanha.trim()) {
      alert('Escreva o texto da mensagem.')
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
        objeto_id: objetoDisparo,
        pesquisa_id: pesquisaNovaCampanhaId,
        nome: nomeNovaCampanha.trim(),
        mensagem_texto: mensagemNovaCampanha,
        filtro_publico: filtroPublicoNovaCampanha,
        status: iniciarDisparo ? 'enviando' : 'rascunho',
        total_destinatarios: destCount,
        enviados_count: 0,
        entregues_count: 0,
        lidos_count: 0,
        respondidos_count: 0,
        disparado_em: iniciarDisparo ? new Date().toISOString() : null
      })

      setModalNovaCampanhaOpen(false)
      await carregarCampanhas(pesquisaDisparoId, objetoDisparo)
      await handleAbrirCockpit(nova)

      if (iniciarDisparo) {
        setTimeout(() => {
          handleIniciarDisparoCampanha(nova)
        }, 300)
      }
    } catch (err: any) {
      alert('Erro ao salvar campanha: ' + err.message)
    } finally {
      setSalvandoCampanha(false)
    }
  }

  const handleExcluirCampanha = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir a campanha "${nome}"?\n\nO histórico de mensagens desta campanha continuará no banco de dados, mas a campanha será removida da lista.`)) {
      return
    }
    try {
      await dbService.deleteCampanha(id)
      if (campanhaAtiva?.id === id) {
        setCampanhaAtiva(null)
      }
      await carregarCampanhas(pesquisaDisparoId, objetoDisparo)
    } catch (e: any) {
      alert('Erro ao excluir campanha: ' + e.message)
    }
  }

  const handleAbrirTimelineAtleta = async (p: ParticipanteComStatus) => {
    setAtletaTimeline(p)
    setModalTimelineOpen(true)
    setCarregandoTimeline(true)
    try {
      const hist = await dbService.getHistoricoParticipante(p.id, objetoDisparo)
      setHistoricoTimeline(hist)
    } catch (e) {
      console.error(e)
    } finally {
      setCarregandoTimeline(false)
    }
  }

  const carregarParticipantesDoObjeto = async (objId: string, pesqId?: string) => {
    setCarregandoParticipantes(true)
    try {
      const data = await dbService.getParticipantes({ 
        objetoId: objId, 
        pesquisaId: pesqId || undefined 
      })
      setParticipantesDisparo(data)
    } catch (err) {
      console.error(err)
    } finally {
      setCarregandoParticipantes(false)
    }
  }


  // Link exato da pesquisa selecionada
  const linkPesquisaDisparoAtiva = useMemo(() => {
    if (pesquisaDisparoId) {
      const pesq = pesquisas.find(p => p.id === pesquisaDisparoId)
      if (pesq?.token) return `https://pesquisas-andorinhas.vercel.app/r/${pesq.token}`
    }
    return getLinkPorPesquisa(null, objetoDisparo)
  }, [pesquisaDisparoId, objetoDisparo, pesquisas])

  // Atletas e Métricas da Campanha Ativa
  const participantesCampanhaAtiva = useMemo(() => {
    if (!campanhaAtiva) return []
    const logMap = new Map<string, DisparoLog>()
    logsCampanhaAtiva.forEach(l => {
      if (l.participante_id) logMap.set(l.participante_id, l)
    })

    let base = participantesDisparo
    if (campanhaAtiva.filtro_publico === 'pendentes') {
      base = participantesDisparo.filter(p => logMap.has(p.id) || !p.respondeu)
    } else if (campanhaAtiva.filtro_publico === 'nao_lidos') {
      base = participantesDisparo.filter(p => {
        const log = logMap.get(p.id)
        return logMap.has(p.id) || (!p.respondeu && log?.status !== 'lido')
      })
    }

    return base.map(p => {
      const log = logMap.get(p.id)
      let estado: 'respondido' | 'lido' | 'entregue' | 'enviado' | 'pendente' = 'pendente'
      if (p.respondeu) {
        estado = 'respondido'
      } else if (log) {
        estado = log.status as any
      }

      return {
        ...p,
        status_campanha: estado,
        lido_em: log?.lido_em || null,
        entregue_em: log?.entregue_em || null,
        enviado_em: log?.created_at || null
      }
    })
  }, [campanhaAtiva, logsCampanhaAtiva, participantesDisparo])

  const estatisticasCampanhaAtiva = useMemo(() => {
    if (!campanhaAtiva) {
      return { total: 0, enviados: 0, entregues: 0, lidos: 0, respondidos: 0, pctEntregues: 0, pctLidos: 0, pctResp: 0, aptos: 0 }
    }
    const total = participantesCampanhaAtiva.length || campanhaAtiva.total_destinatarios || 0
    const enviados = logsCampanhaAtiva.filter(l => l.status !== 'erro').length
    const entregues = logsCampanhaAtiva.filter(l => l.status === 'entregue' || l.status === 'lido').length
    const lidos = logsCampanhaAtiva.filter(l => l.status === 'lido').length
    const respondidos = participantesCampanhaAtiva.filter(p => p.respondeu).length

    const jaNotificadosIds = new Set(logsCampanhaAtiva.map(l => l.participante_id))
    const aptos = participantesCampanhaAtiva.filter(p => !p.respondeu && !jaNotificadosIds.has(p.id) && p.telefone && p.telefone.replace(/\D/g, '').length >= 10).length

    const pctEntregues = enviados > 0 ? Math.round((entregues / enviados) * 100) : 0
    const pctLidos = entregues > 0 ? Math.round((lidos / entregues) * 100) : 0
    const pctResp = total > 0 ? Math.round((respondidos / total) * 100) : 0

    return { total, enviados, entregues, lidos, respondidos, pctEntregues, pctLidos, pctResp, aptos }
  }, [campanhaAtiva, logsCampanhaAtiva, participantesCampanhaAtiva])

  const participantesFiltradosCockpit = useMemo(() => {
    return participantesCampanhaAtiva.filter(p => {
      const matchBusca = !buscaCockpit || 
        p.nome.toLowerCase().includes(buscaCockpit.toLowerCase()) || 
        (p.telefone && p.telefone.includes(buscaCockpit))
      
      const st = (p as any).status_campanha
      let matchStatus = true
      if (filtroStatusCockpit === 'respondido') {
        matchStatus = p.respondeu
      } else if (filtroStatusCockpit !== 'todos') {
        matchStatus = st === filtroStatusCockpit
      }

      return matchBusca && matchStatus
    })
  }, [participantesCampanhaAtiva, buscaCockpit, filtroStatusCockpit])

  const handleIniciarDisparoCampanha = async (camp: CampanhaDisparo) => {
    setCampanhaAtiva(camp)
    setMensagemCustomizadaDisparo(camp.mensagem_texto)
    await handleIniciarDisparoEmLote(camp)
  }

  const estatisticasDisparo = useMemo(() => {
    const total = participantesDisparo.length
    const respondidos = participantesDisparo.filter(p => p.respondeu).length
    const jaNotificados = participantesDisparo.filter(p => !p.respondeu && p.ja_notificado).length
    const pendentes = participantesDisparo.filter(p => !p.respondeu)
    const aptosParaEnvio = pendentes.filter(p => !p.ja_notificado && p.telefone && p.telefone.replace(/\D/g, '').length >= 10)
    return {
      total,
      respondidos,
      jaNotificados,
      pendentes: pendentes.length,
      aptos: aptosParaEnvio.length,
      listaAptos: aptosParaEnvio
    }
  }, [participantesDisparo])

  const handleLimparLogs = async () => {
    if (!pesquisaDisparoId) return
    if (!confirm('Deseja realmente reiniciar o histórico de disparos desta pesquisa?\n\nOs atletas que já receberam a mensagem voltarão a constar como aptos para novo envio (apenas quem ainda não respondeu).')) return

    setLimpandoLogs(true)
    try {
      await dbService.limparLogsDisparo(pesquisaDisparoId, objetoDisparo)
      await carregarParticipantesDoObjeto(objetoDisparo, pesquisaDisparoId)
      alert('Histórico de envios reiniciado com sucesso! Os atletas pendentes estão aptos novamente.')
    } catch (err: any) {
      alert('Erro ao reiniciar histórico: ' + err.message)
    } finally {
      setLimpandoLogs(false)
    }
  }

  const previewMensagemReal = useMemo(() => {
    const obj = objetos.find(o => o.id === objetoDisparo)
    const atletaExemplo = estatisticasDisparo.listaAptos[0] || {
      id: 'exemplo',
      nome: 'Abnadá Caetano',
      telefone: '81999998888',
      objeto_id: objetoDisparo,
      cpf: '00000000000',
      dados_extras: { peito: '1042', distancia: '5KM' }
    } as any

    return ZApiService.personalizarMensagem(
      mensagemCustomizadaDisparo,
      atletaExemplo,
      linkPesquisaDisparoAtiva,
      obj?.nome || 'Corrida de Rua'
    )
  }, [mensagemCustomizadaDisparo, objetoDisparo, linkPesquisaDisparoAtiva, objetos, estatisticasDisparo])

  const copiarLinkAtivo = () => {
    navigator.clipboard.writeText(linkPesquisaDisparoAtiva)
    setCopiadoLink(true)
    setTimeout(() => setCopiadoLink(false), 2000)
  }

  const handleEnviarTeste = async () => {
    if (!telefoneTeste || telefoneTeste.replace(/\D/g, '').length < 10) {
      alert('Informe um número de telefone com DDD para testar.')
      return
    }
    if (!configZApi || !ZApiService.isConfigValida(configZApi)) {
      alert('Configure e conecte suas credenciais da Z-API antes de disparar.')
      return
    }

    setEnviandoTeste(true)
    setFeedbackTeste(null)
    try {
      const res = await ZApiService.enviarTexto(configZApi, telefoneTeste, previewMensagemReal)
      if (res.sucesso) {
        setFeedbackTeste({ sucesso: true, msg: 'Mensagem de teste enviada com sucesso para o seu WhatsApp!' })
      } else {
        setFeedbackTeste({ sucesso: false, msg: res.erro || 'Falha no envio.' })
      }
    } catch (err: any) {
      setFeedbackTeste({ sucesso: false, msg: err.message })
    } finally {
      setEnviandoTeste(false)
    }
  }

  const handleIniciarDisparoEmLote = async (campanhaAlvo?: CampanhaDisparo) => {
    if (!ZApiService.isConfigValida(configZApi)) {
      alert('Por favor, configure as credenciais da Z-API antes de iniciar o envio.')
      setTabAtiva('conexao')
      return
    }

    if (!statusConexao?.connected) {
      if (!confirm('Atenção: A instância da Z-API pode não estar conectada ao WhatsApp no momento. Deseja tentar enviar mesmo assim?')) {
        return
      }
    }

    const camp = campanhaAlvo || campanhaAtiva

    let listaAptos: ParticipanteComStatus[] = []
    if (camp) {
      const jaNotificadosIds = new Set(logsCampanhaAtiva.map(l => l.participante_id))
      listaAptos = participantesCampanhaAtiva.filter(p => !p.respondeu && !jaNotificadosIds.has(p.id) && p.telefone && p.telefone.replace(/\D/g, '').length >= 10)
    } else {
      listaAptos = estatisticasDisparo.listaAptos
    }

    if (listaAptos.length === 0) {
      alert('Nenhum participante apto para envio (pendente e com telefone válido) encontrado nesta seleção.')
      return
    }

    const obj = objetos.find(o => o.id === objetoDisparo)
    const pesq = pesquisas.find(p => p.id === pesquisaDisparoId)
    const alvoDesc = camp ? `campanha "${camp.nome}"` : `pesquisa "${pesq?.titulo || obj?.nome}"`

    if (!confirm(`Confirmar disparo para ${listaAptos.length} participantes da ${alvoDesc}?\n\nLink que será enviado: ${linkPesquisaDisparoAtiva}\nIntervalo de segurança: 6 segundos entre mensagens.`)) {
      return
    }

    setCancelarLote(false)
    setEmLoteProcessando(true)
    setModalLoteOpen(true)
    setProgressoLote({
      total: listaAptos.length,
      atual: 0,
      enviados: 0,
      erros: 0
    })

    const lista = [...listaAptos]

    for (let i = 0; i < lista.length; i++) {
      if (cancelarLote) {
        break
      }

      const p = lista[i]
      const msgTexto = camp?.mensagem_texto || mensagemCustomizadaDisparo
      const msg = ZApiService.personalizarMensagem(
        msgTexto,
        p,
        linkPesquisaDisparoAtiva,
        obj?.nome || 'Corrida'
      )

      try {
        const res = await ZApiService.enviarTexto(configZApi!, p.telefone!, msg)
        if (res.sucesso) {
          await dbService.registrarDisparo({
            participanteId: p.id,
            pesquisaId: pesquisaDisparoId,
            objetoId: objetoDisparo,
            telefone: p.telefone!,
            status: 'enviado',
            campanhaId: camp?.id,
            messageId: res.messageId,
            zaapId: res.zaapId
          })
          p.ja_notificado = true
          p.notificado_em = new Date().toISOString()
        } else {
          await dbService.registrarDisparo({
            participanteId: p.id,
            pesquisaId: pesquisaDisparoId,
            objetoId: objetoDisparo,
            telefone: p.telefone!,
            status: 'erro',
            campanhaId: camp?.id,
            erro: res.erro || 'Falha no envio Z-API'
          })
        }

        setProgressoLote(prev => ({
          ...prev,
          atual: i + 1,
          enviados: res.sucesso ? prev.enviados + 1 : prev.enviados,
          erros: res.sucesso ? prev.erros : prev.erros + 1
        }))
      } catch (err: any) {
        await dbService.registrarDisparo({
          participanteId: p.id,
          pesquisaId: pesquisaDisparoId,
          objetoId: objetoDisparo,
          telefone: p.telefone!,
          status: 'erro',
          campanhaId: campanhaAtiva?.id,
          erro: err?.message || 'Exceção ao disparar'
        }).catch(() => {})

        setProgressoLote(prev => ({
          ...prev,
          atual: i + 1,
          erros: prev.erros + 1
        }))
      }

      // Intervalo de segurança anti-bloqueio Z-API (6 segundos) exceto no último item
      if (i < lista.length - 1 && !cancelarLote) {
        await new Promise(r => setTimeout(r, 6000))
      }
    }

    setEmLoteProcessando(false)
    if (camp) {
      await dbService.saveCampanha({
        id: camp.id,
        status: 'concluido',
        disparado_em: new Date().toISOString()
      })
      const logsAtualizados = await dbService.getLogsCampanha(camp.id)
      setLogsCampanhaAtiva(logsAtualizados)
      await carregarCampanhas(pesquisaDisparoId, objetoDisparo)
    }
    if (objetoDisparo) {
      await carregarParticipantesDoObjeto(objetoDisparo, pesquisaDisparoId)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground gap-2">
        <Clock className="h-5 w-5 animate-spin text-primary" />
        Carregando central de WhatsApp...
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                WhatsApp & Z-API
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Conecte seu WhatsApp com QR Code, configure mensagens por projeto e pesquisa, e realize disparos segmentados.
              </p>
            </div>
          </div>
        </div>

        {/* Status Rápido no Topo */}
        <div className="flex items-center gap-2">
          {statusConexao?.connected ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              WhatsApp Conectado
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Aguardando Conexão
            </div>
          )}
          <button
            onClick={() => consultarStatus()}
            disabled={verificandoStatus}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            title="Atualizar status agora"
          >
            <RefreshCw className={`h-4 w-4 ${verificandoStatus ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto">
        <button
          onClick={() => setTabAtiva('conexao')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
            tabAtiva === 'conexao'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <QrCode className="h-4 w-4" />
          1. Conexão & QR Code
        </button>

        <button
          onClick={() => setTabAtiva('mensagens')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
            tabAtiva === 'mensagens'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          2. Mensagens por Projeto & Pesquisa
        </button>

        <button
          onClick={() => setTabAtiva('disparos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap ${
            tabAtiva === 'disparos'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Send className="h-4 w-4" />
          3. Central de Disparos Segmentados
        </button>
      </div>

      {/* ============================================================ */}
      {/* ABA 1: CONEXÃO & QR CODE */}
      {/* ============================================================ */}
      {tabAtiva === 'conexao' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Card do QR Code e Status ao Vivo */}
          <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-foreground">Conexão do Smartphone</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escaneie o QR Code com o aplicativo WhatsApp
                </p>
              </div>
              <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                <QrCode className="h-5 w-5" />
              </div>
            </div>

            {/* Visualização de Status ou QR Code */}
            <div className="p-6 rounded-2xl bg-muted/40 border border-border flex flex-col items-center justify-center min-h-[300px] text-center">
              {statusConexao?.connected ? (
                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-foreground">WhatsApp Conectado!</h4>
                    <p className="text-xs text-muted-foreground max-w-xs mt-1">
                      Sua instância está pronta para enviar mensagens personalizadas e links das pesquisas oficiais.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={handleReiniciarInstancia}
                      disabled={acaoInstancia !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${acaoInstancia === 'reiniciar' ? 'animate-spin text-primary' : ''}`} />
                      Reiniciar Instância
                    </button>
                    <button
                      onClick={handleDesconectarInstancia}
                      disabled={acaoInstancia !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-destructive/20 bg-destructive/10 hover:bg-destructive/20 text-xs font-bold text-destructive transition-colors cursor-pointer"
                    >
                      <Power className="h-3.5 w-3.5" />
                      Desconectar
                    </button>
                  </div>
                </div>
              ) : qrCodeImg ? (
                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="p-3 bg-white rounded-2xl shadow-lg border border-border inline-block">
                    <img 
                      src={qrCodeImg} 
                      alt="QR Code Z-API WhatsApp" 
                      className="w-56 h-56 object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary">
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span>Aguardando leitura do celular...</span>
                  </div>
                  <button
                    onClick={gerarQrCode}
                    disabled={carregandoQr}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${carregandoQr ? 'animate-spin text-primary' : ''}`} />
                    Atualizar Imagem QR
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Smartphone className="h-8 w-8 opacity-40" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Nenhuma Conexão Ativa</h4>
                    <p className="text-xs text-muted-foreground max-w-xs mt-1">
                      Gere o QR Code para conectar seu número de envio à instância Z-API.
                    </p>
                  </div>
                  {qrErro && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive text-left flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{qrErro}</span>
                    </div>
                  )}
                  <button
                    onClick={gerarQrCode}
                    disabled={carregandoQr}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <QrCode className={`h-4 w-4 ${carregandoQr ? 'animate-spin' : ''}`} />
                    {carregandoQr ? 'Gerando QR Code...' : 'Gerar QR Code na Tela'}
                  </button>
                </div>
              )}
            </div>

            {/* Instruções de Conexão */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-2.5 text-xs text-muted-foreground">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Como conectar:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Abra o <strong>WhatsApp</strong> no seu celular.</li>
                <li>Toque nos <strong>três pontinhos</strong> (ou Configurações no iPhone).</li>
                <li>Selecione <strong>Aparelhos Conectados</strong>.</li>
                <li>Toque em <strong>Conectar Aparelho</strong> e aponte para o QR Code.</li>
              </ol>
            </div>
          </div>

          {/* Card de Configuração das Chaves Z-API */}
          <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-black text-foreground">Credenciais da Z-API</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Localize esses dados na sua conta do painel oficial Z-API
                </p>
              </div>
              <a
                href="https://app.z-api.io"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                Painel Z-API <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <form onSubmit={handleSalvarConfig} className="space-y-4">
              {msgConfigSalva && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {msgConfigSalva}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  Instance ID:
                </label>
                <input
                  type="text"
                  value={formConfig.instance_id}
                  onChange={e => setFormConfig({ ...formConfig, instance_id: e.target.value })}
                  placeholder="Ex: 3B4C5D6E7F8G9H0..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  Instance Token:
                </label>
                <input
                  type="password"
                  value={formConfig.instance_token}
                  onChange={e => setFormConfig({ ...formConfig, instance_token: e.target.value })}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  Client-Token (Segurança Z-API):
                </label>
                <input
                  type="password"
                  value={formConfig.client_token}
                  onChange={e => setFormConfig({ ...formConfig, client_token: e.target.value })}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  O Client-Token protege sua conta contra envios indevidos e é exigido no header da API.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="submit"
                  disabled={salvandoConfig}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {salvandoConfig ? 'Salvando...' : 'Salvar Credenciais'}
                </button>

                <button
                  type="button"
                  onClick={() => consultarStatus()}
                  disabled={verificandoStatus}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${verificandoStatus ? 'animate-spin' : ''}`} />
                  Testar Conexão
                </button>
              </div>
            </form>

            {/* Card de Configuração de Webhook Z-API */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1.5">
                    <CheckCheck className="h-4 w-4 text-blue-600" />
                    Webhook de Status em Tempo Real (Z-API)
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Receba notificações automáticas de <strong>Entregue</strong> e <strong>Lido (Check Azul)</strong> diretamente no banco.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-border/60">
                <span className="font-mono text-[10px] text-muted-foreground break-all max-w-sm">
                  https://jvthahyjloffkoiroejy.supabase.co/functions/v1/zapi-webhook
                </span>
                <button
                  type="button"
                  onClick={handleConfigurarWebhookAutomatico}
                  disabled={webhookConfigurando}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <RefreshCw className={`h-3 w-3 ${webhookConfigurando ? 'animate-spin' : ''}`} />
                  {webhookConfigurando ? 'Ativando...' : 'Ativar Webhook na Z-API'}
                </button>
              </div>

              {webhookFeedback && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${webhookFeedback.sucesso ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                  {webhookFeedback.sucesso ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  <span>{webhookFeedback.msg}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 2: MENSAGENS POR PROJETO E PESQUISA */}
      {/* ============================================================ */}
      {tabAtiva === 'mensagens' && (
        <div className="space-y-6">
          {/* Barra de Filtros: Projeto & Pesquisa */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto flex-1">
              {/* Seletor de Projeto */}
              <div>
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <FolderGit2 className="h-3.5 w-3.5 text-primary" />
                  Projeto / Corrida:
                </label>
                <select
                  value={objetoSelecionadoMsg}
                  onChange={e => {
                    setObjetoSelecionadoMsg(e.target.value)
                    setPesquisaFiltroMsg('')
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {objetos.map(obj => (
                    <option key={obj.id} value={obj.id}>
                      {obj.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seletor de Pesquisa do Projeto */}
              <div>
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />
                  Pesquisa do Projeto:
                </label>
                <select
                  value={pesquisaFiltroMsg}
                  onChange={e => setPesquisaFiltroMsg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="">Todas as Pesquisas deste Projeto</option>
                  {pesquisasDoObjetoMsg.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.titulo} [{p.token}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="text-xs text-muted-foreground bg-muted/50 px-3.5 py-2 rounded-xl border border-border flex items-center gap-2">
                <span>Link:</span>
                <a
                  href={getLinkPorPesquisa(pesquisaFiltroMsg || null, objetoSelecionadoMsg)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[220px]"
                >
                  {getLinkPorPesquisa(pesquisaFiltroMsg || null, objetoSelecionadoMsg)} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>

              <button
                onClick={handleAbrirNovoTemplate}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-md cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-4 w-4" /> Nova Mensagem
              </button>
            </div>
          </div>

          {/* Lista de Mensagens Cadastradas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templatesDoObjeto.length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-card border border-border rounded-2xl space-y-3">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <h4 className="text-base font-bold text-foreground">Nenhuma mensagem cadastrada com os filtros selecionados</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Crie modelos de mensagens vinculados ao projeto e à pesquisa desejada.
                </p>
                <button
                  onClick={handleAbrirNovoTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Criar Primeira Mensagem
                </button>
              </div>
            ) : (
              templatesDoObjeto.map(tpl => {
                const linkAtivo = getLinkPorPesquisa(tpl.pesquisa_id, tpl.objeto_id)
                const previewExemplo = ZApiService.personalizarMensagem(
                  tpl.mensagem,
                  { id: '1', nome: 'Abnadá Caetano', objeto_id: tpl.objeto_id, dados_extras: { peito: '1042', distancia: '5KM' } } as any,
                  linkAtivo,
                  tpl.objeto_nome || 'Corrida'
                )

                return (
                  <div key={tpl.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                        <div>
                          <h4 className="text-base font-black text-foreground">{tpl.titulo}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {tpl.objeto_nome}
                            </span>
                            {tpl.pesquisa_titulo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
                                <ClipboardList className="h-3 w-3" /> {tpl.pesquisa_titulo} ({tpl.pesquisa_token})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-medium">
                                Todas as Pesquisas do Projeto
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAbrirEditarTemplate(tpl)}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleExcluirTemplate(tpl.id)}
                            className="p-1.5 rounded-lg border border-destructive/20 hover:bg-destructive/10 text-destructive transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Preview Estilo Balão do WhatsApp */}
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground font-sans leading-relaxed whitespace-pre-wrap">
                        {previewExemplo}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border">
                      <span className="truncate max-w-[200px] font-mono text-[10px] text-primary">
                        {linkAtivo}
                      </span>
                      <button
                        onClick={() => {
                          setObjetoDisparo(tpl.objeto_id)
                          if (tpl.pesquisa_id) {
                            setPesquisaDisparoId(tpl.pesquisa_id)
                          }
                          setMensagemCustomizadaDisparo(tpl.mensagem)
                          setTabAtiva('disparos')
                        }}
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer"
                      >
                        Usar no Disparador <Send className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 3: CENTRAL DE CAMPANHAS & DISPAROS */}
      {/* ============================================================ */}
      {tabAtiva === 'disparos' && (
        <div className="space-y-8">
          {/* Barra Superior: Projeto e Pesquisa + Botão Nova Campanha */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Central de Campanhas & Disparos
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gerencie ondas de envio com rastreamento de entrega, leitura no WhatsApp e conversão em respostas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleAbrirModalNovaCampanha()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition-all cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                Nova Onda / Campanha
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* 1. Seleção do Projeto */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FolderGit2 className="h-3.5 w-3.5 text-primary" />
                  1. Projeto / Corrida:
                </label>
                <select
                  value={objetoDisparo}
                  onChange={e => {
                    const newObj = e.target.value
                    setObjetoDisparo(newObj)
                    const pesqs = pesquisas.filter(p => p.objeto_id === newObj)
                    const pId = pesqs[0]?.id || ''
                    setPesquisaDisparoId(pId)
                    carregarParticipantesDoObjeto(newObj, pId)
                    carregarCampanhas(pId, newObj)
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {objetos.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.nome}</option>
                  ))}
                </select>
              </div>

              {/* 2. Seleção da Pesquisa */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />
                  2. Pesquisa de Destino:
                </label>
                <select
                  value={pesquisaDisparoId}
                  onChange={e => {
                    const pId = e.target.value
                    setPesquisaDisparoId(pId)
                    carregarParticipantesDoObjeto(objetoDisparo, pId)
                    carregarCampanhas(pId, objetoDisparo)
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {pesquisasDoObjetoDisparo.length === 0 ? (
                    <option value="">Nenhuma pesquisa neste projeto</option>
                  ) : (
                    pesquisasDoObjetoDisparo.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.titulo} [{p.token}]
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {!campanhaAtiva ? (
            /* ============================================================ */
            /* VISÃO MACRO: LISTA DE CAMPANHAS (ONDAS) */
            /* ============================================================ */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-foreground flex items-center gap-2">
                    Ondas de Disparo Cadastradas
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                      {campanhas.length}
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cada onda isola seu histórico de entrega, leitura e conversão.
                  </p>
                </div>
              </div>

              {carregandoCampanhas ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Clock className="h-5 w-5 animate-spin text-primary" />
                  Carregando campanhas...
                </div>
              ) : campanhas.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-border rounded-3xl bg-muted/10 space-y-4">
                  <div className="inline-flex p-4 rounded-3xl bg-primary/10 text-primary">
                    <Layers className="h-8 w-8" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h5 className="text-base font-black text-foreground">
                      Nenhuma campanha criada para esta pesquisa
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      Crie sua 1ª Onda de Disparo para enviar convites aos participantes e acompanhar as taxas de entrega, leitura no WhatsApp e respostas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAbrirModalNovaCampanha()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Criar 1ª Campanha de Disparo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {campanhas.map(camp => {
                    const pctResp = camp.total_destinatarios && camp.total_destinatarios > 0 
                      ? Math.round((camp.respondidos_count / camp.total_destinatarios) * 100) 
                      : 0

                    return (
                      <div 
                        key={camp.id}
                        className="bg-card border border-border hover:border-primary/40 rounded-3xl p-5 shadow-xs transition-all space-y-4 flex flex-col justify-between"
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

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleExcluirCampanha(camp.id, camp.nome)
                              }}
                              title="Excluir campanha"
                              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div>
                            <h5 className="text-base font-black text-foreground line-clamp-1">
                              {camp.nome}
                            </h5>
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {camp.filtro_publico === 'pendentes' 
                                ? 'Público: Apenas Pendentes (Não responderam)' 
                                : camp.filtro_publico === 'nao_lidos'
                                ? 'Público: Apenas Não Lidos no WhatsApp'
                                : 'Público: Todos os Atletas'}
                            </span>
                          </div>

                          {/* Mini Métricas do Funil */}
                          <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border/60 text-center">
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

                          {/* Barra de Conversão */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                              <span>Taxa de Resposta</span>
                              <span className="text-emerald-600 font-black">{pctResp}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${Math.min(pctResp, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {camp.disparado_em 
                              ? `Disparada em ${new Date(camp.disparado_em).toLocaleDateString('pt-BR')}` 
                              : `Criada em ${new Date(camp.created_at).toLocaleDateString('pt-BR')}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAbrirCockpit(camp)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Abrir Painel
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ============================================================ */
            /* VISÃO MICRO: COCKPIT DA CAMPANHA ATIVA */
            /* ============================================================ */
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Barra de Navegação do Cockpit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleVoltarListaCampanhas}
                    className="p-2 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Voltar para lista de campanhas"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-foreground">
                        {campanhaAtiva.nome}
                      </h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        campanhaAtiva.status === 'concluido'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : campanhaAtiva.status === 'enviando'
                          ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {campanhaAtiva.status === 'concluido' ? 'Concluída' : campanhaAtiva.status === 'enviando' ? 'Enviando...' : 'Rascunho'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {campanhaAtiva.filtro_publico === 'pendentes' 
                        ? 'Público-alvo: Atletas Pendentes (que ainda não responderam)' 
                        : campanhaAtiva.filtro_publico === 'nao_lidos'
                        ? 'Público-alvo: Atletas que não leram no WhatsApp'
                        : 'Público-alvo: Todos os Atletas cadastrados'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAbrirCockpit(campanhaAtiva)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer"
                    title="Atualizar métricas da campanha"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Atualizar Status
                  </button>
                  <button
                    type="button"
                    onClick={handleLimparLogs}
                    disabled={limpandoLogs}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Reiniciar histórico de disparos da pesquisa"
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${limpandoLogs ? 'animate-spin' : ''}`} />
                    {limpandoLogs ? 'Limpando...' : 'Zerar Histórico'}
                  </button>
                  {estatisticasCampanhaAtiva.aptos > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleIniciarDisparoCampanha(campanhaAtiva)}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {estatisticasCampanhaAtiva.enviados > 0 
                        ? `Retomar Disparo (${estatisticasCampanhaAtiva.aptos} Restantes)`
                        : `Iniciar Disparo (${estatisticasCampanhaAtiva.aptos} Atletas)`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleIniciarDisparoCampanha(campanhaAtiva)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all cursor-pointer"
                      title="Disparar novamente para atletas aptos"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reenviar Mensagem
                    </button>
                  )}
                </div>
              </div>

              {/* Funil Visual de 4 Etapas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1. Enviadas */}
                <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">1. Enviadas</span>
                    <Send className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {estatisticasCampanhaAtiva.enviados}
                    <span className="text-xs font-bold text-muted-foreground ml-1.5">/ {estatisticasCampanhaAtiva.total}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Disparadas via Z-API</p>
                </div>

                {/* 2. Entregues */}
                <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">2. Entregues</span>
                    <CheckCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {estatisticasCampanhaAtiva.entregues}
                    <span className="text-xs font-bold text-muted-foreground ml-1.5">({estatisticasCampanhaAtiva.pctEntregues}%)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Aparelho recebeu mensagem</p>
                </div>

                {/* 3. Lidas no WhatsApp */}
                <div className="p-5 rounded-3xl bg-blue-500/10 border border-blue-500/20 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-blue-600">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">3. Lidas no Zap</span>
                    <CheckCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-600">
                    {estatisticasCampanhaAtiva.lidos}
                    <span className="text-xs font-bold text-blue-600/70 ml-1.5">({estatisticasCampanhaAtiva.pctLidos}%)</span>
                  </div>
                  <p className="text-[10px] text-blue-600/70">Duplo check azul confirmado</p>
                </div>

                {/* 4. Respostas Coletadas */}
                <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-600">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">4. Respostas</span>
                    <ClipboardList className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600">
                    {estatisticasCampanhaAtiva.respondidos}
                    <span className="text-xs font-bold text-emerald-600/70 ml-1.5">({estatisticasCampanhaAtiva.pctResp}%)</span>
                  </div>
                  <p className="text-[10px] text-emerald-600/70">Pesquisa preenchida</p>
                </div>
              </div>

              {/* Caixa de Mensagem e Link desta Campanha + Teste Rápido */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    Mensagem Transmitida nesta Onda:
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copiarLinkAtivo}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-[11px] font-bold text-foreground cursor-pointer"
                    >
                      {copiadoLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      {copiadoLink ? 'Copiado!' : 'Copiar Link'}
                    </button>
                    <a
                      href={linkPesquisaDisparoAtiva}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90"
                    >
                      Abrir Link <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {campanhaAtiva.mensagem_texto}
                </div>

                {/* Teste Individual para Meu WhatsApp */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    value={telefoneTeste}
                    onChange={e => setTelefoneTeste(e.target.value)}
                    placeholder="Testar no meu zap (ex: 81999998888)"
                    className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={handleEnviarTeste}
                    disabled={enviandoTeste}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-bold text-foreground transition-all cursor-pointer"
                  >
                    <Send className={`h-3 w-3 ${enviandoTeste ? 'animate-spin' : ''}`} />
                    {enviandoTeste ? 'Enviando...' : 'Testar Mensagem no Meu WhatsApp'}
                  </button>
                  {feedbackTeste && (
                    <span className={`text-xs font-bold ${feedbackTeste.sucesso ? 'text-emerald-600' : 'text-destructive'}`}>
                      {feedbackTeste.msg}
                    </span>
                  )}
                </div>
              </div>

              {/* Tabela de Destinatários Desta Campanha */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-black text-foreground">
                      Destinatários Desta Campanha
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Acompanhe o status individual de envio, leitura e resposta na pesquisa.
                    </p>
                  </div>

                  {/* Filtro por Status e Busca */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={buscaCockpit}
                        onChange={e => setBuscaCockpit(e.target.value)}
                        placeholder="Buscar atleta ou fone..."
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <select
                      value={filtroStatusCockpit}
                      onChange={e => setFiltroStatusCockpit(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
                    >
                      <option value="todos">Todos ({participantesCampanhaAtiva.length})</option>
                      <option value="lido">Lido no Zap</option>
                      <option value="entregue">Entregue</option>
                      <option value="enviado">Enviado</option>
                      <option value="respondido">Já Respondeu</option>
                      <option value="pendente">Pendente de Envio</option>
                    </select>
                  </div>
                </div>

                <div className="border border-border rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/60 border-b border-border text-muted-foreground font-extrabold uppercase text-[10px] tracking-wider">
                          <th className="p-3.5">Atleta</th>
                          <th className="p-3.5">Telefone</th>
                          <th className="p-3.5">WhatsApp</th>
                          <th className="p-3.5">Pesquisa</th>
                          <th className="p-3.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {carregandoParticipantes ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                              <Clock className="h-4 w-4 animate-spin inline-block mr-2 text-primary" />
                              Carregando atletas da pesquisa...
                            </td>
                          </tr>
                        ) : participantesFiltradosCockpit.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                              Nenhum atleta encontrado com este filtro.
                            </td>
                          </tr>
                        ) : (
                          participantesFiltradosCockpit.map(p => {
                            const st = (p as any).status_campanha

                            return (
                              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                <td className="p-3.5 font-bold text-foreground">
                                  {p.nome}
                                  {p.dados_extras?.peito && (
                                    <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      Peito {p.dados_extras.peito}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 font-mono text-muted-foreground">
                                  {p.telefone || '—'}
                                </td>
                                <td className="p-3.5">
                                  {st === 'lido' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                      <CheckCheck className="h-3 w-3 text-blue-600" /> Lido no Zap
                                    </span>
                                  ) : st === 'entregue' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-muted text-muted-foreground border border-border">
                                      <CheckCheck className="h-3 w-3 text-muted-foreground" /> Entregue
                                    </span>
                                  ) : st === 'enviado' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-muted text-muted-foreground border border-border">
                                      <Check className="h-3 w-3 text-muted-foreground" /> Enviado
                                    </span>
                                  ) : st === 'erro' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-destructive/10 text-destructive border border-destructive/20">
                                      <AlertCircle className="h-3 w-3" /> Falha
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-muted/40 text-muted-foreground border border-border/60">
                                      <Clock className="h-3 w-3" /> Não enviado
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  {p.respondeu ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Respondeu
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                      <Clock className="h-3 w-3" /> Pendente
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirTimelineAtleta(p)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-border bg-card hover:bg-muted text-[11px] font-bold text-foreground transition-colors cursor-pointer"
                                    title="Ver histórico e linha do tempo deste participante"
                                  >
                                    <HistoryIcon className="h-3 w-3 text-primary" />
                                    Linha do Tempo
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CRIAR / EDITAR TEMPLATE DE MENSAGEM */}
      {/* ============================================================ */}
      {modalTemplateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-black text-foreground">
                  {templateEdicao.id ? 'Editar Mensagem' : 'Nova Mensagem por Projeto e Pesquisa'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure o texto, selecione a pesquisa específica e personalize com tags dinâmicas
                </p>
              </div>
              <button
                onClick={() => setModalTemplateOpen(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarTemplate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Projeto */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    Projeto / Corrida:
                  </label>
                  <select
                    value={templateEdicao.objeto_id}
                    onChange={e => {
                      const newObj = e.target.value
                      const pesqs = pesquisas.filter(p => p.objeto_id === newObj)
                      setTemplateEdicao({ 
                        ...templateEdicao, 
                        objeto_id: newObj,
                        pesquisa_id: pesqs[0]?.id || null
                      })
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    {objetos.map(obj => (
                      <option key={obj.id} value={obj.id}>{obj.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Pesquisa Específica */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    Pesquisa Vinculada:
                  </label>
                  <select
                    value={templateEdicao.pesquisa_id || ''}
                    onChange={e => setTemplateEdicao({ ...templateEdicao, pesquisa_id: e.target.value || null })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Todas / Padrão do Projeto</option>
                    {pesquisas
                      .filter(p => p.objeto_id === templateEdicao.objeto_id)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.titulo} [{p.token}]
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  Título Identificador do Modelo:
                </label>
                <input
                  type="text"
                  value={templateEdicao.titulo || ''}
                  onChange={e => setTemplateEdicao({ ...templateEdicao, titulo: e.target.value })}
                  placeholder="Ex: Convite Pós-Prova, Lembrete de Encerramento"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  Texto da Mensagem:
                </label>
                <textarea
                  value={templateEdicao.mensagem || ''}
                  onChange={e => setTemplateEdicao({ ...templateEdicao, mensagem: e.target.value })}
                  rows={5}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed font-sans"
                  required
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground self-center mr-1">Inserir tag:</span>
                  {['{{primeiro_nome}}', '{{nome}}', '{{corrida}}', '{{link}}', '{{distancia}}', '{{peito}}'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => inserirTag(` ${tag}`)}
                      className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-[10px] font-mono text-foreground border border-border cursor-pointer transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Dinâmico com a Pesquisa Escolhida */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">
                    Preview do Balão WhatsApp:
                  </label>
                  <span className="font-mono text-[10px] text-primary truncate max-w-[280px]">
                    {getLinkPorPesquisa(templateEdicao.pesquisa_id, templateEdicao.objeto_id)}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground font-sans leading-relaxed whitespace-pre-wrap">
                  {ZApiService.personalizarMensagem(
                    templateEdicao.mensagem || '',
                    { id: '1', nome: 'Abnadá Caetano', objeto_id: templateEdicao.objeto_id || '', dados_extras: { peito: '1042', distancia: '5KM' } } as any,
                    getLinkPorPesquisa(templateEdicao.pesquisa_id, templateEdicao.objeto_id),
                    objetos.find(o => o.id === templateEdicao.objeto_id)?.nome || 'Corrida'
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalTemplateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoTemplate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {salvandoTemplate ? 'Salvando...' : 'Salvar Mensagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PROGRESSO DO DISPARO EM MASSA */}
      {/* ============================================================ */}
      {modalLoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-black text-foreground">Disparo em Massa em Andamento</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Intervalo seguro anti-bloqueio Z-API ativo (6s por mensagem)
                </p>
              </div>
              {!emLoteProcessando && (
                <button
                  onClick={() => setModalLoteOpen(false)}
                  className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Barra de Progresso */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span>Progresso do Lote</span>
                  <span>{progressoLote.atual} de {progressoLote.total} ({Math.round((progressoLote.atual / (progressoLote.total || 1)) * 100)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden border border-border">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${Math.round((progressoLote.atual / (progressoLote.total || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Estatísticas de Envio */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/40 border border-border text-center">
                <div>
                  <p className="text-[10px] font-extrabold text-muted-foreground uppercase">Total</p>
                  <p className="text-lg font-black text-foreground">{progressoLote.total}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-emerald-600 uppercase">Sucesso</p>
                  <p className="text-lg font-black text-emerald-600">{progressoLote.enviados}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-destructive uppercase">Falhas</p>
                  <p className="text-lg font-black text-destructive">{progressoLote.erros}</p>
                </div>
              </div>

              {emLoteProcessando ? (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary py-2">
                  <Clock className="h-4 w-4 animate-spin" />
                  Aguardando intervalo anti-bloqueio e transmitindo...
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Processamento em lote finalizado!
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                {emLoteProcessando ? (
                  <button
                    onClick={() => setCancelarLote(true)}
                    className="px-4 py-2.5 rounded-xl border border-destructive/20 bg-destructive/10 hover:bg-destructive/20 text-xs font-bold text-destructive cursor-pointer transition-colors"
                  >
                    Parar Envio
                  </button>
                ) : (
                  <button
                    onClick={() => setModalLoteOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer shadow-md"
                  >
                    Fechar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CRIAR NOVA CAMPANHA DE DISPARO (ONDA) */}
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
                  Configure o público-alvo e a mensagem que será enviada aos participantes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaCampanhaOpen(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome da Campanha */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  Nome da Campanha / Onda:
                </label>
                <input
                  type="text"
                  value={nomeNovaCampanha}
                  onChange={e => setNomeNovaCampanha(e.target.value)}
                  placeholder="Ex: 1ª Onda: Convite Geral Pós-Prova"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Filtro do Público */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  Público-Alvo do Disparo:
                </label>
                <select
                  value={filtroPublicoNovaCampanha}
                  onChange={e => setFiltroPublicoNovaCampanha(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="pendentes">
                    Apenas Pendentes (Atletas que ainda NÃO responderam) [Recomendado]
                  </option>
                  <option value="todos">
                    Todos os Atletas cadastrados no projeto
                  </option>
                  <option value="nao_lidos">
                    Apenas quem NÃO leu a mensagem anterior no WhatsApp
                  </option>
                </select>

                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Atletas aptos para esta onda:</span>
                  <span className="font-black text-foreground text-sm">
                    {filtroPublicoNovaCampanha === 'pendentes'
                      ? participantesDisparo.filter(p => !p.respondeu).length
                      : filtroPublicoNovaCampanha === 'nao_lidos'
                      ? participantesDisparo.filter(p => !p.respondeu && p.status_whatsapp !== 'lido').length
                      : participantesDisparo.length} atletas
                  </span>
                </div>
              </div>

              {/* Mensagem */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    Mensagem do WhatsApp:
                  </label>
                  <select
                    onChange={e => {
                      const t = templates.find(item => item.id === e.target.value)
                      if (t) setMensagemNovaCampanha(t.mensagem)
                    }}
                    className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-muted-foreground cursor-pointer"
                  >
                    <option value="">Carregar de Modelo...</option>
                    {templates.filter(t => t.objeto_id === objetoDisparo).map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.titulo}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={mensagemNovaCampanha}
                  onChange={e => setMensagemNovaCampanha(e.target.value)}
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed font-sans"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground self-center mr-1">Tags permitidas:</span>
                  {['{{primeiro_nome}}', '{{nome}}', '{{corrida}}', '{{link}}', '{{distancia}}', '{{peito}}'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setMensagemNovaCampanha(prev => prev + ' ' + tag)}
                      className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-[10px] font-mono text-foreground border border-border cursor-pointer transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Real */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Preview do Balão WhatsApp:
                </label>
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground font-sans leading-relaxed whitespace-pre-wrap">
                  {ZApiService.personalizarMensagem(
                    mensagemNovaCampanha,
                    participantesDisparo[0] || ({ id: '1', nome: 'Atleta Exemplo' } as any),
                    linkPesquisaDisparoAtiva,
                    objetos.find(o => o.id === objetoDisparo)?.nome || 'Corrida'
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalNovaCampanhaOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSalvarNovaCampanha(false)}
                  disabled={salvandoCampanha}
                  className="px-4 py-2.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-bold text-foreground cursor-pointer"
                >
                  Salvar Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => handleSalvarNovaCampanha(true)}
                  disabled={salvandoCampanha}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Salvar e Disparar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: LINHA DO TEMPO DO PARTICIPANTE */}
      {/* ============================================================ */}
      {modalTimelineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <HistoryIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    Linha do Tempo de Comunicações
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {atletaTimeline?.nome} • {atletaTimeline?.telefone || 'Sem telefone'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalTimelineOpen(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {carregandoTimeline ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Clock className="h-4 w-4 animate-spin text-primary" />
                Carregando histórico...
              </div>
            ) : historicoTimeline.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-2xl border border-border">
                Nenhum registro de disparo ou resposta encontrado para este participante.
              </div>
            ) : (
              <div className="space-y-4">
                {historicoTimeline.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-foreground">
                        {item.campanha_nome ? `Disparo: ${item.campanha_nome}` : 'Disparo Individual WhatsApp'}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {item.enviado_em ? new Date(item.enviado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </span>
                    </div>

                    {item.mensagem_texto && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground leading-relaxed">
                        <span className="text-[10px] font-extrabold text-emerald-600 uppercase block mb-1">Texto Enviado:</span>
                        {item.mensagem_texto}
                      </div>
                    )}

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Disparo Z-API:</span>
                        <span className="font-mono font-semibold text-foreground">
                          {item.enviado_em ? new Date(item.enviado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Entregue no Celular:</span>
                        <span className="font-mono font-semibold text-foreground">
                          {item.entregue_em ? new Date(item.entregue_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Pendente'}
                        </span>
                      </div>

                      <div className={`flex items-center justify-between p-2 rounded-lg font-bold border ${
                        item.status === 'lido' || item.lido_em
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          : 'bg-muted/40 text-muted-foreground border-border'
                      }`}>
                        <span className="flex items-center gap-1.5">
                          <CheckCheck className="h-3.5 w-3.5" /> Lido no WhatsApp:
                        </span>
                        <span className="font-mono">
                          {item.lido_em ? new Date(item.lido_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Ainda não visualizado'}
                        </span>
                      </div>

                      {item.respondeu && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Formulário Respondido:
                          </span>
                          <span className="font-mono">
                            {item.respondeu_em ? new Date(item.respondeu_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Sim'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setModalTimelineOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}