-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Projetos
CREATE TABLE IF NOT EXISTS projeto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
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

-- 3. Tabela de Pesquisas
CREATE TABLE IF NOT EXISTS pesquisa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  token TEXT UNIQUE NOT NULL,
  publicada BOOLEAN DEFAULT false NOT NULL,
  projeto_id UUID REFERENCES projeto(id) ON DELETE CASCADE,
  lider_id UUID REFERENCES lider(id) ON DELETE SET NULL,
  flow_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- 4. Tabela de Perguntas
CREATE TABLE IF NOT EXISTS pergunta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id UUID REFERENCES pesquisa(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('texto_curto', 'textarea', 'multipla', 'whatsapp', 'email')) NOT NULL,
  titulo TEXT NOT NULL,
  obrigatoria BOOLEAN DEFAULT true NOT NULL,
  ordem INTEGER NOT NULL,
  config JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Respostas (Sessão de resposta)
CREATE TABLE IF NOT EXISTS resposta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id UUID REFERENCES pesquisa(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Itens de Resposta
CREATE TABLE IF NOT EXISTS resposta_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id UUID REFERENCES resposta(id) ON DELETE CASCADE,
  pergunta_id UUID REFERENCES pergunta(id) ON DELETE CASCADE,
  valor JSONB NOT NULL
);

-- ==========================================
-- HABILITAR RLS (ROW LEVEL SECURITY)
-- ==========================================

ALTER TABLE projeto ENABLE ROW LEVEL SECURITY;
ALTER TABLE lider ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesquisa ENABLE ROW LEVEL SECURITY;
ALTER TABLE pergunta ENABLE ROW LEVEL SECURITY;
ALTER TABLE resposta ENABLE ROW LEVEL SECURITY;
ALTER TABLE resposta_item ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLÍTICAS RLS (PROJETO)
-- ==========================================

CREATE POLICY "Dono gerencia seus projetos" ON projeto
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- POLÍTICAS RLS (LÍDER)
-- ==========================================

CREATE POLICY "Dono gerencia seus lideres" ON lider
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "Dono gerencia perguntas das suas pesquisas" ON pergunta
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pesquisa 
    WHERE pesquisa.id = pergunta.pesquisa_id AND pesquisa.user_id = auth.uid()
  ));

CREATE POLICY "Leitura pública de perguntas de pesquisas publicadas" ON pergunta
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM pesquisa 
    WHERE pesquisa.id = pergunta.pesquisa_id AND pesquisa.publicada = true
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
    JOIN pesquisa ON pesquisa.id = resposta.pesquisa_id 
    WHERE resposta.id = resposta_item.resposta_id AND pesquisa.user_id = auth.uid()
  ));
