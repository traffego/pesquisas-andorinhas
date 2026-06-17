import React, { useState, useEffect, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { scaleLinear } from 'd3-scale'
import type { Pergunta } from '../services/db'

const GEO_URL =
  'https://raw.githubusercontent.com/giuliano-macedo/geodata-br-states/main/geojson/br_states.json'

// Mapeamento sigla → nome completo e vice-versa
const SIGLA_NOME: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso', PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco',
  PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina',
  SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins'
}
const NOME_SIGLA: Record<string, string> = Object.fromEntries(
  Object.entries(SIGLA_NOME).map(([k, v]) => [v.toLowerCase(), k])
)

function normalizarEstado(val: string): string | null {
  const v = val.trim().toUpperCase()
  if (SIGLA_NOME[v]) return v
  const porNome = NOME_SIGLA[val.trim().toLowerCase()]
  if (porNome) return porNome
  return null
}

interface Props {
  respostas: any[]
  perguntas: Pergunta[]
  titulo?: string
}

export const MapaBrasil: React.FC<Props> = ({ respostas, perguntas, titulo }) => {
  const [geoData, setGeoData] = useState<any>(null)
  const [tooltip, setTooltip] = useState<{ nome: string; total: number; x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    fetch(GEO_URL)
      .then(r => r.json())
      .then(setGeoData)
      .catch(console.error)
  }, [])

  // Conta respostas por sigla de estado
  const contagem = useMemo(() => {
    const map: Record<string, number> = {}
    const perguntasEstado = perguntas.filter(p => p.tipo === 'estado')
    if (perguntasEstado.length === 0) return map

    respostas.forEach(resp => {
      perguntasEstado.forEach(p => {
        const val = resp.valores?.[p.id]
        if (!val) return
        const sigla = normalizarEstado(String(val))
        if (sigla) map[sigla] = (map[sigla] || 0) + 1
      })
    })
    return map
  }, [respostas, perguntas])

  const maxVal = Math.max(1, ...Object.values(contagem))

  const colorScale = scaleLinear<string>()
    .domain([0, maxVal])
    .range(['#1e1b4b', '#8b5cf6'])

  if (!geoData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando mapa...
      </div>
    )
  }

  const temDados = Object.keys(contagem).length > 0

  return (
    <div className="relative w-full">
      {titulo && (
        <h3 className="text-base font-semibold text-foreground mb-3">{titulo}</h3>
      )}

      {!temDados && (
        <p className="text-center text-sm text-muted-foreground mb-2">
          Nenhuma resposta com campo de estado encontrada.
        </p>
      )}

      <div className="relative border border-border rounded-xl overflow-hidden bg-card/30">
        {/* Controles de zoom */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.5, 6))}
            className="w-7 h-7 rounded-lg bg-card border border-border text-foreground text-sm font-bold hover:bg-muted transition-colors"
          >+</button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
            className="w-7 h-7 rounded-lg bg-card border border-border text-foreground text-sm font-bold hover:bg-muted transition-colors"
          >−</button>
          <button
            onClick={() => setZoom(1)}
            className="w-7 h-7 rounded-lg bg-card border border-border text-muted-foreground text-xs hover:bg-muted transition-colors"
            title="Reset zoom"
          >⊙</button>
        </div>

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 700, center: [-52, -15] }}
          style={{ width: '100%', height: 'auto' }}
          viewBox="0 0 800 600"
        >
          <ZoomableGroup zoom={zoom} center={[-52, -15]}>
            <Geographies geography={geoData}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const sigla: string = geo.properties.sigla || geo.properties.UF_05 || ''
                  const nome: string = geo.properties.name || geo.properties.NM_ESTADO || sigla
                  const total = contagem[sigla.toUpperCase()] || 0
                  const fill = total > 0 ? colorScale(total) : 'var(--color-muted)'

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="var(--color-border)"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none', transition: 'fill 0.2s' },
                        hover: { fill: '#a78bfa', outline: 'none', cursor: 'pointer' },
                        pressed: { outline: 'none' }
                      }}
                      onMouseEnter={e => {
                        setTooltip({ nome, total, x: e.clientX, y: e.clientY })
                      }}
                      onMouseMove={e => {
                        setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Legenda */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>Menos</span>
        <div className="flex-1 h-2 rounded-full" style={{
          background: `linear-gradient(to right, #1e1b4b, #8b5cf6)`
        }} />
        <span>Mais</span>
        <span className="ml-2">({maxVal} máx.)</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 rounded-lg bg-card border border-border shadow-xl text-sm pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <p className="font-semibold text-foreground">{tooltip.nome}</p>
          <p className="text-muted-foreground">{tooltip.total} resposta{tooltip.total !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}
