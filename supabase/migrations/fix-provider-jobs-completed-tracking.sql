-- providers.total_jobs_completed was only ever set to its DEFAULT 0 at
-- signup and read everywhere (provider's own dashboard, nearby search,
-- admin portal) but never incremented anywhere -- the "mark job complete"
-- route only updated service_requests.status. Fix both the going-forward
-- tracking and the currently-wrong live data.

-- Atomic increment, called from PATCH /api/service-requests/[id]/complete
-- after a request transitions to 'completed'. Plain UPDATE ... SET x = x + 1
-- avoids the read-modify-write race a client-side increment would have.
CREATE OR REPLACE FUNCTION increment_provider_jobs_completed(p_provider_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.providers
    SET total_jobs_completed = COALESCE(total_jobs_completed, 0) + 1
    WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- One-time backfill: recompute every provider's counter from the
-- service_requests rows that already exist. Idempotent -- safe to re-run.
UPDATE public.providers p
SET total_jobs_completed = (
    SELECT COUNT(*)
    FROM public.service_requests sr
    WHERE sr.provider_id = p.id AND sr.status = 'completed'
);
