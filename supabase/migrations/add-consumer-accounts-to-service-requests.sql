-- ============================================
-- Wire real consumer accounts into service_requests
-- ============================================
-- consumer_id used to be an arbitrary opaque UUID: the anonymous "Guest
-- User" flow generated a fresh random one client-side per request, with no
-- real account behind it. Now that consumers register real accounts (see
-- src/app/api/consumers/register), tie consumer_id to an actual consumers
-- row the same way provider_id already ties to providers.
--
-- NOTE: this deletes all existing service_requests rows first. That's safe
-- here because every pre-existing row was "Guest User" anonymous test data
-- with no real identity behind it -- do not run this against a table with
-- real bookings without migrating consumer_id values first.
-- ============================================

DELETE FROM public.service_requests;

ALTER TABLE public.service_requests
    ADD CONSTRAINT service_requests_consumer_id_fkey
    FOREIGN KEY (consumer_id) REFERENCES public.consumers(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Consumers can view their own service requests" ON public.service_requests;

CREATE POLICY "Consumers can view their own service requests"
    ON public.service_requests FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (SELECT user_id FROM public.consumers WHERE id = consumer_id)
    );

DROP POLICY IF EXISTS "Consumers can create their own service requests" ON public.service_requests;

CREATE POLICY "Consumers can create their own service requests"
    ON public.service_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.consumers WHERE id = consumer_id)
    );

GRANT SELECT, INSERT ON public.service_requests TO authenticated;
