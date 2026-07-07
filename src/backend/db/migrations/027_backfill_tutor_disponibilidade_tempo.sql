UPDATE public.tutors
SET custom_fields = jsonb_set(
  custom_fields,
  '{disponibilidade_tempo}',
  custom_fields -> 'routine',
  true
)
WHERE custom_fields ? 'routine'
  AND NOT custom_fields ? 'disponibilidade_tempo';

SELECT public.refresh_all_tutor_animal_matches();
