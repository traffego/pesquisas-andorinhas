---
name: fluxos-e-pesquisas
description: >-
  Guia completo, runbook técnico e regras de arquitetura para criação, edição e depuração de Fluxos, Perguntas, Blocos e Pesquisas no sistema Andorinhas. Use sempre que o usuário pedir para criar, modificar, inspecionar ou solucionar problemas em fluxos no Builder, perguntas no banco Supabase, distribuição ou formulário de resposta.
---

# Fluxos e Pesquisas — Andorinhas

Este documento estabelece o guia oficial de arquitetura, fluxo de dados e regras de implementação para o módulo de questionários e pesquisas do sistema.

---

## 1. Modelo de Dados e Entidades (Supabase)

O ecossistema divide-se nas seguintes entidades no banco de dados:

- **`objeto`**: Projeto ou Evento/Termo de Fomento vinculado à pesquisa.
- **`lider`**: Responsável/articulador associado à pesquisa.
- **`categoria_campo`**: Categorias temáticas vinculadas às perguntas para consolidação analítica e relatórios territoriais.
- **`fluxo`**: Estrutura lógica e grafo das perguntas.
  - `tipo`: `'fluxo'` (questionário navegável pergunta a pergunta) ou `'bloco'` (grupo de campos exibidos juntos na mesma tela).
  - `flow_data`: Grafo do `@xyflow/react` com nós (`nodes`) e arestas (`edges`).
- **`pesquisa`**: Instância de coleta pública que conecta um `objeto`, um `lider` e um `fluxo`.
  - `token`: Identificador alfanumérico único (10 caracteres) para acesso público via rota `/r/:token`.
  - `publicada`: Booleano que governa as políticas de RLS no Supabase.
  - `exigir_cpf`: Habilita barreira prévia de CPF antes de responder.
- **`pergunta`**: Tabela relacional sincronizada a partir do `flow_data`.
- **`resposta`** e **`resposta_item`**: Sessão de resposta do respondente e valores preenchidos.

---

## 2. Módulo de Fluxos e Visual Builder (`Builder.tsx`)

### Tipos de Nós (`nodes`)
1. **`start`**: Nó de entrada obrigatório.
2. **`end`**: Nó de saída obrigatório.
3. **`question`**: Pergunta individual.
   - Tipos suportados: `texto_curto`, `textarea`, `multipla`, `whatsapp`, `email`, `cpf`, `cep`, `estado`, `cidade`, `bairro`, `logradouro`, `numero`, `avaliacao`.
   - Pode conter `categoria_id` (chave estrangeira para `categoria_campo`).
4. **`block`**: Referencia um fluxo com `tipo = 'bloco'`. No preenchimento, todas as perguntas desse bloco são renderizadas agrupadas na mesma tela.
5. **`subflow`**: Referencia outro fluxo com `tipo = 'fluxo'`. No preenchimento, o sistema empilha o estado atual (`subflowStack`), navega pergunta a pergunta pelo subfluxo e depois retorna ao fluxo pai.

### Conexões e Arestas (`edges`)
- **Aresta Simples (`#52525b`)**: Avanço incondicional entre nós.
- **Aresta Condicional (`#d97706`)**:
  - Habilitada para perguntas do tipo `multipla` com **seleção única** (`max_respostas === 1`).
  - Cada opção individual possui seu próprio Handle lateral âmbar (`id = opcao.id`).
  - O conector inferior geral é suprimido para evitar ambiguidades.
  - A aresta carrega `data: { label: opt.texto, opcaoId: opt.id }`.

### Regras de Persistência e Sincronização
Ao salvar um fluxo (`handleSaveFlow`):
1. **Validação**: Verifica se `start` tem saída conectada e se `end` tem entrada conectada. Bloqueia conexão direta `start` -> `end` se houver perguntas.
2. **`flow_data`**: Salva nós e arestas no campo JSONB da tabela `fluxo`.
3. **Sincronização com `pergunta` (`syncPerguntas`)**:
   - As perguntas são ordenadas no banco pela coordenada vertical dos nós:
     `nodes.sort((a, b) => a.position.y - b.position.y)`.
   - Isso garante que a ordem espacial na tela corresponda à ordem analítica no banco de dados.

---

## 3. Módulo de Pesquisas (`Pesquisas.tsx`)

### Ciclo de Vida da Pesquisa
- **Geração de Token**: 10 caracteres alfanuméricos aleatórios no momento do cadastro.
- **Imutabilidade do Token**: Durante a edição de uma pesquisa existente, o token jamais pode ser sobrescrito ou recalculado, sob risco de invalidar QR Codes e links impressos.
- **Quick Add**: O formulário permite criar novos Objetos ou Líderes inline sem perder o contexto do modal.

### Rota e Distribuição (`Distribuir.tsx`)
- Rota pública oficial: `/r/:token`.
- Geração de QR Code em canvas com download automático (`qrcode_<token>.png`).
- Compartilhamento nativo via WhatsApp com mensagem formatada.

---

## 4. Formulário Público de Resposta (`Responder.tsx`)

1. **Barreira de CPF**:
   - Se `exigir_cpf = true`, valida o CPF algorítmicamente antes de liberar o questionário.
   - Checa duplicidade com `dbService.hasCpfResponded(pesquisaId, cpf)`. Se já respondeu, impede nova submissão.
   - Bypass para testes internos: CPF `'1111111111x'`.
2. **Fingerprint**:
   - Gravado no `localStorage` e submetido em `resposta.fingerprint` para auditoria, mas não bloqueia preenchimento se `exigir_cpf` estiver desativado (compatível com coletas em eventos/tablets).
3. **Consultas Externas e Componentes Dinâmicos**:
   - `estado` e `cidade`: Busca cidades em tempo real na API do IBGE (`https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios`).
   - `logradouro`: Seletor de tipo de via (*Rua, Avenida, etc.*) combinado com input de texto.
   - `avaliacao`: Escala 0 a 10 com paleta semafórica (vermelho, amarelo, verde).
4. **Gravação**:
   - Ao atingir o nó `end`, invoca `dbService.saveRespostaCompleta`, persistindo a sessão em `resposta` e cada campo em `resposta_item`.
