-- ==========================================
-- MIGRAÇÃO: Categorias de Campos dos Fluxos
-- Execute este script no Supabase SQL Editor
-- ==========================================

-- 1. Tabela de categorias de campos
CREATE TABLE IF NOT EXISTS categoria_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RLS
ALTER TABLE categoria_campo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono gerencia categorias" ON categoria_campo
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leitura pública de categorias" ON categoria_campo
  FOR SELECT TO public
  USING (true);

-- 3. Coluna categoria_id na tabela pergunta
ALTER TABLE pergunta
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categoria_campo(id) ON DELETE SET NULL;
