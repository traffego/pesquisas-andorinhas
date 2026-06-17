import React, { useState, useEffect, useMemo } from 'react'
import { dbService, type Pergunta, type Pesquisa } from '../../services/db'
import { MapaBrasil } from '../../components/MapaBrasil'
import { Map, RefreshCw, Loader2 } from 'lucide-react'

export const Territorial: React.FC = () => {
  const [todasPesquisas, setTodasPesquisas] = useState<Pesquisa[]>([])
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [respostasBrutas, setRespostasBrutas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRespostas, setLoadingRespostas] = useState(false)

  // Carga inicial
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [pesqs] = await Promise.all([dbService.getPesquisas()])
        setTodasPesquisas(pesqs)

        // Carrega perguntas de todas as pesquisas
        const todasPergs: Pergunta[] = []
        await Promise.all(
          pesqs.map(async p => {
            const pergs = await dbService.getPerguntas(p.id)
            todasPergs.push(...pergs)
          })
        )
        setPerguntas(todasPergs)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Buscar respostas
  const carregarRespostas = async () => {
    const ids = todasPesquisas.map(p => p.id)
    if (ids.length === 0) return
    setLoadingRespostas(true)
    try {
      const { respostas } = await dbService.getRelatoriosGlobais(ids)
      setRespostasBrutas(respostas)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingRespostas(false)
    }
  }

  useEffect(() => {
    if (!loading && todasPesquisas.length > 0) carregarRespostas()
  }, [loading, todasPesquisas.length])

  // Agrupamento por estado para cards de resumo
  const resumo = useMemo(() => {
    const perguntasEstado = perguntas.filter(p => p.tipo === 'estado')
    if (perguntasEstado.length === 0) return []

    const map: Record<string, number> = {}
    respostasBrutas.forEach(resp => {
      perguntasEstado.forEach(p => {
        const val = resp.valores?.[p.id]
        if (val) map[String(val).trim()] = (map[String(val).trim()] || 0) + 1
      })
    })

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [respostasBrutas, perguntas])

  const temCampoEstado = perguntas.some(p => p.tipo === 'estado')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Map className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Distribuição Territorial</h1>
            <p className="text-sm text-muted-foreground">
              Visualize onde estão concentradas as respostas das pesquisas
            </p>
          </div>
        </div>
        <button
          onClick={carregarRespostas}
          disabled={loadingRespostas}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm text-foreground transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loadingRespostas
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !temCampoEstado ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <Map className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            Nenhuma pesquisa possui campo do tipo <strong>Estado</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Adicione um campo de estado nos seus fluxos para visualizar o mapa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Mapa */}
          <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-5">
            <MapaBrasil
              respostas={respostasBrutas}
              perguntas={perguntas}
              titulo="Respostas por Estado"
            />
          </div>

          {/* Ranking lateral */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Top Estados</h3>
            {resumo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <div className="space-y-3">
                {resumo.map(([estado, total], i) => {
                  const pct = Math.round((total / (resumo[0][1] || 1)) * 100)
                  return (
                    <div key={estado} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-5">
                            {i + 1}
                          </span>
                          <span className="font-medium text-foreground">{estado}</span>
                        </div>
                        <span className="text-muted-foreground">{total}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{respostasBrutas.length}</p>
                  <p className="text-xs text-muted-foreground">Total respostas</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{resumo.length}</p>
                  <p className="text-xs text-muted-foreground">Estados com dados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
