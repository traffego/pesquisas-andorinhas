import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Play } from 'lucide-react'

export const StartNode: React.FC = () => {
  return (
    <div className="px-5 py-3.5 rounded-2xl border border-violet-800 bg-zinc-900 shadow-xl shadow-violet-950/20 flex items-center gap-3 min-w-[150px] relative">
      <div className="bg-violet-950/50 p-2 rounded-xl text-violet-400 border border-violet-900/50">
        <Play className="h-4 w-4 fill-violet-400" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Início</p>
        <p className="text-sm font-bold text-zinc-100">Ponto de Partida</p>
      </div>
      
      {/* Apenas saída inferior */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{ background: '#7c3aed', width: 10, height: 10 }}
      />
    </div>
  )
}
