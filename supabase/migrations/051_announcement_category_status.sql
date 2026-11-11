-- 051: Teacher "Student Communication" items (Announcements, Support Requests,
-- Class Discussion, Teacher Notes) are stored as announcements so students
-- receive them. Adds a category and a publication status; additive only, and
-- existing rows default to a published announcement.

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Announcements',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Published';

DO $c$ BEGIN
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_category_check
    CHECK (category = ANY (ARRAY['Announcements', 'Support Requests', 'Class Discussion', 'Teacher Notes']));
EXCEPTION WHEN duplicate_object THEN NULL; END $c$;

DO $c$ BEGIN
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_status_check
    CHECK (status = ANY (ARRAY['Published', 'Draft', 'Archived']));
EXCEPTION WHEN duplicate_object THEN NULL; END $c$;
