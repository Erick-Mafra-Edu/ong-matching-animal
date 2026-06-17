CREATE EXTENSION IF NOT EXISTS pgmq;

DO $$
BEGIN
  PERFORM pgmq.create('calendar_sync');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

DO $$
BEGIN
  PERFORM pgmq.create('calendar_sync_failed');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

CREATE OR REPLACE FUNCTION enqueue_calendar_sync_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  row_payload JSONB;
  sync_source TEXT;
  sync_operation TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_payload := to_jsonb(OLD);
    sync_source := OLD.metadata #>> '{calendar_sync,source}';
    sync_operation := 'delete';

    IF sync_source IN ('google', 'google_edge_function') THEN
      RETURN OLD;
    END IF;

    IF COALESCE(OLD.provider, 'google') = 'google' THEN
      PERFORM pgmq.send(
        'calendar_sync',
        jsonb_build_object(
          'provider', 'google',
          'operation', sync_operation,
          'calendar_event_id', OLD.id,
          'event_snapshot', row_payload,
          'enqueued_at', NOW()
        )
      );
    END IF;

    RETURN OLD;
  END IF;

  row_payload := to_jsonb(NEW);
  sync_source := NEW.metadata #>> '{calendar_sync,source}';
  sync_operation := 'upsert';

  IF sync_source IN ('google', 'google_edge_function') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.provider, 'google') = 'google' THEN
    PERFORM pgmq.send(
      'calendar_sync',
      jsonb_build_object(
        'provider', 'google',
        'operation', sync_operation,
        'calendar_event_id', NEW.id,
        'event_snapshot', row_payload,
        'enqueued_at', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calendar_events_enqueue_sync ON calendar_events;
CREATE TRIGGER calendar_events_enqueue_sync
AFTER INSERT OR UPDATE OR DELETE ON calendar_events
FOR EACH ROW EXECUTE FUNCTION enqueue_calendar_sync_message();

CREATE OR REPLACE FUNCTION read_calendar_sync_messages(
  visibility_timeout_seconds INTEGER DEFAULT 120,
  batch_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  msg_id BIGINT,
  read_ct INTEGER,
  enqueued_at TIMESTAMPTZ,
  vt TIMESTAMPTZ,
  message JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
  SELECT msg_id, read_ct, enqueued_at, vt, message
  FROM pgmq.read(
    'calendar_sync',
    GREATEST(1, LEAST(visibility_timeout_seconds, 3600)),
    GREATEST(1, LEAST(batch_size, 100))
  );
$$;

CREATE OR REPLACE FUNCTION archive_calendar_sync_message(message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
  SELECT pgmq.archive('calendar_sync', message_id);
$$;

CREATE OR REPLACE FUNCTION send_failed_calendar_sync_message(message JSONB)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
  SELECT * FROM pgmq.send('calendar_sync_failed', message);
$$;

REVOKE EXECUTE ON FUNCTION read_calendar_sync_messages(INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION archive_calendar_sync_message(BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION send_failed_calendar_sync_message(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION read_calendar_sync_messages(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION archive_calendar_sync_message(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION send_failed_calendar_sync_message(JSONB) TO service_role;
