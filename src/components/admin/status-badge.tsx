/**
 * Small color-coded pill used across admin tables/detail pages for any
 * enum-ish status value (provider status, verification status, request
 * status, ...).
 */

import { cn } from '@/lib/utils'

const COLOR_MAP: Record<string, string> = {
    // Provider status
    active: 'bg-green-100 text-green-800',
    verified: 'bg-blue-100 text-blue-800',
    pending: 'bg-amber-100 text-amber-800',
    suspended: 'bg-red-100 text-red-800',
    inactive: 'bg-slate-100 text-slate-600',
    // Verification status
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-slate-100 text-slate-600',
    // Request status
    accepted: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
    const colors = COLOR_MAP[status] || 'bg-slate-100 text-slate-700'
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                colors,
                className
            )}
        >
            {status.replace(/_/g, ' ')}
        </span>
    )
}
