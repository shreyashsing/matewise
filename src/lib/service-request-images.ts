/**
 * Consumer-submitted issue photos for a service request.
 * Uploaded to a private storage bucket and only ever handed back to
 * clients as short-lived signed URLs -- see the bucket/RLS setup in
 * supabase/migrations/add-service-request-issue-details.sql.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ISSUE_REPORT } from '@/config/constants'

const BUCKET = 'service-request-images'
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 // 24 hours -- regenerated on every read, so a
// request that's still open longer than this never ends up with a stale link.

/**
 * Uploads one issue photo to the consumer's own folder in the bucket and
 * returns its storage path (not a URL). Validates type/size against
 * ISSUE_REPORT so a request can't smuggle in an oversized or unexpected file
 * even if the client-side check was bypassed.
 */
export async function uploadIssueImage(
    supabaseAdmin: SupabaseClient,
    userId: string,
    index: number,
    file: File
): Promise<{ path: string | null; error: string | null }> {
    if (!ISSUE_REPORT.allowedImageTypes.includes(file.type as typeof ISSUE_REPORT.allowedImageTypes[number])) {
        return { path: null, error: `Photo ${index + 1}: unsupported file type "${file.type}"` }
    }
    if (file.size > ISSUE_REPORT.maxImageBytes) {
        return { path: null, error: `Photo ${index + 1}: file too large (max ${ISSUE_REPORT.maxImageBytes / (1024 * 1024)}MB)` }
    }

    const extension = file.name.split('.').pop() || 'jpg'
    const path = `${userId}/${Date.now()}_${index}.${extension}`

    const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
        console.error(`Issue photo ${index + 1} upload error:`, uploadError)
        return { path: null, error: `Failed to upload photo ${index + 1}` }
    }

    return { path, error: null }
}

/**
 * Turns stored issue-photo paths into short-lived signed URLs. Called on
 * every read (not baked in once at upload time) so requests stay viewable
 * for as long as they're relevant, however long after upload that is.
 * Returns [] (never throws) if paths is empty/missing or signing fails --
 * callers treat "no photos" the same as "couldn't sign them".
 */
export async function signIssueImagePaths(
    supabaseAdmin: SupabaseClient,
    paths: string[] | null | undefined
): Promise<string[]> {
    if (!paths || paths.length === 0) return []

    const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

    if (error || !data) {
        console.error('Failed to sign issue image URLs:', error)
        return []
    }

    return data
        .filter((entry): entry is typeof entry & { signedUrl: string } => !entry.error && Boolean(entry.signedUrl))
        .map((entry) => entry.signedUrl)
}
