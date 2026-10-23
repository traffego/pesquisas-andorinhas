import { type ConfigZApi, type Participante } from './db'

export interface EnvioResultado {
  sucesso: boolean
  messageId?: string
  zaapId?: string
  erro?: string
}

export class ZApiService {
  /**
   * Higieniza e formata o telefone para o padrão internacional exigido pelo WhatsApp (DDI 55 + DDD + número)
   * Regra canônica da skill Z-API: sem espaços, sem hífens e com 55.
   */
  static formatarTelefone(phone: string): string {
    const limpo = (phone || '').replace(/\D/g, '')
    if (!limpo) return ''
    return limpo.startsWith('55') ? limpo : `55${limpo}`
  }

  /**
   * Valida se a configuração possui os 3 itens essenciais de autenticação
   */
  static isConfigValida(config: ConfigZApi | null): boolean {
    if (!config) return false
    return !!(
      config.instance_id &&
      config.instance_id.trim() !== '' &&
      config.instance_token &&
      config.instance_token.trim() !== '' &&
      config.client_token &&
      config.client_token.trim() !== ''
    )
  }

  /**
   * Envia mensagem de texto via Z-API REST API
   * Endpoint: POST https://api.z-api.io/instances/{instanceId}/token/{token}/send-text
   * Headers: Client-Token
   */
  static async enviarTexto(
    config: ConfigZApi,
    phone: string,
    message: string
  ): Promise<EnvioResultado> {
    const formattedPhone = this.formatarTelefone(phone)

    if (formattedPhone.length < 12) {
      return {
        sucesso: false,
        erro: 'Número de telefone incompleto ou inválido.'
      }
    }

    const url = `https://api.z-api.io/instances/${config.instance_id.trim()}/token/${config.instance_token.trim()}/send-text`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': config.client_token.trim()
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          sucesso: false,
          erro: data?.message || data?.error || `Erro Z-API [HTTP ${response.status}]`
        }
      }

      return {
        sucesso: true,
        messageId: data.messageId || data.id,
        zaapId: data.zaapId
      }
    } catch (err: any) {
      return {
        sucesso: false,
        erro: err?.message || 'Falha na comunicação com o servidor Z-API.'
      }
    }
  }

  /**
   * Personaliza o template da mensagem com as variáveis do atleta e da corrida
   */
  static personalizarMensagem(
    template: string,
    part: Participante,
    linkPesquisa: string,
    nomeCorrida: string
  ): string {
    let msg = template || 'Olá, {{nome}}! Responda nossa pesquisa rápida sobre a {{corrida}}: {{link}}'
    
    // Primeiro nome para ficar mais amigável
    const primeiroNome = (part.nome || '').trim().split(' ')[0]
    
    msg = msg.replace(/\{\{nome\}\}/gi, part.nome || '')
    msg = msg.replace(/\{\{primeiro_nome\}\}/gi, primeiroNome)
    msg = msg.replace(/\{\{corrida\}\}/gi, nomeCorrida || 'Corrida Atleta Para Sempre')
    msg = msg.replace(/\{\{link\}\}/gi, linkPesquisa)
    msg = msg.replace(/\{\{distancia\}\}/gi, part.dados_extras?.distancia || '5KM')
    msg = msg.replace(/\{\{peito\}\}/gi, part.dados_extras?.peito || part.dados_extras?.num || '')
    
    return msg
  }

  /**
   * Gera link de fallback wa.me caso a Z-API não esteja configurada
   */
  static gerarLinkWaMe(phone: string, message: string): string {
    const formatted = this.formatarTelefone(phone)
    const encoded = encodeURIComponent(message)
    return `https://wa.me/${formatted}?text=${encoded}`
  }
}
