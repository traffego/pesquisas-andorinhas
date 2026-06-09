import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { dbService, type Pesquisa, type Pergunta, type Objeto, type Lider, type Fluxo } from '../../services/db'
import logoImg from '../../assets/logo.png'
import { 
  CheckCircle2, 
  ChevronRight, 
  Lock, 
  AlertTriangle
} from 'lucide-react'

export const Responder: React.FC = () => {
  const { token } = useParams<{ token: string }>()

  const [searchParams] = useSearchParams()

  const [pesquisa, setPesquisa] = useState<(Pesquisa & { fluxo?: Fluxo }) | null>(null)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [flowData, setFlowData] = useState<any>(null)
  
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [respondeu, setRespondeu] = useState(false)
  const [deviceFp, setDeviceFp] = useState('')
  const [todasPerguntasSession, setTodasPerguntasSession] = useState<Pergunta[]>([])

  // Acumula todas as perguntas carregadas na sessão para o preview de subfluxos
  useEffect(() => {
    if (perguntas.length > 0) {
      setTodasPerguntasSession(prev => {
        const map = new Map(prev.map(p => [p.id, p]))
        perguntas.forEach(p => map.set(p.id, p))
        return Array.from(map.values())
      })
    }
  }, [perguntas])

  // Estado do fluxo de respostas
  const [currentNodeId, setCurrentNodeId] = useState<string>('start')
  const [respostasAcumuladas, setRespostasAcumuladas] = useState<Record<string, any>>({})
  
  // Resposta da tela atual
  const [valorAtual, setValorAtual] = useState<any>('')
  const [validacaoErro, setValidacaoErro] = useState('')

  // Objeto e Líder Relacionados
  const [objetoRelacionado, setObjetoRelacionado] = useState<Objeto | null>(null)
  const [liderRelacionado, setLiderRelacionado] = useState<Lider | null>(null)

  interface SubflowState {
    pesquisa: Pesquisa & { fluxo?: Fluxo }
    flowData: any
    perguntas: Pergunta[]
    respostasAcumuladas: Record<string, any>
    currentNodeId: string
    objetoRelacionado: Objeto | null
    liderRelacionado: Lider | null
  }

  const [subflowStack, setSubflowStack] = useState<SubflowState[]>([])

  // Gera ou lê fingerprint do localStorage
  const getDeviceFingerprint = () => {
    let fp = localStorage.getItem('andorinha_device_fp')
    if (!fp) {
      const userAgent = navigator.userAgent
      const screenWidth = window.screen.width
      const screenHeight = window.screen.height
      const random = Math.random().toString(36).substring(2, 15)
      fp = btoa(`${userAgent}-${screenWidth}x${screenHeight}-${random}`).substring(0, 32)
      localStorage.setItem('andorinha_device_fp', fp)
    }
    return fp
  }

  useEffect(() => {
    if (token) {
      const fp = getDeviceFingerprint()
      setDeviceFp(fp)
      loadFlow(token, fp)
    }
  }, [token, searchParams])

  const loadFlow = async (tk: string, fp: string) => {
    setLoading(true)
    try {
      let pesq: Pesquisa | null = null
      let obj: Objeto | null = null
      let lid: Lider | null = null
      let pergs: Pergunta[] = []
      let flowDataObj: any = null

      if (tk === 'preview') {
        const fluxoId = searchParams.get('fluxo')
        if (!fluxoId) {
          setErrorMsg('ID do fluxo não especificado para visualização.')
          setLoading(false)
          return
        }
        const fluxoObj = await dbService.getFluxoById(fluxoId)
        if (!fluxoObj) {
          setErrorMsg('Fluxo de visualização não encontrado.')
          setLoading(false)
          return
        }
        pesq = {
          id: 'preview',
          titulo: fluxoObj.nome || 'Visualização do Fluxo',
          descricao: '',
          token: 'preview',
          publicada: true,
          fluxo_id: fluxoObj.id,
          created_at: new Date().toISOString(),
          objeto_id: null,
          lider_id: null
        }
        flowDataObj = fluxoObj.flow_data
        pergs = await dbService.getPerguntas(fluxoObj.id)
      } else {
        // 1. Carrega pesquisa pública ativa
        const realPesq = await dbService.getPesquisaByToken(tk)
        if (!realPesq) {
          setErrorMsg('Pesquisa não encontrada ou indisponível.')
          setLoading(false)
          return
        }
        pesq = realPesq
        flowDataObj = realPesq.fluxo?.flow_data

        // Carrega Objeto e Líder relacionados
        if (realPesq.objeto_id) {
          try {
            obj = await dbService.getObjetoById(realPesq.objeto_id)
            setObjetoRelacionado(obj)
          } catch (e) {
            console.error(e)
          }
        }
        if (realPesq.lider_id) {
          try {
            lid = await dbService.getLiderById(realPesq.lider_id)
            setLiderRelacionado(lid)
          } catch (e) {
            console.error(e)
          }
        }

        // 2. Prevenção de duplicados
        const jaRespondeu = await dbService.hasDeviceResponded(realPesq.id, fp)
        if (jaRespondeu) {
          setRespondeu(true)
          setLoading(false)
          return
        }

        // 3. Carrega perguntas
        if (!realPesq.fluxo_id) {
          setErrorMsg('Esta pesquisa não possui um fluxo associado.')
          setLoading(false)
          return
        }
        pergs = await dbService.getPerguntas(realPesq.fluxo_id)
      }

      setPesquisa(pesq)
      setFlowData(flowDataObj)
      setPerguntas(pergs)

      // 4. Inicia no nó conectado ao "Início"
      const edges = flowDataObj?.edges || []
      const startEdge = edges.find((e: any) => e.source === 'start')
      if (startEdge) {
        const firstNodeId = startEdge.target
        const firstNode = flowDataObj?.nodes?.find((n: any) => n.id === firstNodeId)

        if (firstNode && firstNode.type === 'subflow') {
          const subflowId = firstNode.data?.subflowId
          if (!subflowId) {
            setErrorMsg('Subfluxo não configurado.')
            setLoading(false)
            return
          }
          const subflowEdge = edges.find((e: any) => e.source === firstNode.id)
          const returnNodeId = subflowEdge ? subflowEdge.target : 'end'

          const parentState: SubflowState = {
            pesquisa: pesq!,
            flowData: flowDataObj,
            perguntas: pergs,
            respostasAcumuladas: {},
            currentNodeId: returnNodeId,
            objetoRelacionado: obj,
            liderRelacionado: lid
          }

          await enterSubflow(subflowId, parentState)
        } else {
          setCurrentNodeId(firstNodeId)
        }
      } else {
        setErrorMsg('Esta pesquisa ainda não possui um fluxo estruturado.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Erro ao iniciar formulário de respostas.')
    } finally {
      setLoading(false)
    }
  }

  // --- MÁSCARAS ---
  const applyWhatsappMask = (val: string) => {
    const numbers = val.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const applyCpfMask = (val: string) => {
    const n = val.replace(/\D/g, '').slice(0, 11)
    if (n.length <= 3) return n
    if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`
    if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`
    return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`
  }

  const applyCepMask = (val: string) => {
    const n = val.replace(/\D/g, '').slice(0, 8)
    if (n.length <= 5) return n
    return `${n.slice(0, 5)}-${n.slice(5)}`
  }

  // --- SELEÇÃO DE MÚLTIPLA ESCOLHA ---
  const handleToggleOpcao = (opcaoId: string) => {
    const selecionadas = Array.isArray(valorAtual) ? [...valorAtual] : []
    const maxRespostas = perguntaAtual?.config?.max_respostas

    if (selecionadas.includes(opcaoId)) {
      setValorAtual(selecionadas.filter(id => id !== opcaoId))
      setValidacaoErro('')
    } else {
      if (maxRespostas === 1) {
        // Seleção única (comportamento de Radio)
        setValorAtual([opcaoId])
        setValidacaoErro('')
      } else if (maxRespostas && selecionadas.length >= maxRespostas) {
        setValidacaoErro(`Você pode selecionar no máximo ${maxRespostas} opções.`)
      } else {
        setValorAtual([...selecionadas, opcaoId])
        setValidacaoErro('')
      }
    }
  }

  // --- BUSCA PERGUNTA ATUAL ---
  const getPerguntaAtual = (): Pergunta | undefined => {
    return perguntas.find(p => p.id === currentNodeId)
  }

  const perguntaAtual = getPerguntaAtual()

  // Limpa o valor de entrada quando muda o nó da pergunta
  useEffect(() => {
    if (perguntaAtual) {
      // Pré-carrega se já foi respondida
      const anterior = respostasAcumuladas[perguntaAtual.id]
      setValorAtual(anterior !== undefined ? anterior : (perguntaAtual.tipo === 'multipla' ? [] : ''))
      setValidacaoErro('')
    }
  }, [currentNodeId, perguntaAtual])

  // --- VALIDAÇÕES DE TELA ---
  const validarResposta = (): boolean => {
    if (!perguntaAtual) return true

    const isObrig = perguntaAtual.obrigatoria
    
    // Texto e outros campos normais
    if (perguntaAtual.tipo === 'avaliacao') {
      if (isObrig && (valorAtual === '' || valorAtual === null || valorAtual === undefined)) {
        setValidacaoErro('Por favor, selecione uma nota.')
        return false
      }
    } else if (perguntaAtual.tipo !== 'multipla') {
      const txt = (valorAtual as string || '').trim()
      if (isObrig) {
        if (perguntaAtual.tipo === 'logradouro') {
          const valStr = (valorAtual as string || '').trim()
          const tiposLogradouro = ['Rua', 'Avenida', 'Praça', 'Travessa', 'Alameda', 'Rodovia', 'Outro']
          const match = tiposLogradouro.find(t => valStr.startsWith(t + ' '))
          const nome = match ? valStr.slice(match.length + 1).trim() : valStr.trim()
          if (!nome) {
            setValidacaoErro('Esta resposta é obrigatória.')
            return false
          }
        } else if (!txt) {
          setValidacaoErro('Esta resposta é obrigatória.')
          return false
        }
      }

      if (txt) {
        if (perguntaAtual.tipo === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(txt)) {
            setValidacaoErro('Por favor, informe um endereço de e-mail válido.')
            return false
          }
        }

        if (perguntaAtual.tipo === 'whatsapp') {
          const digits = txt.replace(/\D/g, '')
          if (digits.length < 10 || digits.length > 11) {
            setValidacaoErro('Por favor, insira o número de celular completo com DDD.')
            return false
          }
        }

        if (perguntaAtual.tipo === 'cpf') {
          const digits = txt.replace(/\D/g, '')
          if (digits.length !== 11) {
            setValidacaoErro('CPF inválido. Informe os 11 dígitos.')
            return false
          }
        }

        if (perguntaAtual.tipo === 'cep') {
          const digits = txt.replace(/\D/g, '')
          if (digits.length !== 8) {
            setValidacaoErro('CEP inválido. Informe os 8 dígitos.')
            return false
          }
        }

        if (perguntaAtual.tipo === 'numero') {
          if (!/^-?\d+([.,]\d+)?$/.test(txt)) {
            setValidacaoErro('Por favor, informe apenas números.')
            return false
          }
        }
      }
    } else if (perguntaAtual.tipo !== 'multipla') {
      // Não faz nada para outros tipos sem validação específica
    } else {
      // Múltipla escolha
      const selecionadas = valorAtual as string[]
      if (isObrig && selecionadas.length === 0) {
        setValidacaoErro('Por favor, selecione pelo menos uma opção.')
        return false
      }
      const maxRespostas = perguntaAtual.config?.max_respostas
      if (maxRespostas && selecionadas.length > maxRespostas) {
        setValidacaoErro(`Por favor, selecione no máximo ${maxRespostas} opções.`)
        return false
      }
    }

    return true
  }

  // --- SUBFLUXOS E SESSÕES ---
  const enterSubflow = async (subflowId: string, parentState: SubflowState) => {
    setLoading(true)
    try {
      const subq = await dbService.getFluxoById(subflowId)
      if (!subq) {
        throw new Error('Subfluxo não encontrado ou indisponível.')
      }

      const subPergs = await dbService.getPerguntas(subq.id)

      // Encontra nó inicial do subfluxo
      const subEdges = subq.flow_data?.edges || []
      const subStartEdge = subEdges.find((e: any) => e.source === 'start')
      if (!subStartEdge) {
        throw new Error('Subfluxo não possui um fluxo estruturado.')
      }

      const firstNodeId = subStartEdge.target
      const firstNode = subq.flow_data?.nodes?.find((n: any) => n.id === firstNodeId)

      if (firstNode && firstNode.type === 'subflow') {
        // Subfluxo aninhado diretamente na largada
        const nestedSubflowId = firstNode.data?.subflowId
        if (!nestedSubflowId) {
          throw new Error('Subfluxo aninhado não configurado.')
        }
        const subflowEdge = subEdges.find((e: any) => e.source === firstNode.id)
        const returnNodeId = subflowEdge ? subflowEdge.target : 'end'

        const middleState: SubflowState = {
          pesquisa: parentState.pesquisa,
          flowData: subq.flow_data,
          perguntas: subPergs,
          respostasAcumuladas: {},
          currentNodeId: returnNodeId,
          objetoRelacionado: parentState.objetoRelacionado,
          liderRelacionado: parentState.liderRelacionado
        }

        setSubflowStack(prev => [...prev, parentState])
        await enterSubflow(nestedSubflowId, middleState)
      } else {
        setSubflowStack(prev => [...prev, parentState])

        setFlowData(subq.flow_data)
        setPerguntas(subPergs)
        setRespostasAcumuladas({})
        setValorAtual('')
        setValidacaoErro('')

        setCurrentNodeId(firstNodeId)
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Erro ao carregar subfluxo.')
    } finally {
      setLoading(false)
    }
  }

  const finalizarFluxoOuSubfluxo = async (
    pesqId: string,
    respostasAtuais: Record<string, any>,
    pilha: SubflowState[]
  ) => {
    setLoading(true)
    try {
      if (pilha.length > 0) {
        const parent = pilha[pilha.length - 1]
        const novaPilha = pilha.slice(0, -1)
        setSubflowStack(novaPilha)

        setPesquisa(parent.pesquisa)
        setFlowData(parent.flowData)
        setPerguntas(parent.perguntas)
        
        const novasRespostas = {
          ...parent.respostasAcumuladas,
          ...respostasAtuais
        }
        setRespostasAcumuladas(novasRespostas)
        setObjetoRelacionado(parent.objetoRelacionado)
        setLiderRelacionado(parent.liderRelacionado)

        if (parent.currentNodeId === 'end') {
          await finalizarFluxoOuSubfluxo(parent.pesquisa.id, novasRespostas, novaPilha)
        } else {
          setCurrentNodeId(parent.currentNodeId)
          setLoading(false)
        }
      } else {
        if (token !== 'preview') {
          const itens = Object.keys(respostasAtuais).map(pergId => ({
            pergunta_id: pergId,
            valor: respostasAtuais[pergId]
          }))
          await dbService.saveRespostaCompleta(pesqId, deviceFp, itens)
        }
        setRespondeu(true)
        setLoading(false)
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Ocorreu um erro ao gravar suas respostas. Tente novamente.')
      setLoading(false)
    }
  }

  // --- AVANÇO DE FLUXO ---
  const handleAvancar = async () => {
    if (!validarResposta() || !pesquisa || !flowData) return

    // 1. Salva a resposta atual no estado acumulador
    const novasRespostas = {
      ...respostasAcumuladas,
      [currentNodeId]: valorAtual
    }
    setRespostasAcumuladas(novasRespostas)

    const edges = flowData.edges || []
    let proximoNoId = 'end'

    if (perguntaAtual?.tipo === 'multipla') {
      // Lógica de avanço condicional para múltipla escolha
      const selecionadas = valorAtual as string[]
      
      // Busca arestas condicionais que saem deste nó
      const arestasSaindo = edges.filter((e: any) => e.source === currentNodeId)
      
      // 1. Tenta encontrar uma aresta que parta do handle correspondente a uma opção selecionada
      const arestaPorHandle = arestasSaindo.find((e: any) => 
        e.sourceHandle && e.sourceHandle !== 'output' && selecionadas.includes(e.sourceHandle)
      )

      if (arestaPorHandle) {
        proximoNoId = arestaPorHandle.target
      } else {
        // 2. Tenta encontrar uma aresta condicional associada às opções marcadas
        const arestaCondicionalCorrespondente = arestasSaindo.find((e: any) => 
          e.data && e.data.opcaoId && selecionadas.includes(e.data.opcaoId)
        )

        if (arestaCondicionalCorrespondente) {
          proximoNoId = arestaCondicionalCorrespondente.target
        } else {
          // 3. Se nenhuma condicional bater, procura a rota incondicional padrão
          const arestaIncondicional = arestasSaindo.find((e: any) => 
            (!e.sourceHandle || e.sourceHandle === 'output') && (!e.data || !e.data.opcaoId)
          )
          if (arestaIncondicional) {
            proximoNoId = arestaIncondicional.target
          }
        }
      }
    } else {
      // Avanço sequencial simples para outros tipos
      const arestaPadrao = edges.find((e: any) => e.source === currentNodeId)
      if (arestaPadrao) {
        proximoNoId = arestaPadrao.target
      }
    }

    // 2. Verifica se o próximo nó é subfluxo ou fim ou outra pergunta
    const proximoNo = flowData.nodes?.find((n: any) => n.id === proximoNoId)

    if (proximoNo && proximoNo.type === 'subflow') {
      const subflowId = proximoNo.data?.subflowId
      if (!subflowId) {
        setErrorMsg('Subfluxo não configurado.')
        return
      }

      const subflowEdge = edges.find((e: any) => e.source === proximoNo.id)
      const returnNodeId = subflowEdge ? subflowEdge.target : 'end'

      const parentState: SubflowState = {
        pesquisa,
        flowData,
        perguntas,
        respostasAcumuladas: novasRespostas,
        currentNodeId: returnNodeId,
        objetoRelacionado,
        liderRelacionado
      }

      await enterSubflow(subflowId, parentState)
    } else if (proximoNoId === 'end') {
      await finalizarFluxoOuSubfluxo(pesquisa.id, novasRespostas, subflowStack)
    } else {
      setCurrentNodeId(proximoNoId)
    }
  }

  // --- CALCULA PROGRESSO ---
  const getProgresso = () => {
    if (perguntas.length === 0 || currentNodeId === 'start') return 0
    if (respondeu) return 100
    
    // Como o fluxo é condicional, estimamos baseado na quantidade de respostas preenchidas
    const respondidasCount = Object.keys(respostasAcumuladas).length
    const totalAproximado = perguntas.length
    return Math.min(Math.round((respondidasCount / totalAproximado) * 100), 95)
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 space-y-4 shadow-xl">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto animate-bounce" />
          <h3 className="text-lg font-bold text-foreground">Pesquisa Indisponível</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
        </div>
      </div>
    )
  }

  if (respondeu) {
    const handleReiniciarPreview = () => {
      setRespondeu(false)
      setRespostasAcumuladas({})
      setValorAtual('')
      setValidacaoErro('')
      setSubflowStack([])
      setTodasPerguntasSession([])
      setCurrentNodeId('start')
      const fp = getDeviceFingerprint()
      loadFlow(token!, fp)
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-10 translate-x-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl"></div>
          <div className="bg-emerald-500/10 p-4 rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit mx-auto">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-foreground">Obrigado!</h3>
            {token === 'preview' ? (
              <div className="space-y-4">
                <p className="text-sm text-amber-500 font-semibold leading-relaxed">
                  Modo de visualização. Respostas não foram salvas.
                </p>
                <div className="text-left bg-muted/60 p-4 rounded-2xl space-y-3 max-h-52 overflow-y-auto border border-border">
                  {Object.entries(respostasAcumuladas).map(([pergId, valor]) => {
                    const perg = todasPerguntasSession.find(p => p.id === pergId)
                    let displayValor = ''
                    if (perg && perg.tipo === 'multipla' && perg.config?.opcoes) {
                      const ids = Array.isArray(valor) ? valor : [valor]
                      const textos = ids.map(id => perg.config.opcoes?.find(o => o.id === id)?.texto || id)
                      displayValor = textos.join(', ')
                    } else {
                      displayValor = Array.isArray(valor) ? valor.join(', ') : String(valor)
                    }
                    return (
                      <div key={pergId} className="text-xs space-y-1 border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                        <div className="font-bold text-foreground">{perg?.titulo || pergId}:</div>
                        <div className="text-muted-foreground bg-card p-2 rounded-lg border border-border/30 break-words font-mono">
                          {displayValor}
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(respostasAcumuladas).length === 0 && (
                    <div className="text-muted-foreground text-center py-2">Nenhuma resposta acumulada.</div>
                  )}
                </div>
                <button
                  onClick={handleReiniciarPreview}
                  className="w-full rounded-2xl border border-primary/40 bg-primary/10 text-primary font-bold py-3 text-sm hover:bg-primary/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  ↺ Reiniciar Simulação
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Suas respostas foram registradas com sucesso no sistema.
              </p>
            )}
          </div>
          <div className="text-muted-foreground/60 text-[10px] uppercase font-bold tracking-widest pt-4 border-t border-border">
            Andorinha Pesquisas
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground relative overflow-hidden font-sans">
      {/* Background radial overlays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[350px] w-[350px] rounded-full bg-primary/5 blur-[80px]"></div>

      {/* Progress Bar */}
      <div className="w-full bg-muted h-1.5 sticky top-0 z-50">
        <div 
          className="bg-gradient-to-r from-primary to-blue-500 h-full transition-all duration-300 rounded-r-full"
          style={{ width: `${getProgresso()}%` }}
        ></div>
      </div>

      {/* Header */}
      <header className="py-6 px-6 border-b border-border/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0 bg-card/10 backdrop-blur-sm">
        <div className="flex items-start md:items-center gap-4">
          <img src={logoImg} alt="Andorinha Logo" className="h-10 w-auto object-contain dark:bg-white dark:rounded-lg dark:p-1.5 shrink-0" />
          <div className="h-8 w-[1px] bg-border hidden md:block"></div>
          <div className="space-y-1">
            {objetoRelacionado && (
              <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-foreground bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center gap-1">
                  {objetoRelacionado.tipo === 'projeto' ? '📁' : '📅'} {objetoRelacionado.tipo}
                </span>
                <span className="font-semibold text-foreground">{objetoRelacionado.nome}</span>
              </div>
            )}
            {liderRelacionado && (
              <div className="text-[10px] font-semibold text-muted-foreground">
                Líder Responsável: <span className="text-foreground">{liderRelacionado.nome}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-[10px] bg-muted text-muted-foreground px-3 py-1 rounded-full font-bold border border-border w-fit shrink-0">
          {getProgresso()}% Concluído
        </div>
      </header>

      {/* Pergunta Container */}
      <main className="flex-1 flex items-center justify-center p-6 max-w-md mx-auto w-full">
        {perguntaAtual && (
          <div className="w-full space-y-8 animate-slide-in">
            {/* Título pergunta */}
            <div className="space-y-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                {perguntaAtual.titulo}
              </h2>
              {perguntaAtual.obrigatoria && (
                <span className="inline-block text-[9px] bg-destructive/10 border border-destructive/20 text-destructive px-2 py-0.5 rounded-full font-bold">
                  Obrigatório
                </span>
              )}
            </div>

            {/* Input dependendo do tipo de pergunta */}
            <div className="space-y-4">
              {/* 1. Texto Curto */}
              {perguntaAtual.tipo === 'texto_curto' && (
                <input
                  type="text"
                  value={valorAtual || ''}
                  onChange={(e) => {
                    setValorAtual(e.target.value)
                    setValidacaoErro('')
                  }}
                  placeholder="Escreva sua resposta..."
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
                />
              )}

              {/* 2. Textarea */}
              {perguntaAtual.tipo === 'textarea' && (
                <textarea
                  value={valorAtual || ''}
                  onChange={(e) => {
                    setValorAtual(e.target.value)
                    setValidacaoErro('')
                  }}
                  placeholder="Escreva sua resposta com detalhes..."
                  rows={5}
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base resize-none leading-relaxed shadow-sm"
                />
              )}

              {/* 3. E-mail */}
              {perguntaAtual.tipo === 'email' && (
                <input
                  type="email"
                  value={valorAtual || ''}
                  onChange={(e) => {
                    setValorAtual(e.target.value)
                    setValidacaoErro('')
                  }}
                  placeholder="nome@provedor.com"
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
                />
              )}

              {/* 4. WhatsApp / Celular */}
              {perguntaAtual.tipo === 'whatsapp' && (
                <input
                  type="text"
                  value={valorAtual || ''}
                  onChange={(e) => {
                    const masked = applyWhatsappMask(e.target.value)
                    setValorAtual(masked)
                    setValidacaoErro('')
                  }}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
                />
              )}

              {/* 5. CPF */}
              {perguntaAtual.tipo === 'cpf' && (
                <input
                  type="text"
                  value={valorAtual || ''}
                  onChange={(e) => {
                    const masked = applyCpfMask(e.target.value)
                    setValorAtual(masked)
                    setValidacaoErro('')
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
                />
              )}

              {/* 6. CEP */}
              {perguntaAtual.tipo === 'cep' && (
                <input
                  type="text"
                  value={valorAtual || ''}
                  onChange={(e) => {
                    const masked = applyCepMask(e.target.value)
                    setValorAtual(masked)
                    setValidacaoErro('')
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
                />
              )}

              {/* 7. Estado (UF) */}
              {perguntaAtual.tipo === 'estado' && (
                <select
                  value={valorAtual || ''}
                  onChange={(e) => {
                    setValorAtual(e.target.value)
                    setValidacaoErro('')
                  }}
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm appearance-none"
                >
                  <option value="">Selecione o Estado (UF)...</option>
                  {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              )}

              {/* 8. Cidade */}
              {perguntaAtual.tipo === 'cidade' && (
                <input
                  type="text"
                  value={valorAtual || ''}
                  onChange={(e) => {
                    setValorAtual(e.target.value)
                    setValidacaoErro('')
                  }}
                  placeholder="Informe a cidade ou município..."
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
                />
              )}

              {/* 9. Bairro */}
              {perguntaAtual.tipo === 'bairro' && (
                <input
                  type="text"
                  value={valorAtual || ''}
                  onChange={(e) => {
                    setValorAtual(e.target.value)
                    setValidacaoErro('')
                  }}
                  placeholder="Informe o bairro..."
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
                />
              )}

              {/* 10. Logradouro com select do tipo */}
              {perguntaAtual.tipo === 'logradouro' && (() => {
                const parseLogradouro = (val: string) => {
                  const tiposLogradouro = ['Rua', 'Avenida', 'Praça', 'Travessa', 'Alameda', 'Rodovia', 'Outro']
                  const match = tiposLogradouro.find(t => val.startsWith(t + ' '))
                  if (match) {
                    return { tipo: match, nome: val.slice(match.length + 1) }
                  }
                  return { tipo: 'Rua', nome: val }
                }
                const info = parseLogradouro(valorAtual as string || '')
                return (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={info.tipo}
                      onChange={(e) => {
                        const novoTipo = e.target.value
                        setValorAtual(novoTipo + ' ' + info.nome)
                        setValidacaoErro('')
                      }}
                      className="w-full sm:w-1/3 rounded-2xl border border-border bg-card px-5 py-4 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
                    >
                      {['Rua', 'Avenida', 'Praça', 'Travessa', 'Alameda', 'Rodovia', 'Outro'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={info.nome}
                      onChange={(e) => {
                        const novoNome = e.target.value
                        setValorAtual(info.tipo + ' ' + novoNome)
                        setValidacaoErro('')
                      }}
                      placeholder="Nome do logradouro (ex: Paulista, das Flores...)"
                      className="w-full sm:w-2/3 rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
                    />
                  </div>
                )
              })()}

              {/* 11. Número */}
              {perguntaAtual.tipo === 'numero' && (
                <input
                  type="number"
                  value={valorAtual || ''}
                  onChange={(e) => {
                    setValorAtual(e.target.value)
                    setValidacaoErro('')
                  }}
                  placeholder="Digite um número..."
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              )}

              {/* 12. Avaliação 0-10 */}
              {perguntaAtual.tipo === 'avaliacao' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-11 gap-1.5">
                    {Array.from({ length: 11 }, (_, i) => i).map((nota) => {
                      const selecionada = valorAtual === nota || valorAtual === String(nota)
                      const cor =
                        nota <= 6
                          ? selecionada
                            ? 'bg-red-500 border-red-500 text-white shadow-red-500/30 shadow-md'
                            : 'border-red-200 text-red-400 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40'
                          : nota <= 8
                          ? selecionada
                            ? 'bg-amber-500 border-amber-500 text-white shadow-amber-500/30 shadow-md'
                            : 'border-amber-200 text-amber-500 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/40'
                          : selecionada
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/30 shadow-md'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                      return (
                        <button
                          key={nota}
                          type="button"
                          onClick={() => { setValorAtual(nota); setValidacaoErro('') }}
                          className={`aspect-square rounded-xl border-2 font-bold text-sm transition-all duration-150 active:scale-90 cursor-pointer ${cor}`}
                        >
                          {nota}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold text-muted-foreground px-0.5">
                    <span>😟 Muito insatisfeito</span>
                    <span>Muito satisfeito 😄</span>
                  </div>
                  {(valorAtual !== '' && valorAtual !== null && valorAtual !== undefined) && (
                    <div className="text-center py-2 rounded-2xl bg-card border border-border">
                      <span className="text-4xl font-extrabold text-foreground">{valorAtual}</span>
                      <span className="text-muted-foreground text-lg"> / 10</span>
                    </div>
                  )}
                </div>
              )}

              {/* 13. Múltipla Escolha */}
              {perguntaAtual.tipo === 'multipla' && (
                <div className="space-y-2.5">
                  {(perguntaAtual.config?.opcoes || []).map((opcao) => {
                    const isSelected = Array.isArray(valorAtual) && valorAtual.includes(opcao.id)
                    return (
                      <button
                        key={opcao.id}
                        onClick={() => handleToggleOpcao(opcao.id)}
                        className={`w-full text-left px-5 py-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer shadow-sm ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-foreground font-semibold'
                            : 'bg-card border-border text-muted-foreground hover:border-primary/20 hover:bg-muted/50'
                        }`}
                      >
                        <span className="font-semibold text-base">{opcao.texto}</span>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? 'border-primary bg-primary' : 'border-border'
                        }`}>
                          {isSelected && <div className="h-2 w-2 rounded-full bg-primary-foreground animate-scale-up"></div>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {validacaoErro && (
              <p className="text-destructive text-sm font-semibold flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {validacaoErro}
              </p>
            )}

            {/* Ação de avançar */}
            <button
              onClick={handleAvancar}
              className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
            >
              <span>Avançar</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-border/40 text-center text-[10px] text-muted-foreground/60 font-semibold tracking-wider shrink-0 uppercase flex justify-center items-center gap-1.5 bg-card/10">
        <Lock className="h-3 w-3" />
        <span>Ambiente Criptografado e Seguro</span>
      </footer>
    </div>
  )
}
