import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { dbService, type Pesquisa, type Pergunta } from '../../services/db'
import { 
  Bird, 
  CheckCircle2, 
  ChevronRight, 
  Lock, 
  AlertTriangle
} from 'lucide-react'

export const Responder: React.FC = () => {
  const { token } = useParams<{ token: string }>()

  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [flowData, setFlowData] = useState<any>(null)
  
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [respondeu, setRespondeu] = useState(false)
  const [deviceFp, setDeviceFp] = useState('')

  // Estado do fluxo de respostas
  const [currentNodeId, setCurrentNodeId] = useState<string>('start')
  const [respostasAcumuladas, setRespostasAcumuladas] = useState<Record<string, any>>({})
  
  // Resposta da tela atual
  const [valorAtual, setValorAtual] = useState<any>('')
  const [validacaoErro, setValidacaoErro] = useState('')

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
  }, [token])

  const loadFlow = async (tk: string, fp: string) => {
    setLoading(true)
    try {
      // 1. Carrega pesquisa pública ativa
      const pesq = await dbService.getPesquisaByToken(tk)
      if (!pesq) {
        setErrorMsg('Pesquisa não encontrada ou indisponível.')
        setLoading(false)
        return
      }
      setPesquisa(pesq)
      setFlowData(pesq.flow_data)

      // 2. Prevenção de duplicados
      const jaRespondeu = await dbService.hasDeviceResponded(pesq.id, fp)
      if (jaRespondeu) {
        setRespondeu(true)
        setLoading(false)
        return
      }

      // 3. Carrega perguntas
      const pergs = await dbService.getPerguntas(pesq.id)
      setPerguntas(pergs)

      // 4. Inicia no nó conectado ao "Início"
      const edges = pesq.flow_data?.edges || []
      const startEdge = edges.find((e: any) => e.source === 'start')
      if (startEdge) {
        setCurrentNodeId(startEdge.target)
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
    if (perguntaAtual.tipo !== 'multipla') {
      const txt = (valorAtual as string || '').trim()
      if (isObrig && !txt) {
        setValidacaoErro('Esta resposta é obrigatória.')
        return false
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
      }
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
      
      // Tenta encontrar uma aresta condicional associada às opções marcadas
      const arestaCondicionalCorrespondente = arestasSaindo.find((e: any) => 
        e.data && e.data.opcaoId && selecionadas.includes(e.data.opcaoId)
      )

      if (arestaCondicionalCorrespondente) {
        proximoNoId = arestaCondicionalCorrespondente.target
      } else {
        // Se nenhuma condicional bater, procura a rota incondicional padrão (sem opcaoId)
        const arestaIncondicional = arestasSaindo.find((e: any) => !e.data || !e.data.opcaoId)
        if (arestaIncondicional) {
          proximoNoId = arestaIncondicional.target
        }
      }
    } else {
      // Avanço sequencial simples para outros tipos
      const arestaPadrao = edges.find((e: any) => e.source === currentNodeId)
      if (arestaPadrao) {
        proximoNoId = arestaPadrao.target
      }
    }

    // 2. Se o próximo for o fim, submeter
    if (proximoNoId === 'end') {
      await submeterRespostas(novasRespostas)
    } else {
      setCurrentNodeId(proximoNoId)
    }
  }

  const submeterRespostas = async (respostas: Record<string, any>) => {
    if (!pesquisa) return
    setLoading(true)
    try {
      const itens = Object.keys(respostas).map(pergId => ({
        pergunta_id: pergId,
        valor: respostas[pergId]
      }))

      await dbService.saveRespostaCompleta(pesquisa.id, deviceFp, itens)
      setRespondeu(true)
    } catch (err) {
      console.error(err)
      setErrorMsg('Ocorreu um erro ao gravar suas respostas. Tente novamente.')
    } finally {
      setLoading(false)
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-10 translate-x-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl"></div>
          <div className="bg-emerald-500/10 p-4 rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit mx-auto">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-foreground">Obrigado!</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Suas respostas foram registradas com sucesso no sistema.
            </p>
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
      <header className="py-6 px-6 border-b border-border/60 flex items-center justify-between shrink-0 bg-card/10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Bird className="h-5 w-5 text-primary" />
          <span className="text-xs font-extrabold tracking-widest text-foreground uppercase">Andorinha</span>
        </div>
        <div className="text-[10px] bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-bold border border-border">
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

              {/* 5. Múltipla Escolha */}
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
