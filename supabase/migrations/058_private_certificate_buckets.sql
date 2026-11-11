-- 058: Certificates are personal documents (AUD-05).
--
-- The certificates bucket was public, so anyone holding a file URL could
-- download a student's certificate regardless of the certs_student policy
-- (public buckets serve files without RLS). It is now private; students read
-- their own folder through signed URLs / the authenticated API, admins keep
-- full access via certs_admin. "avaters" is a misspelt duplicate of "avatars"
-- with no policies; making it private closes it without deleting anything.
-- Both buckets were empty and no portal reads them by public URL.

BEGIN;

UPDATE storage.buckets SET public = false WHERE id IN ('certificates', 'avaters');

COMMIT;
