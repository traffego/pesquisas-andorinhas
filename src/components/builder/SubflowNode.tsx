import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Layers, Edit2, Trash2 } from 'lucide-react'

interface SubflowNodeProps {
  data: {
    id: string
    subflowId?: string
    subflowTitulo?: string
    onEdit: (id: string) => void
    onDelete: (id: string) => void
  }
}

export const SubflowNode: React.FC<SubflowNodeProps> = ({ data }) => {
  return (
    <div className="px-5 py-4 rounded-2xl border border-zinc-800 border-l-4 border-l-indigo-500 text-indigo-400 bg-zinc-900 shadow-xl min-w-[260px] max-w-[320px] relative transition-all hover:border-zinc-700/80">
      {/* Target Handle (Entrada superior) */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{ background: '#6366f1', width: 8, height: 8 }}
      />

      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Subfluxo</span>
          </div>
          <h4 className="text-sm font-bold text-zinc-100 line-clamp-2 leading-snug break-words">
            {data.subflowTitulo || (
              <span className="italic text-zinc-500 font-normal">Nenhuma pesquisa selecionada</span>
            )}
          </h4>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => data.onEdit(data.id)}
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Selecionar Pesquisa"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => data.onDelete(data.id)}
            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Excluir Subfluxo"
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
        style={{ background: '#6366f1', width: 8, height: 8 }}
      />
    </div>
  )
}
