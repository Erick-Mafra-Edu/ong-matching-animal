ALTER TABLE public.onboarding_questions
  ADD COLUMN IF NOT EXISTS is_knockout BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS knockout_values JSONB,
  ADD COLUMN IF NOT EXISTS knockout_message TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'onboarding_questions_knockout_values_array_check'
      AND conrelid = 'public.onboarding_questions'::regclass
  ) THEN
    ALTER TABLE public.onboarding_questions
      ADD CONSTRAINT onboarding_questions_knockout_values_array_check
      CHECK (knockout_values IS NULL OR jsonb_typeof(knockout_values) = 'array');
  END IF;
END $$;

UPDATE public.onboarding_questions
SET is_knockout = COALESCE(is_knockout, false)
WHERE is_knockout IS NULL;
