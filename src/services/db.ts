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
  locais?: string[]
  user_id?: string
  created_at?: string
}

export interface Participante {
  id: string
  objeto_id: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  dados_extras?: Record<string, any>
  created_at?: string
}

export interface ParticipanteComStatus extends Participante {
  objeto_nome?: string
  resposta_id?: string | null
  resposta_data?: string | null
  respondeu: boolean
  ja_notificado?: boolean
  notificado_em?: string | null
  status_whatsapp?: 'enviado' | 'entregue' | 'lido' | 'erro' | 'pendente'
  entregue_em?: string | null
  lido_em?: string | null
}

export interface DisparoLog {
  id?: string
  campanha_id?: string | null
  participante_id: string
  pesquisa_id: string
  objeto_id: string
  telefone: string
  status: 'enviado' | 'entregue' | 'lido' | 'erro'
  message_id?: string
  zaap_id?: string
  erro?: string
  entregue_em?: string | null
  lido_em?: string | null
  created_at?: string
}

export interface CampanhaDisparo {
  id: string
  objeto_id: string
  objeto_nome?: string
  pesquisa_id: string
  pesquisa_titulo?: string
  pesquisa_token?: string
  nome: string
  mensagem_texto: string
  filtro_publico: 'todos' | 'pendentes' | 'nao_lidos' | 'custom'
  status: 'rascunho' | 'enviando' | 'concluido'
  total_destinatarios: number
  enviados_count: number
  entregues_count: number
  lidos_count: number
  respondidos_count: number
  disparado_em?: string | null
  created_at: string
}

export interface ConfigZApi {
  id?: string
  instance_id: string
  instance_token: string
  client_token: string
  mensagem_padrao?: string
  ativo?: boolean
}

export interface MensagemTemplateObjeto {
  id: string
  objeto_id: string
  objeto_nome?: string
  pesquisa_id?: string | null
  pesquisa_titulo?: string
  pesquisa_token?: string
  titulo: string
  mensagem: string
  ativo: boolean
  created_at?: string
  updated_at?: string
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
  tipo_identificacao?: 'cpf' | 'celular' | string
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
  is_teste?: boolean
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
      // Remove campos que não devem ir no body do update
      const { id, user_id, created_at, ...updatePayload } = fluxo as any

      // UPDATE com select('id') para detectar se 0 linhas foram afetadas
      // (ocorre silenciosamente quando RLS bloqueia a operação)
      const { data: updatedRows, error } = await supabase
        .from('fluxo')
        .update(updatePayload)
        .eq('id', id)
        .select('id')

      if (error) throw error
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('O fluxo não pôde ser salvo. Verifique suas permissões ou tente novamente.')
      }

      // SELECT separado para buscar o registro completo atualizado
      const { data, error: fetchError } = await supabase
        .from('fluxo')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (fetchError) throw fetchError
      return data as Fluxo
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
      // Remove campos que não devem ser enviados no update:
      // - id: está no filtro .eq(), não no body
      // - user_id: gerenciado pelo RLS/banco
      // - created_at: campo de só leitura
      const { id, user_id, created_at, ...updatePayload } = pesquisa as any

      // UPDATE com select('id') para detectar se 0 linhas foram afetadas
      // (ocorre silenciosamente quando RLS bloqueia a operação)
      const { data: updatedRows, error } = await supabase
        .from('pesquisa')
        .update(updatePayload)
        .eq('id', id)
        .select('id')

      if (error) throw error
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('A pesquisa não pôde ser salva. Verifique suas permissões ou tente novamente.')
      }

      // Busca o registro completo atualizado em um SELECT separado
      const { data, error: fetchError } = await supabase
        .from('pesquisa')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (fetchError) throw fetchError
      return data as Pesquisa
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
  async saveRespostaCompleta(
    pesquisaId: string, 
    fingerprint: string, 
    itens: { pergunta_id: string; valor: any }[], 
    cpf?: string,
    participanteId?: string | null,
    telefone?: string | null,
    isTeste: boolean = false
  ): Promise<void> {
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : null
    const cleanTel = telefone ? telefone.replace(/\D/g, '') : null

    // Dupla validação anti-duplicidade no momento da gravação
    if (cleanCpf || cleanTel || participanteId) {
      const iden = cleanCpf || cleanTel || ''
      const jaResp = await this.hasIdentifierResponded(pesquisaId, iden, participanteId)
      if (jaResp) {
        throw new Error('Este participante já registrou uma resposta para esta pesquisa.')
      }
    }

    const { data: respData, error: respError } = await supabase.from('resposta').insert({
      pesquisa_id: pesquisaId,
      fingerprint,
      is_teste: !!isTeste,
      ...(cleanCpf ? { cpf: cleanCpf } : {}),
      ...(participanteId ? { participante_id: participanteId } : {}),
      ...(cleanTel ? { telefone: cleanTel } : {})
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

  async buscarParticipante(objetoId: string, identificador: string): Promise<Participante | null> {
    const list = await this.buscarParticipantes(objetoId, identificador)
    return list.length > 0 ? list[0] : null
  },

  async buscarParticipantes(objetoId: string, identificador: string): Promise<Participante[]> {
    const { data, error } = await supabase.rpc('buscar_participante', {
      p_objeto_id: objetoId,
      p_identificador: identificador
    })
    if (error) {
      console.error('Erro ao buscar participantes:', error)
      return []
    }
    return (data || []) as Participante[]
  },

  // --- GESTÃO DE PARTICIPANTES ---
  async getParticipantes(filtros?: {
    objetoId?: string
    pesquisaId?: string
    status?: 'todos' | 'respondeu' | 'pendente'
    busca?: string
  }): Promise<ParticipanteComStatus[]> {
    let query = supabase
      .from('vw_participantes_status')
      .select('*')
      .order('nome', { ascending: true })

    if (filtros?.objetoId) {
      query = query.eq('objeto_id', filtros.objetoId)
    }

    if (filtros?.busca && filtros.busca.trim() !== '') {
      const b = filtros.busca.trim()
      const cleanDigits = b.replace(/\D/g, '')
      if (cleanDigits.length >= 3) {
        query = query.or(`nome.ilike.%${b}%,cpf.ilike.%${cleanDigits}%,telefone.ilike.%${cleanDigits}%`)
      } else {
        query = query.ilike('nome', `%${b}%`)
      }
    }

    const { data, error } = await query
    if (error) throw error
    let list = (data || []) as ParticipanteComStatus[]

    // Se uma pesquisa específica for fornecida, recalcula 'respondeu' e verifica 'ja_notificado'
    if (filtros?.pesquisaId) {
      const [respRes, dispRes] = await Promise.all([
        supabase
          .from('resposta')
          .select('participante_id, cpf, id, created_at')
          .eq('pesquisa_id', filtros.pesquisaId),
        supabase
          .from('disparo_whatsapp_log')
          .select('participante_id, created_at, status, entregue_em, lido_em')
          .eq('pesquisa_id', filtros.pesquisaId)
          .neq('status', 'erro')
      ])

      const respList = respRes.data || []
      const dispList = dispRes.data || []
      const dispMap = new Map<string, { created_at: string; status: 'enviado' | 'entregue' | 'lido' | 'erro'; entregue_em?: string | null; lido_em?: string | null }>()
      dispList.forEach((d: any) => {
        if (d.participante_id) {
          // Se houver mais de um log, prioriza o status mais avançado (lido > entregue > enviado)
          const atual = dispMap.get(d.participante_id)
          if (!atual || d.status === 'lido' || (d.status === 'entregue' && atual.status !== 'lido')) {
            dispMap.set(d.participante_id, {
              created_at: d.created_at,
              status: d.status,
              entregue_em: d.entregue_em,
              lido_em: d.lido_em
            })
          }
        }
      })

      list = list.map(p => {
        const pCpfClean = (p.cpf || '').replace(/\D/g, '')
        const rMatch = respList.find(r => 
          (r.participante_id && r.participante_id === p.id) ||
          (pCpfClean && r.cpf && r.cpf.replace(/\D/g, '') === pCpfClean)
        )
        const notifData = dispMap.get(p.id)
        return {
          ...p,
          respondeu: !!rMatch,
          resposta_id: rMatch?.id || null,
          resposta_data: rMatch?.created_at || null,
          ja_notificado: !!notifData,
          notificado_em: notifData?.created_at || null,
          status_whatsapp: notifData ? notifData.status : 'pendente',
          entregue_em: notifData?.entregue_em || null,
          lido_em: notifData?.lido_em || null
        }
      })
    }

    if (filtros?.status === 'respondeu') {
      list = list.filter(p => p.respondeu)
    } else if (filtros?.status === 'pendente') {
      list = list.filter(p => !p.respondeu)
    }

    return list
  },

  async saveParticipante(part: Partial<Participante>): Promise<Participante> {
    if (part.id) {
      const { data, error } = await supabase
        .from('participante')
        .update({
          nome: part.nome,
          objeto_id: part.objeto_id,
          cpf: part.cpf ? part.cpf.replace(/\D/g, '') : null,
          telefone: part.telefone ? part.telefone.replace(/\D/g, '') : null,
          email: part.email || null,
          dados_extras: part.dados_extras || {}
        })
        .eq('id', part.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('participante')
        .insert({
          nome: part.nome,
          objeto_id: part.objeto_id,
          cpf: part.cpf ? part.cpf.replace(/\D/g, '') : null,
          telefone: part.telefone ? part.telefone.replace(/\D/g, '') : null,
          email: part.email || null,
          dados_extras: part.dados_extras || {}
        })
        .select()
        .single()
      if (error) throw error
      return data
    }
  },

  async deleteParticipante(id: string): Promise<void> {
    const { error } = await supabase.from('participante').delete().eq('id', id)
    if (error) throw error
  },

  // --- CONFIGURAÇÃO Z-API (WHATSAPP) ---
  async getConfigZApi(): Promise<ConfigZApi | null> {
    const { data, error } = await supabase
      .from('config_zapi')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (error) {
      console.error('Erro ao buscar config Z-API:', error)
      return null
    }
    return data
  },

  async saveConfigZApi(cfg: Partial<ConfigZApi>): Promise<void> {
    const current = await this.getConfigZApi()
    if (current && current.id) {
      const { error } = await supabase
        .from('config_zapi')
        .update({
          instance_id: cfg.instance_id,
          instance_token: cfg.instance_token,
          client_token: cfg.client_token,
          mensagem_padrao: cfg.mensagem_padrao,
          ativo: cfg.ativo !== undefined ? cfg.ativo : true,
          updated_at: new Date().toISOString()
        })
        .eq('id', current.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('config_zapi')
        .insert({
          instance_id: cfg.instance_id,
          instance_token: cfg.instance_token,
          client_token: cfg.client_token,
          mensagem_padrao: cfg.mensagem_padrao,
          ativo: cfg.ativo !== undefined ? cfg.ativo : true
        })
      if (error) throw error
    }
  },

  // --- MENSAGENS / TEMPLATES POR PROJETO E PESQUISA ---
  async getMensagensTemplates(objetoId?: string, pesquisaId?: string): Promise<MensagemTemplateObjeto[]> {
    let query = supabase
      .from('mensagem_template_objeto')
      .select('*, objeto:objeto_id(nome), pesquisa:pesquisa_id(titulo, token)')
      .order('created_at', { ascending: false })

    if (objetoId) {
      query = query.eq('objeto_id', objetoId)
    }
    if (pesquisaId) {
      query = query.eq('pesquisa_id', pesquisaId)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((t: any) => ({
      id: t.id,
      objeto_id: t.objeto_id,
      objeto_nome: t.objeto?.nome || '',
      pesquisa_id: t.pesquisa_id || null,
      pesquisa_titulo: t.pesquisa?.titulo || '',
      pesquisa_token: t.pesquisa?.token || '',
      titulo: t.titulo,
      mensagem: t.mensagem,
      ativo: t.ativo,
      created_at: t.created_at,
      updated_at: t.updated_at
    }))
  },

  async saveMensagemTemplate(template: Partial<MensagemTemplateObjeto>): Promise<MensagemTemplateObjeto> {
    if (template.id) {
      const { data, error } = await supabase
        .from('mensagem_template_objeto')
        .update({
          objeto_id: template.objeto_id,
          pesquisa_id: template.pesquisa_id || null,
          titulo: template.titulo,
          mensagem: template.mensagem,
          ativo: template.ativo !== undefined ? template.ativo : true,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('mensagem_template_objeto')
        .insert({
          objeto_id: template.objeto_id,
          pesquisa_id: template.pesquisa_id || null,
          titulo: template.titulo,
          mensagem: template.mensagem,
          ativo: template.ativo !== undefined ? template.ativo : true
        })
        .select()
        .single()
      if (error) throw error
      return data
    }
  },

  async deleteMensagemTemplate(id: string): Promise<void> {
    const { error } = await supabase.from('mensagem_template_objeto').delete().eq('id', id)
    if (error) throw error
  },

  // --- LOGS E CONTROLE DE DISPAROS WHATSAPP ---
  async registrarDisparo(dados: {
    participanteId: string
    pesquisaId: string
    objetoId: string
    telefone: string
    status: 'enviado' | 'entregue' | 'lido' | 'erro'
    campanhaId?: string
    messageId?: string
    zaapId?: string
    erro?: string
  }): Promise<void> {
    const { error } = await supabase.from('disparo_whatsapp_log').insert({
      campanha_id: dados.campanhaId || null,
      participante_id: dados.participanteId,
      pesquisa_id: dados.pesquisaId,
      objeto_id: dados.objetoId,
      telefone: dados.telefone.replace(/\D/g, ''),
      status: dados.status,
      message_id: dados.messageId || null,
      zaap_id: dados.zaapId || null,
      erro: dados.erro || null
    })
    if (error) {
      console.warn('Erro ao registrar log de disparo:', error)
    }
  },

  // --- GESTÃO DE CAMPANHAS DE DISPARO ---
  async getCampanhas(pesquisaId?: string, objetoId?: string): Promise<CampanhaDisparo[]> {
    let query = supabase
      .from('disparo_campanha')
      .select('*, objeto:objeto_id(nome), pesquisa:pesquisa_id(titulo, token)')
      .order('created_at', { ascending: false })

    if (pesquisaId) {
      query = query.eq('pesquisa_id', pesquisaId)
    }
    if (objetoId) {
      query = query.eq('objeto_id', objetoId)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((c: any) => ({
      ...c,
      objeto_nome: c.objeto?.nome || undefined,
      pesquisa_titulo: c.pesquisa?.titulo || undefined,
      pesquisa_token: c.pesquisa?.token || undefined
    }))
  },

  async getCampanhaById(id: string): Promise<CampanhaDisparo | null> {
    const { data, error } = await supabase
      .from('disparo_campanha')
      .select('*, objeto:objeto_id(nome), pesquisa:pesquisa_id(titulo, token)')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      ...data,
      objeto_nome: data.objeto?.nome || undefined,
      pesquisa_titulo: data.pesquisa?.titulo || undefined,
      pesquisa_token: data.pesquisa?.token || undefined
    }
  },

  async saveCampanha(campanha: Partial<CampanhaDisparo>): Promise<CampanhaDisparo> {
    const dados: any = {
      objeto_id: campanha.objeto_id,
      pesquisa_id: campanha.pesquisa_id,
      nome: campanha.nome,
      mensagem_texto: campanha.mensagem_texto,
      filtro_publico: campanha.filtro_publico || 'todos',
      status: campanha.status || 'rascunho',
      total_destinatarios: campanha.total_destinatarios ?? 0,
      enviados_count: campanha.enviados_count ?? 0,
      entregues_count: campanha.entregues_count ?? 0,
      lidos_count: campanha.lidos_count ?? 0,
      respondidos_count: campanha.respondidos_count ?? 0,
      disparado_em: campanha.disparado_em || null
    }

    if (campanha.id) {
      const { data, error } = await supabase
        .from('disparo_campanha')
        .update(dados)
        .eq('id', campanha.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('disparo_campanha')
        .insert(dados)
        .select()
        .single()
      if (error) throw error
      return data
    }
  },

  async deleteCampanha(id: string): Promise<void> {
    const { error } = await supabase.from('disparo_campanha').delete().eq('id', id)
    if (error) throw error
  },

  async getLogsCampanha(campanhaId: string): Promise<DisparoLog[]> {
    const { data, error } = await supabase
      .from('disparo_whatsapp_log')
      .select('*')
      .eq('campanha_id', campanhaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getEstatisticasCampanha(campanhaId: string): Promise<{
    total: number
    enviados: number
    entregues: number
    lidos: number
    respondidos: number
  }> {
    const [logsRes, campRes] = await Promise.all([
      supabase
        .from('disparo_whatsapp_log')
        .select('participante_id, status, pesquisa_id')
        .eq('campanha_id', campanhaId),
      supabase
        .from('disparo_campanha')
        .select('pesquisa_id, total_destinatarios')
        .eq('id', campanhaId)
        .maybeSingle()
    ])

    const logs = logsRes.data || []
    const pesquisaId = campRes.data?.pesquisa_id

    const total = campRes.data?.total_destinatarios || logs.length
    const enviados = logs.filter(l => l.status !== 'erro').length
    const entregues = logs.filter(l => l.status === 'entregue' || l.status === 'lido').length
    const lidos = logs.filter(l => l.status === 'lido').length

    let respondidos = 0
    if (pesquisaId && logs.length > 0) {
      const partIds = logs.map(l => l.participante_id).filter(Boolean)
      if (partIds.length > 0) {
        const { count } = await supabase
          .from('resposta')
          .select('id', { count: 'exact', head: true })
          .eq('pesquisa_id', pesquisaId)
          .in('participante_id', partIds)
        respondidos = count || 0
      }
    }

    return { total, enviados, entregues, lidos, respondidos }
  },

  async getHistoricoParticipante(participanteId: string, objetoId?: string): Promise<Array<{
    campanha_id?: string
    campanha_nome?: string
    pesquisa_id?: string
    status: 'enviado' | 'entregue' | 'lido' | 'erro'
    telefone: string
    enviado_em: string
    entregue_em?: string | null
    lido_em?: string | null
    mensagem_texto?: string
    respondeu: boolean
    respondeu_em?: string | null
  }>> {
    let query = supabase
      .from('disparo_whatsapp_log')
      .select('*, campanha:campanha_id(nome, mensagem_texto)')
      .eq('participante_id', participanteId)
      .order('created_at', { ascending: false })

    if (objetoId) {
      query = query.eq('objeto_id', objetoId)
    }

    const { data: logs, error } = await query
    if (error) throw error

    // Busca também se já respondeu em alguma das pesquisas desses logs
    const pesqIds = Array.from(new Set((logs || []).map((l: any) => l.pesquisa_id).filter(Boolean)))
    const { data: resps } = pesqIds.length > 0 
      ? await supabase.from('resposta').select('pesquisa_id, created_at').eq('participante_id', participanteId).in('pesquisa_id', pesqIds)
      : { data: [] }

    const respMap = new Map<string, string>()
    ;(resps || []).forEach((r: any) => respMap.set(r.pesquisa_id, r.created_at))

    return (logs || []).map((l: any) => {
      const respData = l.pesquisa_id ? respMap.get(l.pesquisa_id) : undefined
      return {
        campanha_id: l.campanha_id,
        campanha_nome: l.campanha?.nome || 'Envio Direto',
        pesquisa_id: l.pesquisa_id,
        status: l.status,
        telefone: l.telefone,
        enviado_em: l.created_at,
        entregue_em: l.entregue_em,
        lido_em: l.lido_em,
        mensagem_texto: l.campanha?.mensagem_texto || undefined,
        respondeu: !!respData,
        respondeu_em: respData || null
      }
    })
  },

  async limparLogsDisparo(pesquisaId: string, objetoId?: string): Promise<void> {
    let query = supabase.from('disparo_whatsapp_log').delete().eq('pesquisa_id', pesquisaId)
    if (objetoId) {
      query = query.eq('objeto_id', objetoId)
    }
    const { error } = await query
    if (error) throw error
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

  async hasIdentifierResponded(pesquisaId: string, identificador: string, participanteId?: string | null): Promise<boolean> {
    const clean = identificador.replace(/\D/g, '').toLowerCase()
    if (clean === '1111111111x' || identificador.toLowerCase() === '1111111111x') {
      return false
    }
    
    // Verifica por participante_id, cpf ou telefone
    let query = supabase.from('resposta').select('id').eq('pesquisa_id', pesquisaId)
    if (participanteId) {
      query = query.or(`participante_id.eq.${participanteId},cpf.eq.${clean},telefone.eq.${clean}`)
    } else {
      query = query.or(`cpf.eq.${clean},telefone.eq.${clean}`)
    }
    const { data, error } = await query.maybeSingle()
    if (error) {
      console.warn('Erro ao verificar resposta prévia:', error)
      return false
    }
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
    respostas: {
      id: string
      created_at: string
      cpf?: string | null
      telefone?: string | null
      participante_id?: string | null
      atleta_nome?: string | null
      is_teste: boolean
      valores: Record<string, any>
    }[]
  }> {
    const { data: respostas, error: respError } = await supabase
      .from('resposta')
      .select('id, created_at, cpf, telefone, participante_id, is_teste, participante:participante_id(nome)')
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
      const pNome = (r.participante as any)?.nome || null
      return {
        id: r.id,
        created_at: r.created_at,
        cpf: r.cpf,
        telefone: r.telefone,
        participante_id: r.participante_id,
        atleta_nome: pNome,
        is_teste: !!r.is_teste,
        valores
      }
    })

    return { totalRespostas: respostas.length, respostas: formatted }
  },

  async toggleRespostaTeste(respostaId: string, isTeste: boolean): Promise<void> {
    const { error } = await supabase
      .from('resposta')
      .update({ is_teste: isTeste })
      .eq('id', respostaId)
    if (error) throw error
  },

  async limparRespostasTeste(pesquisaId: string, resetarDisparo: boolean = true): Promise<number> {
    const { data: testes, error: fetchErr } = await supabase
      .from('resposta')
      .select('id, participante_id')
      .eq('pesquisa_id', pesquisaId)
      .eq('is_teste', true)

    if (fetchErr) throw fetchErr
    if (!testes || testes.length === 0) return 0

    const ids = testes.map(t => t.id)
    const partIds = testes.map(t => t.participante_id).filter(Boolean) as string[]

    if (resetarDisparo && partIds.length > 0) {
      await supabase
        .from('disparo_whatsapp_log')
        .delete()
        .eq('pesquisa_id', pesquisaId)
        .in('participante_id', partIds)
    }

    const { error: delError } = await supabase
      .from('resposta')
      .delete()
      .in('id', ids)

    if (delError) throw delError
    return ids.length
  },

  async deleteRespostasLote(respostaIds: string[], resetarDisparos: boolean = true): Promise<void> {
    if (!respostaIds || respostaIds.length === 0) return

    const { data: respList } = await supabase
      .from('resposta')
      .select('id, participante_id, pesquisa_id')
      .in('id', respostaIds)

    const partIds = (respList || []).map(r => r.participante_id).filter(Boolean) as string[]
    const pesquisaId = respList?.[0]?.pesquisa_id

    if (resetarDisparos && partIds.length > 0 && pesquisaId) {
      await supabase
        .from('disparo_whatsapp_log')
        .delete()
        .eq('pesquisa_id', pesquisaId)
        .in('participante_id', partIds)
    }

    const { error } = await supabase
      .from('resposta')
      .delete()
      .in('id', respostaIds)

    if (error) throw error
  },

  async getMetricasAmostrais(pesquisaId: string, objetoId?: string | null): Promise<{
    totalInscritos: number
    totalNotificados: number
  }> {
    let totalInscritos = 0
    let totalNotificados = 0

    if (objetoId) {
      const { count } = await supabase
        .from('participante')
        .select('*', { count: 'exact', head: true })
        .eq('objeto_id', objetoId)
      totalInscritos = count || 0
    }

    const { count: dispCount } = await supabase
      .from('disparo_whatsapp_log')
      .select('*', { count: 'exact', head: true })
      .eq('pesquisa_id', pesquisaId)
      .eq('status', 'enviado')

    totalNotificados = dispCount || 0

    return { totalInscritos, totalNotificados }
  },

  async deleteResposta(respostaId: string, resetarDisparo: boolean = true): Promise<void> {
    // 1. Busca dados da resposta para limpar eventual disparo_log
    const { data: resp } = await supabase
      .from('resposta')
      .select('id, participante_id, pesquisa_id')
      .eq('id', respostaId)
      .maybeSingle()

    // 2. Exclui a resposta (cascateia para resposta_item)
    const { error: delError } = await supabase
      .from('resposta')
      .delete()
      .eq('id', respostaId)

    if (delError) throw delError

    // 3. Se configurado e houver participante_id, remove também o log de disparo
    if (resetarDisparo && resp?.participante_id && resp?.pesquisa_id) {
      await supabase
        .from('disparo_whatsapp_log')
        .delete()
        .eq('pesquisa_id', resp.pesquisa_id)
        .eq('participante_id', resp.participante_id)
    }
  },

  async limparRespostas(pesquisaId: string, resetarDisparos: boolean = true): Promise<void> {
    // 1. Exclui todas as respostas da pesquisa (cascateia para resposta_item)
    const { error } = await supabase
      .from('resposta')
      .delete()
      .eq('pesquisa_id', pesquisaId)

    if (error) throw error

    // 2. Se configurado, limpa também os logs de disparo
    if (resetarDisparos) {
      await this.limparLogsDisparo(pesquisaId)
    }
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
