import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  dbService,
  type Pesquisa,
  type Pergunta,
  type CategoriaCampo,
  type FiltrosRelatorio,
  type RelatorioSalvo,
  type Fluxo
} from '../../services/db'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  BarChart2, FileSpreadsheet, Filter, X, Save, BookOpen,
  Trash2, Check, Loader2, Tag, ClipboardList, RefreshCw, Pencil, Map
} from 'lucide-react'
import { MapaBrasil } from '../../components/MapaBrasil'

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f97316']

// ─── Página Principal ─────────────────────────────────────────────────────────
export const RelatoriosGlobais: React.FC = () => {
  // Dados base
  const [todasPesquisas, setTodasPesquisas] = useState<Pesquisa[]>([])
  const [categorias, setCategorias] = useState<CategoriaCampo[]>([])
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [relatoriosSalvos, setRelatoriosSalvos] = useState<RelatorioSalvo[]>([])
  const [todosFluxos, setTodosFluxos] = useState<Fluxo[]>([])
  const [loadingBase, setLoadingBase] = useState(true)

  // Filtro de Tags Dinâmico
  const [tagsFiltro, setTagsFiltro] = useState<string[]>([])
  const [logicaFiltro, setLogicaFiltro] = useState<'AND' | 'OR'>('AND')

  // Autocomplete UI
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Resultados brutos do banco e carregamento
  const [respostasBrutas, setRespostasBrutas] = useState<any[]>([])
  const [loadingRespostas, setLoadingRespostas] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // UI
  const [showSalvos, setShowSalvos] = useState(false)
  const [modalSalvar, setModalSalvar] = useState(false)
  const [showMapaModal, setShowMapaModal] = useState(false)
  const [nomeRelatorio, setNomeRelatorio] = useState('')
  const [descRelatorio, setDescRelatorio] = useState('')
  const [editandoRelId, setEditandoRelId] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      setLoadingBase(true)
      try {
        const [pesqs, cats, rels, fluxos] = await Promise.all([
          dbService.getPesquisas(),
          dbService.getCategorias(),
          dbService.getRelatoriosSalvos(),
          dbService.getFluxos()
        ])
        setTodasPesquisas(pesqs)
        setCategorias(cats)
        setRelatoriosSalvos(rels)
        setTodosFluxos(fluxos)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingBase(false)
      }
    })()
  }, [])

  // Encontra recursivamente todos os subfluxos de um conjunto de fluxos
  const getRecursiveFluxoIds = useCallback((initialIds: string[]): string[] => {
    const visited = new Set<string>()
    const queue = [...initialIds]

    while (queue.length > 0) {
      const currentId = queue.shift()
      if (!currentId || visited.has(currentId)) continue
      visited.add(currentId)

      const fluxo = todosFluxos.find(f => f.id === currentId)
      if (fluxo && fluxo.flow_data && Array.isArray(fluxo.flow_data.nodes)) {
        fluxo.flow_data.nodes.forEach((node: any) => {
          if (node.type === 'subflow' && node.data?.subflowId) {
            const subId = node.data.subflowId
            if (!visited.has(subId)) {
              queue.push(subId)
            }
          }
        })
      }
    }

    return Array.from(visited)
  }, [todosFluxos])

  // ── Carrega perguntas de todos os fluxos das pesquisas ──────────────────────
  useEffect(() => {
    if (todasPesquisas.length === 0) {
      setPerguntas([])
      return
    }

    const mainFluxoIds = [...new Set(todasPesquisas.map(p => p.fluxo_id).filter(Boolean) as string[])]
    const fluxoIds = getRecursiveFluxoIds(mainFluxoIds)

    if (fluxoIds.length === 0) {
      setPerguntas([])
      return
    }

    dbService.getPerguntasByFluxos(fluxoIds).then(setPerguntas).catch(console.error)
  }, [todasPesquisas, getRecursiveFluxoIds])

  // ── Carrega respostas automaticamente de todas as pesquisas ──────────────────
  useEffect(() => {
    let active = true
    const carregarRespostas = async () => {
      if (todasPesquisas.length === 0) {
        setRespostasBrutas([])
        return
      }

      const idsAlvo = todasPesquisas.map(p => p.id)

      setLoadingRespostas(true)
      try {
        const { respostas } = await dbService.getRelatoriosGlobais(idsAlvo)
        if (active) {
          setRespostasBrutas(respostas)
          setHasSearched(true)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) {
          setLoadingRespostas(false)
        }
      }
    }

    carregarRespostas()
    return () => {
      active = false
    }
  }, [todasPesquisas])

  // ── Categorias com perguntas nas pesquisas selecionadas ───────────────────
  const categoriasDisponiveis = useMemo(() => {
    const catIds = new Set(perguntas.map(p => p.categoria_id).filter(Boolean) as string[])
    return categorias.filter(c => catIds.has(c.id))
  }, [categorias, perguntas])

  // ── Sugestões disponíveis para autocomplete ────────────────────────────────
  const sugestoesDisponiveis = useMemo(() => {
    const termos = new Set<string>()

    // 1. Opções das perguntas de múltipla escolha
    perguntas.forEach(p => {
      if (p.tipo === 'multipla' && p.config?.opcoes) {
        p.config.opcoes.forEach(o => {
          if (o.texto?.trim()) {
            termos.add(o.texto.trim())
          }
        })
      }
    })

    // 2. Valores das respostas cadastradas
    respostasBrutas.forEach(r => {
      perguntas.forEach(p => {
        const val = r.valores[p.id]
        if (!val) return
        if (p.tipo === 'multipla') {
          const opcoes = p.config?.opcoes || []
          const arr = Array.isArray(val) ? val : [val]
          arr.forEach((v: string) => {
            const texto = opcoes.find(o => o.id === v)?.texto || v
            if (typeof texto === 'string' && texto.trim()) {
              termos.add(texto.trim())
            }
          })
        } else if (typeof val === 'string' && val.trim()) {
          termos.add(val.trim())
        }
      })
    })

    return Array.from(termos).sort((a, b) => a.localeCompare(b))
  }, [perguntas, respostasBrutas])

  // ── Resultado Filtrado em tempo real ───────────────────────────────────────
  const resultadoFiltrado = useMemo(() => {
    let filtradas = respostasBrutas

    // Filtrar por tags
    if (tagsFiltro.length > 0) {
      filtradas = filtradas.filter(resp => {
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
              }
            })
          } else if (typeof val === 'string') {
            valoresAmigaveis.add(val.trim().toLowerCase())
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
  }, [respostasBrutas, tagsFiltro, logicaFiltro, perguntas])

  // ── Buscar resultados (força recarga do banco) ─────────────────────────────
  const handleBuscar = useCallback(async () => {
    const idsAlvo = todasPesquisas.map(p => p.id)

    if (idsAlvo.length === 0) {
      setRespostasBrutas([])
      setHasSearched(true)
      return
    }

    setLoadingRespostas(true)
    try {
      const { respostas } = await dbService.getRelatoriosGlobais(idsAlvo)
      setRespostasBrutas(respostas)
      setHasSearched(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingRespostas(false)
    }
  }, [todasPesquisas])

  // ── Salvar relatório ───────────────────────────────────────────────────────
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeRelatorio.trim()) return
    setSaving(true)
    try {
      const filtros: FiltrosRelatorio = {
        objetoIds: [],
        pesquisaIds: [],
        liderIds: [],
        categoriasFiltros: [],
        tags: tagsFiltro
      }
      await dbService.saveRelatorioSalvo({
        id: editandoRelId,
        nome: nomeRelatorio.trim(),
        descricao: descRelatorio.trim() || null,
        filtros
      })
      const rels = await dbService.getRelatoriosSalvos()
      setRelatoriosSalvos(rels)
      setModalSalvar(false)
      setNomeRelatorio('')
      setDescRelatorio('')
      setEditandoRelId(undefined)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const abrirModalSalvar = (rel?: RelatorioSalvo) => {
    if (rel) {
      setEditandoRelId(rel.id)
      setNomeRelatorio(rel.nome)
      setDescRelatorio(rel.descricao || '')
    } else {
      setEditandoRelId(undefined)
      setNomeRelatorio('')
      if (tagsFiltro.length > 0) {
        const conexao = logicaFiltro === 'AND' ? ' E ' : ' OU '
        setDescRelatorio(`Filtros: ${tagsFiltro.join(conexao)}`)
      } else {
        setDescRelatorio('')
      }
    }
    setModalSalvar(true)
  }

  // ── Carregar relatório salvo ───────────────────────────────────────────────
  const carregarRelatorio = (rel: RelatorioSalvo) => {
    const f = rel.filtros
    
    // Suporte a tags e compatibilidade legada
    let tagsCarregadas: string[] = []
    if (Array.isArray(f.tags)) {
      tagsCarregadas = [...f.tags]
    } else if (Array.isArray(f.categoriasFiltros)) {
      // Converte valores selecionados das categorias antigas em tags
      f.categoriasFiltros.forEach(cf => {
        if (Array.isArray(cf.valoresSelecionados)) {
          cf.valoresSelecionados.forEach(v => {
            if (v && !tagsCarregadas.includes(v)) {
              tagsCarregadas.push(v)
            }
          })
        }
      })
    }
    
    setTagsFiltro(tagsCarregadas)
    setShowSalvos(false)
  }

  const handleDeleteRelatorio = async (id: string) => {
    if (!confirm('Excluir este relatório salvo?')) return
    await dbService.deleteRelatorioSalvo(id)
    setRelatoriosSalvos(prev => prev.filter(r => r.id !== id))
  }

  // ── Exportar Excel ─────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!resultadoFiltrado || resultadoFiltrado.length === 0) return
    const rows = resultadoFiltrado.map(r => {
      const row: Record<string, any> = {
        'Pesquisa': r.pesquisa_titulo,
        'Objeto': r.objeto_nome || '-',
        'Líder': r.lider_nome || '-',
        'Data': new Date(r.created_at).toLocaleString('pt-BR')
      }
      perguntas.forEach(p => {
        const val = r.valores[p.id]
        if (val === undefined) { row[p.titulo] = '-'; return }
        if (p.tipo === 'multipla') {
          const sels = Array.isArray(val) ? val : [val]
          const textos = sels.map((id: string) => p.config?.opcoes?.find(o => o.id === id)?.texto || id)
          row[p.titulo] = textos.join(', ')
        } else {
          row[p.titulo] = val
        }
      })
      return row
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
    XLSX.writeFile(wb, `relatorio_${Date.now()}.xlsx`)
  }

  // ── Gráfico por categoria ──────────────────────────────────────────────────
  const getGraficoCat = (catId: string) => {
    if (!resultadoFiltrado) return []
    const pergsDestaCategoria = perguntas.filter(p => p.categoria_id === catId && p.tipo === 'multipla')
    const contagem: Record<string, { nome: string; quantidade: number }> = {}
    pergsDestaCategoria.forEach(p => {
      p.config?.opcoes?.forEach(o => {
        if (!contagem[o.id]) contagem[o.id] = { nome: o.texto, quantidade: 0 }
      })
    })
    resultadoFiltrado.forEach(resp => {
      pergsDestaCategoria.forEach(p => {
        const val = resp.valores[p.id]
        if (!val) return
        const arr = Array.isArray(val) ? val : [val]
        arr.forEach((id: string) => {
          if (contagem[id]) contagem[id].quantidade += 1
        })
      })
    })
    return Object.values(contagem).filter(v => v.quantidade > 0)
  }

  // ──────────────────────────────────────────────────────────────────────────
  if (loadingBase) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in text-foreground max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Monte filtros avançados e salve para fácil acesso.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Relatórios Salvos */}
          <div className="relative">
            <button
              onClick={() => setShowSalvos(o => !o)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all shadow-sm cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              Salvos
              {relatoriosSalvos.length > 0 && (
                <span className="ml-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5">
                  {relatoriosSalvos.length}
                </span>
              )}
            </button>

            {showSalvos && (
              <div className="absolute right-0 top-full mt-2 z-40 w-72 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-in">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">Relatórios Salvos</p>
                  <button onClick={() => setShowSalvos(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {relatoriosSalvos.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center italic">Nenhum relatório salvo</p>
                  ) : (
                    relatoriosSalvos.map(rel => (
                      <div key={rel.id} className="group flex items-center gap-2 px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0">
                        <button
                          onClick={() => carregarRelatorio(rel)}
                          className="flex-1 text-left min-w-0"
                        >
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{rel.nome}</p>
                          {rel.descricao && <p className="text-xs text-muted-foreground truncate mt-0.5">{rel.descricao}</p>}
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(rel.created_at!).toLocaleDateString('pt-BR')}</p>
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => abrirModalSalvar(rel)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"><Pencil className="h-3 w-3" /></button>
                          <button onClick={() => handleDeleteRelatorio(rel.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Atualizar Dados */}
          <button
            onClick={handleBuscar}
            disabled={loadingRespostas}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all shadow-sm cursor-pointer disabled:opacity-60"
          >
            {loadingRespostas ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            )}
            Atualizar
          </button>

          {/* Salvar Atual */}
          <button
            onClick={() => abrirModalSalvar()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            Salvar Relatório
          </button>
        </div>
      </div>

      {/* ── Área de Resultados ── */}
      <div className="space-y-6">
          {respostasBrutas.length === 0 && loadingRespostas && !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-border bg-card/30 text-center gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-muted-foreground font-medium">Buscando respostas no banco...</p>
            </div>
          ) : respostasBrutas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-border bg-card/30 text-center gap-4 animate-fade-in">
              <BarChart2 className="h-14 w-14 text-muted-foreground/30" />
              <div>
                <h3 className="font-bold text-muted-foreground">Nenhuma resposta cadastrada</h3>
                <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs mx-auto">
                  Não existem respostas registradas no banco para as pesquisas selecionadas no escopo.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Barra de Busca Dinâmica por Tags (Autocomplete) */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm text-foreground">Filtro por Tags / Termos</h3>
                  </div>
                  {/* Seletor de Lógica */}
                  <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg border border-border self-start sm:self-auto">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">Lógica:</span>
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

                {/* Container do Input de Tags */}
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
                      placeholder={tagsFiltro.length === 0 ? "Digite termos ou escolha sugestões..." : "Adicionar tag..."}
                      className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground focus:ring-0 placeholder-muted-foreground min-w-[150px] py-1"
                    />
                  </div>

                  {/* Dropdown de Sugestões */}
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
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${idx === focusedIndex ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'}`}
                            >
                              <span>{sug}</span>
                              <span className="text-[10px] text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded font-mono">Click / Enter</span>
                            </button>
                          ))}
                        </div>
                      )
                    })()
                  )}
                </div>
              </div>

              {/* Cabeçalho resultados */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{resultadoFiltrado.length}</p>
                  <p className="text-xs text-muted-foreground font-medium">respostas encontradas</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMapaModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-all shadow-sm cursor-pointer"
                  >
                    <Map className="h-4 w-4 text-primary" />
                    Ver Mapa Territorial
                  </button>
                  {resultadoFiltrado.length > 0 && (
                    <button
                      onClick={handleExportExcel}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:opacity-90 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Exportar Excel
                    </button>
                  )}
                </div>
              </div>

              {resultadoFiltrado.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card/30">
                  <BarChart2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="font-semibold text-muted-foreground">Nenhuma resposta para os filtros aplicados</p>
                </div>
              ) : (
                <>


                  {/* Gráficos por categoria ativa */}
                  {categoriasDisponiveis.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {categoriasDisponiveis.map(cat => {
                        const dados = getGraficoCat(cat.id)
                        if (dados.length === 0) return null
                        return (
                          <div key={cat.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-2">
                              <Tag className="h-3.5 w-3.5 text-primary" />
                              <p className="text-xs font-bold text-primary uppercase tracking-wider">{cat.nome}</p>
                            </div>
                            <div className="h-52">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dados} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
                                  <XAxis dataKey="nome" stroke="#71717a" fontSize={10} />
                                  <YAxis stroke="#71717a" fontSize={10} allowDecimals={false} />
                                  <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', color: 'hsl(var(--foreground))' }}
                                    labelStyle={{ fontWeight: 'bold' }}
                                  />
                                  <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                                    {dados.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Tabela */}
                  <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
                    <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <h3 className="font-bold text-sm text-foreground">Respostas Individuais</h3>
                    </div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 sticky top-0">
                            <th className="p-3 pl-5 whitespace-nowrap">Data</th>
                            <th className="p-3 whitespace-nowrap">Pesquisa</th>
                            <th className="p-3 whitespace-nowrap">Objeto</th>
                            <th className="p-3 whitespace-nowrap">Líder</th>
                            {categoriasDisponiveis.map(cat => (
                              <th key={cat.id} className="p-3 whitespace-nowrap text-primary">{cat.nome}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {resultadoFiltrado.map(r => (
                            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3 pl-5 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(r.created_at).toLocaleString('pt-BR')}
                              </td>
                              <td className="p-3 text-xs font-semibold text-foreground max-w-[180px] truncate">{r.pesquisa_titulo}</td>
                              <td className="p-3 text-xs text-muted-foreground">{r.objeto_nome || '-'}</td>
                              <td className="p-3 text-xs text-muted-foreground">{r.lider_nome || '-'}</td>
                              {categoriasDisponiveis.map(cat => {
                                const pergsDestaCategoria = perguntas.filter(p => p.categoria_id === cat.id)
                                const valores: string[] = []
                                pergsDestaCategoria.forEach(p => {
                                  const val = r.valores[p.id]
                                  if (!val) return
                                  const arr = Array.isArray(val) ? val : [val]
                                  arr.forEach((id: string) => {
                                    const texto = p.config?.opcoes?.find(o => o.id === id)?.texto || val
                                    if (!valores.includes(texto)) valores.push(texto)
                                  })
                                })
                                return (
                                  <td key={cat.id} className="p-3">
                                    {valores.length === 0
                                      ? <span className="text-muted-foreground/50 text-xs">-</span>
                                      : (
                                        <div className="flex flex-wrap gap-1">
                                          {valores.map((v, i) => (
                                            <span key={i} className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded-full font-bold">{v}</span>
                                          ))}
                                        </div>
                                      )
                                    }
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

      {/* ── Modal Mapa Territorial ── */}
      {showMapaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowMapaModal(false)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Distribuição Territorial</h3>
              </div>
              <button
                onClick={() => setShowMapaModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <MapaBrasil respostas={resultadoFiltrado} perguntas={perguntas} />
          </div>
        </div>
      )}

      {/* ── Modal Salvar Relatório ── */}
      {modalSalvar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Save className="h-4 w-4 text-primary" />
                {editandoRelId ? 'Renomear Relatório' : 'Salvar Relatório'}
              </h3>
              <button onClick={() => setModalSalvar(false)} className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Nome do Relatório *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nomeRelatorio}
                  onChange={e => setNomeRelatorio(e.target.value)}
                  placeholder="Ex: Pesquisa Centro — Mulheres 25-40"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={descRelatorio}
                  onChange={e => setDescRelatorio(e.target.value)}
                  placeholder="Breve descrição dos filtros aplicados..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button type="button" onClick={() => setModalSalvar(false)} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-all cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 rounded-xl shadow-lg shadow-primary/10 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2">
                  {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Salvando...</> : <><Check className="h-3.5 w-3.5" />Salvar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
