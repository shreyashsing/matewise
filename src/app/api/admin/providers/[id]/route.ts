/**
 * Admin Provider Detail API
 * GET    /api/admin/providers/[id] - Full row + recent service requests
 * PATCH  /api/admin/providers/[id] - Edit any admin-editable column
 * DELETE /api/admin/providers/[id] - Permanently delete the provider + auth user
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAdminActivity } from '@/lib/admin/activity-log'
import type { ApiResponse } from '@/types'

// Columns an admin is allowed to write. Deliberately excludes id, user_id,
// email (identity), location/lat/lng (derived from address via trigger --
// editing address_* below re-triggers it), created_at/updated_at.
const EDITABLE_FIELDS = [
    'first_name', 'last_name', 'phone', 'business_name', 'description',
    'primary_service', 'additional_services',
    'address_street', 'address_city', 'address_postcode', 'address_county', 'address_country',
    'formatted_address', 'latitude', 'longitude',
    'service_radius_km', 'years_experience', 'hourly_rate', 'minimum_charge',
    'status', 'verification_status', 'trust_score', 'rating_average',
    'total_reviews', 'total_jobs_completed', 'is_available', 'availability_hours',
    'suspended_reason', 'admin_notes'
] as const

export async function GET(
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

    const [{ data: provider, error }, { data: recentRequests }] = await Promise.all([
        supabaseAdmin.from('providers').select('*').eq('id', id).single(),
        supabaseAdmin
            .from('service_requests')
            .select('id, consumer_name, service_category, status, otp_verified, created_at, responded_at, completed_at, distance_km, service_address')
            .eq('provider_id', id)
            .order('created_at', { ascending: false })
            .limit(20)
    ])

    if (error || !provider) {
        return NextResponse.json({ success: false, error: 'Provider not found' } as ApiResponse, { status: 404 })
    }

    return NextResponse.json({
        success: true,
        data: { ...provider, recent_service_requests: recentRequests || [] }
    } as ApiResponse)
}

export async function PATCH(
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
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
        return NextResponse.json({ success: false, error: 'Invalid request body' } as ApiResponse, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    for (const field of EDITABLE_FIELDS) {
        if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ success: false, error: 'No editable fields provided' } as ApiResponse, { status: 400 })
    }

    const { data: before } = await supabaseAdmin.from('providers').select('*').eq('id', id).single()
    if (!before) {
        return NextResponse.json({ success: false, error: 'Provider not found' } as ApiResponse, { status: 404 })
    }

    const { data: updated, error } = await supabaseAdmin
        .from('providers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Admin provider update error:', error)
        return NextResponse.json({ success: false, error: error.message } as ApiResponse, { status: 500 })
    }

    const changed: Record<string, { from: unknown; to: unknown }> = {}
    for (const field of Object.keys(updates)) {
        const beforeVal = (before as Record<string, unknown>)[field]
        const afterVal = (updated as Record<string, unknown>)[field]
        if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
            changed[field] = { from: beforeVal, to: afterVal }
        }
    }

    await logAdminActivity(supabaseAdmin, {
        adminId: auth.userId,
        adminEmail: auth.email || 'unknown',
        action: 'provider.updated',
        entityType: 'provider',
        entityId: id,
        details: { changed, provider_name: `${updated.first_name} ${updated.last_name}`.trim() }
    })

    return NextResponse.json({ success: true, data: updated, message: 'Provider updated' } as ApiResponse)
}

export async function DELETE(
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

    const { data: provider, error: fetchError } = await supabaseAdmin
        .from('providers')
        .select('*')
        .eq('id', id)
        .single()

    if (fetchError || !provider) {
        return NextResponse.json({ success: false, error: 'Provider not found' } as ApiResponse, { status: 404 })
    }

    // Snapshot before deleting -- once the row is gone, entity_id is all
    // that's left to point at it, so the log needs to carry the rest.
    await logAdminActivity(supabaseAdmin, {
        adminId: auth.userId,
        adminEmail: auth.email || 'unknown',
        action: 'provider.deleted',
        entityType: 'provider',
        entityId: id,
        details: {
            snapshot: {
                first_name: provider.first_name,
                last_name: provider.last_name,
                email: provider.email,
                business_name: provider.business_name,
                status: provider.status
            }
        }
    })

    const { error: deleteError } = await supabaseAdmin.from('providers').delete().eq('id', id)
    if (deleteError) {
        console.error('Admin provider delete error:', deleteError)
        return NextResponse.json({ success: false, error: deleteError.message } as ApiResponse, { status: 500 })
    }

    // Also remove the login itself -- a deleted provider shouldn't still be
    // able to sign in with an orphaned auth account.
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(provider.user_id)
    if (authDeleteError) {
        console.error('Failed to delete auth user for provider:', authDeleteError)
    }

    return NextResponse.json({ success: true, message: 'Provider deleted' } as ApiResponse)
}
