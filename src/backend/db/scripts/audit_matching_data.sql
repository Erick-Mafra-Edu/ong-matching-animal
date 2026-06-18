-- ==============================================================================
-- SCRIPT DE AUDITORIA DE MATCHING
-- Use este script no Editor SQL do Supabase para diagnosticar problemas de cache.
-- ==============================================================================

DO $$
DECLARE
    target_tutor_uuid UUID := '77d673c0-4c00-46f2-9d8f-4b2d04266995'; -- Seu ID de Tutor
    tutor_exists BOOLEAN;
    active_rules_count INT;
    animals_count INT;
BEGIN
    RAISE NOTICE '--- INICIANDO AUDITORIA DE MATCHING ---';

    -- 1. Verificar existencia do tutor
    SELECT EXISTS(SELECT 1 FROM tutors WHERE id = target_tutor_uuid) INTO tutor_exists;
    IF NOT tutor_exists THEN
        RAISE NOTICE '[ERRO] Tutor % não encontrado na tabela public.tutors', target_tutor_uuid;
    ELSE
        RAISE NOTICE '[OK] Tutor encontrado.';
    END IF;

    -- 2. Verificar regras ativas
    SELECT COUNT(*) INTO active_rules_count FROM matching_rules WHERE is_active = true;
    RAISE NOTICE '[INFO] Regras de matching ativas: %', active_rules_count;

    -- 3. Verificar animais
    SELECT COUNT(*) INTO animals_count FROM animals;
    RAISE NOTICE '[INFO] Total de animais cadastrados: %', animals_count;

    IF active_rules_count = 0 THEN
        RAISE NOTICE '[ALERTA] Não há regras ativas! O matching sempre retornará vazio.';
    END IF;
END $$;

-- 4. Detalhamento das Regras vs Campos do Tutor
-- Este bloco mostra se o seu tutor possui os campos que as regras exigem
WITH tutor_data AS (
    SELECT id, custom_fields FROM tutors WHERE id = '77d673c0-4c00-46f2-9d8f-4b2d04266995'
)
SELECT 
    r.rule_name,
    r.tutor_field as campo_esperado_no_tutor,
    r.animal_field as campo_esperado_no_animal,
    r.is_dealbreaker,
    (td.custom_fields ? r.tutor_field) as tutor_possui_o_campo,
    td.custom_fields -> r.tutor_field as valor_no_seu_perfil
FROM matching_rules r
CROSS JOIN tutor_data td
WHERE r.is_active = true;

-- 5. Verificação de Cobertura de Animais
-- Mostra quantos animais possuem os campos necessários para cada regra
SELECT 
    r.rule_name,
    r.animal_field,
    COUNT(a.id) as total_animais_com_este_campo
FROM matching_rules r
LEFT JOIN animals a ON (a.custom_fields ? r.animal_field)
WHERE r.is_active = true
GROUP BY r.rule_name, r.animal_field;

-- 6. Teste de Desqualificação (Dealbreakers)
-- Identifica se algum Dealbreaker está eliminando todos os seus matches
-- Se o resultado abaixo for vazio para um animal que você gosta, o Dealbreaker o removeu.
SELECT 
    a.name as animal_nome,
    r.rule_name,
    r.comparison_operator as op,
    td.custom_fields ->> r.tutor_field as seu_valor,
    a.custom_fields ->> r.animal_field as valor_animal,
    r.is_dealbreaker,
    -- Simulação simplificada de match (apenas para campos de texto/diretos)
    CASE 
        WHEN r.comparison_operator = '=' THEN (td.custom_fields -> r.tutor_field = a.custom_fields -> r.animal_field)
        ELSE NULL -- Operadores complexos como 'contains' exigem lógica da função compute_
    END as match_simulado
FROM tutors td
JOIN animals a ON true
JOIN matching_rules r ON r.is_active = true
WHERE td.id = '77d673c0-4c00-46f2-9d8f-4b2d04266995'
  AND r.is_dealbreaker = true;

-- 7. Execução Direta da Função de Cálculo
-- Se este comando retornar dados, o problema é APENAS o gatilho (cache).
-- Se este comando retornar VAZIO, o problema são os DADOS ou as REGRAS.
SELECT * FROM compute_tutor_animal_matches('77d673c0-4c00-46f2-9d8f-4b2d04266995');
