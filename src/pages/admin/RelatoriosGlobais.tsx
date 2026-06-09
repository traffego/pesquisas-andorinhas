import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  dbService,
  type Objeto,
  type Pesquisa,
  type Lider,
  type Pergunta,
  type CategoriaCampo,
  type FiltrosRelatorio,
  type RelatorioSalvo
} from '../../services/db'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  BarChart2, FileSpreadsheet, Filter, Plus, X, Save, BookOpen,
  Trash2, ChevronDown, ChevronUp, Check, Loader2, Tag, Users2,
  FolderGit2, ClipboardList, RefreshCw, Pencil
} from 'lucide-react'

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f97316']

// ─── Tipos internos ────────────────────────────────────────────────────────────
interface CatFiltroAtivo {
  categoriaId: string
  categoriaNome: string
  valoresSelecionados: string[]
}

// ─── Componente MultiSelect ────────────────────────────────────────────────────
interface MultiSelectProps {
  label: string
  icon: React.ReactNode
  items: { id: string; label: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, icon, items, selected, onChange }) => {
  const [open, setOpen] = useState(false)
  const allSelected = selected.length === 0

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      const next = selected.filter(s => s !== id)
      onChange(next)
    } else {
      onChange([...selected, id])
    }
  }

  const displayLabel = allSelected
    ? 'Todos'
    : selected.length === 1
      ? items.find(i => i.id === selected[0])?.label || '1 selecionado'
      : `${selected.length} selecionados`

  return (
    <div className="relative">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {icon}{label}
      </p>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/50 transition-colors"
      >
        <span className={allSelected ? 'text-muted-foreground' : 'font-semibold'}>{displayLabel}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {/* Opção "Todos" */}
            <button
              type="button"
              onClick={() => { onChange([]); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left ${allSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'}`}
            >
              {allSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
              {!allSelected && <span className="w-3.5" />}
              Todos
            </button>
            {items.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground italic">Nenhum item disponível</p>
            )}
            {items.map(item => {
              const isSelected = selected.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'}`}
                >
                  {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span className="w-3.5" />}
                  {item.label}
                </button>
              )
            })}
          </div>
          {items.length > 0 && (
            <div className="border-t border-border px-3 py-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-primary hover:opacity-80 transition-opacity"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export const RelatoriosGlobais: React.FC = () => {
  // Dados base
  const [objetos, setObjetos] = useState<Objeto[]>([])
  const [todasPesquisas, setTodasPesquisas] = useState<Pesquisa[]>([])
  const [lideres, setLideres] = useState<Lider[]>([])
  const [categorias, setCategorias] = useState<CategoriaCampo[]>([])
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [relatoriosSalvos, setRelatoriosSalvos] = useState<RelatorioSalvo[]>([])
  const [loadingBase, setLoadingBase] = useState(true)

  // Filtros ativos
  const [objetoIds, setObjetoIds] = useState<string[]>([])
  const [pesquisaIds, setPesquisaIds] = useState<string[]>([])
  const [liderIds, setLiderIds] = useState<string[]>([])
  const [categsFiltros, setCategsFiltros] = useState<CatFiltroAtivo[]>([])

  // Resultados
  const [resultado, setResultado] = useState<any[] | null>(null)
  const [loadingResult, setLoadingResult] = useState(false)

  // UI
  const [showSalvos, setShowSalvos] = useState(false)
  const [modalSalvar, setModalSalvar] = useState(false)
  const [nomeRelatorio, setNomeRelatorio] = useState('')
  const [descRelatorio, setDescRelatorio] = useState('')
  const [editandoRelId, setEditandoRelId] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      setLoadingBase(true)
      try {
        const [objs, pesqs, lids, cats, rels] = await Promise.all([
          dbService.getObjetos(),
          dbService.getPesquisas(),
          dbService.getLideres(),
          dbService.getCategorias(),
          dbService.getRelatoriosSalvos()
        ])
        setObjetos(objs)
        setTodasPesquisas(pesqs)
        setLideres(lids)
        setCategorias(cats)
        setRelatoriosSalvos(rels)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingBase(false)
      }
    })()
  }, [])

  // ── Pesquisas filtradas por objeto ─────────────────────────────────────────
  const pesquisasFiltradas = useMemo(() => {
    if (objetoIds.length === 0) return todasPesquisas
    return todasPesquisas.filter(p => p.objeto_id && objetoIds.includes(p.objeto_id))
  }, [todasPesquisas, objetoIds])

  // Quando objeto muda, limpa pesquisas que ficaram fora do escopo
  useEffect(() => {
    const validIds = pesquisasFiltradas.map(p => p.id)
    setPesquisaIds(prev => prev.filter(id => validIds.includes(id)))
  }, [pesquisasFiltradas])

  // ── Carrega perguntas quando pesquisas mudam ────────────────────────────────
  useEffect(() => {
    const idsAlvo = pesquisaIds.length > 0
      ? pesquisasFiltradas.filter(p => pesquisaIds.includes(p.id))
      : pesquisasFiltradas

    const fluxoIds = [...new Set(idsAlvo.map(p => p.fluxo_id).filter(Boolean) as string[])]

    if (fluxoIds.length === 0) {
      setPerguntas([])
      return
    }

    dbService.getPerguntasByFluxos(fluxoIds).then(setPerguntas).catch(console.error)
  }, [pesquisaIds, pesquisasFiltradas])

  // ── Valores disponíveis por categoria ─────────────────────────────────────
  const valoresPorCategoria = useMemo(() => {
    const map: Record<string, { id: string; texto: string }[]> = {}
    perguntas.forEach(p => {
      const catId = p.categoria_id
      if (!catId) return
      if (p.tipo === 'multipla' && p.config?.opcoes) {
        if (!map[catId]) map[catId] = []
        p.config.opcoes.forEach(o => {
          if (!map[catId].find((x: { id: string; texto: string }) => x.id === o.id)) {
            map[catId].push(o)
          }
        })
      }
    })
    return map
  }, [perguntas])

  // ── Categorias com perguntas nas pesquisas selecionadas ───────────────────
  const categoriasDisponiveis = useMemo(() => {
    const catIds = new Set(perguntas.map(p => p.categoria_id).filter(Boolean) as string[])
    return categorias.filter(c => catIds.has(c.id))
  }, [categorias, perguntas])

  // ── Adicionar categoria como filtro ───────────────────────────────────────
  const adicionarCatFiltro = (cat: CategoriaCampo) => {
    if (categsFiltros.find(c => c.categoriaId === cat.id)) return
    setCategsFiltros(prev => [...prev, {
      categoriaId: cat.id,
      categoriaNome: cat.nome,
      valoresSelecionados: []
    }])
  }

  const removerCatFiltro = (catId: string) => {
    setCategsFiltros(prev => prev.filter(c => c.categoriaId !== catId))
  }

  const setCatValores = (catId: string, valores: string[]) => {
    setCategsFiltros(prev => prev.map(c =>
      c.categoriaId === catId ? { ...c, valoresSelecionados: valores } : c
    ))
  }

  // ── Buscar resultados ──────────────────────────────────────────────────────
  const handleBuscar = useCallback(async () => {
    setLoadingResult(true)
    try {
      const idsAlvo = pesquisaIds.length > 0
        ? pesquisasFiltradas.filter(p => pesquisaIds.includes(p.id)).map(p => p.id)
        : pesquisasFiltradas.map(p => p.id)

      if (idsAlvo.length === 0) {
        setResultado([])
        return
      }

      const { respostas } = await dbService.getRelatoriosGlobais(idsAlvo)

      // Aplicar filtro de líder
      let filtradas = liderIds.length === 0
        ? respostas
        : respostas.filter(r => {
            const pesq = todasPesquisas.find(p => p.id === r.pesquisa_id)
            return pesq?.lider_id && liderIds.includes(pesq.lider_id)
          })

      // Aplicar filtros de categoria
      categsFiltros.forEach(catFiltro => {
        if (catFiltro.valoresSelecionados.length === 0) return // todos → não filtra
        const pergsDestaCategoria = perguntas.filter(p => p.categoria_id === catFiltro.categoriaId)
        filtradas = filtradas.filter(resp => {
          return pergsDestaCategoria.some(perg => {
            const val = resp.valores[perg.id]
            if (!val) return false
            const arr = Array.isArray(val) ? val : [val]
            return arr.some((v: string) => catFiltro.valoresSelecionados.includes(v))
          })
        })
      })

      setResultado(filtradas)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingResult(false)
    }
  }, [pesquisaIds, pesquisasFiltradas, liderIds, categsFiltros, perguntas, todasPesquisas])

  // ── Salvar relatório ───────────────────────────────────────────────────────
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeRelatorio.trim()) return
    setSaving(true)
    try {
      const filtros: FiltrosRelatorio = {
        objetoIds,
        pesquisaIds,
        liderIds,
        categoriasFiltros: categsFiltros
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
      setDescRelatorio('')
    }
    setModalSalvar(true)
  }

  // ── Carregar relatório salvo ───────────────────────────────────────────────
  const carregarRelatorio = (rel: RelatorioSalvo) => {
    const f = rel.filtros
    setObjetoIds(f.objetoIds || [])
    setPesquisaIds(f.pesquisaIds || [])
    setLiderIds(f.liderIds || [])
    setCategsFiltros(f.categoriasFiltros || [])
    setShowSalvos(false)
    setResultado(null)
  }

  const handleDeleteRelatorio = async (id: string) => {
    if (!confirm('Excluir este relatório salvo?')) return
    await dbService.deleteRelatorioSalvo(id)
    setRelatoriosSalvos(prev => prev.filter(r => r.id !== id))
  }

  // ── Exportar Excel ─────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!resultado || resultado.length === 0) return
    const rows = resultado.map(r => {
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
  const getGraficoCat = (catFiltro: CatFiltroAtivo) => {
    if (!resultado) return []
    const pergsDestaCategoria = perguntas.filter(p => p.categoria_id === catFiltro.categoriaId && p.tipo === 'multipla')
    const contagem: Record<string, { nome: string; quantidade: number }> = {}
    pergsDestaCategoria.forEach(p => {
      p.config?.opcoes?.forEach(o => {
        if (!contagem[o.id]) contagem[o.id] = { nome: o.texto, quantidade: 0 }
      })
    })
    resultado.forEach(resp => {
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

  const categoriasNaoAdicionadas = categoriasDisponiveis.filter(
    c => !categsFiltros.find(cf => cf.categoriaId === c.id)
  )

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

      <div className="flex gap-6 items-start">
        {/* ── Sidebar de Filtros ── */}
        <aside className="w-72 shrink-0 space-y-5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5 sticky top-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Filtros</h2>
          </div>

          {/* Objeto */}
          <MultiSelect
            label="Objeto"
            icon={<FolderGit2 className="h-3 w-3" />}
            items={objetos.map(o => ({ id: o.id, label: `${o.tipo === 'projeto' ? '📁' : '📅'} ${o.nome}` }))}
            selected={objetoIds}
            onChange={setObjetoIds}
          />

          {/* Pesquisa */}
          <MultiSelect
            label="Pesquisa"
            icon={<ClipboardList className="h-3 w-3" />}
            items={pesquisasFiltradas.map(p => ({ id: p.id, label: p.titulo }))}
            selected={pesquisaIds}
            onChange={setPesquisaIds}
          />

          {/* Líder */}
          <MultiSelect
            label="Líder"
            icon={<Users2 className="h-3 w-3" />}
            items={lideres.map(l => ({ id: l.id, label: l.nome }))}
            selected={liderIds}
            onChange={setLiderIds}
          />

          {/* Separador */}
          <div className="border-t border-border/60" />

          {/* Filtros dinâmicos por categoria */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag className="h-3 w-3" />Filtros por Categoria
            </p>

            <div className="space-y-4">
              {categsFiltros.map(cf => {
                const opcoes = valoresPorCategoria[cf.categoriaId] || []
                return (
                  <div key={cf.categoriaId} className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary">{cf.categoriaNome}</p>
                      <button onClick={() => removerCatFiltro(cf.categoriaId)} className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {opcoes.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground italic">Sem valores disponíveis (selecione pesquisas)</p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                        {/* Todos */}
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={cf.valoresSelecionados.length === 0}
                            onChange={() => setCatValores(cf.categoriaId, [])}
                            className="rounded border-border text-primary bg-background focus:ring-primary focus:ring-offset-background h-3.5 w-3.5"
                          />
                          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Todos</span>
                        </label>
                        {opcoes.map(o => (
                          <label key={o.id} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={cf.valoresSelecionados.includes(o.id)}
                              onChange={() => {
                                const next = cf.valoresSelecionados.includes(o.id)
                                  ? cf.valoresSelecionados.filter(v => v !== o.id)
                                  : [...cf.valoresSelecionados, o.id]
                                setCatValores(cf.categoriaId, next)
                              }}
                              className="rounded border-border text-primary bg-background focus:ring-primary focus:ring-offset-background h-3.5 w-3.5"
                            />
                            <span className="text-xs text-foreground/80 group-hover:text-foreground transition-colors truncate">{o.texto}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Adicionar categoria */}
              {categoriasNaoAdicionadas.length > 0 && (
                <div className="relative group/add">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar Categoria
                  </button>
                  <div className="absolute z-20 bottom-full mb-1 left-0 right-0 hidden group-hover/add:block rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      {categoriasNaoAdicionadas.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => adicionarCatFiltro(cat)}
                          className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-muted hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <Tag className="h-3 w-3 text-primary/70" />
                          {cat.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {categoriasDisponiveis.length === 0 && (
                <p className="text-[10px] text-muted-foreground/60 italic text-center py-2">
                  Selecione pesquisas com campos categorizados
                </p>
              )}
            </div>
          </div>

          {/* Botão buscar */}
          <button
            onClick={handleBuscar}
            disabled={loadingResult}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
          >
            {loadingResult
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Buscando...</>
              : <><RefreshCw className="h-4 w-4" /> Aplicar Filtros</>
            }
          </button>
        </aside>

        {/* ── Área de Resultados ── */}
        <div className="flex-1 min-w-0 space-y-6">
          {resultado === null ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-border bg-card/30 text-center gap-4">
              <BarChart2 className="h-14 w-14 text-muted-foreground/30" />
              <div>
                <h3 className="font-bold text-muted-foreground">Configure os filtros e clique em Aplicar</h3>
                <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs mx-auto">
                  Use a barra lateral para selecionar objetos, pesquisas, líderes e categorias.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Cabeçalho resultados */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{resultado.length}</p>
                  <p className="text-xs text-muted-foreground font-medium">respostas encontradas</p>
                </div>
                {resultado.length > 0 && (
                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:opacity-90 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar Excel
                  </button>
                )}
              </div>

              {resultado.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card/30">
                  <BarChart2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="font-semibold text-muted-foreground">Nenhuma resposta para os filtros aplicados</p>
                </div>
              ) : (
                <>
                  {/* Gráficos por categoria ativa */}
                  {categsFiltros.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {categsFiltros.map(cf => {
                        const dados = getGraficoCat(cf)
                        if (dados.length === 0) return null
                        return (
                          <div key={cf.categoriaId} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-2">
                              <Tag className="h-3.5 w-3.5 text-primary" />
                              <p className="text-xs font-bold text-primary uppercase tracking-wider">{cf.categoriaNome}</p>
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
                  <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
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
                            {categsFiltros.map(cf => (
                              <th key={cf.categoriaId} className="p-3 whitespace-nowrap text-primary">{cf.categoriaNome}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {resultado.map(r => (
                            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3 pl-5 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(r.created_at).toLocaleString('pt-BR')}
                              </td>
                              <td className="p-3 text-xs font-semibold text-foreground max-w-[180px] truncate">{r.pesquisa_titulo}</td>
                              <td className="p-3 text-xs text-muted-foreground">{r.objeto_nome || '-'}</td>
                              <td className="p-3 text-xs text-muted-foreground">{r.lider_nome || '-'}</td>
                              {categsFiltros.map(cf => {
                                const pergsDestaCategoria = perguntas.filter(p => p.categoria_id === cf.categoriaId)
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
                                  <td key={cf.categoriaId} className="p-3">
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
      </div>

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
