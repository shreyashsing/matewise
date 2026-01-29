'use client'

/**
 * Payment Page
 * Consumer is redirected here after service request is accepted
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ChevronLeft,
    CreditCard,
    CheckCircle,
    Shield,
    Clock,
    User,
    Briefcase,
    Loader2
} from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

interface ServiceRequestDetails {
    id: string
    consumer_name: string
    service_category: string
    status: string
    provider?: {
        business_name?: string
        first_name?: string
        last_name?: string
        hourly_rate?: number
    }
}

export default function PaymentPage({ 
    params 
}: { 
    params: Promise<{ requestId: string }> 
}) {
    const { requestId } = use(params)
    const router = useRouter()
    const [request, setRequest] = useState<ServiceRequestDetails | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [paymentComplete, setPaymentComplete] = useState(false)

    // Fetch request details
    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const response = await fetch(`/api/service-requests?id=${requestId}`)
                const result = await response.json()

                if (result.success && result.data) {
                    setRequest(result.data)
                }
            } catch (err) {
                console.error('Failed to fetch request:', err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchRequest()
    }, [requestId])

    // Handle payment (placeholder)
    const handlePayment = async () => {
        setIsProcessing(true)
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        setPaymentComplete(true)
        setIsProcessing(false)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600">Loading payment details...</p>
                </div>
            </div>
        )
    }

    if (paymentComplete) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Payment Successful!
                        </h1>
                        <p className="text-slate-500 mb-6">
                            Your service request has been confirmed. The provider will contact you shortly.
                        </p>
                        
                        <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
                            <h3 className="text-sm font-medium text-slate-900 mb-2">Booking Details</h3>
                            <div className="space-y-1 text-sm text-slate-600">
                                <p><span className="text-slate-400">Service:</span> {request?.service_category?.replace('_', ' ')}</p>
                                <p><span className="text-slate-400">Provider:</span> {request?.provider?.business_name || 'Service Provider'}</p>
                                <p><span className="text-slate-400">Booking ID:</span> {requestId.slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>

                        <Link href="/consumer/dashboard">
                            <Button className="w-full">
                                Go to Dashboard
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <Link href="/consumer/services">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Complete Payment</h1>
                        <p className="text-sm text-slate-500">Secure checkout</p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-6">
                {/* Request Accepted Banner */}
                <Card className="mb-6 border-green-200 bg-green-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-green-900">Request Accepted!</h3>
                                <p className="text-green-700 text-sm">
                                    Complete payment to confirm your booking
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Service Details */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Service Details</h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <Briefcase className="h-6 w-6 text-slate-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 capitalize">
                                        {request?.service_category?.replace('_', ' ') || 'Service'}
                                    </p>
                                    <p className="text-sm text-slate-500">Service Type</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <User className="h-6 w-6 text-slate-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">
                                        {request?.provider?.business_name || 
                                         (request?.provider?.first_name 
                                            ? `${request.provider.first_name} ${request.provider.last_name}`
                                            : 'Service Provider')}
                                    </p>
                                    <p className="text-sm text-slate-500">Provider</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-slate-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">Flexible</p>
                                    <p className="text-sm text-slate-500">Scheduling (to be confirmed)</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Summary */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Summary</h2>
                        
                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Service Deposit</span>
                                <span className="font-medium text-slate-900">₹500.00</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Platform Fee</span>
                                <span className="font-medium text-slate-900">₹50.00</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">GST (18%)</span>
                                <span className="font-medium text-slate-900">₹99.00</span>
                            </div>
                            <hr className="border-slate-200" />
                            <div className="flex justify-between">
                                <span className="font-semibold text-slate-900">Total</span>
                                <span className="font-bold text-lg text-slate-900">₹649.00</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                            <p>
                                💡 This is a deposit. Final amount will be based on hours worked and will be settled after service completion.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Method (Placeholder) */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Method</h2>
                        
                        <div className="border-2 border-black rounded-xl p-4 flex items-center gap-4">
                            <div className="h-12 w-12 bg-slate-900 rounded-lg flex items-center justify-center">
                                <CreditCard className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-slate-900">Credit/Debit Card</p>
                                <p className="text-sm text-slate-500">Pay securely with card</p>
                            </div>
                            <div className="h-5 w-5 bg-black rounded-full flex items-center justify-center">
                                <CheckCircle className="h-3 w-3 text-white" />
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 mt-4 text-center">
                            More payment options coming soon (UPI, Wallets, Net Banking)
                        </p>
                    </CardContent>
                </Card>

                {/* Security Notice */}
                <div className="flex items-center gap-2 justify-center text-sm text-slate-500 mb-6">
                    <Shield className="h-4 w-4" />
                    <span>Secured by 256-bit SSL encryption</span>
                </div>

                {/* Pay Button */}
                <Button 
                    className="w-full h-14 text-lg font-semibold"
                    onClick={handlePayment}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            Pay ₹649.00
                        </>
                    )}
                </Button>

                <p className="text-xs text-slate-400 text-center mt-4">
                    By completing this payment, you agree to our Terms of Service and Privacy Policy.
                </p>
            </main>
        </div>
    )
}
