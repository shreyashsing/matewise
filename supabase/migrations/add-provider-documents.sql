-- Migration: Add verification document fields to providers table
-- Run this migration to add document storage fields

ALTER TABLE public.providers 
    ADD COLUMN IF NOT EXISTS id_document_url TEXT,
    ADD COLUMN IF NOT EXISTS business_license_url TEXT,
    ADD COLUMN IF NOT EXISTS certification_urls TEXT[],
    ADD COLUMN IF NOT EXISTS insurance_document_url TEXT,
    ADD COLUMN IF NOT EXISTS documents_uploaded_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.providers.id_document_url IS 'URL to government ID/passport document in Supabase storage';
COMMENT ON COLUMN public.providers.business_license_url IS 'URL to business license document in Supabase storage';
COMMENT ON COLUMN public.providers.certification_urls IS 'Array of URLs to professional certification documents';
COMMENT ON COLUMN public.providers.insurance_document_url IS 'URL to insurance certificate document';
COMMENT ON COLUMN public.providers.documents_uploaded_at IS 'Timestamp when documents were uploaded';
