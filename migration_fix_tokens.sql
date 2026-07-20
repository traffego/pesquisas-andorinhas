-- ============================================================
-- DIAGNÓSTICO E REPARO COMPLETO DE PESQUISAS E FLUXOS
-- Execute este script no Supabase SQL Editor (aba "SQL Editor")
-- ============================================================

-- ============================================================
-- ETAPA 1: DIAGNÓSTICO — ver o estado atual
-- ============================================================

-- 1a. Ver todas as pesquisas e seus user_ids
SELECT id, titulo, token, publicada, user_id, created_at
FROM pesquisa
ORDER BY created_at;

-- 1b. Ver todos os fluxos e seus user_ids
SELECT id, nome, user_id, created_at
FROM fluxo
ORDER BY created_at;

-- 1c. Verificar pesquisas com user_id NULL (causa do "salva sem fazer nada")
SELECT id, titulo, token
FROM pesquisa
WHERE user_id IS NULL;

-- 1d. Verificar fluxos com user_id NULL
SELECT id, nome
FROM fluxo
WHERE user_id IS NULL;

-- 1e. Verificar tokens duplicados
SELECT token, COUNT(*) as qtd
FROM pesquisa
GROUP BY token
HAVING COUNT(*) > 1;


-- ============================================================
-- ETAPA 2: REPARAR user_id NULL (causa raiz do problema de save)
-- ============================================================
-- ATENÇÃO: Substitua 'SEU-USER-ID-AQUI' pelo seu user_id real.
-- Para encontrar seu user_id: SELECT auth.uid(); ou veja em
-- Authentication > Users no painel do Supabase.

-- 2a. Corrigir pesquisas com user_id NULL
UPDATE pesquisa
SET user_id = auth.uid()
WHERE user_id IS NULL;

-- 2b. Corrigir fluxos com user_id NULL
UPDATE fluxo
SET user_id = auth.uid()
WHERE user_id IS NULL;


-- ============================================================
-- ETAPA 3: REPARAR tokens duplicados ou nulos
-- ============================================================

-- 3a. Reparar pesquisas com token NULL ou vazio
UPDATE pesquisa
SET token = substring(md5(random()::text || id::text) from 1 for 10)
WHERE token IS NULL OR token = '';

-- 3b. Reparar tokens duplicados (mantém o mais antigo, gera novo para os demais)
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


-- ============================================================
-- ETAPA 4: CONFIRMAR resultado final
-- ============================================================
SELECT id, titulo, token, publicada, user_id
FROM pesquisa
ORDER BY created_at;
