/**
 * Admin Activity Log API
 * GET /api/admin/activity-log - Paginated audit trail, newest first.
 * Optional filters: entity_type, entity_id.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
    if (!isSupabaseAdminConfigured()) {
        return NextResponse.json({ success: false, error: 'Database not configured' } as ApiResponse, { status: 503 })
    }
    const auth = await requireAdmin(request, supabaseAdmin)
    if (!auth.ok) {
        return NextResponse.json({ success: false, error: auth.error } as ApiResponse, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    let query = supabaseAdmin
        .from('admin_activity_log')
        .select('*', { count: 'exact' })

    if (entityType) query = query.eq('entity_type', entityType)
    if (entityId) query = query.eq('entity_id', entityId)

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) {
        console.error('Admin activity log error:', error)
        return NextResponse.json({ success: false, error: error.message } as ApiResponse, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        data,
        pagination: { total: count || 0, limit, offset, has_more: (count || 0) > offset + limit }
    } as ApiResponse)
}
