-- =======================================================
-- MIGRAÇÃO: Adicionar coluna tipo na tabela fluxo
-- Execute este script no Supabase SQL Editor
-- =======================================================

ALTER TABLE fluxo ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('fluxo', 'bloco')) NOT NULL DEFAULT 'fluxo';
