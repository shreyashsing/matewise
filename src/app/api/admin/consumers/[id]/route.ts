/**
 * Admin Consumer Detail API
 * GET    /api/admin/consumers/[id] - Full row + recent service requests
 * PATCH  /api/admin/consumers/[id] - Edit any admin-editable column
 * DELETE /api/admin/consumers/[id] - Permanently delete the consumer + auth user
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import { logAdminActivity } from '@/lib/admin/activity-log'
import type { ApiResponse } from '@/types'

const EDITABLE_FIELDS = [
    'first_name', 'last_name', 'phone',
    'default_address_street', 'default_address_city', 'default_address_postcode',
    'default_address_county', 'default_address_country', 'default_formatted_address',
    'default_latitude', 'default_longitude',
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

    const [{ data: consumer, error }, { data: recentRequests }] = await Promise.all([
        supabaseAdmin.from('consumers').select('*').eq('id', id).single(),
        supabaseAdmin
            .from('service_requests')
            .select('id, provider_id, service_category, status, otp_verified, created_at, responded_at, completed_at, service_address, providers(business_name, first_name, last_name)')
            .eq('consumer_id', id)
            .order('created_at', { ascending: false })
            .limit(20)
    ])

    if (error || !consumer) {
        return NextResponse.json({ success: false, error: 'Consumer not found' } as ApiResponse, { status: 404 })
    }

    return NextResponse.json({
        success: true,
        data: { ...consumer, recent_service_requests: recentRequests || [] }
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

    const { data: before } = await supabaseAdmin.from('consumers').select('*').eq('id', id).single()
    if (!before) {
        return NextResponse.json({ success: false, error: 'Consumer not found' } as ApiResponse, { status: 404 })
    }

    const { data: updated, error } = await supabaseAdmin
        .from('consumers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Admin consumer update error:', error)
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
        action: 'consumer.updated',
        entityType: 'consumer',
        entityId: id,
        details: { changed, consumer_name: `${updated.first_name} ${updated.last_name}`.trim() }
    })

    return NextResponse.json({ success: true, data: updated, message: 'Consumer updated' } as ApiResponse)
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

    const { data: consumer, error: fetchError } = await supabaseAdmin
        .from('consumers')
        .select('*')
        .eq('id', id)
        .single()

    if (fetchError || !consumer) {
        return NextResponse.json({ success: false, error: 'Consumer not found' } as ApiResponse, { status: 404 })
    }

    await logAdminActivity(supabaseAdmin, {
        adminId: auth.userId,
        adminEmail: auth.email || 'unknown',
        action: 'consumer.deleted',
        entityType: 'consumer',
        entityId: id,
        details: {
            snapshot: {
                first_name: consumer.first_name,
                last_name: consumer.last_name,
                email: consumer.email
            }
        }
    })

    const { error: deleteError } = await supabaseAdmin.from('consumers').delete().eq('id', id)
    if (deleteError) {
        console.error('Admin consumer delete error:', deleteError)
        return NextResponse.json({ success: false, error: deleteError.message } as ApiResponse, { status: 500 })
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(consumer.user_id)
    if (authDeleteError) {
        console.error('Failed to delete auth user for consumer:', authDeleteError)
    }

    return NextResponse.json({ success: true, message: 'Consumer deleted' } as ApiResponse)
}
