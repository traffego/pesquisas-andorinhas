import { supabase } from '../lib/supabase'

export interface CategoriaCampo {
  id: string
  nome: string
  user_id?: string
  created_at?: string
}

export interface FiltrosRelatorio {
  objetoIds: string[]   // [] = todos
  pesquisaIds: string[] // [] = todos
  liderIds: string[]    // [] = todos
  categoriasFiltros: {
    categoriaId: string
    categoriaNome: string
    valoresSelecionados: string[] // [] = todos os valores
  }[]
  tags?: string[]
}

export interface RelatorioSalvo {
  id: string
  nome: string
  descricao: string | null
  filtros: FiltrosRelatorio
  user_id?: string
  created_at?: string
  updated_at?: string
}

export interface Objeto {
  id: string
  nome: string
  descricao: string | null
  tipo: 'projeto' | 'evento'
  termo_fomento: string | null
  codigo_objeto: string | null
  codigo_programa: string | null
  nome_programa: string | null
  user_id?: string
  created_at?: string
}

export interface Lider {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  user_id?: string
  created_at?: string
}

export interface Fluxo {
  id: string
  nome: string
  descricao: string | null
  flow_data: any
  tipo?: 'fluxo' | 'bloco'
  user_id?: string
  created_at?: string
}

export interface Pesquisa {
  id: string
  titulo: string
  descricao: string | null
  token: string
  publicada: boolean
  exigir_cpf: boolean
  objeto_id: string | null
  lider_id: string | null
  fluxo_id: string | null
  user_id?: string
  created_at?: string
}

export interface Pergunta {
  id: string
  fluxo_id: string
  tipo: 'texto_curto' | 'textarea' | 'multipla' | 'whatsapp' | 'email' | 'cpf' | 'cep' | 'estado' | 'cidade' | 'bairro' | 'logradouro' | 'numero' | 'avaliacao'
  titulo: string
  obrigatoria: boolean
  ordem: number
  categoria_id?: string | null
  config: {
    opcoes?: { id: string; texto: string }[]
    min_respostas?: number
    max_respostas?: number
  }
  created_at?: string
}

export interface Resposta {
  id: string
  pesquisa_id: string
  fingerprint: string
  created_at?: string
}

export interface RespostaItem {
  id: string
  resposta_id: string
  pergunta_id: string
  valor: any
}

export const dbService = {
  // --- OBJETOS ---
  async getObjetos(): Promise<Objeto[]> {
    const { data, error } = await supabase.from('objeto').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async saveObjeto(objeto: Omit<Objeto, 'id' | 'created_at'> & { id?: string }): Promise<Objeto> {
    if (objeto.id) {
      const { data, error } = await supabase.from('objeto').update(objeto).eq('id', objeto.id).select().single()
      if (error) throw error
      return data
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('objeto').insert({ ...objeto, user_id: userData.user?.id }).select().single()
      if (error) throw error
      return data
    }
  },

  async deleteObjeto(id: string): Promise<void> {
    const { error } = await supabase.from('objeto').delete().eq('id', id)
    if (error) throw error
  },

  async getObjetoById(id: string): Promise<Objeto | null> {
    const { data, error } = await supabase.from('objeto').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  },

  // --- LÍDERES ---
  async getLideres(): Promise<Lider[]> {
    const { data, error } = await supabase.from('lider').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async saveLider(lider: Omit<Lider, 'id' | 'created_at'> & { id?: string }): Promise<Lider> {
    if (lider.id) {
      const { data, error } = await supabase.from('lider').update(lider).eq('id', lider.id).select().single()
      if (error) throw error
      return data
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('lider').insert({ ...lider, user_id: userData.user?.id }).select().single()
      if (error) throw error
      return data
    }
  },

  async deleteLider(id: string): Promise<void> {
    const { error } = await supabase.from('lider').delete().eq('id', id)
    if (error) throw error
  },

  async getLiderById(id: string): Promise<Lider | null> {
    const { data, error } = await supabase.from('lider').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  },

  // --- FLUXOS ---
  async getFluxos(): Promise<Fluxo[]> {
    const { data, error } = await supabase.from('fluxo').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getFluxoById(id: string): Promise<Fluxo | null> {
    const { data, error } = await supabase.from('fluxo').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  },

  async saveFluxo(fluxo: Omit<Fluxo, 'id' | 'created_at'> & { id?: string }): Promise<Fluxo> {
    if (fluxo.id) {
      const { data, error } = await supabase.from('fluxo').update(fluxo).eq('id', fluxo.id).select().single()
      if (error) throw error
      return data
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('fluxo').insert({ ...fluxo, user_id: userData.user?.id }).select().single()
      if (error) throw error
      return data
    }
  },

  async deleteFluxo(id: string): Promise<void> {
    const { error } = await supabase.from('fluxo').delete().eq('id', id)
    if (error) throw error
  },

  // --- PESQUISAS ---
  async getPesquisas(): Promise<Pesquisa[]> {
    const { data, error } = await supabase.from('pesquisa').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getPesquisaById(id: string): Promise<Pesquisa | null> {
    const { data, error } = await supabase.from('pesquisa').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  },

  async getPesquisaByToken(token: string): Promise<(Pesquisa & { fluxo?: Fluxo }) | null> {
    const { data, error } = await supabase.from('pesquisa').select('*, fluxo:fluxo_id(*)').eq('token', token).eq('publicada', true).maybeSingle()
    if (error) throw error
    return data
  },

  async savePesquisa(pesquisa: Omit<Pesquisa, 'id' | 'created_at'> & { id?: string }): Promise<Pesquisa> {
    if (pesquisa.id) {
      const { data, error } = await supabase.from('pesquisa').update(pesquisa).eq('id', pesquisa.id).select().single()
      if (error) throw error
      return data
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('pesquisa').insert({ ...pesquisa, user_id: userData.user?.id }).select().single()
      if (error) throw error
      return data
    }
  },

  async deletePesquisa(id: string): Promise<void> {
    const { error } = await supabase.from('pesquisa').delete().eq('id', id)
    if (error) throw error
  },

  // --- PERGUNTAS ---
  async getPerguntas(fluxoId: string): Promise<Pergunta[]> {
    const { data, error } = await supabase.from('pergunta').select('*').eq('fluxo_id', fluxoId).order('ordem', { ascending: true })
    if (error) throw error
    return data || []
  },

  async syncPerguntas(fluxoId: string, perguntas: Omit<Pergunta, 'created_at'>[]): Promise<void> {
    await supabase.from('pergunta').delete().eq('fluxo_id', fluxoId)
    if (perguntas.length > 0) {
      const { error } = await supabase.from('pergunta').insert(perguntas.map(q => {
        const { id, ...rest } = q
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        return isUuid ? { id, ...rest } : rest
      }))
      if (error) throw error
    }
  },

  // --- RESPOSTAS ---
  async saveRespostaCompleta(pesquisaId: string, fingerprint: string, itens: { pergunta_id: string; valor: any }[], cpf?: string): Promise<void> {
    const { data: respData, error: respError } = await supabase.from('resposta').insert({
      pesquisa_id: pesquisaId,
      fingerprint,
      ...(cpf ? { cpf } : {})
    }).select().single()

    if (respError) throw respError

    const itemsToInsert = itens.map(item => ({
      resposta_id: respData.id,
      pergunta_id: item.pergunta_id,
      valor: item.valor
    }))

    const { error: itemsError } = await supabase.from('resposta_item').insert(itemsToInsert)
    if (itemsError) throw itemsError
  },

  async hasCpfResponded(pesquisaId: string, cpf: string): Promise<boolean> {
    // CPF de teste especial — sempre passa
    const cpfNormalizado = cpf.replace(/\D/g, '').toLowerCase()
    if (cpfNormalizado === '1111111111x'.replace(/\D/g, '').toLowerCase() || cpf.toLowerCase() === '1111111111x') {
      return false
    }
    const { data, error } = await supabase
      .from('resposta')
      .select('id')
      .eq('pesquisa_id', pesquisaId)
      .eq('cpf', cpf.replace(/\D/g, ''))
      .maybeSingle()
    if (error) throw error
    return !!data
  },

  async hasDeviceResponded(pesquisaId: string, fingerprint: string): Promise<boolean> {
    const { data, error } = await supabase.from('resposta').select('id').eq('pesquisa_id', pesquisaId).eq('fingerprint', fingerprint).maybeSingle()
    if (error) throw error
    return !!data
  },

  async getRespostasCounts(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('resposta')
      .select('pesquisa_id')
    if (error) throw error
    const counts: Record<string, number> = {}
    ;(data || []).forEach(r => {
      counts[r.pesquisa_id] = (counts[r.pesquisa_id] || 0) + 1
    })
    return counts
  },

  // --- RELATÓRIOS ---
  async getRelatorios(pesquisaId: string): Promise<{
    totalRespostas: number
    respostas: { id: string; created_at: string; valores: Record<string, any> }[]
  }> {
    const { data: respostas, error: respError } = await supabase
      .from('resposta')
      .select('id, created_at')
      .eq('pesquisa_id', pesquisaId)
      .order('created_at', { ascending: false })

    if (respError) throw respError
    if (!respostas || respostas.length === 0) return { totalRespostas: 0, respostas: [] }

    const respostaIds = respostas.map(r => r.id)

    const { data: itens, error: itensError } = await supabase
      .from('resposta_item')
      .select('resposta_id, pergunta_id, valor')
      .in('resposta_id', respostaIds)

    if (itensError) throw itensError

    const formatted = respostas.map(r => {
      const rItens = (itens || []).filter(i => i.resposta_id === r.id)
      const valores: Record<string, any> = {}
      rItens.forEach(i => { valores[i.pergunta_id] = i.valor })
      return { id: r.id, created_at: r.created_at, valores }
    })

    return { totalRespostas: respostas.length, respostas: formatted }
  },

  // --- CATEGORIAS DE CAMPO ---
  async getCategorias(): Promise<CategoriaCampo[]> {
    const { data, error } = await supabase.from('categoria_campo').select('*').order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  async saveCategoria(categoria: Omit<CategoriaCampo, 'id' | 'created_at'> & { id?: string }): Promise<CategoriaCampo> {
    if (categoria.id) {
      const { data, error } = await supabase.from('categoria_campo').update({ nome: categoria.nome }).eq('id', categoria.id).select().single()
      if (error) throw error
      return data
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('categoria_campo').insert({ nome: categoria.nome, user_id: userData.user?.id }).select().single()
      if (error) throw error
      return data
    }
  },

  async deleteCategoria(id: string): Promise<void> {
    const { error } = await supabase.from('categoria_campo').delete().eq('id', id)
    if (error) throw error
  },

  // --- RELATÓRIOS SALVOS ---
  async getRelatoriosSalvos(): Promise<RelatorioSalvo[]> {
    const { data, error } = await supabase
      .from('relatorio_salvo')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async saveRelatorioSalvo(
    rel: Omit<RelatorioSalvo, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Promise<RelatorioSalvo> {
    if (rel.id) {
      const { data, error } = await supabase
        .from('relatorio_salvo')
        .update({ nome: rel.nome, descricao: rel.descricao, filtros: rel.filtros, updated_at: new Date().toISOString() })
        .eq('id', rel.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('relatorio_salvo')
        .insert({ nome: rel.nome, descricao: rel.descricao, filtros: rel.filtros, user_id: userData.user?.id })
        .select()
        .single()
      if (error) throw error
      return data
    }
  },

  async deleteRelatorioSalvo(id: string): Promise<void> {
    const { error } = await supabase.from('relatorio_salvo').delete().eq('id', id)
    if (error) throw error
  },

  // --- RELATÓRIOS GLOBAIS ---
  // Busca perguntas de múltiplos fluxos (via pesquisa_ids → fluxo_ids)
  async getPerguntasByFluxos(fluxoIds: string[]): Promise<Pergunta[]> {
    if (fluxoIds.length === 0) return []
    const { data, error } = await supabase
      .from('pergunta')
      .select('*')
      .in('fluxo_id', fluxoIds)
      .order('ordem', { ascending: true })
    if (error) throw error
    return data || []
  },

  // Busca respostas de múltiplas pesquisas com info de pesquisa/lider/objeto
  async getRelatoriosGlobais(pesquisaIds: string[]): Promise<{
    respostas: {
      id: string
      created_at: string
      pesquisa_id: string
      pesquisa_titulo: string
      lider_nome: string | null
      objeto_nome: string | null
      valores: Record<string, any>
    }[]
    total: number
  }> {
    if (pesquisaIds.length === 0) return { respostas: [], total: 0 }

    // Busca pesquisas com join lider e objeto
    const { data: pesquisas, error: pErr } = await supabase
      .from('pesquisa')
      .select('id, titulo, lider:lider_id(nome), objeto:objeto_id(nome)')
      .in('id', pesquisaIds)
    if (pErr) throw pErr

    // Busca respostas
    const { data: respostas, error: rErr } = await supabase
      .from('resposta')
      .select('id, created_at, pesquisa_id')
      .in('pesquisa_id', pesquisaIds)
      .order('created_at', { ascending: false })
    if (rErr) throw rErr
    if (!respostas || respostas.length === 0) return { respostas: [], total: 0 }

    // Busca itens
    const respostaIds = respostas.map((r: any) => r.id)
    const { data: itens, error: iErr } = await supabase
      .from('resposta_item')
      .select('resposta_id, pergunta_id, valor')
      .in('resposta_id', respostaIds)
    if (iErr) throw iErr

    const pesquisaMap: Record<string, any> = {}
    ;(pesquisas || []).forEach((p: any) => { pesquisaMap[p.id] = p })

    const formatted = respostas.map((r: any) => {
      const rItens = (itens || []).filter((i: any) => i.resposta_id === r.id)
      const valores: Record<string, any> = {}
      rItens.forEach((i: any) => { valores[i.pergunta_id] = i.valor })
      const pesq = pesquisaMap[r.pesquisa_id]
      return {
        id: r.id,
        created_at: r.created_at,
        pesquisa_id: r.pesquisa_id,
        pesquisa_titulo: pesq?.titulo || '',
        lider_nome: pesq?.lider?.nome || null,
        objeto_nome: pesq?.objeto?.nome || null,
        valores
      }
    })

    return { respostas: formatted, total: formatted.length }
  }
}
