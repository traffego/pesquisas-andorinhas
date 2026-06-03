import { supabase } from '../lib/supabase'

export interface Projeto {
  id: string
  nome: string
  descricao: string | null
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

export interface Pesquisa {
  id: string
  titulo: string
  descricao: string | null
  token: string
  publicada: boolean
  projeto_id: string | null
  lider_id: string | null
  flow_data: any
  user_id?: string
  created_at?: string
}

export interface Pergunta {
  id: string
  pesquisa_id: string
  tipo: 'texto_curto' | 'textarea' | 'multipla' | 'whatsapp' | 'email'
  titulo: string
  obrigatoria: boolean
  ordem: number
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

// Verifica se o Supabase está configurado corretamente
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && url !== 'https://placeholder-url.supabase.co' && key && key !== 'placeholder-key'
}

// Helper para ler do localStorage (Mock)
const getMockData = (key: string): any[] => {
  const data = localStorage.getItem(`andorinha_mock_${key}`)
  return data ? JSON.parse(data) : []
}

// Helper para salvar no localStorage (Mock)
const saveMockData = (key: string, data: any[]) => {
  localStorage.setItem(`andorinha_mock_${key}`, JSON.stringify(data))
}

export const dbService = {
  // --- PROJETOS ---
  async getProjetos(): Promise<Projeto[]> {
    if (!isSupabaseConfigured()) {
      return getMockData('projeto')
    }
    const { data, error } = await supabase.from('projeto').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async saveProjeto(projeto: Omit<Projeto, 'id' | 'created_at'> & { id?: string }): Promise<Projeto> {
    if (!isSupabaseConfigured()) {
      const projetos = getMockData('projeto')
      if (projeto.id) {
        const index = projetos.findIndex(p => p.id === projeto.id)
        if (index !== -1) {
          projetos[index] = { ...projetos[index], ...projeto }
          saveMockData('projeto', projetos)
          return projetos[index]
        }
      }
      const newProj = {
        id: crypto.randomUUID(),
        ...projeto,
        created_at: new Date().toISOString()
      }
      projetos.push(newProj)
      saveMockData('projeto', projetos)
      return newProj
    }

    if (projeto.id) {
      const { data, error } = await supabase.from('projeto').update(projeto).eq('id', projeto.id).select().single()
      if (error) throw error
      return data
    } else {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('projeto').insert({ ...projeto, user_id: userData.user?.id }).select().single()
      if (error) throw error
      return data
    }
  },

  async deleteProjeto(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const projetos = getMockData('projeto')
      saveMockData('projeto', projetos.filter(p => p.id !== id))
      return
    }
    const { error } = await supabase.from('projeto').delete().eq('id', id)
    if (error) throw error
  },

  // --- LÍDERES ---
  async getLideres(): Promise<Lider[]> {
    if (!isSupabaseConfigured()) {
      return getMockData('lider')
    }
    const { data, error } = await supabase.from('lider').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async saveLider(lider: Omit<Lider, 'id' | 'created_at'> & { id?: string }): Promise<Lider> {
    if (!isSupabaseConfigured()) {
      const lideres = getMockData('lider')
      if (lider.id) {
        const index = lideres.findIndex(l => l.id === lider.id)
        if (index !== -1) {
          lideres[index] = { ...lideres[index], ...lider }
          saveMockData('lider', lideres)
          return lideres[index]
        }
      }
      const newLider = {
        id: crypto.randomUUID(),
        ...lider,
        created_at: new Date().toISOString()
      }
      lideres.push(newLider)
      saveMockData('lider', lideres)
      return newLider
    }

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
    if (!isSupabaseConfigured()) {
      const lideres = getMockData('lider')
      saveMockData('lider', lideres.filter(l => l.id !== id))
      return
    }
    const { error } = await supabase.from('lider').delete().eq('id', id)
    if (error) throw error
  },

  // --- PESQUISAS ---
  async getPesquisas(): Promise<Pesquisa[]> {
    if (!isSupabaseConfigured()) {
      return getMockData('pesquisa')
    }
    const { data, error } = await supabase.from('pesquisa').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getPesquisaById(id: string): Promise<Pesquisa | null> {
    if (!isSupabaseConfigured()) {
      const pesquisas = getMockData('pesquisa')
      return pesquisas.find(p => p.id === id) || null
    }
    const { data, error } = await supabase.from('pesquisa').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  },

  async getPesquisaByToken(token: string): Promise<Pesquisa | null> {
    if (!isSupabaseConfigured()) {
      const pesquisas = getMockData('pesquisa')
      return pesquisas.find(p => p.token === token && p.publicada) || null
    }
    const { data, error } = await supabase.from('pesquisa').select('*').eq('token', token).eq('publicada', true).maybeSingle()
    if (error) throw error
    return data
  },

  async savePesquisa(pesquisa: Omit<Pesquisa, 'id' | 'created_at'> & { id?: string }): Promise<Pesquisa> {
    if (!isSupabaseConfigured()) {
      const pesquisas = getMockData('pesquisa')
      if (pesquisa.id) {
        const index = pesquisas.findIndex(p => p.id === pesquisa.id)
        if (index !== -1) {
          pesquisas[index] = { ...pesquisas[index], ...pesquisa }
          saveMockData('pesquisa', pesquisas)
          return pesquisas[index]
        }
      }
      const newPesquisa = {
        id: crypto.randomUUID(),
        ...pesquisa,
        created_at: new Date().toISOString()
      }
      pesquisas.push(newPesquisa)
      saveMockData('pesquisa', pesquisas)
      return newPesquisa
    }

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
    if (!isSupabaseConfigured()) {
      const pesquisas = getMockData('pesquisa')
      saveMockData('pesquisa', pesquisas.filter(p => p.id !== id))
      
      const perguntas = getMockData('pergunta')
      saveMockData('pergunta', perguntas.filter(q => q.pesquisa_id !== id))
      return
    }
    const { error } = await supabase.from('pesquisa').delete().eq('id', id)
    if (error) throw error
  },

  // --- PERGUNTAS ---
  async getPerguntas(pesquisaId: string): Promise<Pergunta[]> {
    if (!isSupabaseConfigured()) {
      const perguntas = getMockData('pergunta')
      return perguntas.filter(q => q.pesquisa_id === pesquisaId).sort((a, b) => a.ordem - b.ordem)
    }
    const { data, error } = await supabase.from('pergunta').select('*').eq('pesquisa_id', pesquisaId).order('ordem', { ascending: true })
    if (error) throw error
    return data || []
  },

  async syncPerguntas(pesquisaId: string, perguntas: Omit<Pergunta, 'created_at'>[]): Promise<void> {
    if (!isSupabaseConfigured()) {
      const allPerguntas = getMockData('pergunta').filter(q => q.pesquisa_id !== pesquisaId)
      const formatted = perguntas.map(q => ({
        ...q,
        created_at: new Date().toISOString()
      }))
      allPerguntas.push(...formatted)
      saveMockData('pergunta', allPerguntas)
      return
    }

    // Primeiro remove todas as perguntas anteriores da pesquisa
    await supabase.from('pergunta').delete().eq('pesquisa_id', pesquisaId)
    // Depois insere as novas perguntas
    if (perguntas.length > 0) {
      const { error } = await supabase.from('pergunta').insert(perguntas.map(q => {
        const { id, ...rest } = q
        // Se for um UUID válido, mantém. Senão deixa o Supabase gerar.
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        return isUuid ? { id, ...rest } : rest
      }))
      if (error) throw error
    }
  },

  // --- RESPOSTAS ---
  async saveRespostaCompleta(pesquisaId: string, fingerprint: string, itens: { pergunta_id: string; valor: any }[]): Promise<void> {
    if (!isSupabaseConfigured()) {
      const respostas = getMockData('resposta')
      const itensRespostas = getMockData('resposta_item')

      const newRespostaId = crypto.randomUUID()
      const newResposta = {
        id: newRespostaId,
        pesquisa_id: pesquisaId,
        fingerprint,
        created_at: new Date().toISOString()
      }
      respostas.push(newResposta)

      const formattedItens = itens.map(item => ({
        id: crypto.randomUUID(),
        resposta_id: newRespostaId,
        pergunta_id: item.pergunta_id,
        valor: item.valor
      }))
      itensRespostas.push(...formattedItens)

      saveMockData('resposta', respostas)
      saveMockData('resposta_item', itensRespostas)
      return
    }

    // Cria a resposta
    const { data: respData, error: respError } = await supabase.from('resposta').insert({
      pesquisa_id: pesquisaId,
      fingerprint
    }).select().single()

    if (respError) throw respError

    // Cria os itens
    const itemsToInsert = itens.map(item => ({
      resposta_id: respData.id,
      pergunta_id: item.pergunta_id,
      valor: item.valor
    }))

    const { error: itemsError } = await supabase.from('resposta_item').insert(itemsToInsert)
    if (itemsError) throw itemsError
  },

  async hasDeviceResponded(pesquisaId: string, fingerprint: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const respostas = getMockData('resposta')
      return respostas.some(r => r.pesquisa_id === pesquisaId && r.fingerprint === fingerprint)
    }
    const { data, error } = await supabase.from('resposta').select('id').eq('pesquisa_id', pesquisaId).eq('fingerprint', fingerprint).maybeSingle()
    if (error) throw error
    return !!data
  },

  // --- RELATÓRIOS E ANÁLISE ---
  async getRelatorios(pesquisaId: string): Promise<{
    totalRespostas: number
    respostas: {
      id: string
      created_at: string
      valores: Record<string, any>
    }[]
  }> {
    if (!isSupabaseConfigured()) {
      const respostas = getMockData('resposta').filter(r => r.pesquisa_id === pesquisaId)
      const todosItens = getMockData('resposta_item')

      const formatted = respostas.map(r => {
        const itens = todosItens.filter(i => i.resposta_id === r.id)
        const valores: Record<string, any> = {}
        itens.forEach(i => {
          valores[i.pergunta_id] = i.valor
        })
        return {
          id: r.id,
          created_at: r.created_at,
          valores
        }
      })

      return {
        totalRespostas: respostas.length,
        respostas: formatted
      }
    }

    // Busca todas as respostas
    const { data: respostas, error: respError } = await supabase
      .from('resposta')
      .select('id, created_at')
      .eq('pesquisa_id', pesquisaId)
      .order('created_at', { ascending: false })

    if (respError) throw respError

    if (!respostas || respostas.length === 0) {
      return { totalRespostas: 0, respostas: [] }
    }

    const respostaIds = respostas.map(r => r.id)

    // Busca itens das respostas
    const { data: itens, error: itensError } = await supabase
      .from('resposta_item')
      .select('resposta_id, pergunta_id, valor')
      .in('resposta_id', respostaIds)

    if (itensError) throw itensError

    const formatted = respostas.map(r => {
      const rItens = (itens || []).filter(i => i.resposta_id === r.id)
      const valores: Record<string, any> = {}
      rItens.forEach(i => {
        valores[i.pergunta_id] = i.valor
      })
      return {
        id: r.id,
        created_at: r.created_at,
        valores
      }
    })

    return {
      totalRespostas: respostas.length,
      respostas: formatted
    }
  }
}
