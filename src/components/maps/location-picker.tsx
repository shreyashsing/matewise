'use client'

/**
 * Location Picker Component
 * Google Maps integration for selecting a location with address autocomplete
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { Input } from '@/components/ui'
import { MapPin, Crosshair, Search } from 'lucide-react'
import type { GeoLocation, Address } from '@/types'
import { AUTOCOMPLETE_COUNTRY_CODES } from '@/lib/location-rules'

interface LocationPickerProps {
    onLocationSelect: (location: GeoLocation, address: Address) => void
    initialLocation?: GeoLocation
    initialAddress?: Address
    className?: string
}

const mapContainerStyle = {
    width: '100%',
    height: '300px',
    borderRadius: '0.75rem'
}

// Default to London, UK
const defaultCenter: GeoLocation = {
    latitude: 51.5074,
    longitude: -0.1278
}

export function LocationPicker({
    onLocationSelect,
    initialLocation,
    initialAddress,
    className = ''
}: LocationPickerProps) {
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [marker, setMarker] = useState<GeoLocation | null>(initialLocation || null)
    const [address, setAddress] = useState<Address | null>(initialAddress || null)
    const [searchValue, setSearchValue] = useState(initialAddress?.formatted_address || '')
    const [isLoading, setIsLoading] = useState(false)
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

    const center = marker || initialLocation || defaultCenter

    // Handle map load
    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance)
    }, [])

    // Handle map click to place marker
    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const newLocation: GeoLocation = {
                latitude: e.latLng.lat(),
                longitude: e.latLng.lng()
            }
            setMarker(newLocation)
            reverseGeocode(newLocation)
        }
    }, [])

    // Reverse geocode to get address from coordinates
    const reverseGeocode = async (location: GeoLocation) => {
        setIsLoading(true)
        try {
            const geocoder = new google.maps.Geocoder()
            const response = await geocoder.geocode({
                location: { lat: location.latitude, lng: location.longitude }
            })

            if (response.results && response.results[0]) {
                const result = response.results[0]
                const newAddress = parseGoogleAddress(result)
                setAddress(newAddress)
                setSearchValue(result.formatted_address)
                onLocationSelect(location, newAddress)
            }
        } catch (error) {
            console.error('Geocoding error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Parse Google Places address components
    const parseGoogleAddress = (result: google.maps.GeocoderResult): Address => {
        const components = result.address_components
        
        const getComponent = (types: string[]): string => {
            const component = components.find(c => 
                types.some(type => c.types.includes(type))
            )
            return component?.long_name || ''
        }

        const streetNumber = getComponent(['street_number'])
        const route = getComponent(['route'])
        const street = streetNumber ? `${streetNumber} ${route}`.trim() : route

        // Fallback for street if not found
        const finalStreet = street || 
            getComponent(['premise', 'subpremise']) || 
            getComponent(['neighborhood', 'sublocality']) ||
            'Address not specified'

        const city = getComponent(['postal_town', 'locality', 'administrative_area_level_2']) ||
            getComponent(['administrative_area_level_1']) ||
            'City not specified'

        const postcode = getComponent(['postal_code']) || '000000'

        return {
            street: finalStreet,
            city: city,
            postcode: postcode,
            county: getComponent(['administrative_area_level_2']),
            country: getComponent(['country']) || '',
            formatted_address: result.formatted_address
        }
    }

    // Handle autocomplete place selection
    const onPlaceSelect = () => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace()
            
            if (place.geometry?.location) {
                const newLocation: GeoLocation = {
                    latitude: place.geometry.location.lat(),
                    longitude: place.geometry.location.lng()
                }
                
                setMarker(newLocation)
                
                if (map) {
                    map.panTo({ lat: newLocation.latitude, lng: newLocation.longitude })
                    map.setZoom(16)
                }

                if (place.address_components) {
                    const newAddress = parseGoogleAddress({
                        address_components: place.address_components,
                        formatted_address: place.formatted_address || '',
                        geometry: place.geometry,
                        place_id: place.place_id || '',
                        types: place.types || []
                    } as google.maps.GeocoderResult)
                    
                    setAddress(newAddress)
                    setSearchValue(place.formatted_address || '')
                    onLocationSelect(newLocation, newAddress)
                }
            }
        }
    }

    // Handle autocomplete load
    const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete
    }

    // Get current location
    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLoading(true)
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLocation: GeoLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }
                    setMarker(newLocation)
                    
                    if (map) {
                        map.panTo({ lat: newLocation.latitude, lng: newLocation.longitude })
                        map.setZoom(16)
                    }
                    
                    reverseGeocode(newLocation)
                },
                (error) => {
                    console.error('Geolocation error:', error)
                    setIsLoading(false)
                },
                { enableHighAccuracy: true }
            )
        }
    }

    // Set initial marker on load
    useEffect(() => {
        if (initialLocation && map) {
            map.panTo({ lat: initialLocation.latitude, lng: initialLocation.longitude })
            map.setZoom(15)
        }
    }, [initialLocation, map])

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Search Input with Autocomplete */}
            <div className="relative">
                <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceSelect}
                    restrictions={{ country: AUTOCOMPLETE_COUNTRY_CODES }}
                >
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search for your address..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="pl-10 pr-12"
                        />
                    </div>
                </Autocomplete>
                
                <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="absolute right-2 top-1.5 p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                    title="Use current location"
                >
                    <Crosshair className="h-4 w-4 text-slate-600" />
                </button>
            </div>

            {/* Map */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={{ lat: center.latitude, lng: center.longitude }}
                    zoom={marker ? 15 : 11}
                    onClick={onMapClick}
                    onLoad={onMapLoad}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        styles: [
                            {
                                featureType: 'poi',
                                elementType: 'labels',
                                stylers: [{ visibility: 'off' }]
                            }
                        ]
                    }}
                >
                    {marker && (
                        <Marker
                            position={{ lat: marker.latitude, lng: marker.longitude }}
                            animation={google.maps.Animation.DROP}
                        />
                    )}
                </GoogleMap>

                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
                    </div>
                )}
            </div>

            {/* Selected Address Display */}
            {address && (
                <div className="bg-slate-50 rounded-lg p-4 flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                        <p className="font-medium text-slate-900">{address.street}</p>
                        <p className="text-slate-600">
                            {address.city}, {address.postcode}
                        </p>
                        {address.county && (
                            <p className="text-slate-500">{address.county}</p>
                        )}
                    </div>
                </div>
            )}

            <p className="text-xs text-slate-500 text-center">
                Click on the map or search to set your location
            </p>
        </div>
    )
}
