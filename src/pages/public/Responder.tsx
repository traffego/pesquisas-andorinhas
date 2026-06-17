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
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({})
  
  // Resposta da tela atual
  const [valorAtual, setValorAtual] = useState<any>('')
  const [validacaoErro, setValidacaoErro] = useState('')
  const [blockPerguntas, setBlockPerguntas] = useState<Pergunta[]>([])

  // Objeto e Líder Relacionados
  const [objetoRelacionado, setObjetoRelacionado] = useState<Objeto | null>(null)
  const [liderRelacionado, setLiderRelacionado] = useState<Lider | null>(null)

  // Estados para carregamento dinâmico de cidades
  const [cidadesPorEstado, setCidadesPorEstado] = useState<Record<string, string[]>>({})
  const [loadingCidades, setLoadingCidades] = useState<Record<string, boolean>>({})
  const [lastEstado, setLastEstado] = useState('')

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
      loadFlow(token)
    }
  }, [token, searchParams])

  const loadFlow = async (tk: string) => {
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



  // --- BUSCA PERGUNTA ATUAL ---
  const getPerguntaAtual = (): Pergunta | undefined => {
    return perguntas.find(p => p.id === currentNodeId)
  }

  const perguntaAtual = getPerguntaAtual()

  const currentNode = flowData?.nodes?.find((n: any) => n.id === currentNodeId)
  const isBlock = currentNode?.type === 'block'

  // Carrega perguntas do bloco quando nó muda
  useEffect(() => {
    if (isBlock && currentNode?.data?.subflowId) {
      dbService.getPerguntas(currentNode.data.subflowId)
        .then(setBlockPerguntas)
        .catch(console.error)
    } else if (!isBlock) {
      setBlockPerguntas([])
    }
  }, [currentNodeId, isBlock, currentNode?.data?.subflowId])

  // Limpa o valor de entrada quando muda o nó da pergunta ou bloco
  useEffect(() => {
    if (isBlock) {
      const blockVals: Record<string, any> = {}
      blockPerguntas.forEach(sub => {
        const anterior = respostasAcumuladas[sub.id]
        blockVals[sub.id] = anterior !== undefined ? anterior : (sub.tipo === 'multipla' ? [] : '')
      })
      setValorAtual(blockVals)
      setErrosCampos({})
    } else if (perguntaAtual) {
      // Pré-carrega se já foi respondida
      const anterior = respostasAcumuladas[perguntaAtual.id]
      setValorAtual(anterior !== undefined ? anterior : (perguntaAtual.tipo === 'multipla' ? [] : ''))
      setValidacaoErro('')
    }
  }, [currentNodeId, perguntaAtual, isBlock, flowData, blockPerguntas])

  // Encontra o estado selecionado atual
  const getEstadoSelecionado = () => {
    if (isBlock) {
      const estadoPerg = blockPerguntas.find(p => p.tipo === 'estado')
      if (estadoPerg && valorAtual?.[estadoPerg.id]) {
        return valorAtual[estadoPerg.id]
      }
    }
    const todasPerguntas = todasPerguntasSession.length > 0 ? todasPerguntasSession : perguntas
    const estadoPerg = todasPerguntas.find(p => p.tipo === 'estado')
    if (estadoPerg && respostasAcumuladas?.[estadoPerg.id]) {
      return respostasAcumuladas[estadoPerg.id]
    }
    return ''
  }

  const estadoSelecionado = getEstadoSelecionado()

  // Monitora mudança de estado e limpa cidade se houver
  useEffect(() => {
    if (estadoSelecionado && lastEstado && estadoSelecionado !== lastEstado) {
      if (isBlock) {
        setValorAtual((prev: any) => {
          const updated = { ...prev }
          const cidadePerg = blockPerguntas.find(p => p.tipo === 'cidade')
          if (cidadePerg) {
            updated[cidadePerg.id] = ''
          }
          return updated
        })
      } else {
        const cidadePerg = perguntas.find(p => p.id === currentNodeId && p.tipo === 'cidade')
        if (cidadePerg) {
          setValorAtual('')
        }
      }
    }
    if (estadoSelecionado) {
      setLastEstado(estadoSelecionado)
    }
  }, [estadoSelecionado, isBlock, blockPerguntas, perguntas, currentNodeId, lastEstado])

  // Faz o fetch de cidades do estado selecionado
  useEffect(() => {
    if (estadoSelecionado && !cidadesPorEstado[estadoSelecionado] && !loadingCidades[estadoSelecionado]) {
      setLoadingCidades(prev => ({ ...prev, [estadoSelecionado]: true }))
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoSelecionado}/municipios`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const list = data.map((c: any) => c.nome).sort()
            setCidadesPorEstado(prev => ({ ...prev, [estadoSelecionado]: list }))
          }
        })
        .catch(console.error)
        .finally(() => {
          setLoadingCidades(prev => ({ ...prev, [estadoSelecionado]: false }))
        })
    }
  }, [estadoSelecionado, cidadesPorEstado, loadingCidades])

  // --- VALIDAÇÕES DE TELA ---
  const validarUmaResposta = (perg: any, valor: any): string => {
    const isObrig = perg.obrigatoria
    
    if (perg.tipo === 'avaliacao') {
      if (isObrig && (valor === '' || valor === null || valor === undefined)) {
        return 'Por favor, selecione uma nota.'
      }
    } else if (perg.tipo !== 'multipla') {
      const txt = (valor as string || '').trim()
      if (isObrig) {
        if (perg.tipo === 'logradouro') {
          const valStr = (valor as string || '').trim()
          const tiposLogradouro = ['Rua', 'Avenida', 'Praça', 'Travessa', 'Alameda', 'Rodovia', 'Outro']
          const match = tiposLogradouro.find(t => valStr.startsWith(t + ' '))
          const nome = match ? valStr.slice(match.length + 1).trim() : valStr.trim()
          if (!nome) {
            return 'Esta resposta é obrigatória.'
          }
        } else if (!txt) {
          return 'Esta resposta é obrigatória.'
        }
      }

      if (txt) {
        if (perg.tipo === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(txt)) {
            return 'Por favor, informe um endereço de e-mail válido.'
          }
        }

        if (perg.tipo === 'whatsapp') {
          const digits = txt.replace(/\D/g, '')
          if (digits.length < 10 || digits.length > 11) {
            return 'Por favor, insira o número de celular completo com DDD.'
          }
        }

        if (perg.tipo === 'cpf') {
          const digits = txt.replace(/\D/g, '')
          if (digits.length !== 11) {
            return 'CPF inválido. Informe os 11 dígitos.'
          }
        }

        if (perg.tipo === 'cep') {
          const digits = txt.replace(/\D/g, '')
          if (digits.length !== 8) {
            return 'CEP inválido. Informe os 8 dígitos.'
          }
        }

        if (perg.tipo === 'numero') {
          if (!/^-?\d+([.,]\d+)?$/.test(txt)) {
            return 'Por favor, informe apenas números.'
          }
        }
      }
    } else {
      // Múltipla escolha
      const selecionadas = valor as string[]
      if (isObrig && (!selecionadas || selecionadas.length === 0)) {
        return 'Por favor, selecione pelo menos uma opção.'
      }
      const maxRespostas = perg.config?.max_respostas
      if (maxRespostas && selecionadas.length > maxRespostas) {
        return `Por favor, selecione no máximo ${maxRespostas} opções.`
      }
    }

    return ''
  }

  const validarResposta = (): boolean => {
    if (!perguntaAtual) return true
    const erro = validarUmaResposta(perguntaAtual, valorAtual)
    setValidacaoErro(erro)
    return !erro
  }

  const validarRespostaBloco = (): boolean => {
    const novosErros: Record<string, string> = {}
    let temErro = false

    blockPerguntas.forEach(sub => {
      const val = valorAtual[sub.id]
      const erro = validarUmaResposta(sub, val)
      if (erro) {
        novosErros[sub.id] = erro
        temErro = true
      }
    })

    setErrosCampos(novosErros)
    return !temErro
  }

  const handleInputKeyDown = (e: React.KeyboardEvent, index: number, total: number) => {
    if (e.key === 'Enter') {
      if (index < total - 1) {
        e.preventDefault()
        const form = e.currentTarget.closest('form')
        if (form) {
          const elements = Array.from(form.querySelectorAll('input, select, textarea, button[type="button"]'))
          const currentIdx = elements.indexOf(e.currentTarget)
          if (currentIdx !== -1 && currentIdx + 1 < elements.length) {
            (elements[currentIdx + 1] as HTMLElement).focus()
          }
        }
      }
    }
  }

  // --- REUSABLE FIELD INPUT RENDERING ---
  const renderCampoInput = (
    perg: any,
    val: any,
    setVal: (v: any) => void,
    erro: string | undefined,
    onKeyDown?: (e: React.KeyboardEvent<any>) => void
  ) => {
    const applyWhatsappMask = (v: string) => {
      const numbers = v.replace(/\D/g, '')
      if (numbers.length <= 2) return numbers
      if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
      if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
    }

    const applyCpfMask = (v: string) => {
      const n = v.replace(/\D/g, '').slice(0, 11)
      if (n.length <= 3) return n
      if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`
      if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`
      return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`
    }

    const applyCepMask = (v: string) => {
      const n = v.replace(/\D/g, '').slice(0, 8)
      if (n.length <= 5) return n
      return `${n.slice(0, 5)}-${n.slice(5)}`
    }

    const handleToggleOpcao = (opcaoId: string) => {
      const selecionadas = Array.isArray(val) ? [...val] : []
      const maxRespostas = perg.config?.max_respostas

      if (selecionadas.includes(opcaoId)) {
        setVal(selecionadas.filter(id => id !== opcaoId))
      } else {
        if (maxRespostas === 1) {
          setVal([opcaoId])
        } else if (maxRespostas && selecionadas.length >= maxRespostas) {
          // sem ação
        } else {
          setVal([...selecionadas, opcaoId])
        }
      }
    }

    return (
      <div className="space-y-1.5 w-full">
        {perg.tipo === 'texto_curto' && (
          <input
            type="text"
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escreva sua resposta..."
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
          />
        )}

        {perg.tipo === 'textarea' && (
          <textarea
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                if (onKeyDown) {
                  onKeyDown(e)
                } else {
                  e.preventDefault()
                  handleAvancar()
                }
              }
            }}
            placeholder="Escreva sua resposta com detalhes..."
            rows={4}
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base resize-none leading-relaxed shadow-sm"
          />
        )}

        {perg.tipo === 'email' && (
          <input
            type="email"
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="nome@provedor.com"
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
          />
        )}

        {perg.tipo === 'whatsapp' && (
          <input
            type="text"
            value={val || ''}
            onChange={(e) => setVal(applyWhatsappMask(e.target.value))}
            onKeyDown={onKeyDown}
            placeholder="(00) 00000-0000"
            maxLength={15}
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
          />
        )}

        {perg.tipo === 'cpf' && (
          <input
            type="text"
            value={val || ''}
            onChange={(e) => setVal(applyCpfMask(e.target.value))}
            onKeyDown={onKeyDown}
            placeholder="000.000.000-00"
            maxLength={14}
            inputMode="numeric"
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
          />
        )}

        {perg.tipo === 'cep' && (
          <input
            type="text"
            value={val || ''}
            onChange={(e) => setVal(applyCepMask(e.target.value))}
            onKeyDown={onKeyDown}
            placeholder="00000-000"
            maxLength={9}
            inputMode="numeric"
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
          />
        )}

        {perg.tipo === 'estado' && (
          <select
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm appearance-none"
          >
            <option value="">Selecione o Estado (UF)...</option>
            {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        )}

        {perg.tipo === 'cidade' && (
          estadoSelecionado ? (
            <div className="relative">
              <select
                value={val || ''}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={onKeyDown}
                className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm appearance-none"
              >
                <option value="">Selecione a Cidade...</option>
                {loadingCidades[estadoSelecionado] ? (
                  <option disabled>Carregando cidades...</option>
                ) : (
                  (cidadesPorEstado[estadoSelecionado] || []).map(cid => (
                    <option key={cid} value={cid}>{cid}</option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-muted-foreground">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          ) : (
            <input
              type="text"
              value={val || ''}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Informe a cidade (selecione o Estado primeiro)..."
              disabled
              className="w-full rounded-2xl border border-border bg-card/50 px-5 py-4 text-muted-foreground cursor-not-allowed text-base shadow-sm opacity-60"
            />
          )
        )}

        {perg.tipo === 'bairro' && (
          <input
            type="text"
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Informe o bairro..."
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
          />
        )}

        {perg.tipo === 'logradouro' && (() => {
          const parseLogradouro = (vStr: string) => {
            const tiposLogradouro = ['Rua', 'Avenida', 'Praça', 'Travessa', 'Alameda', 'Rodovia', 'Outro']
            const match = tiposLogradouro.find(t => vStr.startsWith(t + ' '))
            if (match) {
              return { tipo: match, nome: vStr.slice(match.length + 1) }
            }
            return { tipo: 'Rua', nome: vStr }
          }
          const info = parseLogradouro(val as string || '')
          return (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <select
                value={info.tipo}
                onChange={(e) => setVal(e.target.value + ' ' + info.nome)}
                onKeyDown={onKeyDown}
                className="w-full sm:w-1/3 rounded-2xl border border-border bg-card px-5 py-4 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm animate-fade-in"
              >
                {['Rua', 'Avenida', 'Praça', 'Travessa', 'Alameda', 'Rodovia', 'Outro'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="text"
                value={info.nome}
                onChange={(e) => setVal(info.tipo + ' ' + e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Nome do logradouro..."
                className="w-full sm:w-2/3 rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm"
              />
            </div>
          )
        })()}

        {perg.tipo === 'numero' && (
          <input
            type="number"
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Digite um número..."
            inputMode="numeric"
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        )}

        {perg.tipo === 'avaliacao' && (
          <div className="space-y-4">
            <div className="grid grid-cols-11 gap-1.5">
              {Array.from({ length: 11 }, (_, i) => i).map((nota) => {
                const selecionada = val === nota || val === String(nota)
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
                    onClick={() => setVal(nota)}
                    onKeyDown={onKeyDown}
                    className={`aspect-square rounded-xl border-2 font-bold text-sm transition-all duration-150 active:scale-90 cursor-pointer ${cor}`}
                  >
                    {nota}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {perg.tipo === 'multipla' && (
          <div className="space-y-2.5">
            {(perg.config?.opcoes || []).map((opcao: any) => {
              const isSelected = Array.isArray(val) && val.includes(opcao.id)
              return (
                <button
                  key={opcao.id}
                  type="button"
                  onClick={() => handleToggleOpcao(opcao.id)}
                  onKeyDown={onKeyDown}
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

        {erro && (
          <p className="text-destructive text-sm font-semibold flex items-center gap-1.5 animate-pulse mt-1">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {erro}
          </p>
        )}
      </div>
    )
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
    if (isBlock) {
      if (!validarRespostaBloco() || !pesquisa || !flowData) return
    } else {
      if (!validarResposta() || !pesquisa || !flowData) return
    }

    // 1. Salva a resposta atual no estado acumulador
    const novasRespostas = {
      ...respostasAcumuladas,
      ...(isBlock ? valorAtual : { [currentNodeId]: valorAtual })
    }
    setRespostasAcumuladas(novasRespostas)

    const edges = flowData.edges || []
    let proximoNoId = 'end'

    if (!isBlock && perguntaAtual?.tipo === 'multipla') {
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
      // Avanço sequencial simples para outros tipos e blocos
      const arestaPadrao = edges.find((e: any) => e.source === currentNodeId)
      if (arestaPadrao) {
        proximoNoId = arestaPadrao.target
      }
    }

    // 2. Verifica se o próximo nó é subfluxo ou fim ou outra pergunta/bloco
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
      loadFlow(token!)
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
        {(perguntaAtual || isBlock) && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAvancar()
            }}
            className="w-full space-y-8 animate-slide-in"
          >
            {/* Título pergunta/bloco */}
            <div className="space-y-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                {isBlock ? (currentNode.data.subflowTitulo || currentNode.data.titulo || 'Bloco') : perguntaAtual?.titulo}
              </h2>
              {(!isBlock && perguntaAtual?.obrigatoria) && (
                <span className="inline-block text-[9px] bg-destructive/10 border border-destructive/20 text-destructive px-2 py-0.5 rounded-full font-bold">
                  Obrigatório
                </span>
              )}
            </div>

            {/* Input dependendo do tipo de pergunta */}
            <div className="space-y-5">
              {isBlock ? (
                blockPerguntas.map((sub, idx) => (
                  <div key={sub.id} className="space-y-2">
                    <label className="block text-sm font-bold text-foreground">
                      {sub.titulo}
                      {sub.obrigatoria && <span className="text-red-500 ml-1 font-extrabold">*</span>}
                    </label>
                    {renderCampoInput(
                      sub,
                      valorAtual[sub.id],
                      (newVal) => {
                        setValorAtual((prev: any) => ({ ...prev, [sub.id]: newVal }))
                        setErrosCampos((prev: any) => ({ ...prev, [sub.id]: '' }))
                      },
                      errosCampos[sub.id],
                      (e) => handleInputKeyDown(e, idx, blockPerguntas.length)
                    )}
                  </div>
                ))
              ) : (
                renderCampoInput(
                  perguntaAtual,
                  valorAtual,
                  (newVal) => {
                    setValorAtual(newVal)
                    setValidacaoErro('')
                  },
                  validacaoErro
                )
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
              type="submit"
              className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-base"
            >
              <span>Avançar</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </form>
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
