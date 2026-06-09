-- Tabela de Relatórios Salvos
CREATE TABLE IF NOT EXISTS relatorio_salvo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE relatorio_salvo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono gerencia seus relatorios salvos" ON relatorio_salvo
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
