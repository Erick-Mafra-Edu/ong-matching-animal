DROP INDEX IF EXISTS public.tutors_auth_user_id_idx;
DROP INDEX IF EXISTS public.admin_users_auth_user_id_idx;

CREATE INDEX IF NOT EXISTS idx_animals_owner_id
ON public.animals (owner_id);

CREATE INDEX IF NOT EXISTS idx_animals_location_gist
ON public.animals USING gist (location);
