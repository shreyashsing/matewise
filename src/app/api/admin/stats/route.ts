/**
 * Admin Dashboard Stats API
 * GET /api/admin/stats - Aggregate counts for the admin dashboard: provider
 * status breakdown, consumer count, service-request status breakdown,
 * completed-jobs totals, signups over the last 30 days, and top service
 * categories.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api-auth'
import type { ApiResponse, ProviderStatus, VerificationStatus, ServiceCategory } from '@/types'

const PROVIDER_STATUSES: ProviderStatus[] = ['pending', 'verified', 'active', 'suspended', 'inactive']
const VERIFICATION_STATUSES: VerificationStatus[] = ['pending', 'verified', 'rejected', 'expired']
const REQUEST_STATUSES = ['pending', 'accepted', 'rejected', 'expired', 'completed'] as const
const SERVICE_CATEGORIES: ServiceCategory[] = [
    'cleaning', 'repairs', 'moving', 'gardening', 'plumbing',
    'painting', 'tutoring', 'care', 'electrical', 'pets'
]

async function countWhere(
    table: string,
    column: string,
    value: string
): Promise<number> {
    const { count } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq(column, value)
    return count || 0
}

export async function GET(request: NextRequest) {
    if (!isSupabaseAdminConfigured()) {
        return NextResponse.json({
            success: false,
            error: 'Database not configured'
        } as ApiResponse, { status: 503 })
    }

    const auth = await requireAdmin(request, supabaseAdmin)
    if (!auth.ok) {
        return NextResponse.json({ success: false, error: auth.error } as ApiResponse, { status: auth.status })
    }

    try {
        const [
            totalProviders,
            totalConsumers,
            providersByStatus,
            providersByVerification,
            providersByService,
            requestsByStatus,
            requestsByCategory,
            jobsCompletedSum,
            signupRows
        ] = await Promise.all([
            supabaseAdmin.from('providers').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('consumers').select('*', { count: 'exact', head: true }),
            Promise.all(PROVIDER_STATUSES.map(async (status) => ({
                status, count: await countWhere('providers', 'status', status)
            }))),
            Promise.all(VERIFICATION_STATUSES.map(async (status) => ({
                status, count: await countWhere('providers', 'verification_status', status)
            }))),
            Promise.all(SERVICE_CATEGORIES.map(async (service) => ({
                service, count: await countWhere('providers', 'primary_service', service)
            }))),
            Promise.all(REQUEST_STATUSES.map(async (status) => ({
                status, count: await countWhere('service_requests', 'status', status)
            }))),
            Promise.all(SERVICE_CATEGORIES.map(async (service) => ({
                service, count: await countWhere('service_requests', 'service_category', service)
            }))),
            supabaseAdmin.from('providers').select('total_jobs_completed'),
            supabaseAdmin
                .from('profiles')
                .select('role, created_at')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        ])

        const jobsCompletedTotal = (jobsCompletedSum.data || [])
            .reduce((sum, row) => sum + (row.total_jobs_completed || 0), 0)

        const completedRequests = requestsByStatus.find(r => r.status === 'completed')?.count || 0

        // Bucket signups by day for the last 30 days
        const days: { date: string; consumers: number; providers: number }[] = []
        for (let i = 29; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
            days.push({ date: d.toISOString().slice(0, 10), consumers: 0, providers: 0 })
        }
        const dayIndex = new Map(days.map((d, idx) => [d.date, idx]))
        for (const row of signupRows.data || []) {
            const date = String(row.created_at).slice(0, 10)
            const idx = dayIndex.get(date)
            if (idx === undefined) continue
            if (row.role === 'consumer') days[idx].consumers++
            else if (row.role === 'provider') days[idx].providers++
        }

        return NextResponse.json({
            success: true,
            data: {
                total_providers: totalProviders.count || 0,
                total_consumers: totalConsumers.count || 0,
                providers_by_status: providersByStatus,
                providers_by_verification: providersByVerification,
                providers_by_service: providersByService.sort((a, b) => b.count - a.count),
                requests_by_status: requestsByStatus,
                requests_by_category: requestsByCategory.sort((a, b) => b.count - a.count),
                jobs_completed_total: jobsCompletedTotal,
                completed_requests_total: completedRequests,
                signups_last_30_days: days
            }
        } as ApiResponse)
    } catch (error) {
        console.error('Admin stats error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to load stats'
        } as ApiResponse, { status: 500 })
    }
}
