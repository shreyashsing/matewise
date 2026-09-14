/**
 * Admin Consumers List API
 * GET /api/admin/consumers - Search, filter, sort and paginate consumers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import type { ApiResponse } from '@/types'

const SORTABLE_COLUMNS = new Set(['created_at', 'updated_at', 'first_name', 'last_name'])

export async function GET(request: NextRequest) {
    if (!isSupabaseAdminConfigured()) {
        return NextResponse.json({ success: false, error: 'Database not configured' } as ApiResponse, { status: 503 })
    }
    const auth = await requireAdmin(request, supabaseAdmin)
    if (!auth.ok) {
        return NextResponse.json({ success: false, error: auth.error } as ApiResponse, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') === 'asc'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25'), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    let query = supabaseAdmin.from('consumers').select('*', { count: 'exact' })

    if (q) {
        const escaped = q.replace(/[%_]/g, '\\$&')
        query = query.or(
            `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%`
        )
    }

    query = query
        .order(SORTABLE_COLUMNS.has(sort) ? sort : 'created_at', { ascending: order })
        .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) {
        console.error('Admin consumers list error:', error)
        return NextResponse.json({ success: false, error: error.message } as ApiResponse, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        data,
        pagination: { total: count || 0, limit, offset, has_more: (count || 0) > offset + limit }
    } as ApiResponse)
}
