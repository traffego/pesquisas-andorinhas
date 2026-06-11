import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  type Connection, 
  type Edge, 
  type Node, 
  MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { dbService, type Fluxo, type Pergunta, type CategoriaCampo } from '../../services/db'
import { StartNode } from '../../components/builder/StartNode'
import { EndNode } from '../../components/builder/EndNode'
import { QuestionNode } from '../../components/builder/QuestionNode'
import { SubflowNode } from '../../components/builder/SubflowNode'
import { ButtonEdge } from '../../components/builder/ButtonEdge'
import { BlockNode } from '../../components/builder/BlockNode'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  X, 
  PlusCircle, 
  Trash2, 
  Sparkles,
  Layers,
  Eye,
  LayoutGrid
} from 'lucide-react'

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  question: QuestionNode,
  subflow: SubflowNode,
  block: BlockNode
}

const edgeTypes = {
  custom: ButtonEdge
}

export const Builder: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [fluxo, setFluxo] = useState<Fluxo | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)

  // Modais
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)

  // Estados do formulário de Pergunta
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [qTitulo, setQTitulo] = useState('')
  const [qTipo, setQTipo] = useState<Pergunta['tipo']>('texto_curto')
  const [qObrigatoria, setQObrigatoria] = useState(true)
  const [qOpcoes, setQOpcoes] = useState<{ id: string; texto: string }[]>([])
  const [newOpcaoTexto, setNewOpcaoTexto] = useState('')
  const [qMaxRespostas, setQMaxRespostas] = useState<string>('1')
  const [qCategoriaId, setQCategoriaId] = useState<string>('')

  // Categorias de campos
  const [categorias, setCategorias] = useState<CategoriaCampo[]>([])

  // Estados do formulário de Aresta Condicional
  const pendingConnectionRef = useRef<Connection | null>(null)
  const [edgeSourceQuestion, setEdgeSourceQuestion] = useState<any | null>(null)

  // Estados do subfluxo
  const [fluxosDisponiveis, setFluxosDisponiveis] = useState<Fluxo[]>([])
  const [isSubflowModalOpen, setIsSubflowModalOpen] = useState(false)
  const [editingSubflowNodeId, setEditingSubflowNodeId] = useState<string | null>(null)
  const [selectedSubflowId, setSelectedSubflowId] = useState<string>('')

  // Estados do Bloco (seleção global)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [editingBlockNodeId, setEditingBlockNodeId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string>('')

  const loadFluxosDisponiveis = async () => {
    try {
      const list = await dbService.getFluxos()
      setFluxosDisponiveis(list)
    } catch (err) {
      console.error(err)
    }
  }

  const loadCategorias = async () => {
    try {
      const list = await dbService.getCategorias()
      setCategorias(list)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (id) {
      loadFluxo(id)
      loadFluxosDisponiveis()
      loadCategorias()
    }
  }, [id])

  const loadFluxo = async (fluxoId: string) => {
    setLoading(true)
    try {
      const flux = await dbService.getFluxoById(fluxoId)
      if (!flux) {
        navigate('/admin/fluxos')
        return
      }
      setFluxo(flux)

      // Carregar nós e arestas do flow_data
      const flow = flux.flow_data || {}
      
      // Mapear callbacks do questionNode e subflowNode nos nós
      const initialNodes = (flow.nodes || []).map((n: Node) => {
        if (n.type === 'question') {
          return {
            ...n,
            data: {
              ...n.data,
              onEdit: handleOpenEditQuestion,
              onDelete: handleDeleteQuestionNode
            }
          }
        }
        if (n.type === 'subflow') {
          return {
            ...n,
            data: {
              ...n.data,
              onEdit: handleOpenEditSubflow,
              onDelete: handleDeleteSubflowNode
            }
          }
        }
        if (n.type === 'block') {
          return {
            ...n,
            data: {
              ...n.data,
              onEdit: handleOpenEditBlock,
              onDelete: handleDeleteBlockNode
            }
          }
        }
        return n
      })

      setNodes(initialNodes)
      setEdges(flow.edges || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // --- LOGICA DE PERGUNTAS (NÓS) ---

  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null)
    setQTitulo('')
    setQTipo('texto_curto')
    setQObrigatoria(true)
    setQOpcoes([])
    setNewOpcaoTexto('')
    setQMaxRespostas('1')
    setQCategoriaId('')
    setIsQuestionModalOpen(true)
  }

  const handleOpenEditQuestion = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const node = nds.find(n => n.id === nodeId)
      if (node) {
        setEditingQuestionId(nodeId)
        setQTitulo(node.data.titulo as string)
        setQTipo(node.data.tipo as Pergunta['tipo'])
        setQObrigatoria(node.data.obrigatoria as boolean)
        setQOpcoes((node.data.config as any)?.opcoes || [])
        setNewOpcaoTexto('')
        const maxR = (node.data.config as any)?.max_respostas
        setQMaxRespostas(maxR ? String(maxR) : 'livre')
        setQCategoriaId((node.data.categoria_id as string) || '')
        setIsQuestionModalOpen(true)
      }
      return nds
    })
  }, [setNodes])

  const handleDeleteQuestionNode = useCallback((nodeId: string) => {
    if (!confirm('Deseja excluir esta pergunta do fluxo? Conexões ligadas a ela serão perdidas.')) return
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  // --- LÓGICA DE SUBFLUXOS (NÓS) ---

  const handleOpenAddSubflow = () => {
    setEditingSubflowNodeId(null)
    setSelectedSubflowId('')
    setIsSubflowModalOpen(true)
  }

  const handleOpenEditSubflow = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const node = nds.find(n => n.id === nodeId)
      if (node) {
        setEditingSubflowNodeId(nodeId)
        setSelectedSubflowId(node.data.subflowId as string || '')
        setIsSubflowModalOpen(true)
      }
      return nds
    })
  }, [setNodes])

  const handleDeleteSubflowNode = useCallback((nodeId: string) => {
    if (!confirm('Deseja excluir este subfluxo do fluxo? Conexões ligadas a ele serão perdidas.')) return
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  const handleSaveSubflow = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubflowId) return

    const subflowFluxo = fluxosDisponiveis.find(f => f.id === selectedSubflowId)
    const subflowTitulo = subflowFluxo ? subflowFluxo.nome : 'Fluxo Desconhecido'

    if (editingSubflowNodeId) {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === editingSubflowNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                subflowId: selectedSubflowId,
                subflowTitulo
              }
            }
          }
          return n
        })
      )
    } else {
      const newId = crypto.randomUUID()
      const newNode: Node = {
        id: newId,
        type: 'subflow',
        position: { x: 250, y: 350 },
        data: {
          id: newId,
          subflowId: selectedSubflowId,
          subflowTitulo,
          onEdit: handleOpenEditSubflow,
          onDelete: handleDeleteSubflowNode
        }
      }
      setNodes((nds) => [...nds, newNode])
    }

    setIsSubflowModalOpen(false)
  }

  // --- LÓGICA DE BLOCOS (NÓS) ---

  const handleOpenAddBlock = () => {
    setEditingBlockNodeId(null)
    setSelectedBlockId('')
    setIsBlockModalOpen(true)
  }

  const handleOpenEditBlock = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const node = nds.find(n => n.id === nodeId)
      if (node) {
        setEditingBlockNodeId(nodeId)
        setSelectedBlockId(node.data.subflowId as string || '')
        setIsBlockModalOpen(true)
      }
      return nds
    })
  }, [setNodes])

  const handleDeleteBlockNode = useCallback((nodeId: string) => {
    if (!confirm('Deseja excluir este bloco do fluxo? Conexões ligadas a ele serão perdidas.')) return
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBlockId) return

    const blockFluxo = fluxosDisponiveis.find(f => f.id === selectedBlockId)
    const subflowTitulo = blockFluxo ? blockFluxo.nome : 'Bloco Desconhecido'

    if (editingBlockNodeId) {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === editingBlockNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                subflowId: selectedBlockId,
                subflowTitulo
              }
            }
          }
          return n
        })
      )
    } else {
      const newId = crypto.randomUUID()
      const newNode: Node = {
        id: newId,
        type: 'block',
        position: { x: 250, y: 350 },
        data: {
          id: newId,
          subflowId: selectedBlockId,
          subflowTitulo,
          onEdit: handleOpenEditBlock,
          onDelete: handleDeleteBlockNode
        }
      }
      setNodes((nds) => [...nds, newNode])
    }

    setIsBlockModalOpen(false)
  }

  const handleAddOpcao = () => {
    if (!newOpcaoTexto.trim()) return
    setQOpcoes([...qOpcoes, { id: crypto.randomUUID(), texto: newOpcaoTexto.trim() }])
    setNewOpcaoTexto('')
  }

  const handleRemoveOpcao = (opcaoId: string) => {
    setQOpcoes(qOpcoes.filter(o => o.id !== opcaoId))
  }

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!qTitulo.trim()) return

    const configOpcoes = qTipo === 'multipla' ? qOpcoes : undefined
    const maxRespostasVal = qTipo === 'multipla' && qMaxRespostas !== 'livre' ? Number(qMaxRespostas) : undefined

    const qData = {
      id: editingQuestionId || crypto.randomUUID(),
      titulo: qTitulo,
      tipo: qTipo,
      obrigatoria: qObrigatoria,
      categoria_id: qCategoriaId || null,
      config: { 
        opcoes: configOpcoes,
        min_respostas: qTipo === 'multipla' ? 1 : undefined,
        max_respostas: maxRespostasVal
      }
    }

    if (editingQuestionId) {
      // Editar nó existente
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === editingQuestionId) {
            return {
              ...n,
              data: {
                ...n.data,
                ...qData
              }
            }
          }
          return n
        })
      )
    } else {
      // Adicionar novo nó de pergunta no centro aproximado
      const newId = qData.id
      const newNode: Node = {
        id: newId,
        type: 'question',
        position: { x: 250, y: 350 },
        data: {
          ...qData,
          onEdit: handleOpenEditQuestion,
          onDelete: handleDeleteQuestionNode
        }
      }
      setNodes((nds) => [...nds, newNode])
    }

    setIsQuestionModalOpen(false)
  }

  // --- LÓGICA DE CONEXÃO (ARESTAS) ---

  const onConnect = useCallback(
    (connection: Connection) => {
      // Validação: Impedir início direto no fim se existirem perguntas
      const hasQuestions = nodes.some(n => n.type === 'question')
      if (connection.source === 'start' && connection.target === 'end' && hasQuestions) {
        alert('Fluxo Inválido! Não ligue o "Início" diretamente no "Fim" se houver perguntas no fluxo.')
        return
      }

      // Verifica se o nó de origem é uma pergunta do tipo Múltipla Escolha
      const sourceNode = nodes.find(n => n.id === connection.source)
      if (sourceNode && sourceNode.type === 'question' && sourceNode.data.tipo === 'multipla') {
        const config = sourceNode.data.config as any
        const maxRespostas = config?.max_respostas

        // Se for múltipla escolha com seleção única (max === 1) e saiu de um handle específico de opção
        if (maxRespostas === 1 && connection.sourceHandle && connection.sourceHandle !== 'output') {
          const opcoes = config?.opcoes || []
          const opt = opcoes.find((o: any) => o.id === connection.sourceHandle)

          if (opt) {
            // Cria a conexão condicional diretamente, pulando o modal
            setEdges((eds) =>
              addEdge(
                {
                  ...connection,
                  type: 'custom',
                  data: {
                    label: opt.texto,
                    opcaoId: opt.id
                  },
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#d97706' }
                },
                eds
              )
            )
            return
          }
        }

        const opcoes = config?.opcoes || []
        if (opcoes.length > 0) {
          // Abre modal para decidir se é condicional e escolher a opção
          pendingConnectionRef.current = connection
          setEdgeSourceQuestion({
            titulo: sourceNode.data.titulo,
            opcoes
          })
          setIsEdgeModalOpen(true)
          return
        }
      }

      // Conexão direta padrão
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'custom',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b' }
          },
          eds
        )
      )
    },
    [nodes, setEdges]
  )

  const handleSaveEdgeCondition = (opcaoId: string | 'incondicional') => {
    const connection = pendingConnectionRef.current
    if (!connection) return

    let edgeData = {}
    if (opcaoId !== 'incondicional' && edgeSourceQuestion) {
      const opt = edgeSourceQuestion.opcoes.find((o: any) => o.id === opcaoId)
      if (opt) {
        edgeData = {
          label: opt.texto,
          opcaoId: opt.id
        }
      }
    }

    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          type: 'custom',
          data: edgeData,
          markerEnd: { 
            type: MarkerType.ArrowClosed, 
            color: opcaoId === 'incondicional' ? '#52525b' : '#d97706' 
          }
        },
        eds
      )
    )

    setIsEdgeModalOpen(false)
    pendingConnectionRef.current = null
    setEdgeSourceQuestion(null)
  }

  // --- SALVAR FLUXO ---

  const handleSaveFlow = async (): Promise<boolean> => {
    if (!fluxo) return false

    // Validações antes de salvar
    // 1. Início conectado a alguma coisa
    const isStartConnected = edges.some(e => e.source === 'start')
    if (!isStartConnected) {
      alert('Aviso: O nó "Início" não está conectado. Conecte-o a uma pergunta para que o fluxo possa começar.')
      return false
    }

    // 2. Fim conectado a alguma coisa
    const isEndConnected = edges.some(e => e.target === 'end')
    if (!isEndConnected) {
      alert('Aviso: O nó "Fim" não está conectado. Conecte o final das perguntas a ele.')
      return false
    }

    try {
      // 1. Estrutura flow_data
      const flowData = {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            id: n.data.id,
            titulo: n.data.titulo,
            tipo: n.data.tipo,
            obrigatoria: n.data.obrigatoria,
            config: n.data.config,
            subflowId: n.data.subflowId,
            subflowTitulo: n.data.subflowTitulo,
            perguntas: n.data.perguntas,
            categoria_id: n.data.categoria_id
          }
        })),
        edges
      }

      // 2. Mapeia e atualiza a tabela fluxo
      await dbService.saveFluxo({
        ...fluxo,
        flow_data: flowData
      })

      // 3. Sincroniza tabela de perguntas
      const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y)
      const perguntas: Omit<Pergunta, 'created_at'>[] = []
      let ordem = 1

      sortedNodes.forEach(node => {
        if (node.type === 'question') {
          perguntas.push({
            id: node.id,
            fluxo_id: fluxo.id,
            tipo: node.data.tipo as Pergunta['tipo'],
            titulo: node.data.titulo as string,
            obrigatoria: node.data.obrigatoria as boolean,
            ordem: ordem++,
            categoria_id: (node.data.categoria_id as string) || null,
            config: node.data.config as any
          })
        } else if (node.type === 'block') {
          // Blocos reutilizáveis são fluxos independentes; não sincronizar aqui
        }
      })

      await dbService.syncPerguntas(fluxo.id, perguntas)
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  const handlePreview = async () => {
    const saved = await handleSaveFlow()
    if (saved) {
      setIsPreviewModalOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-8 relative bg-zinc-950">
      {/* Top Header */}
      <div className="h-16 border-b border-zinc-900 px-6 flex items-center justify-between bg-zinc-900/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/fluxos"
            className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">{fluxo?.nome}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddSubflow}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <Layers className="h-4 w-4" />
            Adicionar Subfluxo
          </button>
          <button
            onClick={handleOpenAddBlock}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <LayoutGrid className="h-4 w-4" />
            Adicionar Bloco
          </button>
          <button
            onClick={handleOpenAddQuestion}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Adicionar Pergunta
          </button>
          <button
            onClick={handlePreview}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <Eye className="h-4 w-4" />
            Visualizar Preview
          </button>
          <button
            onClick={handleSaveFlow}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            Salvar Fluxo
          </button>
        </div>
      </div>

      {/* Editor React Flow */}
      <div className="flex-1 min-h-0 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          colorMode="dark"
        >
          <Background color="#27272a" gap={16} size={1} />
          <Controls showInteractive={false} />
          

        </ReactFlow>
      </div>

      {/* MODAL 1: ADICIONAR / EDITAR PERGUNTA */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-5">
              <h3 className="text-lg font-bold text-zinc-100">
                {editingQuestionId ? 'Editar Pergunta' : 'Criar Nova Pergunta'}
              </h3>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Tipo de Pergunta
                </label>
                <select
                  value={qTipo}
                  onChange={(e) => setQTipo(e.target.value as Pergunta['tipo'])}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-200 focus:border-primary focus:outline-none transition-colors text-sm"
                >
                  <option value="texto_curto">Texto Curto</option>
                  <option value="textarea">Texto Longo</option>
                  <option value="multipla">Múltipla Escolha</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">E-mail</option>
                  <option value="cpf">CPF</option>
                  <option value="cep">CEP</option>
                  <option value="estado">Estado (UF)</option>
                  <option value="cidade">Cidade</option>
                  <option value="bairro">Bairro</option>
                  <option value="logradouro">Logradouro (Rua/Av/etc.)</option>
                  <option value="numero">Número</option>
                  <option value="avaliacao">Avaliação (0 – 10)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Título da Pergunta / Enunciado
                </label>
                <input
                  type="text"
                  required
                  value={qTitulo}
                  onChange={(e) => setQTitulo(e.target.value)}
                  placeholder="Ex: Qual o seu nível de satisfação?"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder-zinc-650 focus:border-primary focus:outline-none transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Categoria do Campo
                </label>
                <select
                  value={qCategoriaId}
                  onChange={(e) => setQCategoriaId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-200 focus:border-primary focus:outline-none transition-colors text-sm"
                >
                  <option value="">— Sem categoria —</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
                {categorias.length === 0 && (
                  <p className="text-[10px] text-zinc-500 mt-1.5">
                    Crie categorias em Fluxos → Categorias de Campos.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 p-4 rounded-xl">
                <span className="text-sm font-bold text-zinc-300">Obrigatório</span>
                <button
                  type="button"
                  onClick={() => setQObrigatoria(!qObrigatoria)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    qObrigatoria ? 'bg-primary' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      qObrigatoria ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {qTipo === 'multipla' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Quantidade de respostas
                  </label>
                  <select
                    value={qMaxRespostas}
                    onChange={(e) => setQMaxRespostas(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-200 focus:border-primary focus:outline-none transition-colors text-sm"
                  >
                    <option value="1">só 1</option>
                    <option value="2">até 2</option>
                    <option value="3">até 3</option>
                    <option value="5">até 5</option>
                    <option value="livre">livre</option>
                  </select>
                </div>
              )}

              {/* OPÇÕES DA MÚLTIPLA ESCOLHA */}
              {qTipo === 'multipla' && (
                <div className="space-y-3 border-t border-zinc-800 pt-4">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Opções de Escolha
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOpcaoTexto}
                      onChange={(e) => setNewOpcaoTexto(e.target.value)}
                      placeholder="Adicione uma opção..."
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-zinc-100 placeholder-zinc-650 focus:border-primary focus:outline-none text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddOpcao()
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddOpcao}
                      className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-all cursor-pointer"
                    >
                      <PlusCircle className="h-5 w-5" />
                    </button>
                  </div>

                  {qOpcoes.length === 0 ? (
                    <p className="text-xs text-zinc-650 italic">Adicione opções para poder definir o fluxo condicional.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                      {qOpcoes.map((op) => (
                        <div key={op.id} className="flex justify-between items-center bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                          <span className="text-sm text-zinc-300">{op.texto}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOpcao(op.id)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-lg shadow-primary/20 transition-all"
                >
                  {editingQuestionId ? 'Salvar Alterações' : 'Criar Pergunta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DEFINIR REGRA CONDICIONAL DE CONEXÃO */}
      {isEdgeModalOpen && edgeSourceQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex gap-2 items-center text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">
              <Sparkles className="h-4 w-4" />
              <span>Conexão Condicional</span>
            </div>
            
            <h3 className="text-base font-bold text-zinc-100 mb-1">
              Origem: Múltipla Escolha
            </h3>
            <p className="text-xs text-zinc-450 mb-5 leading-relaxed">
              Você puxou uma conexão de <strong>{edgeSourceQuestion.titulo}</strong>. Selecione se esta rota é condicional:
            </p>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {/* Opção Incondicional */}
              <button
                onClick={() => handleSaveEdgeCondition('incondicional')}
                className="w-full text-left p-3.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/60 transition-all flex flex-col justify-start gap-0.5 cursor-pointer"
              >
                <span className="text-sm font-bold text-zinc-200">Rota Padrão (Incondicional)</span>
                <span className="text-[10px] text-zinc-500">Segue sempre, caso nenhuma outra condicional seja correspondida.</span>
              </button>

              {/* Lista de Opções Condicionais */}
              <div className="border-t border-zinc-800 my-2 pt-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 pl-1">Filtrar por opção</p>
                {edgeSourceQuestion.opcoes.map((op: any) => (
                  <button
                    key={op.id}
                    onClick={() => handleSaveEdgeCondition(op.id)}
                    className="w-full text-left p-3 rounded-xl border border-amber-900/20 hover:border-amber-700/60 bg-amber-950/10 hover:bg-amber-950/20 transition-all flex items-center justify-between gap-3 cursor-pointer mb-2 last:mb-0"
                  >
                    <div>
                      <span className="text-xs font-bold text-amber-300">Somente se responder:</span>
                      <p className="text-sm text-zinc-200 font-semibold mt-0.5">{op.texto}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-zinc-800 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setIsEdgeModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 rounded-xl transition-all"
              >
                Cancelar Conexão
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 3: SELECIONAR PESQUISA PARA SUBFLUXO */}
      {isSubflowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-5">
              <h3 className="text-lg font-bold text-zinc-100">
                {editingSubflowNodeId ? 'Editar Subfluxo' : 'Adicionar Subfluxo'}
              </h3>
              <button
                onClick={() => setIsSubflowModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubflow} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Selecionar Fluxo de Destino
                </label>
                <select
                  required
                  value={selectedSubflowId}
                  onChange={(e) => setSelectedSubflowId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-200 focus:border-primary focus:outline-none transition-colors text-sm"
                >
                  <option value="" disabled>Escolha um fluxo...</option>
                  {fluxosDisponiveis
                    .filter((f) => f.id !== id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsSubflowModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-lg shadow-primary/20 transition-all"
                >
                  {editingSubflowNodeId ? 'Salvar Alterações' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VISUALIZAÇÃO PREVIEW (IFRAME) */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md h-[85vh] bg-zinc-950 rounded-3xl border border-zinc-800 flex flex-col shadow-2xl overflow-hidden relative animate-scale-up">
            {/* Header */}
            <div className="flex justify-between items-center bg-zinc-900 border-b border-zinc-800 px-5 py-4 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Preview do Fluxo
                </h3>
                <p className="text-[10px] text-zinc-400">Simulador de respostas interativo</p>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-250 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Iframe Body */}
            <div className="flex-1 min-h-0 bg-background relative">
              <iframe
                src={`/r/preview?fluxo=${id}`}
                title="Visualização Prévia"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADICIONAR / EDITAR BLOCO */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-5">
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-sky-400" />
                {editingBlockNodeId ? 'Editar Bloco' : 'Adicionar Bloco Reutilizável'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Selecionar Bloco Reutilizável
                </label>
                <select
                  required
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-zinc-200 focus:border-sky-500 focus:outline-none transition-colors text-sm"
                >
                  <option value="" disabled>Escolha um bloco...</option>
                  {fluxosDisponiveis
                    .filter((f) => f.tipo === 'bloco')
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                </select>
                {fluxosDisponiveis.filter(f => f.tipo === 'bloco').length === 0 && (
                  <p className="text-xs text-amber-400 mt-2">
                    Nenhum bloco criado ainda. Crie blocos na aba "Blocos Reutilizáveis" em Fluxos.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                >
                  {editingBlockNodeId ? 'Salvar Alterações' : 'Adicionar Bloco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
