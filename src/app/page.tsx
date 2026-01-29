'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Briefcase, Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function SelectionPage() {
    return (
        <div className="min-h-screen bg-white text-slate-950 flex flex-col font-sans selection:bg-black selection:text-white">
            {/* Header / Nav */}
            <header className="px-6 py-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
                    <span className="text-xl font-bold tracking-tight">MateWise</span>
                </div>
                {/* Optional Top Nav items can go here */}
                <div className="text-sm font-medium text-slate-500 hover:text-black transition-colors cursor-pointer">
                    Help
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
                <div className="text-center mb-12 max-w-2xl space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
                        How can we help you today?
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed">
                        Join MateWise to find trusted local services or build your reputation as a premium provider.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
                    {/* Consumer Selection */}
                    <Link href="/consumer/services" className="group">
                        <Card className="h-full relative overflow-hidden border-2 border-transparent hover:border-black transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-slate-50 group-hover:bg-white">
                            <CardHeader>
                                <div className="h-14 w-14 rounded-full bg-slate-200 group-hover:bg-black group-hover:text-white transition-colors flex items-center justify-center mb-4">
                                    <Search className="h-7 w-7" />
                                </div>
                                <CardTitle className="text-2xl mb-2">Find a Service</CardTitle>
                                <CardDescription className="text-base text-slate-500 group-hover:text-slate-600">
                                    I need help with home maintenance, cleaning, or errands.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm font-medium text-slate-900 opacity-60 group-hover:opacity-100 transition-opacity mt-4">
                                    Get started <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </CardContent>
                            {/* Decorative gradient blob */}
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br from-slate-200 to-transparent rounded-full opacity-0 group-hover:opacity-50 blur-2xl transition-opacity pointer-events-none" />
                        </Card>
                    </Link>

                    {/* Provider Selection */}
                    <Card className="h-full relative overflow-hidden border-2 border-transparent hover:border-black transition-all duration-300 hover:shadow-2xl cursor-pointer bg-black text-white group">
                        <CardHeader>
                            <div className="h-14 w-14 rounded-full bg-zinc-800 group-hover:bg-white group-hover:text-black transition-colors flex items-center justify-center mb-4 text-white">
                                <Briefcase className="h-7 w-7" />
                            </div>
                            <CardTitle className="text-2xl mb-2 text-white">Provide Services</CardTitle>
                            <CardDescription className="text-base text-zinc-400 group-hover:text-zinc-300">
                                I want to offer my skills, earn money, and build my reputation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link 
                                href="/provider/register"
                                className="inline-flex items-center justify-center w-full bg-white text-black hover:bg-zinc-100 mb-3 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Join as Pro <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                            <div className="text-center">
                                <Link 
                                    href="/provider/login" 
                                    className="text-xs text-zinc-400 hover:text-white transition-colors inline-block"
                                >
                                    Already registered? Sign in →
                                </Link>
                            </div>
                        </CardContent>
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br from-zinc-700 to-transparent rounded-full opacity-0 group-hover:opacity-30 blur-2xl transition-opacity pointer-events-none" />
                    </Card>
                </div>



            </main>

            <footer className="py-8 border-t border-slate-100 mt-auto bg-slate-50/50">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400">
                    <p>&copy; 2026 MateWise Ltd. All rights reserved.</p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
                        <a href="#" className="hover:text-slate-900 transition-colors">Sitemap</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
