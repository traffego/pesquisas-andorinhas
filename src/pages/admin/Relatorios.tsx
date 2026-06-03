import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { dbService, type Pesquisa, type Pergunta } from '../../services/db'
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
  ClipboardCheck, 
  Clock, 
  Sparkles,
  BarChart2
} from 'lucide-react'

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1']

export const Relatorios: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [relatorioData, setRelatorioData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

      const pergs = pesq.fluxo_id ? await dbService.getPerguntas(pesq.fluxo_id) : []
      setPerguntas(pergs)

      const data = await dbService.getRelatorios(pesquisaId)
      setRelatorioData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // --- PREPARA DADOS DOS GRÁFICOS ---
  const getGraficoDados = (pergunta: Pergunta) => {
    if (pergunta.tipo !== 'multipla' || !relatorioData) return []
    const opcoes = pergunta.config?.opcoes || []
    
    // Inicializa contagem
    const contagem: Record<string, { nome: string; quantidade: number }> = {}
    opcoes.forEach(o => {
      contagem[o.id] = { nome: o.texto, quantidade: 0 }
    })

    // Soma respostas
    relatorioData.respostas.forEach((resp: any) => {
      const valor = resp.valores[pergunta.id]
      if (Array.isArray(valueToArr(valor))) {
        valueToArr(valor).forEach((opcaoId: string) => {
          if (contagem[opcaoId]) {
            contagem[opcaoId].quantidade += 1
          }
        })
      }
    })

    return Object.values(contagem)
  }

  const valueToArr = (val: any): string[] => {
    if (!val) return []
    return Array.isArray(val) ? val : [val]
  }

  // --- EXPORTAR EXCEL ---
  const handleExportExcel = () => {
    if (!relatorioData || !pesquisa) return

    const rows = relatorioData.respostas.map((r: any) => {
      const rowData: Record<string, any> = {
        'ID da Resposta': r.id,
        'Data/Hora da Resposta': new Date(r.created_at).toLocaleString('pt-BR'),
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
    
    // Baixar arquivo
    XLSX.writeFile(workbook, `respostas_${pesquisa.token}.xlsx`)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  const totalRespostas = relatorioData?.totalRespostas || 0
  const perguntasMultipla = perguntas.filter(p => p.tipo === 'multipla')

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/pesquisas"
            className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Métricas & Relatórios</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{pesquisa?.titulo}</p>
          </div>
        </div>

        {totalRespostas > 0 && (
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:opacity-90 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all cursor-pointer self-start sm:self-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel (.xlsx)
          </button>
        )}
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total de Respostas */}
        <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total de Respostas</p>
            <p className="text-3xl font-extrabold text-foreground">{totalRespostas}</p>
          </div>
          <div className="rounded-xl p-3 bg-primary/10 text-primary border border-primary/20">
            <ClipboardCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Coleta Ativa */}
        <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status da Pesquisa</p>
            <p className="text-lg font-bold text-foreground mt-1">
              {pesquisa?.publicada ? (
                <span className="text-emerald-600 dark:text-emerald-400">Ativa e Pública</span>
              ) : (
                <span className="text-muted-foreground">Rascunho / Inativa</span>
              )}
            </p>
          </div>
          <div className="rounded-xl p-3 bg-muted border border-border text-muted-foreground">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Resposta Recente */}
        <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tempo de Coleta</p>
            <p className="text-lg font-bold text-foreground mt-1">
              {totalRespostas > 0 ? (
                <span className="text-primary font-semibold">~2 min / média</span>
              ) : (
                <span className="text-muted-foreground">Sem histórico</span>
              )}
            </p>
          </div>
          <div className="rounded-xl p-3 bg-muted border border-border text-muted-foreground">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {totalRespostas === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card/50">
          <BarChart2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4 animate-pulse" />
          <h3 className="font-bold text-muted-foreground text-lg">Sem dados de resposta</h3>
          <p className="text-muted-foreground/80 text-sm mt-1 max-w-sm mx-auto">
            Esta pesquisa ainda não possui respostas registradas no banco de dados. Compartilhe o link para começar a gerar métricas.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* GRÁFICOS */}
          {perguntasMultipla.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {perguntasMultipla.map((perg) => {
                const dados = getGraficoDados(perg)
                return (
                  <div key={perg.id} className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
                    <div className="flex gap-2 items-center text-xs font-bold text-primary uppercase tracking-wider">
                      <Sparkles className="h-4 w-4" />
                      <span>Análise Gráfica</span>
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

          {/* LISTAGEM COMPLETA DAS RESPOSTAS */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <h3 className="font-bold text-foreground text-lg">Respostas Individuais</h3>
            
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/40">
                    <th className="p-3 pl-4">Data / Hora</th>
                    {perguntas.map(p => (
                      <th key={p.id} className="p-3 truncate max-w-[200px]">{p.titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {relatorioData.respostas.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 pl-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('pt-BR')}
                      </td>
                      {perguntas.map(p => {
                        const val = r.valores[p.id]
                        if (val === undefined) {
                          return <td key={p.id} className="p-3 text-muted-foreground/60">-</td>
                        }
                        if (p.tipo === 'multipla') {
                          const opcoes = p.config?.opcoes || []
                          const selecionadas = Array.isArray(val) ? val : [val]
                          const textos = selecionadas.map(id => opcoes.find(o => o.id === id)?.texto || id)
                          return (
                            <td key={p.id} className="p-3 text-foreground">
                              <div className="flex flex-wrap gap-1">
                                {textos.map((txt, idx) => (
                                  <span key={idx} className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    {txt}
                                  </span>
                                ))}
                              </div>
                            </td>
                          )
                        }
                        return (
                          <td key={p.id} className="p-3 text-foreground truncate max-w-[250px]" title={val}>
                            {val}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
