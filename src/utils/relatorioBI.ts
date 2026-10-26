import type { Pergunta } from '../services/db'

export interface DistribuicaoItem {
  id: string
  nome: string
  quantidade: number
  percentual: number
}

export interface CruzamentoResultadoItem {
  opcaoX: string
  totalX: number
  percentualDoTotal: number
  distribuicaoY: {
    opcaoY: string
    quantidade: number
    percentualNaOpcaoX: number
  }[]
}

export interface IndicadoresCorridaBI {
  // 1. Perfil & Cruzamentos
  estreantes: {
    totalEstreantes: number
    percentualEstreantes: number
    totalRespondentes: number
  } | null
  genero: {
    feminino: { count: number; pct: number }
    masculino: { count: number; pct: number }
    outros: { count: number; pct: number }
    total: number
  } | null
  faixaEtaria: DistribuicaoItem[] | null
  faixaEtariaDominante: { faixa: string; percentual: number } | null
  renda: DistribuicaoItem[] | null
  rendaAte2SM: { total: number; percentual: number } | null
  cruzamentoGeneroEstreantes: CruzamentoResultadoItem[] | null

  // 2. Painel Executivo & Indicadores Operacionais
  aprovacaoGeral: {
    positivo: number
    percentual: number
    total: number
    nivelTexto: string
  } | null
  fidelizacao: {
    retorno: number
    percentual: number
    total: number
  } | null
  metaFomento: {
    concordam: number
    percentual: number
    total: number
  } | null
  notaGeralMedia: number | null
  organizacao: DistribuicaoItem[] | null
  estrutura: DistribuicaoItem[] | null
  beneficioComunidade: DistribuicaoItem[] | null

  // 3. Amostragem & Território
  territorio: DistribuicaoItem[] | null
  margemErro: number | null
  taxaAdesao: number | null
  totalInscritos: number
  totalNotificados: number
  totalRespondentes: number
}

/**
 * Normaliza string para busca semântica insensível a acentos e maiúsculas.
 */
function norm(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Mapeia perguntas aos conceitos semânticos do BI por título e opções.
 */
export function identificarPerguntasChave(perguntas: Pergunta[]) {
  const map: Record<string, Pergunta | undefined> = {
    faixaEtaria: undefined,
    territorio: undefined,
    genero: undefined,
    renda: undefined,
    estreante: undefined,
    frequencia: undefined,
    organizacao: undefined,
    estrutura: undefined,
    metaFomento: undefined,
    beneficioComunidade: undefined,
    experienciaGeral: undefined,
    retorno: undefined,
    pontoPositivo: undefined,
    melhoria: undefined,
  }

  perguntas.forEach(p => {
    const t = norm(p.titulo)
    const opcoes = p.config?.opcoes?.map(o => norm(o.texto)) || []

    if (!map.faixaEtaria && (t.includes('faixa etaria') || t.includes('idade') || opcoes.some(o => o.includes('anos')))) {
      map.faixaEtaria = p
    } else if (!map.territorio && (t.includes('bairro') || t.includes('regional') || t.includes('regiao') || t.includes('comunidade') || p.tipo === 'bairro')) {
      map.territorio = p
    } else if (!map.genero && (t.includes('sexo') || t.includes('genero') || (opcoes.includes('feminino') && opcoes.includes('masculino')))) {
      map.genero = p
    } else if (!map.renda && (t.includes('renda') || t.includes('salario') || opcoes.some(o => o.includes('salario') || o.includes('sm')))) {
      map.renda = p
    } else if (!map.estreante && (t.includes('primeira participacao') || t.includes('primeira vez') || t.includes('estreante'))) {
      map.estreante = p
    } else if (!map.frequencia && (t.includes('frequencia') || t.includes('praticava'))) {
      map.frequencia = p
    } else if (!map.organizacao && (t.includes('organizacao geral') || t.includes('organizacao do evento'))) {
      map.organizacao = p
    } else if (!map.estrutura && (t.includes('estrutura') || t.includes('percurso') || t.includes('hidratacao'))) {
      map.estrutura = p
    } else if (!map.metaFomento && (t.includes('incentivam a pratica') || t.includes('habitos saudaveis') || t.includes('incentivo'))) {
      map.metaFomento = p
    } else if (!map.beneficioComunidade && (t.includes('beneficios') || t.includes('comunidade local') || t.includes('municipio'))) {
      map.beneficioComunidade = p
    } else if (!map.experienciaGeral && (t.includes('experiencia geral') || t.includes('satisfacao geral') || t.includes('avaliacao geral'))) {
      map.experienciaGeral = p
    } else if (!map.retorno && (t.includes('participaria novamente') || t.includes('futuras edicoes') || t.includes('edicao futura'))) {
      map.retorno = p
    } else if (!map.pontoPositivo && (t.includes('ponto positivo') || t.includes('o que mais gostou'))) {
      map.pontoPositivo = p
    } else if (!map.melhoria && (t.includes('melhorado') || t.includes('sugestao') || t.includes('proximas edicoes'))) {
      map.melhoria = p
    }
  })

  return map
}

/**
 * Calcula a margem de erro estatística amostral para populações finitas.
 * Fórmula clássica: e = Z * sqrt((p * (1-p) / n) * ((N - n) / (N - 1)))
 * com Z = 1.96 (IC 95%) e p = 0.5 (pior caso conservador).
 */
export function calcularMargemErroAmostral(populacaoTotal: number, amostraRespondentes: number): number | null {
  if (amostraRespondentes <= 0) return null
  if (populacaoTotal <= 0) return null
  if (amostraRespondentes >= populacaoTotal) return 0.0

  const Z = 1.96
  const p = 0.5
  const N = populacaoTotal
  const n = amostraRespondentes

  const fracaoAmostral = (N - n) / (N - 1)
  const variancia = (p * (1 - p)) / n
  const margem = Z * Math.sqrt(variancia * fracaoAmostral)

  // Retorna em percentual com 1 casa decimal (ex: 3.2 para 3.2%)
  return parseFloat((margem * 100).toFixed(1))
}

/**
 * Calcula a distribuição de frequência absoluta e percentual para uma pergunta.
 */
export function calcularDistribuicaoPergunta(
  pergunta: Pergunta | undefined,
  respostas: { valores: Record<string, any> }[]
): DistribuicaoItem[] | null {
  if (!pergunta) return null
  const opcoes = pergunta.config?.opcoes || []
  const contagem: Record<string, { nome: string; quantidade: number }> = {}

  // Inicializa com as opções conhecidas da pergunta
  opcoes.forEach(o => {
    contagem[o.id] = { nome: o.texto, quantidade: 0 }
  })

  let totalValores = 0

  respostas.forEach(r => {
    const val = r.valores[pergunta.id]
    if (val === undefined || val === null || val === '') return

    const arr = Array.isArray(val) ? val : [val]
    arr.forEach(v => {
      totalValores += 1
      if (contagem[v]) {
        contagem[v].quantidade += 1
      } else {
        // Se a resposta for um texto livre ou ID customizado
        const opcaoCorrespondente = opcoes.find(o => o.id === v || norm(o.texto) === norm(String(v)))
        if (opcaoCorrespondente) {
          contagem[opcaoCorrespondente.id].quantidade += 1
        } else {
          contagem[String(v)] = { nome: String(v), quantidade: (contagem[String(v)]?.quantidade || 0) + 1 }
        }
      }
    })
  })

  if (totalValores === 0) return null

  return Object.entries(contagem).map(([id, item]) => ({
    id,
    nome: item.nome,
    quantidade: item.quantidade,
    percentual: parseFloat(((item.quantidade / totalValores) * 100).toFixed(1))
  }))
}

/**
 * Gera tabela cruzada bi-dimensional entre duas perguntas categóricas (Pergunta X vs Pergunta Y).
 */
export function calcularCruzamentoCategorias(
  perguntaX: Pergunta | undefined,
  perguntaY: Pergunta | undefined,
  respostas: { valores: Record<string, any> }[]
): CruzamentoResultadoItem[] | null {
  if (!perguntaX || !perguntaY) return null

  const opcoesX = perguntaX.config?.opcoes || []
  const opcoesY = perguntaY.config?.opcoes || []

  const mapa: Record<string, { nomeX: string; totalX: number; contagemY: Record<string, number> }> = {}

  // Inicializa mapa
  opcoesX.forEach(ox => {
    mapa[ox.id] = { nomeX: ox.texto, totalX: 0, contagemY: {} }
    opcoesY.forEach(oy => {
      mapa[ox.id].contagemY[oy.id] = 0
    })
  })

  let totalGeralValido = 0

  respostas.forEach(r => {
    const valX = r.valores[perguntaX.id]
    const valY = r.valores[perguntaY.id]
    if (!valX || !valY) return

    const itemX = opcoesX.find(o => o.id === valX || norm(o.texto) === norm(String(valX)))
    const itemY = opcoesY.find(o => o.id === valY || norm(o.texto) === norm(String(valY)))

    if (itemX && itemY) {
      totalGeralValido += 1
      mapa[itemX.id].totalX += 1
      mapa[itemX.id].contagemY[itemY.id] = (mapa[itemX.id].contagemY[itemY.id] || 0) + 1
    }
  })

  if (totalGeralValido === 0) return null

  return opcoesX.map(ox => {
    const dadosX = mapa[ox.id]
    const totalX = dadosX.totalX
    const distribuicaoY = opcoesY.map(oy => {
      const q = dadosX.contagemY[oy.id] || 0
      const pct = totalX > 0 ? parseFloat(((q / totalX) * 100).toFixed(1)) : 0
      return {
        opcaoY: oy.texto,
        quantidade: q,
        percentualNaOpcaoX: pct
      }
    })

    return {
      opcaoX: ox.texto,
      totalX,
      percentualDoTotal: totalGeralValido > 0 ? parseFloat(((totalX / totalGeralValido) * 100).toFixed(1)) : 0,
      distribuicaoY
    }
  })
}

/**
 * Agregador principal de inteligência e indicadores executivos.
 */
export function processarRelatorioCorridaBI(params: {
  perguntas: Pergunta[]
  respostas: { id: string; valores: Record<string, any> }[]
  totalInscritos?: number
  totalNotificados?: number
}): IndicadoresCorridaBI {
  const { perguntas, respostas, totalInscritos = 0, totalNotificados = 0 } = params
  const chaves = identificarPerguntasChave(perguntas)
  const totalRespondentes = respostas.length

  // 1. Estreantes no Esporte
  let estreantes: IndicadoresCorridaBI['estreantes'] = null
  if (chaves.estreante) {
    const dist = calcularDistribuicaoPergunta(chaves.estreante, respostas)
    if (dist) {
      const sim = dist.find(d => norm(d.nome).startsWith('sim'))
      const totalVal = dist.reduce((acc, curr) => acc + curr.quantidade, 0)
      if (sim && totalVal > 0) {
        estreantes = {
          totalEstreantes: sim.quantidade,
          percentualEstreantes: sim.percentual,
          totalRespondentes: totalVal
        }
      }
    }
  }

  // 2. Gênero
  let genero: IndicadoresCorridaBI['genero'] = null
  if (chaves.genero) {
    const dist = calcularDistribuicaoPergunta(chaves.genero, respostas)
    if (dist) {
      const fem = dist.find(d => norm(d.nome).includes('fem'))?.quantidade || 0
      const masc = dist.find(d => norm(d.nome).includes('masc'))?.quantidade || 0
      const total = dist.reduce((acc, curr) => acc + curr.quantidade, 0)
      const outros = total - fem - masc

      if (total > 0) {
        genero = {
          feminino: { count: fem, pct: parseFloat(((fem / total) * 100).toFixed(1)) },
          masculino: { count: masc, pct: parseFloat(((masc / total) * 100).toFixed(1)) },
          outros: { count: outros, pct: parseFloat(((outros / total) * 100).toFixed(1)) },
          total
        }
      }
    }
  }

  // 3. Faixa Etária
  const faixaEtaria = calcularDistribuicaoPergunta(chaves.faixaEtaria, respostas)
  let faixaEtariaDominante: IndicadoresCorridaBI['faixaEtariaDominante'] = null
  if (faixaEtaria && faixaEtaria.length > 0) {
    const maisVotada = [...faixaEtaria].sort((a, b) => b.quantidade - a.quantidade)[0]
    if (maisVotada && maisVotada.quantidade > 0) {
      faixaEtariaDominante = {
        faixa: maisVotada.nome,
        percentual: maisVotada.percentual
      }
    }
  }

  // 4. Renda Familiar
  const renda = calcularDistribuicaoPergunta(chaves.renda, respostas)
  let rendaAte2SM: IndicadoresCorridaBI['rendaAte2SM'] = null
  if (renda && renda.length > 0) {
    const ate2 = renda.filter(r => {
      const n = norm(r.nome)
      return n.includes('ate 1') || n.includes('ate 2') || n.includes('1 ate 2')
    })
    const totalAte2 = ate2.reduce((acc, curr) => acc + curr.quantidade, 0)
    const totalRendaValida = renda.reduce((acc, curr) => acc + curr.quantidade, 0)
    if (totalRendaValida > 0) {
      rendaAte2SM = {
        total: totalAte2,
        percentual: parseFloat(((totalAte2 / totalRendaValida) * 100).toFixed(1))
      }
    }
  }

  // 5. Cruzamento: Gênero vs Estreante
  const cruzamentoGeneroEstreantes = calcularCruzamentoCategorias(chaves.genero, chaves.estreante, respostas)

  // 6. Aprovação Geral (CSAT)
  let aprovacaoGeral: IndicadoresCorridaBI['aprovacaoGeral'] = null
  const pAprov = chaves.experienciaGeral || chaves.organizacao
  if (pAprov) {
    const dist = calcularDistribuicaoPergunta(pAprov, respostas)
    if (dist) {
      const positivas = dist.filter(d => {
        const n = norm(d.nome)
        return n.includes('muito boa') || n.includes('boa') || n.includes('muito satisf') || n.includes('satisf') || n.includes('excelente')
      })
      const totalPositivo = positivas.reduce((acc, curr) => acc + curr.quantidade, 0)
      const totalGeral = dist.reduce((acc, curr) => acc + curr.quantidade, 0)
      if (totalGeral > 0) {
        const pct = parseFloat(((totalPositivo / totalGeral) * 100).toFixed(1))
        let nivelTexto = 'Excelente'
        if (pct < 70) nivelTexto = 'Regular'
        else if (pct < 85) nivelTexto = 'Bom'
        else if (pct >= 90) nivelTexto = 'Excelente'

        aprovacaoGeral = {
          positivo: totalPositivo,
          percentual: pct,
          total: totalGeral,
          nivelTexto
        }
      }
    }
  }

  // 7. Fidelização (Participaria Novamente)
  let fidelizacao: IndicadoresCorridaBI['fidelizacao'] = null
  if (chaves.retorno) {
    const dist = calcularDistribuicaoPergunta(chaves.retorno, respostas)
    if (dist) {
      const retorno = dist.filter(d => {
        const n = norm(d.nome)
        return n.includes('com certeza') || n.includes('provavelmente') || n.startsWith('sim')
      })
      const totalRetorno = retorno.reduce((acc, curr) => acc + curr.quantidade, 0)
      const totalGeral = dist.reduce((acc, curr) => acc + curr.quantidade, 0)
      if (totalGeral > 0) {
        fidelizacao = {
          retorno: totalRetorno,
          percentual: parseFloat(((totalRetorno / totalGeral) * 100).toFixed(1)),
          total: totalGeral
        }
      }
    }
  }

  // 8. Meta do Fomento (Incentivo a Hábitos Saudáveis)
  let metaFomento: IndicadoresCorridaBI['metaFomento'] = null
  if (chaves.metaFomento) {
    const dist = calcularDistribuicaoPergunta(chaves.metaFomento, respostas)
    if (dist) {
      const concordo = dist.filter(d => {
        const n = norm(d.nome)
        return n.includes('concordo totalmente') || n.includes('concordo parcialmente') || n.startsWith('sim')
      })
      const totalConcordam = concordo.reduce((acc, curr) => acc + curr.quantidade, 0)
      const totalGeral = dist.reduce((acc, curr) => acc + curr.quantidade, 0)
      if (totalGeral > 0) {
        metaFomento = {
          concordam: totalConcordam,
          percentual: parseFloat(((totalConcordam / totalGeral) * 100).toFixed(1)),
          total: totalGeral
        }
      }
    }
  }

  // 9. Operacionais: Organização, Estrutura e Benefício
  const organizacao = calcularDistribuicaoPergunta(chaves.organizacao, respostas)
  const estrutura = calcularDistribuicaoPergunta(chaves.estrutura, respostas)
  const beneficioComunidade = calcularDistribuicaoPergunta(chaves.beneficioComunidade, respostas)

  // 10. Território
  const territorio = calcularDistribuicaoPergunta(chaves.territorio, respostas)

  // 11. Estatísticas amostrais
  const margemErro = totalInscritos > 0 && totalRespondentes > 0
    ? calcularMargemErroAmostral(totalInscritos, totalRespondentes)
    : null

  const taxaAdesao = totalNotificados > 0 && totalRespondentes > 0
    ? parseFloat(((totalRespondentes / totalNotificados) * 100).toFixed(1))
    : totalInscritos > 0 && totalRespondentes > 0
    ? parseFloat(((totalRespondentes / totalInscritos) * 100).toFixed(1))
    : null

  // Média ponderada 0 a 10 de satisfação geral (se houver dados)
  let notaGeralMedia: number | null = null
  if (aprovacaoGeral) {
    notaGeralMedia = parseFloat(((aprovacaoGeral.percentual / 100) * 10).toFixed(1))
  }

  return {
    estreantes,
    genero,
    faixaEtaria,
    faixaEtariaDominante,
    renda,
    rendaAte2SM,
    cruzamentoGeneroEstreantes,
    aprovacaoGeral,
    fidelizacao,
    metaFomento,
    notaGeralMedia,
    organizacao,
    estrutura,
    beneficioComunidade,
    territorio,
    margemErro,
    taxaAdesao,
    totalInscritos,
    totalNotificados,
    totalRespondentes
  }
}
