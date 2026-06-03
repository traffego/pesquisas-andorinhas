import React, { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from '@xyflow/react'

export const ButtonEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const { setEdges } = useReactFlow()
  const [isHovered, setIsHovered] = useState(false)
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    setEdges((edges) => edges.filter((edge) => edge.id !== id))
  }

  const label = data?.label as string | undefined
  const isConditional = !!label

  return (
    <>
      {/* Path invisível e mais largo para capturar hover/mouse de forma estável */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={15}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          strokeWidth: isConditional ? 2.5 : 2, 
          stroke: isConditional ? '#d97706' : '#52525b' 
        }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="nodrag nopan flex flex-col items-center gap-1 group/edge"
        >
          {label && (
            <span className="px-2 py-0.5 bg-amber-950 border border-amber-900/60 text-amber-300 rounded-lg text-[9px] font-bold shadow-lg whitespace-nowrap">
              Se: {label}
            </span>
          )}
          <button
            onClick={onEdgeClick}
            style={{
              opacity: isHovered ? 1 : 0,
              pointerEvents: isHovered ? 'all' : 'none',
              transition: 'opacity 150ms ease-in-out, transform 150ms ease-in-out'
            }}
            className="w-5 h-5 bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-950 hover:bg-red-950/20 rounded-full flex items-center justify-center text-[10px] font-extrabold cursor-pointer shadow-xl scale-90 hover:scale-110 active:scale-95"
            title="Deletar Conexão"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
