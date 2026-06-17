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

function normalizarTexto(txt: string): string {
  return txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

interface Props {
  respostas: any[]
  perguntas: Pergunta[]
  titulo?: string
  onEscopoChange?: (escopo: 'brasil' | string) => void
}

export const MapaBrasil: React.FC<Props> = ({ respostas, perguntas, titulo, onEscopoChange }) => {
  const [escopo, setEscopo] = useState<'brasil' | string>('brasil')
  const [geoData, setGeoData] = useState<any>(null)
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [geoCache, setGeoCache] = useState<Record<string, any>>({})
  const [tooltip, setTooltip] = useState<{ nome: string; total: number; x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)

  // Dispara evento de escopo para o componente pai
  useEffect(() => {
    if (onEscopoChange) {
      onEscopoChange(escopo)
    }
  }, [escopo, onEscopoChange])

  // Busca o GeoJSON do escopo atual
  useEffect(() => {
    if (geoCache[escopo]) {
      setGeoData(geoCache[escopo])
      return
    }

    setLoadingGeo(true)
    const url = escopo === 'brasil'
      ? GEO_URL
      : `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${escopo}/municipios?formato=application/vnd.geo+json&qualidade=1`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setGeoCache(prev => ({ ...prev, [escopo]: data }))
        setGeoData(data)
      })
      .catch(err => {
        console.error("Erro ao obter malha do IBGE:", err)
      })
      .finally(() => setLoadingGeo(false))
  }, [escopo, geoCache])

  // Calcula centro e escala dinamicamente a partir das coordenadas do GeoJSON
  const projectionParams = useMemo(() => {
    if (!geoData || !geoData.features || geoData.features.length === 0) {
      return { center: [-52, -15] as [number, number], scale: 700 }
    }

    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90
    let hasCoords = false

    const processCoords = (coords: any) => {
      if (typeof coords[0] === 'number') {
        const [lng, lat] = coords
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
        hasCoords = true
      } else {
        coords.forEach(processCoords)
      }
    }

    geoData.features.forEach((f: any) => {
      if (f.geometry && f.geometry.coordinates) {
        processCoords(f.geometry.coordinates)
      }
    })

    if (!hasCoords) {
      return { center: [-52, -15] as [number, number], scale: 700 }
    }

    const centerLng = (minLng + maxLng) / 2
    const centerLat = (minLat + maxLat) / 2
    const dLng = maxLng - minLng
    const dLat = maxLat - minLat
    const maxSpan = Math.max(dLng, dLat, 0.1)

    // Ajusta a escala baseada no tamanho do bounding box
    const scaleFactor = escopo === 'brasil' ? 700 : 700 * (38 / maxSpan) * 0.82
    const finalScale = Math.min(Math.max(scaleFactor, 500), 20000)

    return {
      center: [centerLng, centerLat] as [number, number],
      scale: finalScale
    }
  }, [geoData, escopo])

  // Conta respostas por estado ou por cidade
  const contagem = useMemo(() => {
    const map: Record<string, number> = {}

    if (escopo === 'brasil') {
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
    } else {
      const perguntasCidade = perguntas.filter(p => p.tipo === 'cidade')
      const perguntasEstado = perguntas.filter(p => p.tipo === 'estado')
      if (perguntasCidade.length === 0) return map

      respostas.forEach(resp => {
        // Verifica se a resposta é deste estado
        let pertenceAoEstado = true
        if (perguntasEstado.length > 0) {
          pertenceAoEstado = perguntasEstado.some(p => {
            const valUF = resp.valores?.[p.id]
            if (!valUF) return false
            return normalizarEstado(String(valUF)) === escopo
          })
        }

        if (pertenceAoEstado) {
          perguntasCidade.forEach(p => {
            const val = resp.valores?.[p.id]
            if (!val) return
            const cidadeNome = normalizarTexto(String(val))
            if (cidadeNome) {
              map[cidadeNome] = (map[cidadeNome] || 0) + 1
            }
          })
        }
      })
    }
    return map
  }, [respostas, perguntas, escopo])

  const maxVal = Math.max(1, ...Object.values(contagem))

  const colorScale = scaleLinear<string>()
    .domain([0, maxVal])
    .range(['#1e1b4b', '#8b5cf6'])

  return (
    <div className="relative w-full space-y-4">
      {/* Controles de Escopo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {titulo && (
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            {titulo}
          </h3>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Visualizar:</span>
          <select
            value={escopo}
            onChange={(e) => {
              setEscopo(e.target.value)
              setZoom(1)
            }}
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
          >
            <option value="brasil">Brasil (Estados)</option>
            {Object.entries(SIGLA_NOME).sort((a, b) => a[1].localeCompare(b[1])).map(([sigla, nome]) => (
              <option key={sigla} value={sigla}>{nome}</option>
            ))}
          </select>
          {escopo !== 'brasil' && (
            <button
              onClick={() => {
                setEscopo('brasil')
                setZoom(1)
              }}
              className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs text-foreground font-medium transition-colors cursor-pointer"
            >
              ← Voltar
            </button>
          )}
        </div>
      </div>

      <div className="relative border border-border rounded-2xl overflow-hidden bg-card/30 min-h-[300px] flex items-center justify-center">
        {loadingGeo && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-20 flex items-center justify-center text-sm text-muted-foreground font-semibold">
            Carregando mapa...
          </div>
        )}

        {!geoData && !loadingGeo ? (
          <div className="text-muted-foreground text-sm py-16">
            Erro ao carregar dados do mapa.
          </div>
        ) : (
          geoData && (
            <>
              {/* Controles de zoom */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
                <button
                  onClick={() => setZoom(z => Math.min(z + 0.5, 6))}
                  className="w-7 h-7 rounded-lg bg-card border border-border text-foreground text-sm font-bold hover:bg-muted transition-colors cursor-pointer"
                >+</button>
                <button
                  onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
                  className="w-7 h-7 rounded-lg bg-card border border-border text-foreground text-sm font-bold hover:bg-muted transition-colors cursor-pointer"
                >−</button>
                <button
                  onClick={() => setZoom(1)}
                  className="w-7 h-7 rounded-lg bg-card border border-border text-muted-foreground text-xs hover:bg-muted transition-colors cursor-pointer"
                  title="Reset zoom"
                >⊙</button>
              </div>

              <ComposableMap
                key={escopo}
                projection="geoMercator"
                projectionConfig={{
                  scale: projectionParams.scale,
                  center: projectionParams.center
                }}
                style={{ width: '100%', height: 'auto', maxHeight: '500px' }}
                viewBox="0 0 800 600"
              >
                <ZoomableGroup zoom={zoom} center={projectionParams.center}>
                  <Geographies geography={geoData}>
                    {({ geographies }) =>
                      geographies.map(geo => {
                        const sigla: string = geo.properties.sigla || geo.properties.UF_05 || ''
                        const nome: string = geo.properties.name || geo.properties.NM_MUN || geo.properties.NM_MUNICIPIO || geo.properties.NM_MUN_2022 || sigla
                        
                        const key = escopo === 'brasil' ? sigla.toUpperCase() : normalizarTexto(nome)
                        const total = contagem[key] || 0
                        const fill = total > 0 ? colorScale(total) : 'var(--color-muted)'

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fill}
                            stroke="var(--color-border)"
                            strokeWidth={escopo === 'brasil' ? 0.6 : 0.3}
                            style={{
                              default: { outline: 'none', transition: 'fill 0.2s' },
                              hover: { fill: '#a78bfa', outline: 'none', cursor: 'pointer' },
                              pressed: { outline: 'none' }
                            }}
                            onClick={() => {
                              if (escopo === 'brasil' && sigla) {
                                setEscopo(sigla.toUpperCase())
                                setZoom(1)
                              }
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
            </>
          )
        )}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
