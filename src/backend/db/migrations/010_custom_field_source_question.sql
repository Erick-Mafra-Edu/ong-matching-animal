ALTER TABLE custom_fields
  ADD COLUMN IF NOT EXISTS source_question_id TEXT REFERENCES onboarding_questions(id) ON DELETE SET NULL;

UPDATE custom_fields
SET source_question_id = CASE field_key
  WHEN 'pref_energia' THEN 'preferred_energy'
  WHEN 'tem_criancas' THEN 'has_children'
  WHEN 'tamanho_casa' THEN 'home_type'
  WHEN 'disponibilidade_tempo' THEN 'routine'
  ELSE source_question_id
END
WHERE entity_type = 'tutor';
