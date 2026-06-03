import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { 
  Type, 
  AlignLeft, 
  ListTodo, 
  MessageSquareCode, 
  Mail, 
  Edit2, 
  Trash2 
} from 'lucide-react'

interface QuestionNodeProps {
  data: {
    id: string
    titulo: string
    tipo: 'texto_curto' | 'textarea' | 'multipla' | 'whatsapp' | 'email'
    obrigatoria: boolean
    onEdit: (id: string) => void
    onDelete: (id: string) => void
  }
}

export const QuestionNode: React.FC<QuestionNodeProps> = ({ data }) => {
  const getTipoInfo = () => {
    switch (data.tipo) {
      case 'texto_curto':
        return { label: 'Texto Curto', icon: Type, color: 'border-l-blue-500 text-blue-400 bg-blue-950/20' }
      case 'textarea':
        return { label: 'Texto Longo', icon: AlignLeft, color: 'border-l-violet-500 text-violet-400 bg-violet-950/20' }
      case 'multipla':
        return { label: 'Múltipla Escolha', icon: ListTodo, color: 'border-l-amber-500 text-amber-400 bg-amber-950/20' }
      case 'whatsapp':
        return { label: 'WhatsApp', icon: MessageSquareCode, color: 'border-l-emerald-500 text-emerald-400 bg-emerald-950/20' }
      case 'email':
        return { label: 'E-mail', icon: Mail, color: 'border-l-pink-500 text-pink-400 bg-pink-950/20' }
      default:
        return { label: 'Pergunta', icon: Type, color: 'border-l-zinc-500 text-zinc-400 bg-zinc-950/20' }
    }
  }

  const info = getTipoInfo()
  const Icon = info.icon

  return (
    <div className={`px-5 py-4 rounded-2xl border border-zinc-800 border-l-4 ${info.color} bg-zinc-900 shadow-xl min-w-[260px] max-w-[320px] relative transition-all hover:border-zinc-700/80`}>
      {/* Target Handle (Entrada superior) */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{ background: '#52525b', width: 8, height: 8 }}
      />

      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{info.label}</span>
            {data.obrigatoria && (
              <span className="text-[9px] bg-red-950/40 border border-red-900/30 text-red-400 px-1.5 py-0.2 rounded-full font-bold">
                Obrigatório
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-zinc-100 line-clamp-2 leading-snug">
            {data.titulo || <span className="italic text-zinc-600 font-normal">Sem título</span>}
          </h4>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => data.onEdit(data.id)}
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Editar Pergunta"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => data.onDelete(data.id)}
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Excluir Pergunta"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Source Handle (Saída inferior) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{ background: '#52525b', width: 8, height: 8 }}
      />
    </div>
  )
}
