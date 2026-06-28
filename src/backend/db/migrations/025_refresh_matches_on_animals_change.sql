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

DROP TRIGGER IF EXISTS refresh_matches_on_animals_change ON public.animals;

CREATE TRIGGER refresh_matches_on_animals_change
AFTER INSERT OR UPDATE OR DELETE
ON public.animals
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_all_matches_on_entity_change();

DROP TRIGGER IF EXISTS refresh_matches_on_tutors_change ON public.tutors;

CREATE TRIGGER refresh_matches_on_tutors_change
AFTER INSERT OR UPDATE OR DELETE
ON public.tutors
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_all_matches_on_entity_change();
