-- Corrigir políticas RLS para permitir leitura pública de fluxos e perguntas
-- Isso resolve o problema de blocos reutilizáveis (tipo = 'bloco') não aparecerem ao responder

DROP POLICY IF EXISTS "Leitura pública de fluxos de pesquisas publicadas" ON fluxo;
CREATE POLICY "Leitura pública de todos os fluxos" ON fluxo
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Leitura pública de perguntas de fluxos de pesquisas publicadas" ON pergunta;
CREATE POLICY "Leitura pública de todas as perguntas" ON pergunta
  FOR SELECT TO public
  USING (true);
