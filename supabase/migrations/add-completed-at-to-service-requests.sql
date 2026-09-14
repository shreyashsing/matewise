-- Run after add-completed-status-to-service-requests.sql
ALTER TABLE public.service_requests
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.service_requests.completed_at IS 'Set when the provider marks the job done (requires OTP verified first)';
