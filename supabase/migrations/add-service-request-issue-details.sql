-- Migration: Add issue details (description + photos) to service requests
-- Consumers now describe what they're facing and can attach up to 4 photos
-- when requesting a service, so the provider sees real context about the
-- job before they accept -- not just a name and a category.
--
-- Safe to run multiple times.

ALTER TABLE public.service_requests
    ADD COLUMN IF NOT EXISTS issue_description TEXT,
    ADD COLUMN IF NOT EXISTS issue_image_paths TEXT[];

COMMENT ON COLUMN public.service_requests.issue_description IS
    'Consumer-written description of the problem, collected on the request form before it is sent to a provider';
COMMENT ON COLUMN public.service_requests.issue_image_paths IS
    'Storage paths (service-request-images bucket) for consumer-uploaded photos of the issue. Private bucket -- always signed into short-lived URLs on read (see src/lib/service-request-images.ts), never returned to clients as raw paths';

-- ============================================
-- Storage bucket for consumer-submitted issue photos
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'service-request-images',
    'service-request-images',
    false, -- private: only ever served via short-lived signed URLs from the API
    5242880, -- 5MB per photo
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Consumers may upload into their own folder (object path = "<auth uid>/...")
DROP POLICY IF EXISTS "Consumers can upload their own issue photos" ON storage.objects;
CREATE POLICY "Consumers can upload their own issue photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'service-request-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Consumers may view the photos they uploaded
DROP POLICY IF EXISTS "Consumers can view their own issue photos" ON storage.objects;
CREATE POLICY "Consumers can view their own issue photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'service-request-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- The provider a request was sent to (and admins) never get an ambient
-- bucket-read policy here -- they only ever see these photos through the
-- API's signed URLs, generated with the service-role key. That key bypasses
-- RLS entirely, so no additional SELECT policy is needed for them.
