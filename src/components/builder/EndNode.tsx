import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { CheckCircle2 } from 'lucide-react'

export const EndNode: React.FC = () => {
  return (
    <div className="px-5 py-3.5 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl flex items-center gap-3 min-w-[150px] relative">
      <div className="bg-zinc-950 p-2 rounded-xl text-emerald-500 border border-zinc-800">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Fim</p>
        <p className="text-sm font-bold text-zinc-100">Pesquisa Concluída</p>
      </div>

      {/* Apenas entrada superior */}
      <Handle
        type="target"
        position={Position.Top}
        id="a"
        style={{ background: '#3f3f46', width: 10, height: 10 }}
      />
    </div>
  )
}
