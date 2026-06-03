-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Objetos (Projeto ou Evento)
CREATE TABLE IF NOT EXISTS objeto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT CHECK (tipo IN ('projeto', 'evento')) NOT NULL DEFAULT 'projeto',
  termo_fomento TEXT,
  codigo_objeto TEXT,
  codigo_programa TEXT,
  nome_programa TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- 2. Tabela de Líderes
CREATE TABLE IF NOT EXISTS lider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- 3. Tabela de Fluxos (logic graph of questions)
CREATE TABLE IF NOT EXISTS fluxo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  flow_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- 4. Tabela de Pesquisas (instances using a flow)
CREATE TABLE IF NOT EXISTS pesquisa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  token TEXT UNIQUE NOT NULL,
  publicada BOOLEAN DEFAULT false NOT NULL,
  objeto_id UUID REFERENCES objeto(id) ON DELETE CASCADE,
  lider_id UUID REFERENCES lider(id) ON DELETE SET NULL,
  fluxo_id UUID REFERENCES fluxo(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- 5. Tabela de Perguntas (linked to a flow)
CREATE TABLE IF NOT EXISTS pergunta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fluxo_id UUID REFERENCES fluxo(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('texto_curto', 'textarea', 'multipla', 'whatsapp', 'email')) NOT NULL,
  titulo TEXT NOT NULL,
  obrigatoria BOOLEAN DEFAULT true NOT NULL,
  ordem INTEGER NOT NULL,
  config JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Respostas (Sessão de resposta vinculada a pesquisa)
CREATE TABLE IF NOT EXISTS resposta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id UUID REFERENCES pesquisa(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Itens de Resposta
CREATE TABLE IF NOT EXISTS resposta_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id UUID REFERENCES resposta(id) ON DELETE CASCADE,
  pergunta_id UUID REFERENCES pergunta(id) ON DELETE CASCADE,
  valor JSONB NOT NULL
);

-- ==========================================
-- HABILITAR RLS (ROW LEVEL SECURITY)
-- ==========================================

ALTER TABLE objeto ENABLE ROW LEVEL SECURITY;
ALTER TABLE lider ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesquisa ENABLE ROW LEVEL SECURITY;
ALTER TABLE pergunta ENABLE ROW LEVEL SECURITY;
ALTER TABLE resposta ENABLE ROW LEVEL SECURITY;
ALTER TABLE resposta_item ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS RLS (OBJETO)
-- ==========================================

CREATE POLICY "Dono gerencia seus objetos" ON objeto
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leitura pública de objetos" ON objeto
  FOR SELECT TO public
  USING (true);

-- ==========================================
-- POLÍTICAS RLS (LÍDER)
-- ==========================================

CREATE POLICY "Dono gerencia seus lideres" ON lider
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leitura pública de lideres" ON lider
  FOR SELECT TO public
  USING (true);

-- ==========================================
-- POLÍTICAS RLS (FLUXO)
-- ==========================================

CREATE POLICY "Dono gerencia seus fluxos" ON fluxo
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leitura pública de fluxos de pesquisas publicadas" ON fluxo
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM pesquisa
    WHERE pesquisa.fluxo_id = fluxo.id AND pesquisa.publicada = true
  ));

-- ==========================================
-- POLÍTICAS RLS (PESQUISA)
-- ==========================================

CREATE POLICY "Dono gerencia suas pesquisas" ON pesquisa
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leitura pública de pesquisas publicadas" ON pesquisa
  FOR SELECT TO public
  USING (publicada = true);

-- ==========================================
-- POLÍTICAS RLS (PERGUNTA)
-- ==========================================

CREATE POLICY "Dono gerencia perguntas dos seus fluxos" ON pergunta
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM fluxo 
    WHERE fluxo.id = pergunta.fluxo_id AND fluxo.user_id = auth.uid()
  ));

CREATE POLICY "Leitura pública de perguntas de fluxos de pesquisas publicadas" ON pergunta
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM pesquisa 
    WHERE pesquisa.fluxo_id = pergunta.fluxo_id AND pesquisa.publicada = true
  ));

-- ==========================================
-- POLÍTICAS RLS (RESPOSTA)
-- ==========================================

CREATE POLICY "Inserção pública de respostas" ON resposta
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Dono visualiza respostas das suas pesquisas" ON resposta
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pesquisa 
    WHERE pesquisa.id = resposta.pesquisa_id AND pesquisa.user_id = auth.uid()
  ));

-- ==========================================
-- POLÍTICAS RLS (RESPOSTA ITEM)
-- ==========================================

CREATE POLICY "Inserção pública de itens de resposta" ON resposta_item
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Dono visualiza itens das respostas das suas pesquisas" ON resposta_item
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM resposta 
    WHERE resposta.id = resposta_item.resposta_id AND pesquisa.user_id = auth.uid()
  ));
