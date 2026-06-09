-- Document the custom_fields target entity metadata.
--
-- custom_fields.entity_type is the database field that indicates where a
-- custom field is used. Current valid values are:
-- - tutor: field is available in tutor custom_fields.
-- - animal: field is available in animal custom_fields.

COMMENT ON COLUMN custom_fields.entity_type IS
  'Defines where the custom field is used. Valid values: tutor, animal.';
