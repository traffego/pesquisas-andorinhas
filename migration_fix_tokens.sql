-- ============================================================
-- DIAGNÓSTICO E REPARO DE TOKENS DUPLICADOS OU NULOS
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Ver todos os tokens atuais (diagnóstico)
SELECT id, titulo, token, publicada, created_at
FROM pesquisa
ORDER BY created_at;

-- 2. Verificar se existem tokens duplicados
SELECT token, COUNT(*) as qtd
FROM pesquisa
GROUP BY token
HAVING COUNT(*) > 1;

-- 3. Reparar pesquisas com token NULL (não deve acontecer, mas por segurança)
UPDATE pesquisa
SET token = substring(md5(random()::text || id::text) from 1 for 10)
WHERE token IS NULL OR token = '';

-- 4. Reparar tokens duplicados: mantém o token da pesquisa mais antiga,
--    e gera um novo para as mais recentes
WITH duplicadas AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY token ORDER BY created_at ASC) as rn
  FROM pesquisa
)
UPDATE pesquisa
SET token = substring(md5(random()::text || pesquisa.id::text) from 1 for 10)
FROM duplicadas
WHERE pesquisa.id = duplicadas.id
  AND duplicadas.rn > 1;

-- 5. Confirmar resultado final
SELECT id, titulo, token, publicada
FROM pesquisa
ORDER BY created_at;
