'use client'

/**
 * Google Maps Provider Component
 * Wraps the application with Google Maps API loader
 */

import { Libraries, useLoadScript } from '@react-google-maps/api'
import { ReactNode } from 'react'

const libraries: Libraries = ['places', 'geometry']

interface GoogleMapsProviderProps {
    children: ReactNode
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey || '',
        libraries,
        preventGoogleFontsLoading: true,
    })

    if (!apiKey) {
        console.warn('Google Maps API key is not configured')
        return <>{children}</>
    }

    if (loadError) {
        console.error('Error loading Google Maps:', loadError)
        return (
            <div className="flex items-center justify-center h-full p-4">
                <div className="text-center text-red-600">
                    <p className="font-medium">Failed to load Google Maps</p>
                    <p className="text-sm text-slate-600 mt-1">Please check your API key and internet connection</p>
                </div>
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
        )
    }

    return <>{children}</>
}
