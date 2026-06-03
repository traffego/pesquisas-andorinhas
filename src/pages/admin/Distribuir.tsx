import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { dbService, type Pesquisa } from '../../services/db'
import { QRCodeCanvas } from 'qrcode.react'
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  MessageSquare,
  Info
} from 'lucide-react'

export const Distribuir: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qrRef = useRef<HTMLDivElement>(null)

  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Ações do link
  const [copied, setCopied] = useState(false)
  const [whatsMsg, setWhatsMsg] = useState('')

  const linkPublico = pesquisa 
    ? `${window.location.origin}/r/${pesquisa.token}`
    : ''

  useEffect(() => {
    if (id) {
      loadPesquisa(id)
    }
  }, [id])

  useEffect(() => {
    if (pesquisa) {
      setWhatsMsg(
        `Olá! Gostaria de convidar você para responder a nossa pesquisa rápida: "${pesquisa.titulo}".\n\nLeva apenas 2 minutos! Acesse o link abaixo:\n${linkPublico}`
      )
    }
  }, [pesquisa, linkPublico])

  const loadPesquisa = async (pesquisaId: string) => {
    setLoading(true)
    try {
      const pesq = await dbService.getPesquisaById(pesquisaId)
      if (!pesq) {
        navigate('/admin/pesquisas')
        return
      }
      setPesquisa(pesq)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(linkPublico)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQRCode = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return

    const pngUrl = canvas
      .toDataURL('image/png')
      .replace('image/png', 'image/octet-stream')

    const downloadLink = document.createElement('a')
    downloadLink.href = pngUrl
    downloadLink.download = `qrcode_${pesquisa?.token || 'pesquisa'}.png`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  const handleShareWhatsApp = () => {
    const encodedText = encodeURIComponent(whatsMsg)
    const url = `https://api.whatsapp.com/send?text=${encodedText}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin/pesquisas"
          className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Distribuição da Pesquisa</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Opções de compartilhamento e QR Code da pesquisa pública.</p>
        </div>
      </div>

      {!pesquisa?.publicada && (
        <div className="bg-amber-950/20 border border-amber-900/50 rounded-2xl p-4 text-sm text-amber-300 flex gap-3">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">A pesquisa está salva como Rascunho</p>
            <p className="text-amber-400/80 mt-1 leading-relaxed">
              O link público só funcionará corretamente após você ativar o status "Publicada" na listagem de pesquisas ou no menu anterior.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        {/* Lado Esquerdo: Link e WhatsApp */}
        <div className="space-y-6">
          {/* Card Link */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Link de Acesso Direto</h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={linkPublico}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-300 text-sm focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className={`px-4 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  copied 
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Este link é otimizado para celulares. O respondente preencherá uma pergunta por vez de maneira ágil.
            </p>
          </div>

          {/* Card WhatsApp */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-400 animate-bounce" />
              Compartilhar no WhatsApp
            </h3>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Mensagem Customizada
              </label>
              <textarea
                value={whatsMsg}
                onChange={(e) => setWhatsMsg(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-300 text-sm focus:border-primary focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 shadow-lg shadow-emerald-950/40 active:scale-[0.98] transition-all cursor-pointer text-sm"
            >
              <Share2 className="h-4 w-4" />
              Enviar pelo WhatsApp
            </button>
          </div>
        </div>

        {/* Lado Direito: QR Code */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col items-center justify-center text-center space-y-6">
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Acesso por QR Code</h3>

          {/* Canvas Wrapper */}
          <div 
            ref={qrRef}
            className="p-6 bg-white rounded-3xl border-4 border-zinc-800 shadow-2xl relative"
          >
            <QRCodeCanvas
              value={linkPublico}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>

          <div className="space-y-4 max-w-xs">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ideal para impressão em panfletos, cartazes de campanha, mesas de votação ou tablets presenciais.
            </p>
            
            <button
              onClick={downloadQRCode}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-3 text-sm transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Baixar Imagem PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
