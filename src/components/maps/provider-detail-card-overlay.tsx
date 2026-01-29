import {
    X,
    Star,
    MapPin,
    Clock,
    Phone,
    CheckCircle2,
    ShieldCheck,
    Calendar,
    ArrowRight,
    Send
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import type { ProviderSearchResult } from '@/types'

interface ProviderDetailCardOverlayProps {
    provider: ProviderSearchResult
    onClose: () => void
    onSelect?: () => void
    onRequestService?: () => void
}

export function ProviderDetailCardOverlay({
    provider,
    onClose,
    onSelect,
    onRequestService
}: ProviderDetailCardOverlayProps) {
    const businessName = provider.business_name || `${provider.first_name} ${provider.last_name}`

    return (
        <Card className="absolute bottom-4 right-4 w-[calc(100%-2rem)] max-w-sm bg-white shadow-2xl rounded-xl overflow-hidden z-10 animate-in slide-in-from-bottom-10 fade-in duration-300 border-none">
            {/* Header Image / Gradient */}
            <div className="h-24 bg-gradient-to-r from-slate-900 to-slate-800 relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Profile Image / Initials */}
                <div className="absolute -bottom-8 left-6">
                    <div className="h-16 w-16 rounded-2xl bg-white p-1 shadow-lg">
                        <div className="h-full w-full rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-700">
                            {businessName.charAt(0)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="pt-10 px-6 pb-6">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            {businessName}
                            {provider.verification_status === 'verified' && (
                                <ShieldCheck className="h-5 w-5 text-blue-500" />
                            )}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 capitalize">
                            {provider.primary_service.replace('_', ' ')} Specialist
                        </p>
                    </div>
                    {provider.rating_average && (
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 bg-black text-white px-2 py-1 rounded-lg text-sm font-bold shadow-sm">
                                <Star className="h-3 w-3 fill-current" />
                                {provider.rating_average.toFixed(1)}
                            </div>
                            <span className="text-xs text-slate-400 mt-1">
                                {provider.total_reviews || 0} reviews
                            </span>
                        </div>
                    )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Hourly Rate
                        </div>
                        <div className="font-semibold text-slate-900">
                            {provider.hourly_rate ? `£${provider.hourly_rate}/hr` : 'Contact for price'}
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Distance
                        </div>
                        <div className="font-semibold text-slate-900">
                            {provider.distance_km.toFixed(1)} km away
                        </div>
                    </div>
                </div>

                {/* Description */}
                {provider.description && (
                    <div className="mb-6">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">About</h4>
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                            {provider.description}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                    <Button
                        onClick={onRequestService}
                        className="w-full bg-black hover:bg-slate-800 text-white shadow-lg shadow-slate-200 h-12 text-base font-medium rounded-xl"
                    >
                        <Send className="h-4 w-4 mr-2" />
                        Request Service
                    </Button>

                    {provider.phone && (
                        <a
                            href={`tel:${provider.phone}`}
                            className="block w-full"
                        >
                            <Button
                                variant="outline"
                                className="w-full h-11 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-slate-700"
                            >
                                <Phone className="h-4 w-4 mr-2 text-slate-500" />
                                Call {provider.phone}
                            </Button>
                        </a>
                    )}
                </div>
            </div>
        </Card>
    )
}
