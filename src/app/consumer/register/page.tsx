'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { Mail, Lock, Loader2, AlertCircle, ChevronLeft, User, Phone } from 'lucide-react'
import type { ConsumerRegistrationData } from '@/types'

function ConsumerRegisterContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { signIn } = useAuth()

    const redirectTo = searchParams.get('redirect') || '/consumer/dashboard'

    const [formData, setFormData] = useState<ConsumerRegistrationData>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: ''
    })
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            const response = await fetch('/api/consumers/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
                setError(result.error || 'Failed to create account')
                setIsLoading(false)
                return
            }

            // Registration auto-confirms the account -- sign the user straight in
            const { error: signInError } = await signIn(formData.email, formData.password)
            if (signInError) {
                // Account was created fine; just send them to log in manually
                router.push(`/consumer/login?redirect=${encodeURIComponent(redirectTo)}`)
                return
            }

            router.push(redirectTo)
        } catch {
            setError('An unexpected error occurred')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between bg-white border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <span className="text-xl font-bold tracking-tight">MateWise</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex items-center justify-center px-6 py-12">
                <Card className="w-full max-w-md">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
                        <CardDescription>
                            Sign up to start requesting trusted local services
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label htmlFor="first_name" className="text-sm font-medium text-slate-700">
                                        First Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                        <Input
                                            id="first_name"
                                            placeholder="Jane"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            className="pl-10"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="last_name" className="text-sm font-medium text-slate-700">
                                        Last Name
                                    </label>
                                    <Input
                                        id="last_name"
                                        placeholder="Doe"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Email Field */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="pl-10"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Phone Field */}
                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                                    Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="Your phone number"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="pl-10"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="At least 8 characters"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="pl-10"
                                        required
                                        minLength={8}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </Button>

                            {/* Login Link */}
                            <div className="text-center pt-4 border-t border-slate-200">
                                <p className="text-sm text-slate-600">
                                    Already have an account?{' '}
                                    <Link
                                        href={`/consumer/login?redirect=${encodeURIComponent(redirectTo)}`}
                                        className="font-medium text-black hover:underline"
                                    >
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}

export default function ConsumerRegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        }>
            <ConsumerRegisterContent />
        </Suspense>
    )
}
