-- ============================================================
-- MIGRATION: GESTÃO DE CAMPANHAS DE DISPARO & RASTREAMENTO Z-API
-- ============================================================

-- 1. Tabela de Campanhas de Disparo (Lotes / Ondas)
CREATE TABLE IF NOT EXISTS public.disparo_campanha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objeto_id UUID NOT NULL REFERENCES public.objetos(id) ON DELETE CASCADE,
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  mensagem_texto TEXT NOT NULL,
  filtro_publico VARCHAR(50) NOT NULL DEFAULT 'todos', -- 'todos' | 'pendentes' | 'nao_lidos'
  status VARCHAR(50) NOT NULL DEFAULT 'rascunho',       -- 'rascunho' | 'enviando' | 'concluido'
  total_destinatarios INT DEFAULT 0,
  enviados_count INT DEFAULT 0,
  entregues_count INT DEFAULT 0,
  lidos_count INT DEFAULT 0,
  respondidos_count INT DEFAULT 0,
  disparado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilita RLS na tabela disparo_campanha
ALTER TABLE public.disparo_campanha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso publico a campanhas"
ON public.disparo_campanha
FOR ALL
USING (true)
WITH CHECK (true);

-- 2. Alteração na tabela disparo_whatsapp_log para vincular campanha e timestamps de entrega/leitura
ALTER TABLE public.disparo_whatsapp_log
ADD COLUMN IF NOT EXISTS campanha_id UUID REFERENCES public.disparo_campanha(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS entregue_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lido_em TIMESTAMPTZ;

-- 3. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_disparo_log_campanha_id ON public.disparo_whatsapp_log(campanha_id);
CREATE INDEX IF NOT EXISTS idx_disparo_log_message_id ON public.disparo_whatsapp_log(message_id);
CREATE INDEX IF NOT EXISTS idx_disparo_log_zaap_id ON public.disparo_whatsapp_log(zaap_id);
CREATE INDEX IF NOT EXISTS idx_disparo_log_status ON public.disparo_whatsapp_log(status);
CREATE INDEX IF NOT EXISTS idx_disparo_campanha_pesquisa ON public.disparo_campanha(pesquisa_id);
CREATE INDEX IF NOT EXISTS idx_disparo_campanha_objeto ON public.disparo_campanha(objeto_id);
