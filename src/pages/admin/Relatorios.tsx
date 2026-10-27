import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { dbService, type Pesquisa, type Pergunta } from '../../services/db'
import { processarRelatorioCorridaBI } from '../../utils/relatorioBI'
import * as XLSX from 'xlsx'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts'
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  Users, 
  Sparkles, 
  BarChart2, 
  Filter, 
  X, 
  Trash2, 
  TrendingUp, 
  MapPin,
  ChevronDown,
  ChevronUp,
  FlaskConical
} from 'lucide-react'

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1']

// Helpers para Capa Sintética Adaptável a Qualquer Formulário
function getResumoLinha(r: any, perguntasList: Pergunta[]) {
  const badges: { label: string; cor: string }[] = []

  const pIdade = perguntasList.find(p => {
    const t = p.titulo.toLowerCase()
    return t.includes('faixa et') || t.includes('idade')
  })
  const pSexo = perguntasList.find(p => {
    const t = p.titulo.toLowerCase()
    return t.includes('sexo') || t.includes('gênero') || t.includes('genero')
  })
  const pEstreante = perguntasList.find(p => {
    const t = p.titulo.toLowerCase()
    return t.includes('primeira vez') || t.includes('estreante') || t.includes('primeira particip')
  })

  if (pIdade && r.valores[pIdade.id]) {
    const val = r.valores[pIdade.id]
    const opcao = pIdade.config?.opcoes?.find(o => o.id === (Array.isArray(val) ? val[0] : val))?.texto || (Array.isArray(val) ? val[0] : val)
    if (opcao) badges.push({ label: String(opcao), cor: 'bg-blue-500/10 text-blue-600 border-blue-500/20' })
  }

  if (pSexo && r.valores[pSexo.id]) {
    const val = r.valores[pSexo.id]
    const opcao = pSexo.config?.opcoes?.find(o => o.id === (Array.isArray(val) ? val[0] : val))?.texto || (Array.isArray(val) ? val[0] : val)
    if (opcao) badges.push({ label: String(opcao), cor: 'bg-zinc-500/10 text-foreground border-border' })
  }

  if (pEstreante && r.valores[pEstreante.id]) {
    const val = r.valores[pEstreante.id]
    const opcao = pEstreante.config?.opcoes?.find(o => o.id === (Array.isArray(val) ? val[0] : val))?.texto || (Array.isArray(val) ? val[0] : val)
    const isSim = String(opcao).toLowerCase().startsWith('sim')
    if (opcao) badges.push({ 
      label: isSim ? '⭐ Estreante' : 'Veterano', 
      cor: isSim ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
    })
  }

  // Se não encontrou demográficas, seleciona as primeiras respostas objetivas
  if (badges.length === 0) {
    for (const p of perguntasList) {
      if (badges.length >= 2) break
      const val = r.valores[p.id]
      if (val !== undefined && val !== null && val !== '') {
        let texto = ''
        if (p.tipo === 'multipla') {
          const arr = Array.isArray(val) ? val : [val]
          texto = arr.map(v => p.config?.opcoes?.find(o => o.id === v)?.texto || v).join(', ')
        } else if (p.tipo !== 'textarea') {
          texto = String(val)
        }
        if (texto && texto.length <= 35) {
          badges.push({ label: texto, cor: 'bg-primary/10 text-primary border-primary/20' })
        }
      }
    }
  }

  return badges
}

function getAvaliacaoLinha(r: any, perguntasList: Pergunta[]) {
  const pAprov = perguntasList.find(p => {
    const t = p.titulo.toLowerCase()
    return p.tipo === 'avaliacao' || 
      t.includes('experiência geral') || 
      t.includes('experiencia geral') || 
      t.includes('organização geral') || 
      t.includes('organizacao geral')
  })

  if (pAprov && r.valores[pAprov.id]) {
    const val = r.valores[pAprov.id]
    const texto = pAprov.config?.opcoes?.find(o => o.id === (Array.isArray(val) ? val[0] : val))?.texto || (Array.isArray(val) ? val[0] : val)
    return {
      temAvaliacao: true,
      texto: String(texto),
    }
  }

  const respondidas = perguntasList.filter(p => r.valores[p.id] !== undefined && r.valores[p.id] !== null && r.valores[p.id] !== '').length
  return {
    temAvaliacao: false,
    texto: `${respondidas} / ${perguntasList.length} respondidas`,
  }
}

export const Relatorios: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [relatorioData, setRelatorioData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Controle de Acordeom Inline das Respostas (Opção 3)
  const [respostasExpandidas, setRespostasExpandidas] = useState<Set<string>>(new Set())

  const toggleRespostaExpandida = (respostaId: string) => {
    setRespostasExpandidas(prev => {
      const next = new Set(prev)
      if (next.has(respostaId)) {
        next.delete(respostaId)
      } else {
        next.add(respostaId)
      }
      return next
    })
  }

  // Filtro de Respostas: Todas | Oficiais | Testes
  const [filtroTipoResposta, setFiltroTipoResposta] = useState<'todos' | 'oficiais' | 'testes'>('todos')

  // Seleção de Respostas em Lote (Checkboxes)
  const [respostasSelecionadas, setRespostasSelecionadas] = useState<Set<string>>(new Set())

  const toggleSelecionarTudo = () => {
    if (respostasSelecionadas.size === resultadoFiltrado.length && resultadoFiltrado.length > 0) {
      setRespostasSelecionadas(new Set())
    } else {
      setRespostasSelecionadas(new Set(resultadoFiltrado.map((r: any) => r.id)))
    }
  }

  const toggleSelecionarResposta = (rId: string) => {
    setRespostasSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(rId)) next.delete(rId)
      else next.add(rId)
      return next
    })
  }

  // Estatísticas Amostrais reais (Inscritos no Objeto e Disparos efetuados)
  const [metricasAmostrais, setMetricasAmostrais] = useState<{
    totalInscritos: number
    totalNotificados: number
  }>({
    totalInscritos: 0,
    totalNotificados: 0,
  })

  // Controle de Abas Executivas (Aba 1 ativa por padrão)
  const [abaAtiva, setAbaAtiva] = useState<'perfil' | 'executivo' | 'territorio'>('perfil')

  // Filtro de Tags Dinâmico
  const [tagsFiltro, setTagsFiltro] = useState<string[]>([])
  const [logicaFiltro, setLogicaFiltro] = useState<'AND' | 'OR'>('AND')

  // Autocomplete UI
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [mostrarGraficosIndividuais, setMostrarGraficosIndividuais] = useState(false)

  useEffect(() => {
    if (id) {
      loadData(id)
    }
  }, [id])

  const loadData = async (pesquisaId: string) => {
    setLoading(true)
    try {
      const pesq = await dbService.getPesquisaById(pesquisaId)
      if (!pesq) {
        navigate('/admin/pesquisas')
        return
      }
      setPesquisa(pesq)

      // Carregar fluxos para resolver subfluxos recursivamente
      const allFluxos = await dbService.getFluxos()
      
      const getRecursiveFluxoIds = (initialIds: string[]): string[] => {
        const visited = new Set<string>()
        const queue = [...initialIds]

        while (queue.length > 0) {
          const currentId = queue.shift()
          if (!currentId || visited.has(currentId)) continue
          visited.add(currentId)

          const fluxo = allFluxos.find(f => f.id === currentId)
          if (fluxo && fluxo.flow_data && Array.isArray(fluxo.flow_data.nodes)) {
            fluxo.flow_data.nodes.forEach((node: any) => {
              if ((node.type === 'subflow' || node.type === 'block') && node.data?.subflowId) {
                const subId = node.data.subflowId
                if (!visited.has(subId)) {
                  queue.push(subId)
                }
              }
            })
          }
        }

        return Array.from(visited)
      }

      const mainFluxoIds = pesq.fluxo_id ? [pesq.fluxo_id] : []
      const fluxoIds = getRecursiveFluxoIds(mainFluxoIds)

      const pergs = fluxoIds.length > 0 ? await dbService.getPerguntasByFluxos(fluxoIds) : []
      setPerguntas(pergs)

      const data = await dbService.getRelatorios(pesquisaId)
      setRelatorioData(data)

      // Carrega métricas amostrais reais do banco
      const amostrais = await dbService.getMetricasAmostrais(pesquisaId, pesq.objeto_id)
      setMetricasAmostrais(amostrais)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Sugestões disponíveis para autocomplete ────────────────────────────────
  const sugestoesDisponiveis = useMemo(() => {
    const termos = new Set<string>()
    const respostas = relatorioData?.respostas || []

    perguntas.forEach(p => {
      if (p.tipo === 'multipla' && p.config?.opcoes) {
        p.config.opcoes.forEach(o => {
          if (o.texto?.trim()) {
            termos.add(`${p.titulo}: ${o.texto.trim()}`)
          }
        })
      }
    })

    respostas.forEach((r: any) => {
      perguntas.forEach(p => {
        const val = r.valores[p.id]
        if (!val) return
        if (p.tipo === 'multipla') {
          const opcoes = p.config?.opcoes || []
          const arr = Array.isArray(val) ? val : [val]
          arr.forEach((v: string) => {
            const texto = opcoes.find(o => o.id === v)?.texto || v
            if (typeof texto === 'string' && texto.trim()) {
              termos.add(`${p.titulo}: ${texto.trim()}`)
            }
          })
        } else if (typeof val === 'string' && val.trim()) {
          termos.add(`${p.titulo}: ${val.trim()}`)
        }
      })
    })

    return Array.from(termos).sort((a, b) => a.localeCompare(b))
  }, [perguntas, relatorioData])

  // ── Resultado Filtrado em tempo real ───────────────────────────────────────
  const resultadoFiltrado = useMemo(() => {
    const respostas = relatorioData?.respostas || []
    let filtradas = respostas

    // Filtro por tipo de resposta (oficiais x testes)
    if (filtroTipoResposta === 'oficiais') {
      filtradas = filtradas.filter((r: any) => !r.is_teste)
    } else if (filtroTipoResposta === 'testes') {
      filtradas = filtradas.filter((r: any) => !!r.is_teste)
    }

    if (tagsFiltro.length > 0) {
      filtradas = filtradas.filter((resp: any) => {
        const valoresAmigaveis = new Set<string>()
        perguntas.forEach(p => {
          const val = resp.valores[p.id]
          if (!val) return
          if (p.tipo === 'multipla') {
            const opcoes = p.config?.opcoes || []
            const arr = Array.isArray(val) ? val : [val]
            arr.forEach((v: string) => {
              const texto = opcoes.find(o => o.id === v)?.texto || v
              if (typeof texto === 'string') {
                valoresAmigaveis.add(texto.trim().toLowerCase())
                valoresAmigaveis.add(`${p.titulo.trim().toLowerCase()}: ${texto.trim().toLowerCase()}`)
              }
            })
          } else if (typeof val === 'string') {
            valoresAmigaveis.add(val.trim().toLowerCase())
            valoresAmigaveis.add(`${p.titulo.trim().toLowerCase()}: ${val.trim().toLowerCase()}`)
          }
        })

        if (logicaFiltro === 'AND') {
          return tagsFiltro.every(tag => valoresAmigaveis.has(tag.trim().toLowerCase()))
        } else {
          return tagsFiltro.some(tag => valoresAmigaveis.has(tag.trim().toLowerCase()))
        }
      })
    }

    return filtradas
  }, [relatorioData, filtroTipoResposta, tagsFiltro, logicaFiltro, perguntas])

  // ── Inteligência de Dados & BI ─────────────────────────────────────────────
  const indicadoresBI = useMemo(() => {
    if (!perguntas.length || !resultadoFiltrado.length) return null
    return processarRelatorioCorridaBI({
      perguntas,
      respostas: resultadoFiltrado,
      totalInscritos: metricasAmostrais.totalInscritos,
      totalNotificados: metricasAmostrais.totalNotificados,
    })
  }, [perguntas, resultadoFiltrado, metricasAmostrais])

  // --- PREPARA DADOS DOS GRÁFICOS INDIVIDUAIS ---
  const getGraficoDados = (pergunta: Pergunta) => {
    if (pergunta.tipo !== 'multipla' || !relatorioData) return []
    const opcoes = pergunta.config?.opcoes || []
    
    const contagem: Record<string, { nome: string; quantidade: number }> = {}
    opcoes.forEach(o => {
      contagem[o.id] = { nome: o.texto, quantidade: 0 }
    })

    resultadoFiltrado.forEach((resp: any) => {
      const valor = resp.valores[pergunta.id]
      const arr = Array.isArray(valor) ? valor : valor ? [valor] : []
      arr.forEach((opcaoId: string) => {
        if (contagem[opcaoId]) {
          contagem[opcaoId].quantidade += 1
        }
      })
    })

    return Object.values(contagem)
  }

  // --- EXPORTAR EXCEL ---
  const handleExportExcel = () => {
    if (!relatorioData || !pesquisa) return

    const rows = resultadoFiltrado.map((r: any) => {
      const rowData: Record<string, any> = {
        'ID da Resposta': r.id,
        'Data/Hora da Resposta': new Date(r.created_at).toLocaleString('pt-BR'),
        'Atleta / Participante': r.atleta_nome || 'Anônimo',
        'CPF': r.cpf || '-',
        'Telefone': r.telefone || '-',
      }

      perguntas.forEach(p => {
        const val = r.valores[p.id]
        if (val === undefined) {
          rowData[p.titulo] = '-'
        } else if (p.tipo === 'multipla') {
          const opcoes = p.config?.opcoes || []
          const selecionadas = Array.isArray(val) ? val : [val]
          const textos = selecionadas.map(id => opcoes.find(o => o.id === id)?.texto || id)
          rowData[p.titulo] = textos.join(', ')
        } else {
          rowData[p.titulo] = val
        }
      })

      return rowData
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Respostas')
    
    XLSX.writeFile(workbook, `relatorio_${pesquisa.token || 'pesquisa'}.xlsx`)
  }

  const handleDeleteIndividual = async (respostaId: string, atletaNome?: string | null) => {
    const nome = atletaNome || 'anônimo / de teste'
    if (!confirm(`Deseja realmente excluir a resposta de "${nome}"?\n\nO participante voltará ao status "Pendente" e essa resposta será removida das métricas.`)) {
      return
    }

    try {
      await dbService.deleteResposta(respostaId, true)
      if (id) {
        await loadData(id)
      }
      alert('Resposta excluída com sucesso!')
    } catch (err: any) {
      alert('Erro ao excluir resposta: ' + err.message)
    }
  }

  const handleZerarApenasTestes = async () => {
    if (!id || !pesquisa) return
    if (totalTestes === 0) {
      alert('Não há nenhuma resposta de teste registrada nesta pesquisa.')
      return
    }

    if (!confirm(`ATENÇÃO: Deseja realmente excluir ${totalTestes} resposta(s) marcada(s) como TESTE da pesquisa "${pesquisa.titulo}"?\n\nAs respostas oficiais dos atletas continuarão 100% preservadas e intactas.`)) {
      return
    }

    try {
      const apagadas = await dbService.limparRespostasTeste(id, true)
      await loadData(id)
      alert(`${apagadas} resposta(s) de teste apagada(s) com sucesso! Respostas oficiais preservadas.`)
    } catch (err: any) {
      alert('Erro ao apagar testes: ' + err.message)
    }
  }

  const handleExcluirSelecionadas = async () => {
    if (!id || respostasSelecionadas.size === 0) return
    const qtd = respostasSelecionadas.size
    if (!confirm(`Deseja realmente excluir as ${qtd} resposta(s) selecionada(s)?\n\nOs participantes correspondentes voltarão para o status Pendente.`)) {
      return
    }

    try {
      await dbService.deleteRespostasLote(Array.from(respostasSelecionadas), true)
      setRespostasSelecionadas(new Set())
      await loadData(id)
      alert(`${qtd} resposta(s) excluída(s) com sucesso!`)
    } catch (err: any) {
      alert('Erro ao excluir respostas selecionadas: ' + err.message)
    }
  }

  const handleToggleRespostaTeste = async (respostaId: string, currentIsTeste: boolean) => {
    try {
      await dbService.toggleRespostaTeste(respostaId, !currentIsTeste)
      if (id) {
        await loadData(id)
      }
    } catch (err: any) {
      alert('Erro ao alterar status da resposta: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const totalRespostas = relatorioData?.totalRespostas || 0
  const totalOficiais = (relatorioData?.respostas || []).filter((r: any) => !r.is_teste).length
  const totalTestes = (relatorioData?.respostas || []).filter((r: any) => !!r.is_teste).length
  const perguntasMultipla = perguntas.filter(p => p.tipo === 'multipla')

  return (
    <div className="w-full space-y-6 animate-fade-in text-foreground">
      
      {/* Header Executivo */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-start gap-3">
            <Link
              to="/admin/pesquisas"
              className="p-2.5 rounded-2xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {metricasAmostrais.totalInscritos > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    📅 Base do Evento ({metricasAmostrais.totalInscritos} inscritos)
                  </span>
                )}
                {pesquisa?.publicada ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    Pesquisa Ativa
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                    Rascunho
                  </span>
                )}
                <span className="text-xs text-muted-foreground">Token: <code className="font-mono font-bold text-foreground">{pesquisa?.token}</code></span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {pesquisa?.titulo}
              </h1>
              <p className="text-xs text-muted-foreground">
                Inteligência analítica, perfil demográfico dos respondentes e comprovação de indicadores.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {totalRespostas > 0 && (
              <>
                {respostasSelecionadas.size > 0 && (
                  <button
                    onClick={handleExcluirSelecionadas}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25 text-xs font-bold px-3.5 py-2.5 transition-all cursor-pointer shadow-sm animate-fade-in"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir Selecionadas ({respostasSelecionadas.size})
                  </button>
                )}
                {totalTestes > 0 && (
                  <button
                    onClick={handleZerarApenasTestes}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400 px-3.5 py-2.5 transition-all cursor-pointer shadow-sm"
                    title={`Excluir apenas as ${totalTestes} respostas marcadas como teste`}
                  >
                    <FlaskConical className="h-4 w-4" />
                    Zerar Testes ({totalTestes})
                  </button>
                )}
                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-md active:scale-[0.98] transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Excel (.xlsx)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Barra de Navegação por Abas Executivas */}
        {totalRespostas > 0 && (
          <div className="flex items-center gap-2 pt-4 overflow-x-auto">
            <button
              onClick={() => setAbaAtiva('perfil')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                abaAtiva === 'perfil'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground border border-border bg-background'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              1. Perfil do Atleta & Cruzamentos
            </button>
            <button
              onClick={() => setAbaAtiva('executivo')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                abaAtiva === 'executivo'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground border border-border bg-background'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              2. Painel Executivo & Indicadores
            </button>
            <button
              onClick={() => setAbaAtiva('territorio')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                abaAtiva === 'territorio'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground border border-border bg-background'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              3. Amostragem & Território
            </button>
          </div>
        )}
      </div>

      {totalRespostas === 0 ? (
        <div className="text-center py-20 rounded-3xl border border-dashed border-border bg-card/60 p-8 space-y-3">
          <BarChart2 className="h-12 w-12 mx-auto text-muted-foreground/40 animate-pulse" />
          <h3 className="font-bold text-foreground text-lg">Nenhuma resposta registrada ainda</h3>
          <p className="text-muted-foreground text-xs max-w-md mx-auto">
            Assim que os participantes responderem ao formulário pelo WhatsApp ou link direto, os cruzamentos demográficos e KPIs analíticos serão computados automaticamente em tempo real.
          </p>
          {pesquisa?.token && (
            <div className="pt-2">
              <a
                href={`/r/${pesquisa.token}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:opacity-90 transition-all"
              >
                Abrir formulário de resposta
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">

          {/* ============================================================== */}
          {/* VISÃO 1: PERFIL DO ATLETA & CRUZAMENTOS (ABA ATIVA INICIAL)     */}
          {/* ============================================================== */}
          {abaAtiva === 'perfil' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* 4 Cards de Resumo do Perfil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Card 1: Estreantes / Iniciação Esportiva */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Iniciação Esportiva</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">Impacto</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-amber-500">
                      {indicadoresBI?.estreantes ? `${indicadoresBI.estreantes.percentualEstreantes}%` : `${resultadoFiltrado.length}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {indicadoresBI?.estreantes ? '1ª Corrida' : 'Respondentes'}
                    </span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all" 
                      style={{ width: `${indicadoresBI?.estreantes?.percentualEstreantes ?? 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    {indicadoresBI?.estreantes 
                      ? `${indicadoresBI.estreantes.totalEstreantes} atletas estrearam em corrida de rua nesta prova.`
                      : `${resultadoFiltrado.length} atletas responderam.`}
                  </p>
                </div>

                {/* Card 2: Perfil de Gênero */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Perfil de Gênero</span>
                    {(() => {
                      if (!indicadoresBI?.genero || indicadoresBI.genero.total === 0) {
                        return <span className="text-xs font-black px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">Sem Dados</span>
                      }
                      const diff = Math.abs(indicadoresBI.genero.feminino.pct - indicadoresBI.genero.masculino.pct)
                      if (diff <= 10) {
                        return <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Equilíbrio (±10%)</span>
                      }
                      if (indicadoresBI.genero.feminino.pct > indicadoresBI.genero.masculino.pct) {
                        return <span className="text-xs font-black px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 border border-pink-500/20">Maioria Feminina</span>
                      }
                      return <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">Maioria Masculina</span>
                    })()}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-pink-500">
                          {indicadoresBI?.genero ? `${indicadoresBI.genero.feminino.pct}%` : '-'}
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground">Mulheres</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {indicadoresBI?.genero ? `${indicadoresBI.genero.feminino.count} ${indicadoresBI.genero.feminino.count === 1 ? 'atleta' : 'atletas'}` : '0'}
                      </span>
                    </div>

                    <div className="h-7 w-px bg-border/80" />

                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-2xl font-black text-blue-500">
                          {indicadoresBI?.genero ? `${indicadoresBI.genero.masculino.pct}%` : '-'}
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground">Homens</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {indicadoresBI?.genero ? `${indicadoresBI.genero.masculino.count} ${indicadoresBI.genero.masculino.count === 1 ? 'atleta' : 'atletas'}` : '0'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-border h-2 rounded-full flex overflow-hidden">
                    <div 
                      className="bg-pink-500 h-full transition-all" 
                      style={{ width: `${indicadoresBI?.genero?.feminino.pct ?? 0}%` }} 
                      title={`Mulheres: ${indicadoresBI?.genero?.feminino.pct ?? 0}%`}
                    />
                    <div 
                      className="bg-blue-500 h-full transition-all" 
                      style={{ width: `${indicadoresBI?.genero?.masculino.pct ?? 0}%` }} 
                      title={`Homens: ${indicadoresBI?.genero?.masculino.pct ?? 0}%`}
                    />
                    {((indicadoresBI?.genero?.outros.pct ?? 0) > 0) && (
                      <div 
                        className="bg-purple-500 h-full transition-all" 
                        style={{ width: `${indicadoresBI?.genero?.outros.pct}%` }} 
                        title={`Outros: ${indicadoresBI?.genero?.outros.pct}%`}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    {indicadoresBI?.genero 
                      ? `${indicadoresBI.genero.total} ${indicadoresBI.genero.total === 1 ? 'respondente apurado' : 'respondentes apurados'}.`
                      : 'Divisão por gênero apurada.'}
                  </p>
                </div>

                {/* Card 3: Faixa Etária Dominante */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Faixa Etária Principal</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">Idade</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-purple-600 truncate max-w-[170px]" title={indicadoresBI?.faixaEtariaDominante?.faixa || 'N/A'}>
                      {indicadoresBI?.faixaEtariaDominante?.faixa || 'Geral'}
                    </span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${indicadoresBI?.faixaEtariaDominante?.percentual ?? 0}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    {indicadoresBI?.faixaEtariaDominante 
                      ? `${indicadoresBI.faixaEtariaDominante.percentual}% do total de participantes.`
                      : 'Concentração etária apurada.'}
                  </p>
                </div>

                {/* Card 4: Inclusão Social (Renda Familiar) */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Até 2 Salários Mínimos</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Social</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-600">
                      {indicadoresBI?.rendaAte2SM ? `${indicadoresBI.rendaAte2SM.percentual}%` : '-'}
                    </span>
                    <span className="text-xs text-muted-foreground">da base</span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${indicadoresBI?.rendaAte2SM?.percentual ?? 0}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    {indicadoresBI?.rendaAte2SM 
                      ? `${indicadoresBI.rendaAte2SM.total} atletas em estratos populares.`
                      : 'Estrato socioeconômico apurado.'}
                  </p>
                </div>

              </div>

              {/* Grade de Cruzamentos Bi-dimensionais */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Cruzamento 1: Gênero vs Estreantes */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-foreground">Cruzamento: Gênero vs. Estreantes</h3>
                      <p className="text-xs text-muted-foreground">Proporção de primeira vez em corrida por gênero</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      Inclusão
                    </span>
                  </div>

                  {indicadoresBI?.cruzamentoGeneroEstreantes && indicadoresBI.cruzamentoGeneroEstreantes.filter(i => i.totalX > 0).length > 0 ? (
                    <div className="space-y-4 pt-1">
                      {indicadoresBI.cruzamentoGeneroEstreantes.filter(i => i.totalX > 0).map((item, idx) => {
                        const simItem = item.distribuicaoY.find(y => y.opcaoY.toLowerCase().startsWith('sim'))
                        const pctEstreante = simItem ? simItem.percentualNaOpcaoX : 0
                        const isFem = item.opcaoX.toLowerCase().includes('fem')
                        const barColor = isFem ? 'bg-pink-500' : 'bg-blue-500'
                        const textColor = isFem ? 'text-pink-500' : 'text-blue-500'

                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className={`${textColor} font-bold`}>{item.opcaoX} ({item.totalX} {item.totalX === 1 ? 'atleta' : 'atletas'})</span>
                              <span>{pctEstreante}% Estreantes ({simItem?.quantidade || 0} {simItem?.quantidade === 1 ? 'atleta' : 'atletas'})</span>
                            </div>
                            <div className="h-3 w-full bg-border rounded-full flex overflow-hidden">
                              <div className={`${barColor} h-full transition-all`} style={{ width: `${pctEstreante}%` }} title={`Estreantes: ${pctEstreante}%`} />
                              <div className="bg-muted h-full transition-all" style={{ width: `${100 - pctEstreante}%` }} title={`Veteranos: ${100 - pctEstreante}%`} />
                            </div>
                          </div>
                        )
                      })}

                      <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs text-foreground space-y-1">
                        <span className="font-bold text-primary block">💡 Conclusão de BI:</span>
                        <p>
                          A corrida atua como porta de entrada esportiva e inclusão comunitária, identificando a taxa real de adesão ao hábito esportivo em cada grupo.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-8 text-center">
                      Dados de cruzamento sendo computados com base nas respostas cadastradas.
                    </p>
                  )}
                </div>

                {/* Cruzamento 2: Distribuição Etária */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-base font-black text-foreground">Distribuição Etária dos Atletas</h3>
                    <p className="text-xs text-muted-foreground">Volume e percentual de participantes por faixa de idade</p>
                  </div>

                  {indicadoresBI?.faixaEtaria && indicadoresBI.faixaEtaria.length > 0 ? (
                    <div className="space-y-3 pt-1">
                      {indicadoresBI.faixaEtaria.map((fe, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-foreground">{fe.nome}</span>
                            <span className="font-semibold text-muted-foreground">{fe.quantidade} atletas ({fe.percentual}%)</span>
                          </div>
                          <div className="h-2.5 w-full bg-border rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${fe.percentual}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-8 text-center">Sem dados etários apurados.</p>
                  )}
                </div>

                {/* Cruzamento 3: Renda Familiar Mensal (Span 2) */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black text-foreground">Estrato Socioeconômico (Renda Familiar Mensal)</h3>
                      <p className="text-xs text-muted-foreground">Evidência de democratização de acesso ao evento público e gratuito</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 self-start sm:self-auto">
                      Comprovação Social
                    </span>
                  </div>

                  {indicadoresBI?.renda && indicadoresBI.renda.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
                      {indicadoresBI.renda.map((r, idx) => (
                        <div key={idx} className="p-4 rounded-2xl border border-border bg-background space-y-1">
                          <span className="text-xs font-bold text-muted-foreground block line-clamp-1" title={r.nome}>{r.nome}</span>
                          <span className="text-2xl font-black text-foreground">{r.percentual}%</span>
                          <p className="text-xs text-muted-foreground">{r.quantidade} atletas</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">Sem dados de renda familiar cadastrados.</p>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* VISÃO 2: PAINEL EXECUTIVO & INDICADORES (ABA 2)                 */}
          {/* ============================================================== */}
          {abaAtiva === 'executivo' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* 4 Grand Card KPIs Estratégicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Card 1: CSAT / Aprovação Geral */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Aprovação Geral</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {indicadoresBI?.aprovacaoGeral?.nivelTexto || 'Avaliado'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-600">
                      {indicadoresBI?.aprovacaoGeral ? `${indicadoresBI.aprovacaoGeral.percentual}%` : '-'}
                    </span>
                    <span className="text-xs text-muted-foreground">Muito Boa + Boa</span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all" 
                      style={{ width: `${indicadoresBI?.aprovacaoGeral?.percentual ?? 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Base: {resultadoFiltrado.length} {resultadoFiltrado.length === 1 ? 'resposta coletada' : 'respostas coletadas'}.
                  </p>
                </div>

                {/* Card 2: Intenção de Retorno (Fidelização) */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Participaria Novamente</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">Fidelização</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-blue-500">
                      {indicadoresBI?.fidelizacao ? `${indicadoresBI.fidelizacao.percentual}%` : '-'}
                    </span>
                    <span className="text-xs text-muted-foreground">Retorno</span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all" 
                      style={{ width: `${indicadoresBI?.fidelizacao?.percentual ?? 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    {indicadoresBI?.fidelizacao ? `${indicadoresBI.fidelizacao.retorno} ${indicadoresBI.fidelizacao.retorno === 1 ? 'atleta confirmou' : 'atletas confirmaram'} retorno.` : 'Índice de fidelização.'}
                  </p>
                </div>

                {/* Card 3: Impacto Social / Cumprimento do Fomento */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Incentivo a Hábitos</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">Meta Pública</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-purple-600">
                      {indicadoresBI?.metaFomento ? `${indicadoresBI.metaFomento.percentual}%` : '-'}
                    </span>
                    <span className="text-xs text-muted-foreground">Concordância</span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full transition-all" 
                      style={{ width: `${indicadoresBI?.metaFomento?.percentual ?? 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Comprova o cumprimento do objeto do termo de fomento.
                  </p>
                </div>

                {/* Card 4: Margem de Erro Amostral */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Rigor Estatístico</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 border border-zinc-500/20">IC 95%</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-foreground">
                      {indicadoresBI?.margemErro !== null ? `±${indicadoresBI?.margemErro}%` : '±0.0%'}
                    </span>
                    <span className="text-xs text-muted-foreground">Margem Erro</span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all" 
                      style={{ width: `${Math.max(5, Math.min(100, 100 - (indicadoresBI?.margemErro || 0)))}%` }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    {metricasAmostrais.totalInscritos > 0 
                      ? `Universo: ${metricasAmostrais.totalInscritos} atletas inscritos.`
                      : 'Amostragem representativa com rigor científico.'}
                  </p>
                </div>

              </div>

              {/* Matriz de Desempenho Operacional vs Funil de Resposta */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Bloco Operacional */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-foreground">Avaliação Operacional Detalhada</h3>
                      <p className="text-xs text-muted-foreground">Notas atribuídas pelos corredores às dimensões da prova</p>
                    </div>
                    {indicadoresBI?.notaGeralMedia && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        Nota {indicadoresBI.notaGeralMedia} / 10
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Organização Geral */}
                    {indicadoresBI?.organizacao && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span>1. Organização Geral do Evento</span>
                          <span className="text-emerald-600 font-semibold">
                            {indicadoresBI.organizacao.find(o => o.nome.toLowerCase().includes('muito boa'))?.percentual || 0}% Muito Boa
                          </span>
                        </div>
                        <div className="h-3 w-full bg-border rounded-full flex overflow-hidden">
                          {indicadoresBI.organizacao.map((item, idx) => {
                            const colors = ['bg-emerald-600', 'bg-emerald-400', 'bg-amber-400', 'bg-red-500', 'bg-red-700']
                            return (
                              <div 
                                key={idx} 
                                className={`${colors[idx % colors.length]} h-full`} 
                                style={{ width: `${item.percentual}%` }} 
                                title={`${item.nome}: ${item.percentual}%`}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Estrutura */}
                    {indicadoresBI?.estrutura && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span>2. Estrutura (Percurso, Hidratação e Segurança)</span>
                          <span className="text-emerald-600 font-semibold">
                            {indicadoresBI.estrutura.find(o => o.nome.toLowerCase().includes('muito boa'))?.percentual || 0}% Muito Boa
                          </span>
                        </div>
                        <div className="h-3 w-full bg-border rounded-full flex overflow-hidden">
                          {indicadoresBI.estrutura.map((item, idx) => {
                            const colors = ['bg-emerald-600', 'bg-emerald-400', 'bg-amber-400', 'bg-red-500', 'bg-red-700']
                            return (
                              <div 
                                key={idx} 
                                className={`${colors[idx % colors.length]} h-full`} 
                                style={{ width: `${item.percentual}%` }} 
                                title={`${item.nome}: ${item.percentual}%`}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Benefício para a Cidade */}
                    {indicadoresBI?.beneficioComunidade && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span>3. Benefícios Trazidos para o Município</span>
                          <span className="text-purple-600 font-semibold">
                            {indicadoresBI.beneficioComunidade.find(o => o.nome.toLowerCase().includes('muitos'))?.percentual || 0}% Alto Impacto
                          </span>
                        </div>
                        <div className="h-3 w-full bg-border rounded-full flex overflow-hidden">
                          {indicadoresBI.beneficioComunidade.map((item, idx) => {
                            const colors = ['bg-purple-600', 'bg-purple-400', 'bg-zinc-400', 'bg-zinc-600']
                            return (
                              <div 
                                key={idx} 
                                className={`${colors[idx % colors.length]} h-full`} 
                                style={{ width: `${item.percentual}%` }} 
                                title={`${item.nome}: ${item.percentual}%`}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border flex-wrap">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-600"></span> Muito Boa</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400"></span> Boa</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400"></span> Regular</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500"></span> Ruim</span>
                  </div>
                </div>

                {/* Funil de Resposta */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-foreground">Engajamento & Taxa de Resposta</h3>
                      <p className="text-xs text-muted-foreground">Adesão dos corredores da base</p>
                    </div>
                    {indicadoresBI?.taxaAdesao && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {indicadoresBI.taxaAdesao}% de Conversão
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-border/20 border border-border flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase">1. Total de Inscritos na Prova</span>
                        <p className="text-xl font-black text-foreground">
                          {metricasAmostrais.totalInscritos > 0 ? `${metricasAmostrais.totalInscritos} atletas` : 'Base Completa'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">100% da base</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-border/20 border border-border flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase">2. Notificados via WhatsApp (Z-API)</span>
                        <p className="text-xl font-black text-blue-500">
                          {metricasAmostrais.totalNotificados > 0 ? `${metricasAmostrais.totalNotificados} atletas` : `${resultadoFiltrado.length} contatados`}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-blue-500">
                        {metricasAmostrais.totalInscritos > 0 && metricasAmostrais.totalNotificados > 0 
                          ? `${((metricasAmostrais.totalNotificados / metricasAmostrais.totalInscritos) * 100).toFixed(1)}% notificados` 
                          : 'Envio ativo'}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-emerald-600 uppercase">3. Respostas Válidas Coletadas</span>
                        <p className="text-xl font-black text-emerald-600">{resultadoFiltrado.length} formulários</p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-emerald-600">
                          {indicadoresBI?.taxaAdesao ? `${indicadoresBI.taxaAdesao}%` : 'Ativo'}
                        </span>
                        <span className="block text-xs text-emerald-600/80">Taxa de Adesão</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* VISÃO 3: AMOSTRAGEM & TERRITÓRIO (ABA 3)                        */}
          {/* ============================================================== */}
          {abaAtiva === 'territorio' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-black text-foreground">Distribuição Geográfica dos Beneficiários</h3>
                  <p className="text-xs text-muted-foreground">Mapeamento dos bairros e localidades de residência dos atletas</p>
                </div>

                {indicadoresBI?.territorio && indicadoresBI.territorio.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {indicadoresBI.territorio.map((b, idx) => (
                      <div key={idx} className="p-4 rounded-2xl border border-border bg-background space-y-1 text-center">
                        <span className="text-xs font-bold text-muted-foreground block truncate" title={b.nome}>{b.nome}</span>
                        <span className="text-2xl font-black text-foreground">{b.percentual}%</span>
                        <span className="text-xs text-muted-foreground block">{b.quantidade} atletas</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl bg-border/10 border border-border space-y-2">
                    <MapPin className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">
                      Esta pesquisa ainda não possui respostas na pergunta de Bairro/Região ou as opções são abertas.
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-border/20 border border-border text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>Metodologia: Amostragem estratificada sobre o universo de inscritos do projeto.</span>
                  <span className="font-bold text-foreground">Confiança Estatística: 95%</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* BARRA DE FILTRO POR TAGS & AUTOCOMPLETE                        */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Filtro Dinâmico por Tags / Termos</h3>
              </div>
              <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg border border-border self-start sm:self-auto">
                <span className="text-xs font-bold text-muted-foreground uppercase px-2">Lógica:</span>
                <button
                  type="button"
                  onClick={() => setLogicaFiltro('AND')}
                  className={`text-xs font-bold px-2 py-1 rounded transition-colors ${logicaFiltro === 'AND' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  E (AND)
                </button>
                <button
                  type="button"
                  onClick={() => setLogicaFiltro('OR')}
                  className={`text-xs font-bold px-2 py-1 rounded transition-colors ${logicaFiltro === 'OR' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  OU (OR)
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="w-full flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all min-h-[46px]">
                {tagsFiltro.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 text-xs font-bold pl-2.5 pr-1.5 py-1 rounded-lg"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTagsFiltro(prev => prev.filter(t => t !== tag))}
                      className="hover:bg-primary/20 rounded-md p-0.5 text-primary/70 hover:text-primary transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  value={inputValue}
                  onChange={e => {
                    setInputValue(e.target.value)
                    setShowSuggestions(true)
                    setFocusedIndex(-1)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  onKeyDown={e => {
                    const filteredSugs = sugestoesDisponiveis.filter(
                      s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tagsFiltro.includes(s)
                    )

                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setFocusedIndex(prev => Math.min(prev + 1, filteredSugs.length - 1))
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setFocusedIndex(prev => Math.max(prev - 1, -1))
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      if (focusedIndex >= 0 && focusedIndex < filteredSugs.length) {
                        const selected = filteredSugs[focusedIndex]
                        if (!tagsFiltro.includes(selected)) {
                          setTagsFiltro(prev => [...prev, selected])
                        }
                        setInputValue('')
                        setFocusedIndex(-1)
                      } else if (inputValue.trim()) {
                        const val = inputValue.trim()
                        if (!tagsFiltro.includes(val)) {
                          setTagsFiltro(prev => [...prev, val])
                        }
                        setInputValue('')
                      }
                    } else if (e.key === ',' || e.key === ';') {
                      e.preventDefault()
                      if (inputValue.trim()) {
                        const val = inputValue.trim()
                        if (!tagsFiltro.includes(val)) {
                          setTagsFiltro(prev => [...prev, val])
                        }
                        setInputValue('')
                      }
                    } else if (e.key === 'Backspace' && !inputValue && tagsFiltro.length > 0) {
                      setTagsFiltro(prev => prev.slice(0, -1))
                    }
                  }}
                  placeholder={tagsFiltro.length === 0 ? "Filtrar por resposta ou opção..." : "Adicionar tag..."}
                  className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground focus:ring-0 placeholder-muted-foreground min-w-[150px] py-1"
                />
              </div>

              {showSuggestions && (
                (() => {
                  const filteredSugs = sugestoesDisponiveis.filter(
                    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tagsFiltro.includes(s)
                  )

                  if (filteredSugs.length === 0) return null

                  return (
                    <div className="absolute z-50 w-full mt-1.5 rounded-xl border border-border bg-card shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                      {filteredSugs.map((sug, idx) => (
                        <button
                          key={sug}
                          type="button"
                          onMouseDown={() => {
                            if (!tagsFiltro.includes(sug)) {
                              setTagsFiltro(prev => [...prev, sug])
                            }
                            setInputValue('')
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${idx === focusedIndex ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'}`}
                        >
                          <span>{sug}</span>
                          <span className="text-xs text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded font-mono">Enter</span>
                        </button>
                      ))}
                    </div>
                  )
                })()
              )}
            </div>
          </div>

          {/* Botão para alternar Gráficos Individuais das Perguntas */}
          {perguntasMultipla.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => setMostrarGraficosIndividuais(prev => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-all shadow-sm cursor-pointer"
              >
                <BarChart2 className="h-4 w-4 text-primary" />
                {mostrarGraficosIndividuais ? 'Ocultar Questões Individuais' : 'Explorar Questões Individuais em Gráficos'}
              </button>
            </div>
          )}

          {/* Gráficos Individuais */}
          {mostrarGraficosIndividuais && perguntasMultipla.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              {perguntasMultipla.map((perg) => {
                const dados = getGraficoDados(perg)
                return (
                  <div key={perg.id} className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
                    <div className="flex gap-2 items-center text-xs font-bold text-primary uppercase tracking-wider">
                      <Sparkles className="h-4 w-4" />
                      <span>Distribuição de Respostas</span>
                    </div>
                    <h3 className="font-bold text-foreground text-sm line-clamp-2">{perg.titulo}</h3>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dados} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
                          <XAxis dataKey="nome" stroke="#71717a" fontSize={10} />
                          <YAxis stroke="#71717a" fontSize={10} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', color: 'hsl(var(--foreground))' }} 
                            labelStyle={{ fontWeight: 'bold' }}
                          />
                          <Bar dataKey="quantidade" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                            {dados.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ============================================================== */}
          {/* TABELA DE RESPOSTAS INDIVIDUAIS COM ACORDEOM INLINE            */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">Respostas Individuais Registradas</h3>
                <p className="text-xs text-muted-foreground">Listagem com auditoria, origem (oficial vs. teste) e seleção em lote</p>
              </div>

              {/* Filtro Rápido de Origem: Todas / Oficiais / Testes */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFiltroTipoResposta('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filtroTipoResposta === 'todos' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todas ({totalRespostas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoResposta('oficiais')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filtroTipoResposta === 'oficiais' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ✓ Oficiais ({totalOficiais})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoResposta('testes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filtroTipoResposta === 'testes' ? 'bg-amber-500 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  🧪 Testes ({totalTestes})
                </button>
              </div>
            </div>
            
            <div className="w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/40">
                    <th className="p-3 pl-4 rounded-l-xl w-10">
                      <input
                        type="checkbox"
                        checked={resultadoFiltrado.length > 0 && respostasSelecionadas.size === resultadoFiltrado.length}
                        onChange={toggleSelecionarTudo}
                        className="rounded border-border text-primary focus:ring-primary/20 cursor-pointer h-3.5 w-3.5"
                        title="Selecionar / Deselecionar todas as visíveis"
                      />
                    </th>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Participante / Contato</th>
                    <th className="p-3">Origem</th>
                    <th className="p-3">Perfil Rápido</th>
                    <th className="p-3">Avaliação / Status</th>
                    <th className="p-3 pr-4 text-right rounded-r-xl">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {resultadoFiltrado.map((r: any) => {
                    const expandida = respostasExpandidas.has(r.id)
                    const selecionada = respostasSelecionadas.has(r.id)
                    const badges = getResumoLinha(r, perguntas)
                    const avaliacao = getAvaliacaoLinha(r, perguntas)

                    return (
                      <React.Fragment key={r.id}>
                        {/* Linha Sintética Principal (Zero Scroll Lateral) */}
                        <tr 
                          onClick={() => toggleRespostaExpandida(r.id)} 
                          className={`hover:bg-primary/5 transition-colors cursor-pointer group ${selecionada ? 'bg-primary/5' : ''}`}
                        >
                          <td className="p-3.5 pl-4" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selecionada}
                              onChange={() => toggleSelecionarResposta(r.id)}
                              className="rounded border-border text-primary focus:ring-primary/20 cursor-pointer h-3.5 w-3.5"
                            />
                          </td>
                          <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                            {new Date(r.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-bold text-foreground block group-hover:text-primary transition-colors">
                              {r.atleta_nome || 'Anônimo / Teste'}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {r.cpf ? `CPF: ${r.cpf}` : (r.telefone ? `Tel: ${r.telefone}` : '-')}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            {r.is_teste ? (
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 inline-flex items-center gap-1">
                                🧪 Teste
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-1">
                                ✓ Oficial
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {badges.length > 0 ? (
                                badges.map((b, bIdx) => (
                                  <span key={bIdx} className={`px-2 py-0.5 rounded-md text-xs font-bold border ${b.cor}`}>
                                    {b.label}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            {avaliacao.temAvaliacao ? (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-1">
                                <span>{avaliacao.texto}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-semibold">
                                {avaliacao.texto}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => toggleRespostaExpandida(r.id)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                                  expandida
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                    : 'border-border bg-card hover:bg-muted text-foreground'
                                }`}
                              >
                                <span>{expandida ? 'Recolher' : 'Ver Respostas'}</span>
                                {expandida ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => handleDeleteIndividual(r.id, r.atleta_nome)}
                                title="Excluir resposta (retorna participante para Pendente)"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Linha Expansível do Acordeom Inline (Adaptável a Qualquer Formulário) */}
                        {expandida && (
                          <tr className="bg-muted/15 border-b border-border">
                            <td colSpan={7} className="p-5 sm:p-6 space-y-4">
                              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-5 animate-fade-in">
                                
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`w-2.5 h-2.5 rounded-full ${r.is_teste ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                    <span className="font-bold text-sm text-foreground">
                                      Ficha Completa · {r.atleta_nome || 'Participante'}
                                    </span>
                                    {r.is_teste ? (
                                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                                        🧪 Resposta de Teste
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                        ✓ Resposta Oficial
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRespostaTeste(r.id, r.is_teste)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                        r.is_teste
                                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
                                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/30'
                                      }`}
                                      title="Alternar se esta resposta é oficial ou de teste"
                                    >
                                      {r.is_teste ? '✓ Mudar para Oficial' : '🧪 Marcar como Teste'}
                                    </button>
                                    <span className="text-xs font-mono text-muted-foreground hidden sm:inline">ID: {r.id.slice(0, 8)}...</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                  {perguntas.map(p => {
                                    const val = r.valores[p.id]
                                    const isVazio = val === undefined || val === null || val === ''
                                    const isTextarea = p.tipo === 'textarea'

                                    if (isTextarea) {
                                      return (
                                        <div key={p.id} className="md:col-span-2 lg:col-span-3 p-4 rounded-2xl bg-muted/30 border border-border space-y-1.5">
                                          <span className="text-xs font-bold text-muted-foreground block">
                                            💬 {p.titulo}
                                          </span>
                                          <p className="text-xs text-foreground italic bg-background p-3 rounded-xl border border-border leading-relaxed">
                                            {isVazio ? <span className="text-muted-foreground/60 not-italic">Sem resposta enviada</span> : `"${val}"`}
                                          </p>
                                        </div>
                                      )
                                    }

                                    if (p.tipo === 'multipla') {
                                      const opcoes = p.config?.opcoes || []
                                      const selecionadas = Array.isArray(val) ? val : isVazio ? [] : [val]
                                      const textos = selecionadas.map(opcaoId => opcoes.find(o => o.id === opcaoId)?.texto || opcaoId)

                                      return (
                                        <div key={p.id} className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
                                          <span className="text-xs text-muted-foreground block line-clamp-1" title={p.titulo}>
                                            {p.titulo}
                                          </span>
                                          <div className="flex flex-wrap gap-1 pt-0.5">
                                            {textos.length > 0 ? (
                                              textos.map((txt, idx) => (
                                                <span key={idx} className="bg-primary/10 text-primary border border-primary/20 text-xs px-2 py-0.5 rounded-md font-bold">
                                                  {txt}
                                                </span>
                                              ))
                                            ) : (
                                              <span className="text-xs text-muted-foreground/60">-</span>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    }

                                    return (
                                      <div key={p.id} className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
                                        <span className="text-xs text-muted-foreground block line-clamp-1" title={p.titulo}>
                                          {p.titulo}
                                        </span>
                                        <span className="text-xs font-bold text-foreground block pt-0.5">
                                          {isVazio ? <span className="text-muted-foreground/60 font-normal">-</span> : String(val)}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>

                                <div className="flex justify-end pt-2 border-t border-border">
                                  <button
                                    onClick={() => toggleRespostaExpandida(r.id)}
                                    className="px-3.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <span>Recolher Ficha</span>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
