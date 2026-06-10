import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { LayoutGrid, Edit2, Trash2 } from 'lucide-react'

interface BlockNodeProps {
  data: {
    id: string
    titulo: string
    perguntas?: { id: string; titulo: string; tipo: string }[]
    onEdit: (id: string) => void
    onDelete: (id: string) => void
  }
}

export const BlockNode: React.FC<BlockNodeProps> = ({ data }) => {
  const perguntas = data.perguntas || []

  return (
    <div className="px-5 py-4 rounded-2xl border border-zinc-800 border-l-4 border-l-sky-500 text-sky-400 bg-sky-950/20 bg-zinc-900 shadow-xl min-w-[260px] max-w-[320px] relative transition-all hover:border-zinc-700/80">
      {/* Target Handle (Entrada superior) */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{ background: '#52525b', width: 8, height: 8 }}
      />

      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Bloco de Campos</span>
          </div>
          <h4 className="text-sm font-bold text-zinc-100 line-clamp-2 leading-snug break-words">
            {data.titulo || <span className="italic text-zinc-600 font-normal">Bloco Sem Nome</span>}
          </h4>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => data.onEdit(data.id)}
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Editar Bloco"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => data.onDelete(data.id)}
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Excluir Bloco"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Lista de Campos Internos */}
      <div className="mt-3 space-y-1.5 border-t border-zinc-800/80 pt-3">
        {perguntas.length === 0 ? (
          <p className="text-[10px] text-zinc-500 italic">Nenhum campo adicionado</p>
        ) : (
          perguntas.map((p) => (
            <div key={p.id} className="bg-zinc-950/40 border border-zinc-850 rounded-xl px-3 py-1.5 text-[11px] text-zinc-300 truncate">
              <span className="font-semibold text-sky-400/90 mr-1.5">[{p.tipo}]</span>
              {p.titulo}
            </div>
          ))
        )}
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
