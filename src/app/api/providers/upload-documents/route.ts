/**
 * Provider Document Upload API
 * POST /api/providers/upload-documents - Upload verification documents to Supabase storage
 *
 * For an *already-registered* provider updating/replacing a document (e.g.
 * from their dashboard). Registration itself uploads documents inline (see
 * src/app/api/providers/register/route.ts) since there's no session yet at
 * that point in the flow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { ApiResponse } from '@/types'
import { getAuthenticatedUser } from '@/lib/api-auth'

function getSupabaseAdmin(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        return null
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

const ALLOWED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024 // 10MB, matches the storage bucket's own limit
const DOCUMENT_URL_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days -- see register route for the same caveat

async function uploadDocument(
    supabaseAdmin: SupabaseClient,
    userId: string,
    fieldName: string,
    file: File
): Promise<{ url: string | null; error: string | null }> {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
        return { url: null, error: `${fieldName}: unsupported file type "${file.type}"` }
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
        return { url: null, error: `${fieldName}: file too large` }
    }

    const extension = file.name.split('.').pop()
    const path = `${userId}/${fieldName}_${Date.now()}.${extension}`

    const { error: uploadError } = await supabaseAdmin.storage
        .from('provider-documents')
        .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
        console.error(`${fieldName} upload error:`, uploadError)
        return { url: null, error: `Failed to upload ${fieldName}` }
    }

    // The bucket is private -- getPublicUrl() would return a URL that always
    // 403s. A signed URL actually works.
    const { data: signedUrlData, error: signError } = await supabaseAdmin.storage
        .from('provider-documents')
        .createSignedUrl(path, DOCUMENT_URL_TTL_SECONDS)

    if (signError || !signedUrlData) {
        console.error(`${fieldName} sign error:`, signError)
        return { url: null, error: `Failed to generate a link for ${fieldName}` }
    }

    return { url: signedUrlData.signedUrl, error: null }
}

export async function POST(request: NextRequest) {
    try {
        const supabaseAdmin = getSupabaseAdmin()
        if (!supabaseAdmin) {
            return NextResponse.json({
                success: false,
                error: 'Database not configured'
            } as ApiResponse, { status: 503 })
        }

        // Real auth check: resolves the caller from their Supabase access
        // token (Authorization: Bearer <token>), not a client with no
        // knowledge of who's making this request.
        const user = await getAuthenticatedUser(request, supabaseAdmin)
        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            } as ApiResponse, { status: 401 })
        }

        // Only upload documents for your own provider profile
        const { data: provider, error: providerError } = await supabaseAdmin
            .from('providers')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (providerError || !provider) {
            return NextResponse.json({
                success: false,
                error: 'No provider profile found for this account'
            } as ApiResponse, { status: 404 })
        }

        const formData = await request.formData()
        const uploadedUrls: Record<string, string | string[]> = {}
        const uploadErrors: string[] = []

        const singleFileFields: Array<[string, string]> = [
            ['id_document', 'id_document_url'],
            ['business_license', 'business_license_url'],
            ['insurance_document', 'insurance_document_url']
        ]

        for (const [formKey, dbField] of singleFileFields) {
            const file = formData.get(formKey)
            if (file instanceof File) {
                const { url, error } = await uploadDocument(supabaseAdmin, user.id, formKey, file)
                if (url) uploadedUrls[dbField] = url
                if (error) uploadErrors.push(error)
            }
        }

        const certificationUrls: string[] = []
        let certIndex = 0
        while (true) {
            const certFile = formData.get(`certification_${certIndex}`)
            if (!(certFile instanceof File)) break
            const { url, error } = await uploadDocument(supabaseAdmin, user.id, `certification_${certIndex}`, certFile)
            if (url) certificationUrls.push(url)
            if (error) uploadErrors.push(error)
            certIndex++
        }
        if (certificationUrls.length > 0) {
            uploadedUrls.certification_urls = certificationUrls
        }

        if (Object.keys(uploadedUrls).length === 0) {
            return NextResponse.json({
                success: false,
                error: uploadErrors.join(', ') || 'No documents were uploaded'
            } as ApiResponse, { status: 400 })
        }

        uploadedUrls.documents_uploaded_at = new Date().toISOString()

        // Persist the new links onto the provider's own profile
        const { error: updateError } = await supabaseAdmin
            .from('providers')
            .update(uploadedUrls)
            .eq('id', provider.id)

        if (updateError) {
            console.error('Failed to save document URLs:', updateError)
            return NextResponse.json({
                success: false,
                error: 'Documents uploaded but failed to save to profile'
            } as ApiResponse, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: uploadedUrls,
            message: uploadErrors.length > 0
                ? `Some documents uploaded successfully (${uploadErrors.join(', ')})`
                : 'Documents uploaded successfully'
        } as ApiResponse)

    } catch (error) {
        console.error('Document upload error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to upload documents'
        } as ApiResponse, { status: 500 })
    }
}
