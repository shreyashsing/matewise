/**
 * Supported service regions
 *
 * The app currently supports the UK (primary/client market) and India
 * (used for local testing). Add more entries here to open up another
 * country — nothing else in the codebase should need to change.
 */

export interface SupportedRegion {
    /** ISO 3166-1 alpha-2 code, also used for Google Places Autocomplete restrictions */
    code: string
    name: string
    bounds: {
        latMin: number
        latMax: number
        lngMin: number
        lngMax: number
    }
    /** Matches phone numbers in this region, with or without country code */
    phonePattern: RegExp
    /** Matches postal/PIN codes in this region */
    postcodePattern: RegExp
}

export const SUPPORTED_REGIONS: SupportedRegion[] = [
    {
        code: 'gb',
        name: 'United Kingdom',
        bounds: { latMin: 49.5, latMax: 61, lngMin: -8, lngMax: 2 },
        phonePattern: /^(?:(?:\+44)|0)\d{10}$/,
        postcodePattern: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i
    },
    {
        code: 'in',
        name: 'India',
        bounds: { latMin: 6.5, latMax: 35.7, lngMin: 68, lngMax: 97.5 },
        phonePattern: /^(?:(?:\+91)|0)?[6-9]\d{9}$/,
        postcodePattern: /^\d{6}$/
    }
]

/** Country codes to pass to Google Places Autocomplete's `restrictions.country` */
export const AUTOCOMPLETE_COUNTRY_CODES = SUPPORTED_REGIONS.map(r => r.code)

/** Human-readable list for error messages, e.g. "United Kingdom or India" */
export const SUPPORTED_REGION_NAMES = SUPPORTED_REGIONS.map(r => r.name).join(' or ')

export function isWithinSupportedRegion(latitude: number, longitude: number): boolean {
    return SUPPORTED_REGIONS.some(({ bounds }) =>
        latitude >= bounds.latMin && latitude <= bounds.latMax &&
        longitude >= bounds.lngMin && longitude <= bounds.lngMax
    )
}

export function isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\s/g, '')
    return SUPPORTED_REGIONS.some(({ phonePattern }) => phonePattern.test(cleaned))
}

export function isValidPostcode(postcode: string): boolean {
    const trimmed = postcode.trim()
    return SUPPORTED_REGIONS.some(({ postcodePattern }) => postcodePattern.test(trimmed))
}
