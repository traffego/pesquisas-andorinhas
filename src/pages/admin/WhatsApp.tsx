import React, { useState, useEffect, useMemo, useRef } from 'react'
import { 
  dbService, 
  type Objeto, 
  type Pesquisa, 
  type ParticipanteComStatus, 
  type ConfigZApi,
  type MensagemTemplateObjeto
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
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  ExternalLink,
  Power,
  RotateCcw,
  Clock,
  Sparkles
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

  // Aba Mensagens por Projeto
  const [objetoSelecionadoMsg, setObjetoSelecionadoMsg] = useState<string>('')
  const [modalTemplateOpen, setModalTemplateOpen] = useState(false)
  const [templateEdicao, setTemplateEdicao] = useState<Partial<MensagemTemplateObjeto>>({})
  const [salvandoTemplate, setSalvandoTemplate] = useState(false)

  // Aba Disparos
  const [objetoDisparo, setObjetoDisparo] = useState<string>('')
  const [templateDisparoId, setTemplateDisparoId] = useState<string>('')
  const [mensagemCustomizadaDisparo, setMensagemCustomizadaDisparo] = useState<string>('')
  const [participantesDisparo, setParticipantesDisparo] = useState<ParticipanteComStatus[]>([])
  const [carregandoParticipantes, setCarregandoParticipantes] = useState(false)

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

  // Teste individual
  const [telefoneTeste, setTelefoneTeste] = useState('')
  const [enviandoTeste, setEnviandoTeste] = useState(false)
  const [feedbackTeste, setFeedbackTeste] = useState<{ sucesso: boolean; msg: string } | null>(null)

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

  // --- MENSAGENS POR PROJETO ---
  const templatesDoObjeto = useMemo(() => {
    if (!objetoSelecionadoMsg) return []
    return templates.filter(t => t.objeto_id === objetoSelecionadoMsg)
  }, [templates, objetoSelecionadoMsg])

  const getPesquisaPorObjeto = (objId: string): Pesquisa | undefined => {
    return pesquisas.find(p => p.objeto_id === objId)
  }

  const getLinkPesquisaPorObjeto = (objId: string): string => {
    const pesq = getPesquisaPorObjeto(objId)
    if (pesq?.token) {
      return `https://pesquisas-andorinhas.vercel.app/r/${pesq.token}`
    }
    return 'https://pesquisas-andorinhas.vercel.app/'
  }

  const handleAbrirNovoTemplate = () => {
    const obj = objetos.find(o => o.id === objetoSelecionadoMsg)
    setTemplateEdicao({
      objeto_id: objetoSelecionadoMsg,
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

  // --- DISPARO EM MASSA POR PROJETO ---
  useEffect(() => {
    if (objetoDisparo) {
      carregarParticipantesDoObjeto(objetoDisparo)
      const tpls = templates.filter(t => t.objeto_id === objetoDisparo)
      if (tpls.length > 0) {
        setTemplateDisparoId(tpls[0].id)
        setMensagemCustomizadaDisparo(tpls[0].mensagem)
      } else {
        setTemplateDisparoId('')
        const obj = objetos.find(o => o.id === objetoDisparo)
        setMensagemCustomizadaDisparo(`Olá, {{primeiro_nome}}! Sua opinião sobre a ${obj?.nome || 'nossa corrida'} é fundamental. Responda no link oficial: {{link}}`)
      }
    }
  }, [objetoDisparo, templates])

  const carregarParticipantesDoObjeto = async (objId: string) => {
    setCarregandoParticipantes(true)
    try {
      const data = await dbService.getParticipantes({ objetoId: objId })
      setParticipantesDisparo(data)
    } catch (err) {
      console.error(err)
    } finally {
      setCarregandoParticipantes(false)
    }
  }

  const handleTrocaTemplateDisparo = (tplId: string) => {
    setTemplateDisparoId(tplId)
    const t = templates.find(item => item.id === tplId)
    if (t) {
      setMensagemCustomizadaDisparo(t.mensagem)
    }
  }

  const estatisticasDisparo = useMemo(() => {
    const total = participantesDisparo.length
    const respondidos = participantesDisparo.filter(p => p.respondeu).length
    const pendentes = participantesDisparo.filter(p => !p.respondeu)
    const aptosParaEnvio = pendentes.filter(p => p.telefone && p.telefone.replace(/\D/g, '').length >= 10)
    return {
      total,
      respondidos,
      pendentes: pendentes.length,
      aptos: aptosParaEnvio.length,
      listaAptos: aptosParaEnvio
    }
  }, [participantesDisparo])

  const previewMensagemReal = useMemo(() => {
    const obj = objetos.find(o => o.id === objetoDisparo)
    const link = getLinkPesquisaPorObjeto(objetoDisparo)
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
      link,
      obj?.nome || 'Corrida de Rua'
    )
  }, [mensagemCustomizadaDisparo, objetoDisparo, objetos, estatisticasDisparo])

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

  const handleIniciarDisparoEmLote = async () => {
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

    if (estatisticasDisparo.aptos === 0) {
      alert('Nenhum participante pendente com telefone válido encontrado para este projeto.')
      return
    }

    const obj = objetos.find(o => o.id === objetoDisparo)
    const link = getLinkPesquisaPorObjeto(objetoDisparo)

    if (!confirm(`Confirmar disparo para ${estatisticasDisparo.aptos} participantes de "${obj?.nome}" com intervalo seguro anti-bloqueio de 6 segundos entre mensagens?`)) {
      return
    }

    setCancelarLote(false)
    setEmLoteProcessando(true)
    setModalLoteOpen(true)
    setProgressoLote({
      total: estatisticasDisparo.aptos,
      atual: 0,
      enviados: 0,
      erros: 0
    })

    const lista = [...estatisticasDisparo.listaAptos]

    for (let i = 0; i < lista.length; i++) {
      if (cancelarLote) {
        break
      }

      const p = lista[i]
      const msg = ZApiService.personalizarMensagem(
        mensagemCustomizadaDisparo,
        p,
        link,
        obj?.nome || 'Corrida'
      )

      try {
        const res = await ZApiService.enviarTexto(configZApi!, p.telefone!, msg)
        setProgressoLote(prev => ({
          ...prev,
          atual: i + 1,
          enviados: res.sucesso ? prev.enviados + 1 : prev.enviados,
          erros: res.sucesso ? prev.erros : prev.erros + 1
        }))
      } catch (err) {
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
                Conecte seu WhatsApp com QR Code, crie mensagens por projeto e realize disparos em massa.
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
          2. Mensagens por Projeto
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
          3. Central de Disparos
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
                      Sua instância está pronta para enviar mensagens personalizadas e formulários oficiais.
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
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 2: MENSAGENS POR PROJETO */}
      {/* ============================================================ */}
      {tabAtiva === 'mensagens' && (
        <div className="space-y-6">
          {/* Seletor de Projeto */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1 w-full md:w-auto">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Selecione o Projeto / Corrida:
              </label>
              <select
                value={objetoSelecionadoMsg}
                onChange={e => setObjetoSelecionadoMsg(e.target.value)}
                className="w-full md:w-96 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {objetos.map(obj => (
                  <option key={obj.id} value={obj.id}>
                    {obj.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-xl border border-border">
                Link da Pesquisa deste Projeto:{' '}
                <a
                  href={getLinkPesquisaPorObjeto(objetoSelecionadoMsg)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  {getLinkPesquisaPorObjeto(objetoSelecionadoMsg)} <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <button
                onClick={handleAbrirNovoTemplate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-md cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-4 w-4" /> Nova Mensagem
              </button>
            </div>
          </div>

          {/* Lista de Mensagens Cadastradas para o Projeto Selecionado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templatesDoObjeto.length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-card border border-border rounded-2xl space-y-3">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <h4 className="text-base font-bold text-foreground">Nenhuma mensagem cadastrada para este projeto</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Crie modelos de mensagens para disparar aos inscritos desta corrida ou evento.
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
                const pesq = getPesquisaPorObjeto(tpl.objeto_id)
                const link = pesq ? `https://pesquisas-andorinhas.vercel.app/r/${pesq.token}` : 'https://pesquisas-andorinhas.vercel.app/'
                const previewExemplo = ZApiService.personalizarMensagem(
                  tpl.mensagem,
                  { id: '1', nome: 'Abnadá Caetano', objeto_id: tpl.objeto_id, dados_extras: { peito: '1042', distancia: '5KM' } } as any,
                  link,
                  tpl.objeto_nome || 'Corrida'
                )

                return (
                  <div key={tpl.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                        <div>
                          <h4 className="text-base font-black text-foreground">{tpl.titulo}</h4>
                          <span className="text-[11px] text-muted-foreground">
                            {tpl.objeto_nome}
                          </span>
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
                      <span>Tags dinâmicas aplicadas</span>
                      <button
                        onClick={() => {
                          setObjetoDisparo(tpl.objeto_id)
                          setTemplateDisparoId(tpl.id)
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
      {/* ABA 3: CENTRAL DE DISPAROS POR PROJETO */}
      {/* ============================================================ */}
      {tabAtiva === 'disparos' && (
        <div className="space-y-8">
          {/* Card de Configuração do Disparo */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-foreground border-b border-border pb-3">
              Configurar Disparo em Massa
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Seleção do Projeto */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FolderGit2 className="h-3.5 w-3.5 text-primary" />
                  1. Projeto / Corrida de Destino:
                </label>
                <select
                  value={objetoDisparo}
                  onChange={e => setObjetoDisparo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {objetos.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.nome}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Cada participante deste projeto receberá o link específico do formulário dele.
                </p>
              </div>

              {/* Seleção da Mensagem */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  2. Mensagem Modelo do Projeto:
                </label>
                <select
                  value={templateDisparoId}
                  onChange={e => handleTrocaTemplateDisparo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {templates.filter(t => t.objeto_id === objetoDisparo).length === 0 && (
                    <option value="">Mensagem Padrão do Sistema</option>
                  )}
                  {templates.filter(t => t.objeto_id === objetoDisparo).map(tpl => (
                    <option key={tpl.id} value={tpl.id}>{tpl.titulo}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Você pode editar a mensagem antes de disparar logo abaixo.
                </p>
              </div>
            </div>

            {/* Editor de Texto da Mensagem */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                Conteúdo da Mensagem para este Envio:
              </label>
              <textarea
                value={mensagemCustomizadaDisparo}
                onChange={e => setMensagemCustomizadaDisparo(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed font-sans"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground self-center mr-1">Tags permitidas:</span>
                {['{{primeiro_nome}}', '{{nome}}', '{{corrida}}', '{{link}}', '{{distancia}}', '{{peito}}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setMensagemCustomizadaDisparo(prev => prev + ' ' + tag)}
                    className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-[10px] font-mono text-foreground border border-border cursor-pointer transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Painel de Métricas do Projeto Selecionado */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider">Total Atletas</p>
                <p className="text-xl font-black text-foreground">{carregandoParticipantes ? '...' : estatisticasDisparo.total}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase text-emerald-600 tracking-wider">Já Responderam</p>
                <p className="text-xl font-black text-emerald-600">{carregandoParticipantes ? '...' : estatisticasDisparo.respondidos}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase text-amber-500 tracking-wider">Pendentes</p>
                <p className="text-xl font-black text-amber-500">{carregandoParticipantes ? '...' : estatisticasDisparo.pendentes}</p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase text-primary tracking-wider">Aptos (Com Telefone)</p>
                <p className="text-xl font-black text-primary">{carregandoParticipantes ? '...' : estatisticasDisparo.aptos}</p>
              </div>
            </div>

            {/* Preview Real do Balão WhatsApp */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider block">
                Visualização Real (Como o Atleta Nº 1 vai receber):
              </label>
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans max-w-2xl">
                {previewMensagemReal}
              </div>
            </div>

            {/* Teste Individual Rápido */}
            <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-foreground tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-primary" />
                Enviar Mensagem de Teste para o Seu WhatsApp:
              </h4>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={telefoneTeste}
                  onChange={e => setTelefoneTeste(e.target.value)}
                  placeholder="Ex: 81999998888 (com DDD)"
                  className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleEnviarTeste}
                  disabled={enviandoTeste}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-bold text-foreground transition-all cursor-pointer"
                >
                  <Send className={`h-3.5 w-3.5 ${enviandoTeste ? 'animate-spin' : ''}`} />
                  {enviandoTeste ? 'Enviando...' : 'Testar no Meu WhatsApp'}
                </button>
              </div>
              {feedbackTeste && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${feedbackTeste.sucesso ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                  {feedbackTeste.sucesso ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {feedbackTeste.msg}
                </div>
              )}
            </div>

            {/* Botão de Disparo em Massa */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Proteção Anti-Bloqueio: <strong>6 segundos</strong> de intervalo automático entre cada mensagem.
                </span>
              </div>

              <button
                type="button"
                onClick={handleIniciarDisparoEmLote}
                disabled={estatisticasDisparo.aptos === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm shadow-lg transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
                Iniciar Disparo em Massa ({estatisticasDisparo.aptos} Atletas)
              </button>
            </div>
          </div>
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
                  {templateEdicao.id ? 'Editar Mensagem' : 'Nova Mensagem por Projeto'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure o texto e personalize com tags dinâmicas
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
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  Projeto / Corrida Vinculada:
                </label>
                <select
                  value={templateEdicao.objeto_id}
                  onChange={e => setTemplateEdicao({ ...templateEdicao, objeto_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  {objetos.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.nome}</option>
                  ))}
                </select>
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

              {/* Preview Dinâmico */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Preview do Balão WhatsApp:
                </label>
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground font-sans leading-relaxed whitespace-pre-wrap">
                  {ZApiService.personalizarMensagem(
                    templateEdicao.mensagem || '',
                    { id: '1', nome: 'Abnadá Caetano', objeto_id: templateEdicao.objeto_id || '', dados_extras: { peito: '1042', distancia: '5KM' } } as any,
                    getLinkPesquisaPorObjeto(templateEdicao.objeto_id || ''),
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
    </div>
  )
}