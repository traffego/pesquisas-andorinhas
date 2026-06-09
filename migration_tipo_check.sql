-- =======================================================
-- MIGRAÇÃO: Remover check constraint antiga de tipo
-- Execute este script no Supabase SQL Editor
-- =======================================================

ALTER TABLE pergunta DROP CONSTRAINT IF EXISTS pergunta_tipo_check;
