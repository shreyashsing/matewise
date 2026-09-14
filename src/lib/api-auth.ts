import type { SupabaseClient, User } from '@supabase/supabase-js'

type AuthResult =
    | { ok: true; userId: string }
    | { ok: false; status: number; error: string }

/**
 * Resolves the caller from a Supabase access token in the
 * `Authorization: Bearer <token>` header, if present. Returns null (not an
 * error) when there's no token or it doesn't resolve to a user -- callers
 * decide whether that's acceptable.
 *
 * `supabaseAdmin` must be the service-role client -- verifying a bearer
 * token requires elevated privileges.
 */
export async function getAuthenticatedUser(
    request: Request,
    supabaseAdmin: SupabaseClient
): Promise<User | null> {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) return null

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    return error ? null : user
}

/**
 * Verifies that the caller is authenticated *and* is the provider that owns
 * `providerId`. Used to gate provider-only actions (accepting/rejecting a
 * service request, verifying its OTP) so that knowing a request's id alone
 * isn't enough to act as its provider.
 */
export async function requireOwningProvider(
    request: Request,
    supabaseAdmin: SupabaseClient,
    providerId: string
): Promise<AuthResult> {
    const user = await getAuthenticatedUser(request, supabaseAdmin)
    if (!user) {
        return { ok: false, status: 401, error: 'Authentication required' }
    }

    const { data: provider, error: providerError } = await supabaseAdmin
        .from('providers')
        .select('user_id')
        .eq('id', providerId)
        .single()

    if (providerError || !provider) {
        return { ok: false, status: 404, error: 'Provider not found' }
    }

    if (provider.user_id !== user.id) {
        return { ok: false, status: 403, error: 'You are not authorized to perform this action' }
    }

    return { ok: true, userId: user.id }
}

/**
 * Verifies that the caller is authenticated *and* is the consumer that owns
 * `consumerId` (a row id in public.consumers, not an auth user id).
 */
export async function requireOwningConsumer(
    request: Request,
    supabaseAdmin: SupabaseClient,
    consumerId: string
): Promise<AuthResult> {
    const user = await getAuthenticatedUser(request, supabaseAdmin)
    if (!user) {
        return { ok: false, status: 401, error: 'Authentication required' }
    }

    const { data: consumer, error: consumerError } = await supabaseAdmin
        .from('consumers')
        .select('user_id')
        .eq('id', consumerId)
        .single()

    if (consumerError || !consumer) {
        return { ok: false, status: 404, error: 'Consumer not found' }
    }

    if (consumer.user_id !== user.id) {
        return { ok: false, status: 403, error: 'You are not authorized to perform this action' }
    }

    return { ok: true, userId: user.id }
}
