/**
 * Provider Registration API Route
 * POST /api/providers/register
 *
 * Accepts multipart/form-data: the same registration fields as before, plus
 * optional verification documents (id_document, business_license,
 * insurance_document, certification_0..N). Documents are uploaded here,
 * after the account is created, using the service-role client -- not a
 * separate authenticated endpoint, because there's no session to check at
 * this point in the flow: the account doesn't exist yet until this request
 * creates it. See src/app/api/providers/upload-documents/route.ts for the
 * (now properly authenticated) endpoint an already-registered provider would
 * use to replace a document later.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { ApiResponse, ServiceCategory, Address, GeoLocation } from '@/types'
import { isValidPhone, isValidPostcode, isWithinSupportedRegion, SUPPORTED_REGION_NAMES } from '@/lib/location-rules'

// Create admin client lazily to avoid build errors
function getSupabaseAdmin(): SupabaseClient | null {
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

// Validation helpers
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

const VALID_SERVICES: ServiceCategory[] = [
    'cleaning', 'repairs', 'moving', 'gardening', 'plumbing',
    'painting', 'tutoring', 'care', 'electrical', 'pets'
]

const ALLOWED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024 // 10MB, matches the storage bucket's own limit

// How long a saved document link stays viewable before it 403s. This is a
// stopgap: a real admin-review feature should mint a fresh signed URL on
// demand rather than rely on the one saved at upload time indefinitely.
const DOCUMENT_URL_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

async function uploadDocument(
    supabaseAdmin: SupabaseClient,
    userId: string,
    fieldName: string,
    file: File
): Promise<string | null> {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
        console.warn(`Skipping ${fieldName}: unsupported file type "${file.type}"`)
        return null
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
        console.warn(`Skipping ${fieldName}: file too large (${file.size} bytes)`)
        return null
    }

    const extension = file.name.split('.').pop()
    const path = `${userId}/${fieldName}_${Date.now()}.${extension}`

    const { error: uploadError } = await supabaseAdmin.storage
        .from('provider-documents')
        .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
        console.error(`${fieldName} upload error:`, uploadError)
        return null
    }

    // The bucket is private -- getPublicUrl() would return a URL that always
    // 403s. A signed URL actually works.
    const { data: signedUrlData, error: signError } = await supabaseAdmin.storage
        .from('provider-documents')
        .createSignedUrl(path, DOCUMENT_URL_TTL_SECONDS)

    if (signError || !signedUrlData) {
        console.error(`${fieldName} sign error:`, signError)
        return null
    }

    return signedUrlData.signedUrl
}

export async function POST(request: NextRequest) {
    try {
        const supabaseAdmin = getSupabaseAdmin()

        if (!supabaseAdmin) {
            const response: ApiResponse = {
                success: false,
                error: 'Database not configured. Please set up Supabase environment variables.'
            }
            return NextResponse.json(response, { status: 503 })
        }

        const formData = await request.formData()

        const getText = (key: string) => {
            const value = formData.get(key)
            return typeof value === 'string' ? value : ''
        }
        const getJson = <T,>(key: string): T | null => {
            const raw = getText(key)
            if (!raw) return null
            try {
                return JSON.parse(raw) as T
            } catch {
                return null
            }
        }

        const primary_service = getText('primary_service') as ServiceCategory
        const first_name = getText('first_name')
        const last_name = getText('last_name')
        const email = getText('email')
        const phone = getText('phone')
        const password = getText('password')
        const business_name = getText('business_name')
        const description = getText('description')
        const years_experience = getText('years_experience')
        const hourly_rate = getText('hourly_rate')
        const service_radius_km = getText('service_radius_km')
        const address = getJson<Address>('address')
        const location = getJson<GeoLocation>('location')

        // Validate required fields
        const errors: string[] = []

        if (!primary_service || !VALID_SERVICES.includes(primary_service)) {
            errors.push('Invalid service category')
        }

        if (!first_name?.trim()) {
            errors.push('First name is required')
        }

        if (!last_name?.trim()) {
            errors.push('Last name is required')
        }

        if (!email || !isValidEmail(email)) {
            errors.push('Valid email is required')
        }

        if (!phone || !isValidPhone(phone)) {
            errors.push(`Valid phone number is required (${SUPPORTED_REGION_NAMES})`)
        }

        if (!password || password.length < 8) {
            errors.push('Password must be at least 8 characters')
        }

        if (!address?.street?.trim()) {
            errors.push('Street address is required')
        }

        if (!address?.city?.trim()) {
            errors.push('City is required')
        }

        if (!address?.postcode || !isValidPostcode(address.postcode)) {
            errors.push(`Valid postcode is required (${SUPPORTED_REGION_NAMES})`)
        }

        if (!location?.latitude || !location?.longitude) {
            errors.push('Location coordinates are required')
        }

        if (location && !isWithinSupportedRegion(location.latitude, location.longitude)) {
            errors.push(`Location must be within a supported region (${SUPPORTED_REGION_NAMES})`)
        }

        if (errors.length > 0) {
            const response: ApiResponse = {
                success: false,
                error: errors.join(', ')
            }
            return NextResponse.json(response, { status: 400 })
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm for now
            user_metadata: {
                first_name,
                last_name,
                role: 'provider'
            }
        })

        if (authError) {
            console.error('Auth error:', authError)
            const response: ApiResponse = {
                success: false,
                error: authError.message
            }
            return NextResponse.json(response, { status: 400 })
        }

        const userId = authData.user.id

        // Upload verification documents now that we have a userId to file
        // them under. Best-effort: a failed/missing document never blocks
        // registration, matching the previous behaviour.
        const idDocumentFile = formData.get('id_document')
        const businessLicenseFile = formData.get('business_license')
        const insuranceDocumentFile = formData.get('insurance_document')

        const [id_document_url, business_license_url, insurance_document_url] = await Promise.all([
            idDocumentFile instanceof File ? uploadDocument(supabaseAdmin, userId, 'id_document', idDocumentFile) : null,
            businessLicenseFile instanceof File ? uploadDocument(supabaseAdmin, userId, 'business_license', businessLicenseFile) : null,
            insuranceDocumentFile instanceof File ? uploadDocument(supabaseAdmin, userId, 'insurance_document', insuranceDocumentFile) : null
        ])

        const certificationUrls: string[] = []
        let certIndex = 0
        while (true) {
            const certFile = formData.get(`certification_${certIndex}`)
            if (!(certFile instanceof File)) break
            const url = await uploadDocument(supabaseAdmin, userId, `certification_${certIndex}`, certFile)
            if (url) certificationUrls.push(url)
            certIndex++
        }

        const hasDocuments = !!(id_document_url || business_license_url || insurance_document_url || certificationUrls.length > 0)

        // Create provider profile with PostGIS point
        const { data: provider, error: providerError } = await supabaseAdmin
            .from('providers')
            .insert({
                user_id: userId,
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                email: email.toLowerCase(),
                phone: phone.replace(/\s/g, ''),
                business_name: business_name?.trim() || null,
                description: description?.trim() || null,
                primary_service,
                additional_services: [],
                address_street: address!.street.trim(),
                address_city: address!.city.trim(),
                address_postcode: address!.postcode.toUpperCase().trim(),
                address_county: address!.county?.trim() || null,
                address_country: address!.country || 'United Kingdom',
                formatted_address: address!.formatted_address || null,
                latitude: location!.latitude,
                longitude: location!.longitude,
                service_radius_km: service_radius_km ? Number(service_radius_km) : 10,
                years_experience: years_experience ? Number(years_experience) : null,
                hourly_rate: hourly_rate ? Number(hourly_rate) : null,
                id_document_url,
                business_license_url,
                insurance_document_url,
                certification_urls: certificationUrls,
                documents_uploaded_at: hasDocuments ? new Date().toISOString() : null,
                status: 'active',
                verification_status: 'pending',
                is_available: true
            })
            .select()
            .single()

        if (providerError) {
            // Rollback: delete the auth user if provider creation fails
            await supabaseAdmin.auth.admin.deleteUser(userId)

            console.error('Provider error:', providerError)
            const response: ApiResponse = {
                success: false,
                error: providerError.message
            }
            return NextResponse.json(response, { status: 400 })
        }

        // Update the location field with PostGIS point
        // This may use a database function or trigger in production
        const { error: locationError } = await supabaseAdmin.rpc('update_provider_location', {
            provider_id: provider.id,
            lat: location!.latitude,
            lng: location!.longitude
        })

        if (locationError) {
            // Location update via RPC failed, location will be updated via trigger
            console.log('RPC location update skipped (may use trigger instead)')
        }

        // Create profile record
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                email: email.toLowerCase(),
                name: `${first_name} ${last_name}`,
                role: 'provider',
                phone: phone.replace(/\s/g, '')
            })

        if (profileError) {
            console.error('Profile creation error:', profileError)
        }

        const response: ApiResponse = {
            success: true,
            data: {
                provider_id: provider.id,
                user_id: userId,
                email
            },
            message: 'Provider registered successfully'
        }

        return NextResponse.json(response, { status: 201 })

    } catch (error) {
        console.error('Registration error:', error)
        const response: ApiResponse = {
            success: false,
            error: 'An unexpected error occurred'
        }
        return NextResponse.json(response, { status: 500 })
    }
}
