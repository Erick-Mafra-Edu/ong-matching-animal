CREATE OR REPLACE FUNCTION public.refresh_all_matches_on_entity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_all_tutor_animal_matches();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS refresh_matches_on_matching_rules_change ON public.matching_rules;

CREATE TRIGGER refresh_matches_on_matching_rules_change
AFTER INSERT OR UPDATE OR DELETE
ON public.matching_rules
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_all_matches_on_entity_change();
