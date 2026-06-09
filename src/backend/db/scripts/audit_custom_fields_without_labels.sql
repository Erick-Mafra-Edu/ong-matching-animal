-- Audit custom_fields JSONB keys used by tutors and animals without usable labels.
--
-- Purpose:
-- - Find keys stored in tutors.custom_fields and animals.custom_fields that do not
--   have an active custom_fields catalog entry with a non-empty label.
-- - Prevent UI fallbacks such as "Selecione o campo" when a key exists in records
--   but is not described in the custom field catalog.
--
-- How to use:
-- 1. Run this file in Supabase SQL Editor or psql against the project database.
-- 2. Review the first result set for fields requiring attention.
-- 3. Review the second result set for concrete affected records.
-- 4. Optionally use the generated insert/update statements from the third result
--    set as a starting point, then replace the suggested labels with business labels.

WITH used_fields AS (
  SELECT
    'tutor'::text AS entity_type,
    tutors.id AS record_id,
    tutors.name AS record_name,
    field.key AS field_key,
    field.value AS field_value
  FROM tutors
  CROSS JOIN LATERAL jsonb_each(COALESCE(tutors.custom_fields, '{}'::jsonb)) AS field(key, value)

  UNION ALL

  SELECT
    'animal'::text AS entity_type,
    animals.id AS record_id,
    animals.name AS record_name,
    field.key AS field_key,
    field.value AS field_value
  FROM animals
  CROSS JOIN LATERAL jsonb_each(COALESCE(animals.custom_fields, '{}'::jsonb)) AS field(key, value)
),
catalog AS (
  SELECT
    custom_fields.entity_type,
    custom_fields.field_key,
    custom_fields.label,
    custom_fields.field_type,
    custom_fields.is_active
  FROM custom_fields
),
audit AS (
  SELECT
    used_fields.entity_type,
    used_fields.field_key,
    catalog.label,
    catalog.field_type,
    catalog.is_active,
    COUNT(*) AS affected_records,
    COUNT(*) FILTER (
      WHERE used_fields.field_value IS NULL
        OR used_fields.field_value = 'null'::jsonb
        OR used_fields.field_value = '""'::jsonb
        OR used_fields.field_value = '[]'::jsonb
        OR used_fields.field_value = '{}'::jsonb
    ) AS empty_value_records,
    CASE
      WHEN catalog.field_key IS NULL THEN 'missing_definition'
      WHEN NULLIF(BTRIM(catalog.label), '') IS NULL THEN 'blank_label'
      WHEN catalog.is_active IS DISTINCT FROM true THEN 'inactive_definition'
      ELSE 'ok'
    END AS issue
  FROM used_fields
  LEFT JOIN catalog
    ON catalog.entity_type = used_fields.entity_type
   AND catalog.field_key = used_fields.field_key
  GROUP BY
    used_fields.entity_type,
    used_fields.field_key,
    catalog.label,
    catalog.field_type,
    catalog.is_active,
    catalog.field_key
)
SELECT
  entity_type,
  field_key,
  issue,
  label,
  field_type,
  is_active,
  affected_records,
  empty_value_records
FROM audit
WHERE issue <> 'ok'
ORDER BY entity_type, issue, affected_records DESC, field_key;

-- Affected record examples for each problematic key.
WITH used_fields AS (
  SELECT
    'tutor'::text AS entity_type,
    tutors.id AS record_id,
    tutors.name AS record_name,
    field.key AS field_key,
    field.value AS field_value
  FROM tutors
  CROSS JOIN LATERAL jsonb_each(COALESCE(tutors.custom_fields, '{}'::jsonb)) AS field(key, value)

  UNION ALL

  SELECT
    'animal'::text AS entity_type,
    animals.id AS record_id,
    animals.name AS record_name,
    field.key AS field_key,
    field.value AS field_value
  FROM animals
  CROSS JOIN LATERAL jsonb_each(COALESCE(animals.custom_fields, '{}'::jsonb)) AS field(key, value)
),
problem_fields AS (
  SELECT DISTINCT
    used_fields.entity_type,
    used_fields.field_key
  FROM used_fields
  LEFT JOIN custom_fields
    ON custom_fields.entity_type = used_fields.entity_type
   AND custom_fields.field_key = used_fields.field_key
  WHERE custom_fields.field_key IS NULL
     OR NULLIF(BTRIM(custom_fields.label), '') IS NULL
     OR custom_fields.is_active IS DISTINCT FROM true
)
SELECT
  used_fields.entity_type,
  used_fields.field_key,
  used_fields.record_id,
  used_fields.record_name,
  used_fields.field_value
FROM used_fields
JOIN problem_fields
  ON problem_fields.entity_type = used_fields.entity_type
 AND problem_fields.field_key = used_fields.field_key
ORDER BY used_fields.entity_type, used_fields.field_key, used_fields.record_name
LIMIT 200;

-- Suggested remediation statements.
-- Review before executing. Labels are generated from field_key and should be
-- replaced by human-readable domain labels when needed.
WITH used_fields AS (
  SELECT 'tutor'::text AS entity_type, field.key AS field_key
  FROM tutors
  CROSS JOIN LATERAL jsonb_each(COALESCE(tutors.custom_fields, '{}'::jsonb)) AS field(key, value)

  UNION

  SELECT 'animal'::text AS entity_type, field.key AS field_key
  FROM animals
  CROSS JOIN LATERAL jsonb_each(COALESCE(animals.custom_fields, '{}'::jsonb)) AS field(key, value)
),
problem_fields AS (
  SELECT DISTINCT
    used_fields.entity_type,
    used_fields.field_key,
    INITCAP(REPLACE(used_fields.field_key, '_', ' ')) AS suggested_label
  FROM used_fields
  LEFT JOIN custom_fields
    ON custom_fields.entity_type = used_fields.entity_type
   AND custom_fields.field_key = used_fields.field_key
  WHERE custom_fields.field_key IS NULL
     OR NULLIF(BTRIM(custom_fields.label), '') IS NULL
     OR custom_fields.is_active IS DISTINCT FROM true
)
SELECT
  FORMAT(
    'INSERT INTO custom_fields (entity_type, field_key, label, field_type, options, is_active, sort_order) VALUES (%L, %L, %L, %L, NULL, true, 999) ON CONFLICT (entity_type, field_key) DO UPDATE SET label = EXCLUDED.label, is_active = true, updated_at = NOW();',
    entity_type,
    field_key,
    suggested_label,
    'text'
  ) AS suggested_sql
FROM problem_fields
ORDER BY entity_type, field_key;
