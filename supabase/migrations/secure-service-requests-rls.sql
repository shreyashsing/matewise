-- ============================================
-- Security fix: lock down public.service_requests
-- ============================================
-- Problem: service_requests never had RLS enabled, and the schema-wide
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
-- statement (see bottom of schema.sql) gave the public anon key --
-- which ships in every client bundle by design -- full read/write
-- access to this table directly via supabase-js, completely bypassing
-- every API route. That meant anyone could:
--   - SELECT * and read every consumer's name/phone/email plus every
--     OTP ever generated
--   - UPDATE status/otp_verified on any row to fake an acceptance or
--     a completed OTP check
--   - INSERT arbitrary rows to spam providers
--
-- Fix: enable RLS, revoke the blanket grant on this one table, and
-- grant back only what's actually needed.
--
-- All legitimate reads/writes already go through the API routes under
-- src/app/api/service-requests/**, which use the Supabase service-role
-- key and therefore bypass RLS entirely -- those are unaffected.
--
-- The one thing that *does* rely on direct client-side table access is
-- the provider dashboard's Realtime subscription (an authenticated
-- provider watching their own incoming requests). The policy below
-- preserves exactly that and nothing more. The consumer-facing status
-- watcher (anonymous, no Supabase Auth session) has been switched to
-- poll the existing API route instead -- see
-- src/components/service-request/service-request-modal.tsx.
--
-- Safe to run multiple times.
-- ============================================

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can view their own service requests" ON public.service_requests;

CREATE POLICY "Providers can view their own service requests"
    ON public.service_requests FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (SELECT user_id FROM public.providers WHERE id = provider_id)
    );

-- Strip the blanket privileges this table inherited from the
-- schema-wide grant, then re-grant only SELECT to authenticated users
-- -- the policy above further scopes that to their own rows. No
-- privileges at all are granted to anon, and no INSERT/UPDATE/DELETE
-- policy exists for either role: all writes happen server-side via
-- the service-role key.
REVOKE ALL ON public.service_requests FROM anon, authenticated;
GRANT SELECT ON public.service_requests TO authenticated;
