/**
 * Admin Provider Document Signing API
 * POST /api/admin/providers/[id]/documents/sign
 *
 * Mints a fresh, short-lived signed URL for one of a provider's verification
 * documents. The `providers` table only stores the signed URL generated at
 * upload time (7-day TTL, see upload routes) -- not the raw storage object
 * path -- so it's often stale by the time an admin looks at it. This route
 * extracts the object path back out of that stored URL and re-signs it,
 * rather than ever persisting a long-lived admin-viewable link.
 *
 * Body: { field: 'id_document_url' | 'business_license_url' |
 *                 'insurance_document_url' | 'certification_urls',
 *         index?: number } -- index required when field is certification_urls.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import type { ApiResponse } from '@/types'

const SIGN_TTL_SECONDS = 600 // 10 minutes -- just long enough for an admin to view/download it

const DOCUMENT_FIELDS = ['id_document_url', 'business_license_url', 'insurance_document_url', 'certification_urls'] as const
type DocumentField = typeof DOCUMENT_FIELDS[number]

/**
 * Pulls the storage object path back out of a previously-generated Supabase
 * signed URL, e.g.
 * ".../storage/v1/object/sign/provider-documents/<path>?token=..." -> "<path>"
 */
function extractStoragePath(signedUrl: string): string | null {
    const match = signedUrl.match(/\/object\/sign\/provider-documents\/([^?]+)/)
    if (!match) return null
    try {
        return decodeURIComponent(match[1])
    } catch {
        return match[1]
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!isSupabaseAdminConfigured()) {
        return NextResponse.json({ success: false, error: 'Database not configured' } as ApiResponse, { status: 503 })
    }
    const auth = await requireAdmin(request, supabaseAdmin)
    if (!auth.ok) {
        return NextResponse.json({ success: false, error: auth.error } as ApiResponse, { status: auth.status })
    }

    const { id } = await params
    const body = await request.json().catch(() => null) as { field?: string; index?: number } | null
    const field = body?.field as DocumentField | undefined

    if (!field || !DOCUMENT_FIELDS.includes(field)) {
        return NextResponse.json({ success: false, error: 'Invalid document field' } as ApiResponse, { status: 400 })
    }

    const { data: provider, error } = await supabaseAdmin
        .from('providers')
        .select('id_document_url, business_license_url, insurance_document_url, certification_urls')
        .eq('id', id)
        .single()

    if (error || !provider) {
        return NextResponse.json({ success: false, error: 'Provider not found' } as ApiResponse, { status: 404 })
    }

    let storedUrl: string | null | undefined
    if (field === 'certification_urls') {
        const index = body?.index
        if (typeof index !== 'number' || index < 0) {
            return NextResponse.json({ success: false, error: 'index is required for certification_urls' } as ApiResponse, { status: 400 })
        }
        storedUrl = provider.certification_urls?.[index]
    } else {
        storedUrl = provider[field]
    }

    if (!storedUrl) {
        return NextResponse.json({ success: false, error: 'No document uploaded for this field' } as ApiResponse, { status: 404 })
    }

    const path = extractStoragePath(storedUrl)
    if (!path) {
        return NextResponse.json({ success: false, error: 'Could not resolve stored document path' } as ApiResponse, { status: 500 })
    }

    const { data: signedUrlData, error: signError } = await supabaseAdmin.storage
        .from('provider-documents')
        .createSignedUrl(path, SIGN_TTL_SECONDS)

    if (signError || !signedUrlData) {
        console.error('Admin document sign error:', signError)
        return NextResponse.json({ success: false, error: 'Failed to generate a link for this document' } as ApiResponse, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        data: { url: signedUrlData.signedUrl, expires_in: SIGN_TTL_SECONDS }
    } as ApiResponse)
}
