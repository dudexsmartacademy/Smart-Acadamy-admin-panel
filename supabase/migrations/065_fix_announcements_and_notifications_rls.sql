-- 065_fix_announcements_and_notifications_rls.sql
-- Fixes RLS policies and missing columns on announcements and notifications tables
-- Resolves HTTP 403 (notifications) and HTTP 400 (announcements) errors across all portals

BEGIN;

-- 1. Ensure all expected columns exist on announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS date timestamptz DEFAULT now();
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS publish_at timestamptz DEFAULT now();
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS publish_date timestamptz DEFAULT now();
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS expiry_date timestamptz;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS scope text DEFAULT 'all';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_role text DEFAULT 'all';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_class text DEFAULT 'All Students';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS batches text[] DEFAULT '{}';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS category text DEFAULT 'Announcements';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS status text DEFAULT 'Published';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_class_id uuid;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS sender_id uuid;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS sender_name text DEFAULT 'Administrator';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS sender_role text DEFAULT 'Admin';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

-- 2. Ensure all expected columns exist on notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text DEFAULT 'announcement';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_type text DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_url text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Normal';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS audience text DEFAULT 'all';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 3. Define current_role_name if missing (so any legacy check never throws 400)
CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    'student'
  );
$$;

-- 4. Re-configure RLS and Permissions for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.announcements TO authenticated;
GRANT SELECT ON TABLE public.announcements TO anon;

DROP POLICY IF EXISTS "ann_read" ON public.announcements;
DROP POLICY IF EXISTS "dudex_announcement_read" ON public.announcements;
DROP POLICY IF EXISTS "Students view relevant announcements" ON public.announcements;
DROP POLICY IF EXISTS "Teachers can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_read_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete_all" ON public.announcements;

CREATE POLICY "announcements_select_all"
  ON public.announcements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "announcements_insert_all"
  ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "announcements_update_all"
  ON public.announcements
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "announcements_delete_all"
  ON public.announcements
  FOR DELETE TO authenticated
  USING (true);

-- 5. Re-configure RLS and Permissions for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;

DROP POLICY IF EXISTS "dudex_notification_own_access" ON public.notifications;
DROP POLICY IF EXISTS "notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

-- Anyone authenticated can insert notifications for student/teacher/admin recipients
CREATE POLICY "notifications_insert_all"
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can read notifications directed to their user_id, recipient_id, or created by them
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR recipient_id = auth.uid()
    OR created_by = auth.uid()
  );

-- Users can update (e.g. mark as read) their own notifications
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR recipient_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR recipient_id = auth.uid()
    OR created_by = auth.uid()
  );

COMMIT;
