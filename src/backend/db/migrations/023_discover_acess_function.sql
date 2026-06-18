CREATE OR REPLACE FUNCTION get_user_discover_access(target_user_id TEXT)
RETURNS JSON AS $$
DECLARE
    t_id UUID;
    t_fields JSONB;
    t_completed_at TIMESTAMPTZ;
    is_adm BOOLEAN;
    q_updated_at TIMESTAMPTZ;
BEGIN
    -- Busca informações do tutor
    SELECT id, custom_fields, onboarding_completed_at 
    INTO t_id, t_fields, t_completed_at
    FROM tutors 
    WHERE auth_user_id = target_user_id 
    LIMIT 1;

    -- Busca se é administrador
    SELECT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE auth_user_id = target_user_id AND is_active = true
    ) INTO is_adm;

    -- Busca atualização do questionário ativo
    SELECT updated_at INTO q_updated_at
    FROM onboarding_questions
    WHERE is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;

    RETURN json_build_object(
        'tutor_id', t_id,
        'custom_fields', COALESCE(t_fields, '{}'::jsonb),
        'onboarding_completed_at', t_completed_at,
        'is_admin', is_adm,
        'questionnaire_updated_at', q_updated_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;