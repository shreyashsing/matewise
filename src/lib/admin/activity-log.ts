/**
 * Admin activity log helper -- every mutating admin action (status changes,
 * edits, deletes) writes one row here via logAdminActivity() so there's an
 * accountable audit trail of what an admin did and why. See
 * supabase/migrations/add-admin-portal.sql for the table.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export async function logAdminActivity(
    supabaseAdmin: SupabaseClient,
    entry: {
        adminId: string
        adminEmail: string
        action: string
        entityType: 'provider' | 'consumer' | 'service_request'
        entityId?: string | null
        details?: Record<string, unknown>
    }
): Promise<void> {
    const { error } = await supabaseAdmin.from('admin_activity_log').insert({
        admin_id: entry.adminId,
        admin_email: entry.adminEmail,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        details: entry.details ?? null
    })

    // Never let a logging failure block the admin action itself -- just
    // surface it server-side.
    if (error) {
        console.error('Failed to write admin_activity_log entry:', error)
    }
}
