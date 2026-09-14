/**
 * Admin identity check
 * GET /api/admin/me - Confirms the bearer token belongs to an admin account.
 * Used by the /admin client shell to gate every admin page: being logged in
 * is not enough, the caller's profiles.role must actually be 'admin'.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
    if (!isSupabaseAdminConfigured()) {
        return NextResponse.json({
            success: false,
            error: 'Database not configured'
        } as ApiResponse, { status: 503 })
    }

    const auth = await requireAdmin(request, supabaseAdmin)
    if (!auth.ok) {
        return NextResponse.json({
            success: false,
            error: auth.error
        } as ApiResponse, { status: auth.status })
    }

    return NextResponse.json({
        success: true,
        data: { id: auth.userId, email: auth.email }
    } as ApiResponse)
}
