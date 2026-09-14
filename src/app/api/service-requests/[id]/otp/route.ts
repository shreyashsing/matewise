/**
 * Service Request OTP API Route
 * GET /api/service-requests/[id]/otp - Fetch the OTP for a consumer to read out to their provider
 *
 * This is deliberately the *only* place the raw OTP is ever returned by the
 * API (see GET /api/service-requests, which strips it). Only the consumer
 * who created this request may fetch it. To further limit the exposure
 * window, the OTP is only served while it's actually still useful: once
 * it's been verified or the request is no longer in the 'accepted' state,
 * this returns status only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ApiResponse } from '@/types'
import { requireOwningConsumer } from '@/lib/api-auth'

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

export async function GET(
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

        const { data: serviceRequest, error } = await supabaseAdmin
            .from('service_requests')
            .select('status, otp, otp_verified, consumer_id')
            .eq('id', id)
            .single()

        if (error || !serviceRequest) {
            return NextResponse.json({
                success: false,
                error: 'Service request not found'
            } as ApiResponse, { status: 404 })
        }

        // Only the consumer who created this request may see its OTP
        const auth = await requireOwningConsumer(request, supabaseAdmin, serviceRequest.consumer_id)
        if (!auth.ok) {
            return NextResponse.json({
                success: false,
                error: auth.error
            } as ApiResponse, { status: auth.status })
        }

        const otpAvailable = serviceRequest.status === 'accepted' && !serviceRequest.otp_verified

        return NextResponse.json({
            success: true,
            data: {
                status: serviceRequest.status,
                otp_verified: serviceRequest.otp_verified,
                otp: otpAvailable ? serviceRequest.otp : null
            }
        } as ApiResponse)

    } catch (error) {
        console.error('Get OTP error:', error)
        return NextResponse.json({
            success: false,
            error: 'An unexpected error occurred'
        } as ApiResponse, { status: 500 })
    }
}
