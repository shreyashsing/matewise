'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { Mail, Lock, Loader2, AlertCircle, ChevronLeft } from 'lucide-react'

export default function ProviderLoginPage() {
    const router = useRouter()
    const { signIn, user, loading: authLoading } = useAuth()
    
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Redirect if already logged in
    useEffect(() => {
        if (user && !authLoading) {
            router.replace('/provider/dashboard')
        }
    }, [user, authLoading, router])

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
                // Check if user is a provider
                const role = data.user.user_metadata?.role
                if (role !== 'provider') {
                    setError('This account is not registered as a service provider')
                    await signOut()
                    setIsLoading(false)
                    return
                }

                // Redirect to provider dashboard
                router.push('/provider/dashboard')
            }
        } catch (err) {
            setError('An unexpected error occurred')
            setIsLoading(false)
        }
    }

    const signOut = async () => {
        const { supabase } = await import('@/lib/supabase')
        await supabase.auth.signOut()
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
                        <CardTitle className="text-2xl font-bold">Provider Login</CardTitle>
                        <CardDescription>
                            Sign in to access your provider dashboard
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
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}
                            >
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
                                    Don't have an account?{' '}
                                    <Link
                                        href="/provider/register"
                                        className="font-medium text-black hover:underline"
                                    >
                                        Register as a Provider
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
