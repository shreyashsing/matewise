'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { adminFetch } from '@/lib/admin/client'
import { Button } from '@/components/ui'
import {
    LayoutDashboard,
    Users,
    Briefcase,
    ClipboardList,
    History,
    LogOut,
    Loader2,
    ShieldCheck,
    Menu,
    X
} from 'lucide-react'

const NAV_ITEMS = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/providers', label: 'Providers', icon: Briefcase },
    { href: '/admin/consumers', label: 'Consumers', icon: Users },
    { href: '/admin/service-requests', label: 'Service Requests', icon: ClipboardList },
    { href: '/admin/activity-log', label: 'Activity Log', icon: History },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [status, setStatus] = useState<'checking' | 'ok'>('checking')
    const [adminEmail, setAdminEmail] = useState<string | null>(null)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const isLoginPage = pathname === '/admin/login'

    useEffect(() => {
        if (isLoginPage) return

        let cancelled = false

        const verify = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (cancelled) return
            if (!session) {
                router.replace('/admin/login')
                return
            }
            try {
                const result = await adminFetch<{ id: string; email: string }>('/api/admin/me')
                if (cancelled) return
                setAdminEmail(result.data?.email || session.user.email || null)
                setStatus('ok')
            } catch {
                if (cancelled) return
                await supabase.auth.signOut()
                router.replace('/admin/login')
            }
        }

        verify()
        return () => { cancelled = true }
    }, [isLoginPage, router])

    if (isLoginPage) return <>{children}</>

    if (status === 'checking') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.replace('/admin/login')
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 h-screen w-64 bg-slate-900 text-slate-100 flex flex-col z-30 transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <ShieldCheck className="h-5 w-5" />
                        MateWise Admin
                    </div>
                    <button className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon
                        const active = pathname === item.href || pathname?.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="px-3 py-4 border-t border-slate-800">
                    <div className="px-3 pb-2 text-xs text-slate-400 truncate">{adminEmail}</div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 hover:text-white"
                        onClick={handleSignOut}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0 flex flex-col">
                <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
                    <button onClick={() => setSidebarOpen(true)} className="text-slate-700">
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="font-bold">MateWise Admin</span>
                    <div className="w-6" />
                </header>
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    )
}
