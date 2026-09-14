'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { Mail, Lock, Loader2, AlertCircle, ChevronLeft } from 'lucide-react'

function ConsumerLoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { signIn, signOut, user, role, loading: authLoading } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const redirectTo = searchParams.get('redirect') || '/consumer/dashboard'

    // If already logged in as a consumer, go straight to where they were
    // headed. If logged in as something else (e.g. a provider account),
    // sign out and say so instead of silently bouncing through redirects.
    useEffect(() => {
        if (authLoading || !user) return

        if (role === 'consumer') {
            router.replace(redirectTo)
        } else if (role) {
            signOut().then(() => {
                setError('That account is not registered as a consumer. Please sign in below with a consumer account.')
            })
        }
    }, [user, role, authLoading, router, redirectTo, signOut])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            const { data, error: signInError } = await signIn(email, password)

            if (signInError) {
                setError(signInError.message)
                setIsLoading(false)
                return
            }

            if (data.user) {
                const role = data.user.user_metadata?.role
                if (role !== 'consumer') {
                    setError('This account is not registered as a consumer')
                    await signOut()
                    setIsLoading(false)
                    return
                }

                router.push(redirectTo)
            }
        } catch {
            setError('An unexpected error occurred')
            setIsLoading(false)
        }
    }

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
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
                        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                        <CardDescription>
                            Sign in to request services and track your bookings
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Error Message */}
                            {error && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

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
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
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
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>

                            {/* Register Link */}
                            <div className="text-center pt-4 border-t border-slate-200">
                                <p className="text-sm text-slate-600">
                                    Don&apos;t have an account?{' '}
                                    <Link
                                        href={`/consumer/register?redirect=${encodeURIComponent(redirectTo)}`}
                                        className="font-medium text-black hover:underline"
                                    >
                                        Create one
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

export default function ConsumerLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        }>
            <ConsumerLoginContent />
        </Suspense>
    )
}
