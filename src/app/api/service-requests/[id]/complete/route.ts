/**
 * Service Request Completion API Route
 * PATCH /api/service-requests/[id]/complete - Provider marks a job as done
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ApiResponse } from '@/types'
import { requireOwningProvider } from '@/lib/api-auth'

function getSupabaseAdmin() {
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

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabaseAdmin = getSupabaseAdmin()

        if (!supabaseAdmin) {
            return NextResponse.json({
                success: false,
                error: 'Database not configured'
            } as ApiResponse, { status: 503 })
        }

        const { id } = await params

        const { data: serviceRequest, error: fetchError } = await supabaseAdmin
            .from('service_requests')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !serviceRequest) {
            return NextResponse.json({
                success: false,
                error: 'Service request not found'
            } as ApiResponse, { status: 404 })
        }

        // Only the provider this job belongs to may mark it complete
        const auth = await requireOwningProvider(request, supabaseAdmin, serviceRequest.provider_id)
        if (!auth.ok) {
            return NextResponse.json({
                success: false,
                error: auth.error
            } as ApiResponse, { status: auth.status })
        }

        if (serviceRequest.status !== 'accepted') {
            return NextResponse.json({
                success: false,
                error: `Request cannot be completed from status "${serviceRequest.status}"`
            } as ApiResponse, { status: 400 })
        }

        if (!serviceRequest.otp_verified) {
            return NextResponse.json({
                success: false,
                error: 'OTP must be verified before the job can be marked complete'
            } as ApiResponse, { status: 400 })
        }

        const { data: updatedRequest, error: updateError } = await supabaseAdmin
            .from('service_requests')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (updateError) {
            console.error('Error completing request:', updateError)
            return NextResponse.json({
                success: false,
                error: 'Failed to mark request complete'
            } as ApiResponse, { status: 500 })
        }

        const { otp: _otp, ...responseData } = updatedRequest

        return NextResponse.json({
            success: true,
            data: responseData,
            message: 'Job marked as completed'
        } as ApiResponse)

    } catch (error) {
        console.error('Complete request error:', error)
        return NextResponse.json({
            success: false,
            error: 'An unexpected error occurred'
        } as ApiResponse, { status: 500 })
    }
}
