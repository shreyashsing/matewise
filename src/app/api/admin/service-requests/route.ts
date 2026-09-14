/**
 * Admin Service Requests List API
 * GET /api/admin/service-requests - All requests platform-wide, joined with
 * provider/consumer names, filterable and paginated. Never returns the OTP
 * column (same convention as GET /api/service-requests).
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
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const providerId = searchParams.get('provider_id')
    const consumerId = searchParams.get('consumer_id')
    const from = searchParams.get('from') // ISO date
    const to = searchParams.get('to') // ISO date
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25'), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    let query = supabaseAdmin
        .from('service_requests')
        .select(
            'id, consumer_id, provider_id, consumer_name, consumer_phone, consumer_email, ' +
            'service_category, service_address, distance_km, status, otp_verified, ' +
            'expires_at, created_at, responded_at, completed_at, ' +
            'providers(id, business_name, first_name, last_name)',
            { count: 'exact' }
        )

    if (status) query = query.eq('status', status)
    if (category) query = query.eq('service_category', category)
    if (providerId) query = query.eq('provider_id', providerId)
    if (consumerId) query = query.eq('consumer_id', consumerId)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) {
        console.error('Admin service requests list error:', error)
        return NextResponse.json({ success: false, error: error.message } as ApiResponse, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        data,
        pagination: { total: count || 0, limit, offset, has_more: (count || 0) > offset + limit }
    } as ApiResponse)
}
