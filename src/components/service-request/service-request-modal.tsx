'use client'

/**
 * Service Request Modal Component
 * First collects what the consumer is actually facing -- a description and,
 * optionally, a few photos -- then sends the request and shows the waiting
 * screen with countdown timer and real-time status updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    X,
    Camera,
    ImagePlus
} from 'lucide-react'
import { Button, Card, Textarea } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { ISSUE_REPORT } from '@/config/constants'
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

interface IssuePhoto {
    file: File
    previewUrl: string
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
    const [status, setStatus] = useState<'form' | 'sending' | RequestStatus>('form')
    const [request, setRequest] = useState<ServiceRequest | null>(null)
    const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_SECONDS)
    const [error, setError] = useState<string | null>(null)
    const hasSentRequest = useRef(false) // Prevent duplicate sends in StrictMode

    // Issue details, collected before anything is sent to the provider
    const [issueDescription, setIssueDescription] = useState('')
    const [issuePhotos, setIssuePhotos] = useState<IssuePhoto[]>([])
    const [formError, setFormError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Revoke object URLs on unmount so previews don't leak memory
    useEffect(() => {
        return () => {
            issuePhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleAddPhotos = (files: FileList | null) => {
        if (!files || files.length === 0) return
        setFormError(null)

        const incoming = Array.from(files)
        const room = ISSUE_REPORT.maxImages - issuePhotos.length
        if (room <= 0) {
            setFormError(`You can attach up to ${ISSUE_REPORT.maxImages} photos`)
            return
        }

        const accepted: IssuePhoto[] = []
        const rejected: string[] = []

        for (const file of incoming.slice(0, room)) {
            if (!ISSUE_REPORT.allowedImageTypes.includes(file.type as typeof ISSUE_REPORT.allowedImageTypes[number])) {
                rejected.push(`${file.name} (unsupported type)`)
                continue
            }
            if (file.size > ISSUE_REPORT.maxImageBytes) {
                rejected.push(`${file.name} (over ${ISSUE_REPORT.maxImageBytes / (1024 * 1024)}MB)`)
                continue
            }
            accepted.push({ file, previewUrl: URL.createObjectURL(file) })
        }

        if (incoming.length > room) {
            rejected.push(`only ${room} more photo${room === 1 ? '' : 's'} can be added`)
        }

        if (accepted.length > 0) {
            setIssuePhotos((prev) => [...prev, ...accepted])
        }
        if (rejected.length > 0) {
            setFormError(`Couldn't add: ${rejected.join(', ')}`)
        }

        // Allow re-selecting the same file after removing it
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleRemovePhoto = (index: number) => {
        setIssuePhotos((prev) => {
            URL.revokeObjectURL(prev[index].previewUrl)
            return prev.filter((_, i) => i !== index)
        })
    }

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

            const formData = new FormData()
            formData.append('provider_id', provider.id)
            formData.append('service_category', serviceCategory)
            formData.append('service_latitude', consumerLocation.latitude.toString())
            formData.append('service_longitude', consumerLocation.longitude.toString())
            formData.append('distance_km', provider.distance_km.toString())
            formData.append('issue_description', issueDescription.trim())
            issuePhotos.forEach((photo) => formData.append('issue_images', photo.file))

            const response = await fetch('/api/service-requests', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                },
                body: formData
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
    }, [provider.id, provider.distance_km, serviceCategory, consumerLocation, issueDescription, issuePhotos])

    const handleSubmitForm = () => {
        const trimmed = issueDescription.trim()
        if (trimmed.length < ISSUE_REPORT.descriptionMinLength) {
            setFormError(`Please describe the issue in at least ${ISSUE_REPORT.descriptionMinLength} characters`)
            return
        }
        if (trimmed.length > ISSUE_REPORT.descriptionMaxLength) {
            setFormError(`Description is too long (max ${ISSUE_REPORT.descriptionMaxLength} characters)`)
            return
        }
        setFormError(null)
        if (hasSentRequest.current) return
        hasSentRequest.current = true
        setStatus('sending')
        sendRequest()
    }

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

    // Render content based on status
    const renderContent = () => {
        switch (status) {
            case 'form':
                return (
                    <>
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Camera className="h-8 w-8 text-slate-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">
                            What&apos;s going on?
                        </h2>
                        <p className="text-slate-500 text-sm mb-5">
                            Tell {provider.business_name || `${provider.first_name} ${provider.last_name}`} what you&apos;re facing so they arrive prepared.
                        </p>

                        <div className="text-left space-y-4">
                            <div>
                                <Textarea
                                    value={issueDescription}
                                    onChange={(e) => {
                                        setIssueDescription(e.target.value)
                                        setFormError(null)
                                    }}
                                    placeholder="e.g. Kitchen sink is leaking from the pipe joint, water pooling under the cabinet."
                                    rows={4}
                                    maxLength={ISSUE_REPORT.descriptionMaxLength}
                                />
                                <div className="flex justify-end mt-1">
                                    <span className="text-xs text-slate-400">
                                        {issueDescription.length}/{ISSUE_REPORT.descriptionMaxLength}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span className="block text-sm font-medium text-slate-700 mb-2">
                                    Photos <span className="text-slate-400 font-normal">(optional, up to {ISSUE_REPORT.maxImages})</span>
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {issuePhotos.map((photo, index) => (
                                        <div key={photo.previewUrl} className="relative h-16 w-16 rounded-lg overflow-hidden border border-slate-200 group">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={photo.previewUrl} alt={`Attached photo ${index + 1}`} className="h-full w-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePhoto(index)}
                                                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                    {issuePhotos.length < ISSUE_REPORT.maxImages && (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-16 w-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
                                        >
                                            <ImagePlus className="h-5 w-5" />
                                        </button>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ISSUE_REPORT.allowedImageTypes.join(',')}
                                        multiple
                                        className="hidden"
                                        onChange={(e) => handleAddPhotos(e.target.files)}
                                    />
                                </div>
                            </div>

                            {formError && (
                                <p className="text-sm text-red-600">{formError}</p>
                            )}
                        </div>

                        <Button onClick={handleSubmitForm} className="w-full mt-6">
                            Send Request
                        </Button>
                    </>
                )

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
            <Card className="w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                <div className="relative p-8 text-center">
                    {/* Close button - only show when request is not pending/sending */}
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
                                {issueDescription.trim() && (
                                    <p className="pt-1"><span className="text-slate-400">Issue:</span> {issueDescription.trim()}</p>
                                )}
                                {issuePhotos.length > 0 && (
                                    <div className="flex gap-1.5 pt-1">
                                        {issuePhotos.map((photo) => (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img key={photo.previewUrl} src={photo.previewUrl} alt="Attached" className="h-10 w-10 rounded-md object-cover border border-slate-200" />
                                        ))}
                                    </div>
                                )}
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
