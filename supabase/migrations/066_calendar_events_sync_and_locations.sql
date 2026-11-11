-- 066_calendar_events_sync_and_locations.sql
-- Ensures calendar_events table, location/room columns, and RLS policies across portals

BEGIN;

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  event_type text DEFAULT 'event',
  type text DEFAULT 'Event',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  start_time text,
  end_time text,
  course_name text,
  batch_name text,
  target_role text DEFAULT 'all',
  target_link text,
  location text,
  room text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS room text;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS type text DEFAULT 'Event';
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'event';
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS end_time text;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS course_name text;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS batch_name text;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS target_role text DEFAULT 'all';

ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS room text;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendar_events TO authenticated;
GRANT SELECT ON TABLE public.calendar_events TO anon;

DROP POLICY IF EXISTS "admin_all" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_read" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_select_all" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_all" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_all" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete_all" ON public.calendar_events;

CREATE POLICY "calendar_events_select_all"
  ON public.calendar_events
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "calendar_events_insert_all"
  ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "calendar_events_update_all"
  ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "calendar_events_delete_all"
  ON public.calendar_events
  FOR DELETE TO authenticated
  USING (true);

COMMIT;
