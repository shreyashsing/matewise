'use client'

/**
 * Service Request Modal Component
 * Shows waiting screen when consumer requests a service
 * Displays countdown timer and real-time status updates
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    X
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import type { ProviderSearchResult, ServiceCategory, GeoLocation } from '@/types'

interface ServiceRequestModalProps {
    provider: ProviderSearchResult
    serviceCategory: ServiceCategory
    consumerName: string
    consumerLocation: GeoLocation
    onClose: () => void
}

type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

interface ServiceRequest {
    id: string
    status: RequestStatus
    created_at: string
    expires_at: string
}

const TIMEOUT_SECONDS = 30

export function ServiceRequestModal({
    provider,
    serviceCategory,
    consumerName,
    consumerLocation,
    onClose
}: ServiceRequestModalProps) {
    const router = useRouter()
    const [status, setStatus] = useState<'sending' | RequestStatus>('sending')
    const [request, setRequest] = useState<ServiceRequest | null>(null)
    const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_SECONDS)
    const [error, setError] = useState<string | null>(null)
    const hasSentRequest = useRef(false) // Prevent duplicate sends in StrictMode

    // Send service request. The caller must be a signed-in consumer -- the
    // API derives who's making the request from their session, not from
    // anything passed in the body (consumerName here is display-only, used
    // while waiting for the response).
    const sendRequest = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                throw new Error('Please log in to request a service')
            }

            const response = await fetch('/api/service-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    provider_id: provider.id,
                    service_category: serviceCategory,
                    // Consumer's location (where provider needs to go)
                    service_latitude: consumerLocation.latitude,
                    service_longitude: consumerLocation.longitude,
                    distance_km: provider.distance_km
                })
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to send request')
            }

            setRequest(result.data)
            setStatus('pending')
            return result.data
        } catch (err) {
            console.error('Send request error:', err)
            setError(err instanceof Error ? err.message : 'Failed to send request')
            setStatus('expired')
            return null
        }
    }, [provider.id, serviceCategory, consumerLocation])

    // Subscribe to realtime updates. Consumers are real, signed-in accounts
    // now, and RLS scopes service_requests SELECT to rows the caller's own
    // consumer/provider record actually owns -- so this only ever receives
    // this consumer's own request, not anyone else's.
    useEffect(() => {
        if (!request?.id) return

        const channel = supabase
            .channel(`service-request-${request.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'service_requests',
                    filter: `id=eq.${request.id}`
                },
                (payload: { new: ServiceRequest }) => {
                    const updatedRequest = payload.new
                    setRequest(updatedRequest)
                    setStatus(updatedRequest.status)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [request?.id])

    // Countdown timer
    useEffect(() => {
        if (status !== 'pending') return

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    setStatus('expired')
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [status])

    // Send request on mount (with guard against StrictMode double-run)
    useEffect(() => {
        if (hasSentRequest.current) return
        hasSentRequest.current = true
        sendRequest()
    }, [sendRequest])

    // Render content based on status
    const renderContent = () => {
        switch (status) {
            case 'sending':
                return (
                    <>
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            Sending Request...
                        </h2>
                        <p className="text-slate-500">
                            Connecting you with {provider.business_name || `${provider.first_name} ${provider.last_name}`}
                        </p>
                    </>
                )

            case 'pending':
                return (
                    <>
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            {/* Progress circle */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="44"
                                    stroke="#e2e8f0"
                                    strokeWidth="8"
                                    fill="none"
                                />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="44"
                                    stroke="#000"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={276.46}
                                    strokeDashoffset={276.46 * (1 - timeRemaining / TIMEOUT_SECONDS)}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-slate-900">{timeRemaining}</span>
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            Waiting for Response
                        </h2>
                        <p className="text-slate-500 mb-4">
                            {provider.business_name || `${provider.first_name} ${provider.last_name}`} has {timeRemaining} seconds to respond
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                            <Clock className="h-4 w-4" />
                            <span>Request expires automatically</span>
                        </div>
                    </>
                )

            case 'accepted':
                return (
                    <>
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            Request Accepted!
                        </h2>
                        <p className="text-slate-500 mb-4">
                            {provider.business_name || `${provider.first_name} ${provider.last_name}`} accepted your request
                        </p>
                        
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                            <p className="text-green-800 font-medium mb-1">
                                ₹649.00 debited from wallet
                            </p>
                            <p className="text-green-600 text-sm">
                                Payment successful via MateWise Wallet
                            </p>
                        </div>

                        <Button 
                            onClick={() => router.push(`/consumer/service-confirmation/${request?.id}`)} 
                            className="w-full"
                        >
                            View Details & OTP
                        </Button>
                    </>
                )

            case 'rejected':
                return (
                    <>
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                            <XCircle className="h-10 w-10 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            Request Declined
                        </h2>
                        <p className="text-slate-500 mb-6">
                            {provider.business_name || `${provider.first_name} ${provider.last_name}`} is unavailable right now
                        </p>
                        <Button onClick={onClose} className="w-full">
                            Find Another Provider
                        </Button>
                    </>
                )

            case 'expired':
                return (
                    <>
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                            <AlertCircle className="h-10 w-10 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            Request Expired
                        </h2>
                        <p className="text-slate-500 mb-6">
                            {error || 'The provider did not respond in time'}
                        </p>
                        <Button onClick={onClose} className="w-full">
                            Try Another Provider
                        </Button>
                    </>
                )
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="relative p-8 text-center">
                    {/* Close button - only show when request is not pending */}
                    {status !== 'pending' && status !== 'sending' && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    )}

                    {renderContent()}
                </div>

                {/* Request details */}
                {status === 'pending' && (
                    <div className="px-8 pb-8">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h3 className="text-sm font-medium text-slate-900 mb-2">Request Details</h3>
                            <div className="space-y-1 text-sm text-slate-600">
                                <p><span className="text-slate-400">Service:</span> {serviceCategory.replace('_', ' ')}</p>
                                <p><span className="text-slate-400">Provider:</span> {provider.business_name || `${provider.first_name} ${provider.last_name}`}</p>
                                <p><span className="text-slate-400">Distance:</span> {provider.distance_km.toFixed(1)} km away</p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="w-full mt-4"
                        >
                            Cancel Request
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    )
}
