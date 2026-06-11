-- =======================================================
-- SQL SCRIPT: Popular Banco de Dados com Dados de Demonstração
-- Execute este script no SQL Editor do Supabase
-- =======================================================

DO $$
DECLARE
  v_user_id UUID;
  
  -- Categorias de Campos
  v_cat_sexo_id UUID;
  v_cat_idade_id UUID;
  v_cat_local_id UUID;

  -- Objetos, Líderes e Fluxos
  v_obj1_id UUID := gen_random_uuid();
  v_obj2_id UUID := gen_random_uuid();
  v_obj3_id UUID := gen_random_uuid();
  
  v_lid1_id UUID := gen_random_uuid();
  v_lid2_id UUID := gen_random_uuid();
  v_lid3_id UUID := gen_random_uuid();
  
  v_flx1_id UUID := gen_random_uuid();
  v_flx2_id UUID := gen_random_uuid();
  v_flx3_id UUID := gen_random_uuid();
  
  -- Pesquisas
  v_pesq1_id UUID := gen_random_uuid();
  v_pesq2_id UUID := gen_random_uuid();
  v_pesq3_id UUID := gen_random_uuid();
  
  -- Perguntas Fluxo 1
  v_perg1_1 UUID := gen_random_uuid();
  v_perg1_2 UUID := gen_random_uuid();
  v_perg1_sexo UUID := gen_random_uuid();
  v_perg1_idade UUID := gen_random_uuid();
  v_perg1_local UUID := gen_random_uuid();
  
  -- Perguntas Fluxo 2
  v_perg2_1 UUID := gen_random_uuid();
  v_perg2_2 UUID := gen_random_uuid();
  v_perg2_sexo UUID := gen_random_uuid();
  v_perg2_idade UUID := gen_random_uuid();
  v_perg2_local UUID := gen_random_uuid();
  
  -- Perguntas Fluxo 3
  v_perg3_1 UUID := gen_random_uuid();
  v_perg3_2 UUID := gen_random_uuid();
  v_perg3_sexo UUID := gen_random_uuid();
  v_perg3_idade UUID := gen_random_uuid();
  v_perg3_local UUID := gen_random_uuid();
  
  i INT;
  v_pesq_id UUID;
  v_resp_id UUID;
  v_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Obter o ID do primeiro usuário autenticado
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado no auth.users. Por favor, crie uma conta no sistema primeiro.';
  END IF;

  -- 1. Limpar dados anteriores para evitar chaves duplicadas
  DELETE FROM resposta_item WHERE resposta_id IN (
    SELECT r.id FROM resposta r
    JOIN pesquisa p ON r.pesquisa_id = p.id
    WHERE p.token LIKE 'token-urbana%' OR p.token LIKE 'token-feira%' OR p.token LIKE 'token-capacitacao%'
  );
  
  DELETE FROM resposta WHERE pesquisa_id IN (
    SELECT id FROM pesquisa 
    WHERE token LIKE 'token-urbana%' OR token LIKE 'token-feira%' OR token LIKE 'token-capacitacao%'
  );
  
  DELETE FROM pesquisa WHERE token LIKE 'token-urbana%' OR token LIKE 'token-feira%' OR token LIKE 'token-capacitacao%';
  
  DELETE FROM pergunta WHERE fluxo_id IN (
    SELECT id FROM fluxo 
    WHERE nome IN ('Satisfação de Infraestrutura', 'Feedback de Evento Público', 'Interesse em Cursos')
  );
  
  DELETE FROM fluxo WHERE nome IN ('Satisfação de Infraestrutura', 'Feedback de Evento Público', 'Interesse em Cursos');
  
  DELETE FROM lider WHERE nome IN ('Roberto Silva', 'Maria Oliveira', 'Carlos Santos');
  
  DELETE FROM objeto WHERE nome IN ('Projeto Renovação Urbana', 'Feira da Comunidade 2026', 'Capacitação Profissional Digital');

  -- 2. Garantir ou criar Categorias de Campos para o Usuário
  SELECT id INTO v_cat_sexo_id FROM categoria_campo WHERE user_id = v_user_id AND nome = 'Sexo' LIMIT 1;
  IF v_cat_sexo_id IS NULL THEN
    v_cat_sexo_id := gen_random_uuid();
    INSERT INTO categoria_campo (id, nome, user_id) VALUES (v_cat_sexo_id, 'Sexo', v_user_id);
  END IF;

  SELECT id INTO v_cat_idade_id FROM categoria_campo WHERE user_id = v_user_id AND nome = 'Faixa etária' LIMIT 1;
  IF v_cat_idade_id IS NULL THEN
    v_cat_idade_id := gen_random_uuid();
    INSERT INTO categoria_campo (id, nome, user_id) VALUES (v_cat_idade_id, 'Faixa etária', v_user_id);
  END IF;

  SELECT id INTO v_cat_local_id FROM categoria_campo WHERE user_id = v_user_id AND nome = 'Local' LIMIT 1;
  IF v_cat_local_id IS NULL THEN
    v_cat_local_id := gen_random_uuid();
    INSERT INTO categoria_campo (id, nome, user_id) VALUES (v_cat_local_id, 'Local', v_user_id);
  END IF;

  -- 3. Inserir Objetos
  INSERT INTO objeto (id, nome, descricao, tipo, termo_fomento, codigo_objeto, codigo_programa, nome_programa, user_id) VALUES
    (v_obj1_id, 'Projeto Renovação Urbana', 'Melhorias de infraestrutura em bairros periféricos', 'projeto', '979754', '10245', '5100020250028', 'Desenvolvimento Urbano', v_user_id),
    (v_obj2_id, 'Feira da Comunidade 2026', 'Evento anual de economia criativa e artesanato', 'evento', '979755', '10246', '5100020250029', 'Cultura e Economia Criativa', v_user_id),
    (v_obj3_id, 'Capacitação Profissional Digital', 'Cursos gratuitos de tecnologia para jovens', 'projeto', '979756', '10247', '5100020250030', 'Educação Tecnológica', v_user_id);

  -- 4. Inserir Líderes
  INSERT INTO lider (id, nome, telefone, email, user_id) VALUES
    (v_lid1_id, 'Roberto Silva', '(11) 98765-4321', 'roberto.silva@email.com', v_user_id),
    (v_lid2_id, 'Maria Oliveira', '(21) 99888-7766', 'maria.oliveira@email.com', v_user_id),
    (v_lid3_id, 'Carlos Santos', '(31) 99111-2233', 'carlos.santos@email.com', v_user_id);

  -- 5. Inserir Fluxos
  INSERT INTO fluxo (id, nome, descricao, flow_data, tipo, user_id) VALUES
    (v_flx1_id, 'Satisfação de Infraestrutura', 'Avaliação de asfalto, saneamento e iluminação', '{}'::jsonb, 'fluxo', v_user_id),
    (v_flx2_id, 'Feedback de Evento Público', 'Pesquisa sobre organização, atrações e segurança', '{}'::jsonb, 'fluxo', v_user_id),
    (v_flx3_id, 'Interesse em Cursos', 'Mapeamento de demanda por cursos técnicos', '{}'::jsonb, 'fluxo', v_user_id);

  -- 6. Inserir Perguntas para cada Fluxo (incluindo demográficos categorizados)
  -- Fluxo 1 (Satisfação)
  INSERT INTO pergunta (id, fluxo_id, tipo, titulo, obrigatoria, ordem, config, categoria_id) VALUES
    (v_perg1_1, v_flx1_id, 'texto_curto', 'Qual sua opinião sobre o asfalto da sua rua?', true, 1, '{}'::jsonb, NULL),
    (v_perg1_2, v_flx1_id, 'multipla', 'Como você avalia a iluminação pública?', true, 2, '{"opcoes": [{"id": "otima", "texto": "Ótima"}, {"id": "regular", "texto": "Regular"}, {"id": "ruim", "texto": "Ruim"}]}'::jsonb, NULL),
    (v_perg1_sexo, v_flx1_id, 'multipla', 'Qual o seu sexo?', true, 3, '{"opcoes": [{"id": "masc", "texto": "Masculino"}, {"id": "fem", "texto": "Feminino"}, {"id": "outro", "texto": "Outro"}, {"id": "pref_nao_dizer", "texto": "Prefiro não responder"}]}'::jsonb, v_cat_sexo_id),
    (v_perg1_idade, v_flx1_id, 'multipla', 'Qual a sua faixa etária?', true, 4, '{"opcoes": [{"id": "ate_24", "texto": "Até 24 anos"}, {"id": "25_a_44", "texto": "25 a 44 anos"}, {"id": "45_a_59", "texto": "45 a 59 anos"}, {"id": "60_ou_mais", "texto": "60 anos ou mais"}]}'::jsonb, v_cat_idade_id),
    (v_perg1_local, v_flx1_id, 'multipla', 'Qual a sua região/bairro?', true, 5, '{"opcoes": [{"id": "centro", "texto": "Região Central"}, {"id": "z_norte", "texto": "Zona Norte"}, {"id": "z_sul", "texto": "Zona Sul"}, {"id": "z_leste", "texto": "Zona Leste"}, {"id": "z_oeste", "texto": "Zona Oeste"}]}'::jsonb, v_cat_local_id);
  
  -- Fluxo 2 (Feedback Evento)
  INSERT INTO pergunta (id, fluxo_id, tipo, titulo, obrigatoria, ordem, config, categoria_id) VALUES
    (v_perg2_1, v_flx2_id, 'avaliacao', 'Dê uma nota de 1 a 5 para a organização geral do evento', true, 1, '{}'::jsonb, NULL),
    (v_perg2_2, v_flx2_id, 'texto_curto', 'O que você mais gostou no evento?', false, 2, '{}'::jsonb, NULL),
    (v_perg2_sexo, v_flx2_id, 'multipla', 'Qual o seu sexo?', true, 3, '{"opcoes": [{"id": "masc", "texto": "Masculino"}, {"id": "fem", "texto": "Feminino"}, {"id": "outro", "texto": "Outro"}, {"id": "pref_nao_dizer", "texto": "Prefiro não responder"}]}'::jsonb, v_cat_sexo_id),
    (v_perg2_idade, v_flx2_id, 'multipla', 'Qual a sua faixa etária?', true, 4, '{"opcoes": [{"id": "ate_24", "texto": "Até 24 anos"}, {"id": "25_a_44", "texto": "25 a 44 anos"}, {"id": "45_a_59", "texto": "45 a 59 anos"}, {"id": "60_ou_mais", "texto": "60 anos ou mais"}]}'::jsonb, v_cat_idade_id),
    (v_perg2_local, v_flx2_id, 'multipla', 'Qual a sua região/bairro?', true, 5, '{"opcoes": [{"id": "centro", "texto": "Região Central"}, {"id": "z_norte", "texto": "Zona Norte"}, {"id": "z_sul", "texto": "Zona Sul"}, {"id": "z_leste", "texto": "Zona Leste"}, {"id": "z_oeste", "texto": "Zona Oeste"}]}'::jsonb, v_cat_local_id);

  -- Fluxo 3 (Interesse Cursos)
  INSERT INTO pergunta (id, fluxo_id, tipo, titulo, obrigatoria, ordem, config, categoria_id) VALUES
    (v_perg3_1, v_flx3_id, 'multipla', 'Qual área de cursos você tem mais interesse?', true, 1, '{"opcoes": [{"id": "programacao", "texto": "Programação"}, {"id": "design", "texto": "Design Digital"}, {"id": "marketing", "texto": "Marketing"}]}'::jsonb, NULL),
    (v_perg3_2, v_flx3_id, 'email', 'Deixe seu e-mail para contato', true, 2, '{}'::jsonb, NULL),
    (v_perg3_sexo, v_flx3_id, 'multipla', 'Qual o seu sexo?', true, 3, '{"opcoes": [{"id": "masc", "texto": "Masculino"}, {"id": "fem", "texto": "Feminino"}, {"id": "outro", "texto": "Outro"}, {"id": "pref_nao_dizer", "texto": "Prefiro não responder"}]}'::jsonb, v_cat_sexo_id),
    (v_perg3_idade, v_flx3_id, 'multipla', 'Qual a sua faixa etária?', true, 4, '{"opcoes": [{"id": "ate_24", "texto": "Até 24 anos"}, {"id": "25_a_44", "texto": "25 a 44 anos"}, {"id": "45_a_59", "texto": "45 a 59 anos"}, {"id": "60_ou_mais", "texto": "60 anos ou mais"}]}'::jsonb, v_cat_idade_id),
    (v_perg3_local, v_flx3_id, 'multipla', 'Qual a sua região/bairro?', true, 5, '{"opcoes": [{"id": "centro", "texto": "Região Central"}, {"id": "z_norte", "texto": "Zona Norte"}, {"id": "z_sul", "texto": "Zona Sul"}, {"id": "z_leste", "texto": "Zona Leste"}, {"id": "z_oeste", "texto": "Zona Oeste"}]}'::jsonb, v_cat_local_id);

  -- 7. Inserir Pesquisas
  INSERT INTO pesquisa (id, titulo, descricao, token, publicada, objeto_id, lider_id, fluxo_id, user_id) VALUES
    (v_pesq1_id, 'Pesquisa de Opinião - Renovação Urbana', 'Coleta de feedback sobre asfalto e iluminação', 'token-urbana-' || substring(md5(random()::text) from 1 for 6), true, v_obj1_id, v_lid1_id, v_flx1_id, v_user_id),
    (v_pesq2_id, 'Pesquisa de Opinião - Feira 2026', 'Coleta de avaliação sobre o evento', 'token-feira-2026-' || substring(md5(random()::text) from 1 for 6), true, v_obj2_id, v_lid2_id, v_flx2_id, v_user_id),
    (v_pesq3_id, 'Mapeamento de Demanda - Capacitação', 'Identificação de áreas de interesse em tecnologia', 'token-capacitacao-' || substring(md5(random()::text) from 1 for 6), true, v_obj3_id, v_lid3_id, v_flx3_id, v_user_id);

  -- 8. Inserir 30 Respostas distribuídas com dados demográficos simulados
  FOR i IN 1..30 LOOP
    -- Alternar entre as 3 pesquisas
    IF i % 3 = 1 THEN
      v_pesq_id := v_pesq1_id;
    ELSIF i % 3 = 2 THEN
      v_pesq_id := v_pesq2_id;
    ELSE
      v_pesq_id := v_pesq3_id;
    END IF;

    v_resp_id := gen_random_uuid();
    
    -- Distribuir datas nos últimos 30 dias
    v_date := now() - (random() * 30 * INTERVAL '1 day');

    INSERT INTO resposta (id, pesquisa_id, fingerprint, created_at) VALUES
      (v_resp_id, v_pesq_id, md5(random()::text), v_date);

    -- Inserir itens de resposta correspondentes
    IF v_pesq_id = v_pesq1_id THEN
      INSERT INTO resposta_item (resposta_id, pergunta_id, valor) VALUES
        (v_resp_id, v_perg1_1, to_jsonb('O asfalto está excelente, facilitou a mobilidade.'::text)),
        (v_resp_id, v_perg1_2, to_jsonb(CASE WHEN random() > 0.5 THEN 'otima'::text WHEN random() > 0.2 THEN 'regular'::text ELSE 'ruim'::text END)),
        (v_resp_id, v_perg1_sexo, to_jsonb(CASE WHEN random() > 0.55 THEN 'fem'::text WHEN random() > 0.1 THEN 'masc'::text ELSE 'outro'::text END)),
        (v_resp_id, v_perg1_idade, to_jsonb(CASE WHEN random() > 0.7 THEN '25_a_44'::text WHEN random() > 0.4 THEN '45_a_59'::text WHEN random() > 0.15 THEN 'ate_24'::text ELSE '60_ou_mais'::text END)),
        (v_resp_id, v_perg1_local, to_jsonb(CASE WHEN random() > 0.6 THEN 'centro'::text WHEN random() > 0.4 THEN 'z_sul'::text WHEN random() > 0.2 THEN 'z_norte'::text ELSE 'z_leste'::text END));
    ELSIF v_pesq_id = v_pesq2_id THEN
      INSERT INTO resposta_item (resposta_id, pergunta_id, valor) VALUES
        (v_resp_id, v_perg2_1, to_jsonb(floor(random() * 5 + 1)::int)),
        (v_resp_id, v_perg2_2, to_jsonb('Gostei da praça de alimentação e segurança.'::text)),
        (v_resp_id, v_perg2_sexo, to_jsonb(CASE WHEN random() > 0.55 THEN 'fem'::text WHEN random() > 0.1 THEN 'masc'::text ELSE 'outro'::text END)),
        (v_resp_id, v_perg2_idade, to_jsonb(CASE WHEN random() > 0.7 THEN '25_a_44'::text WHEN random() > 0.4 THEN '45_a_59'::text WHEN random() > 0.15 THEN 'ate_24'::text ELSE '60_ou_mais'::text END)),
        (v_resp_id, v_perg2_local, to_jsonb(CASE WHEN random() > 0.6 THEN 'centro'::text WHEN random() > 0.4 THEN 'z_sul'::text WHEN random() > 0.2 THEN 'z_norte'::text ELSE 'z_leste'::text END));
    ELSE
      INSERT INTO resposta_item (resposta_id, pergunta_id, valor) VALUES
        (v_resp_id, v_perg3_1, to_jsonb(CASE WHEN random() > 0.6 THEN 'programacao'::text WHEN random() > 0.3 THEN 'design'::text ELSE 'marketing'::text END)),
        (v_resp_id, v_perg3_2, to_jsonb('participante' || i || '@email.com')),
        (v_resp_id, v_perg3_sexo, to_jsonb(CASE WHEN random() > 0.55 THEN 'fem'::text WHEN random() > 0.1 THEN 'masc'::text ELSE 'outro'::text END)),
        (v_resp_id, v_perg3_idade, to_jsonb(CASE WHEN random() > 0.7 THEN '25_a_44'::text WHEN random() > 0.4 THEN '45_a_59'::text WHEN random() > 0.15 THEN 'ate_24'::text ELSE '60_ou_mais'::text END)),
        (v_resp_id, v_perg3_local, to_jsonb(CASE WHEN random() > 0.6 THEN 'centro'::text WHEN random() > 0.4 THEN 'z_sul'::text WHEN random() > 0.2 THEN 'z_norte'::text ELSE 'z_leste'::text END));
    END IF;

  END LOOP;

  RAISE NOTICE 'População concluída com sucesso!';
END $$;
