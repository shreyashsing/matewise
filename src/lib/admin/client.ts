/**
 * Client-side helper for calling /api/admin/* routes. Attaches the current
 * Supabase access token the same way every existing API route expects it
 * (Authorization: Bearer <token>, see src/lib/api-auth.ts), so admin pages
 * don't each have to re-derive it from the session.
 */

import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

export class AdminApiError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

export async function adminFetch<T = unknown>(
    path: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined),
    }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(path, { ...options, headers })

    let body: ApiResponse<T>
    try {
        body = await response.json()
    } catch {
        body = { success: false, error: `Request failed (${response.status})` }
    }

    if (!response.ok) {
        throw new AdminApiError(body.error || `Request failed (${response.status})`, response.status)
    }

    return body
}
