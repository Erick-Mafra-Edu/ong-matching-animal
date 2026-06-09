-- Register labels for custom_fields keys already present in tutors.custom_fields
-- and animals.custom_fields.
--
-- This prevents admin UI fallbacks such as "Selecione o campo" when a stored
-- JSONB key exists in records but is missing from the custom_fields catalog.

INSERT INTO custom_fields (entity_type, field_key, label, field_type, options, source_question_id, is_active, sort_order)
VALUES
  -- Animal fields found in animals.custom_fields.
  ('animal', 'aceita_outros_animais', 'Aceita outros animais', 'boolean', NULL, NULL, true, 70),
  ('animal', 'castrado', 'Castrado', 'boolean', NULL, NULL, true, 80),
  ('animal', 'idade_meses', 'Idade em meses', 'number', NULL, NULL, true, 90),
  ('animal', 'peso_kg', 'Peso em kg', 'number', NULL, NULL, true, 100),
  ('animal', 'raca', 'Raca', 'text', NULL, NULL, true, 110),

  -- Raw onboarding answer keys stored for tutor traceability.
  ('tutor', 'has_children', 'Tem criancas', 'boolean', NULL, 'has_children', true, 70),
  ('tutor', 'home_type', 'Tipo de moradia', 'select', '["apartamento","casa_sem_quintal","casa_com_quintal"]'::jsonb, 'home_type', true, 80),
  ('tutor', 'preferred_energy', 'Energia preferida', 'select', '["baixo","medio","alto"]'::jsonb, 'preferred_energy', true, 90),
  ('tutor', 'preferences', 'Preferencias', 'multiselect', NULL, NULL, true, 100),
  ('tutor', 'routine', 'Rotina', 'select', '["meio_periodo","integral"]'::jsonb, 'routine', true, 110),
  ('tutor', 'notes', 'Observacoes', 'text', NULL, NULL, true, 120),

  -- Normalized keys generated from onboarding answers.
  ('tutor', 'preferencias', 'Preferencias', 'multiselect', NULL, NULL, true, 130),
  ('tutor', 'observacoes', 'Observacoes', 'text', NULL, NULL, true, 140),

  -- Technical profile state stored in custom_fields.
  ('tutor', 'onboarding_complete', 'Onboarding concluido', 'boolean', NULL, NULL, true, 999)
ON CONFLICT (entity_type, field_key) DO UPDATE SET
  label = EXCLUDED.label,
  field_type = EXCLUDED.field_type,
  options = EXCLUDED.options,
  source_question_id = EXCLUDED.source_question_id,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
