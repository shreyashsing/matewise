-- ============================================
-- Supabase Storage Buckets for Provider Documents
-- ============================================

-- Create storage bucket for provider verification documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'provider-documents',
    'provider-documents',
    false, -- Private bucket (requires authentication)
    10485760, -- 10MB file size limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/pdf'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage Policies for Provider Documents
-- ============================================

-- Allow authenticated users to upload their own documents
CREATE POLICY "Providers can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'provider-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own documents
CREATE POLICY "Providers can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'provider-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own documents
CREATE POLICY "Providers can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'provider-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own documents
CREATE POLICY "Providers can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'provider-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all documents (optional)
CREATE POLICY "Admins can view all provider documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'provider-documents' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
