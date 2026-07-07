UPDATE public.matching_rules
SET
  rule_name = 'Energia desejada vs energia do animal',
  tutor_field = 'pref_energia',
  animal_field = 'nivel_energia',
  comparison_operator = '=',
  weight = 40,
  is_dealbreaker = false,
  is_active = true
WHERE rule_name = 'Tempo disponível vs energia do animal'
   OR (
    tutor_field = 'disponibilidade_tempo'
    AND animal_field = 'nivel_energia'
  );

UPDATE public.matching_rules
SET is_active = false
WHERE tutor_field IN ('tem_quintal', 'renda_mensal')
  AND rule_name IN (
    'Quintal vs tamanho do animal',
    'Renda vs necessidade de cuidados'
  );

SELECT public.refresh_all_tutor_animal_matches();
