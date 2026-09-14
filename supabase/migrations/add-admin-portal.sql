-- ============================================
-- Admin Portal Support
-- ============================================
-- profiles.role already has an 'admin' value in the user_role enum (see
-- schema.sql) but nothing uses it yet. This migration adds the supporting
-- audit table and the columns/indexes the admin portal's API routes need.
-- Admin access itself is enforced in application code (src/lib/admin-auth.ts)
-- by looking up profiles.role with the service-role key on every request --
-- never trusted from the client. All admin API routes use the service-role
-- client, which bypasses RLS entirely, so no new RLS *policies* are needed
-- here for admin reads/writes.

-- ============================================
-- Admin activity log (audit trail)
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at
    ON public.admin_activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_entity
    ON public.admin_activity_log (entity_type, entity_id);

-- This table holds an internal audit trail, not user-facing data. Every
-- legitimate read/write goes through admin API routes using the
-- service-role key (which bypasses RLS/grants entirely), so -- same
-- reasoning as service_requests' OTP lockdown at the bottom of schema.sql --
-- strip the anon/authenticated grants back off entirely rather than leaving
-- them with useless RLS-blocked access.
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_activity_log FROM anon, authenticated;

-- ============================================
-- Admin-editable notes/reason columns
-- ============================================

ALTER TABLE public.providers
    ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
    ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.consumers
    ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
    ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ============================================
-- Indexes for admin list/stat queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_providers_created_at
    ON public.providers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consumers_created_at
    ON public.consumers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_requests_created_at
    ON public.service_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_role
    ON public.profiles (role);
