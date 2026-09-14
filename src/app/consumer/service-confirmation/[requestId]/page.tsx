'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLoadScript, Libraries } from '@react-google-maps/api';
import {
  CheckCircle2,
  Clock,
  Navigation,
  Phone,
  MapPin,
  ShieldCheck,
  Copy,
  Check,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';

const mapsLibraries: Libraries = ['places', 'geometry'];

interface ServiceRequest {
  id: string;
  provider_id: string;
  consumer_name: string;
  service_category: string;
  status: string;
  otp_verified: boolean;
  service_latitude?: number;
  service_longitude?: number;
  service_address?: string;
  distance_km?: number;
}

interface Provider {
  id: string;
  business_name: string;
  business_category: string;
  phone_number: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface RouteEta {
  duration: string;
  distance: string;
}

// Statuses where the provider is still expected to travel to the consumer
const EN_ROUTE_STATUSES = ['accepted'];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200'
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting for response',
  accepted: 'Provider assigned',
  completed: 'Completed',
  rejected: 'Declined',
  expired: 'Expired'
};

export default function ServiceConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;
  const { user, loading: authLoading } = useAuth();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeEta, setRouteEta] = useState<RouteEta | null>(null);
  const [etaError, setEtaError] = useState(false);
  const [copied, setCopied] = useState(false);

  const { isLoaded: mapsLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: mapsLibraries,
    preventGoogleFontsLoading: true
  });

  // Require a signed-in consumer
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/consumer/login?redirect=${encodeURIComponent(`/consumer/service-confirmation/${requestId}`)}`);
    }
  }, [user, authLoading, router, requestId]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authHeader: Record<string, string> = session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};

        // Fetch service request (no OTP here -- that's a separate, narrower endpoint)
        const requestRes = await fetch(`/api/service-requests?id=${requestId}`, { headers: authHeader });
        const requestData = await requestRes.json();

        if (requestData.success && requestData.data) {
          setRequest(requestData.data);

          // Fetch provider details
          const providerRes = await fetch(`/api/providers/${requestData.data.provider_id}`);
          const providerData = await providerRes.json();

          if (providerData.success && providerData.data) {
            setProvider(providerData.data);
          }
        }

        // Fetch the OTP itself from its dedicated endpoint
        const otpRes = await fetch(`/api/service-requests/${requestId}/otp`, { headers: authHeader });
        const otpData = await otpRes.json();
        if (otpData.success && otpData.data) {
          setOtp(otpData.data.otp);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [requestId, user]);

  // Recompute the real (traffic-aware) driving ETA from the provider's
  // location to the consumer's service location, refreshing periodically
  // while the provider is still expected to be en route.
  useEffect(() => {
    if (!mapsLoaded || !request || !provider?.location) return;
    if (!request.service_latitude || !request.service_longitude) return;
    if (!EN_ROUTE_STATUSES.includes(request.status)) return;

    let cancelled = false;

    const computeEta = () => {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: provider.location!.latitude, lng: provider.location!.longitude },
          destination: { lat: request.service_latitude!, lng: request.service_longitude! },
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          }
        },
        (result, status) => {
          if (cancelled) return;
          if (status === google.maps.DirectionsStatus.OK && result?.routes[0]?.legs[0]) {
            const leg = result.routes[0].legs[0];
            setRouteEta({
              duration: leg.duration_in_traffic?.text || leg.duration?.text || 'Unknown',
              distance: leg.distance?.text || 'Unknown'
            });
            setEtaError(false);
          } else {
            setEtaError(true);
          }
        }
      );
    };

    computeEta();
    // Traffic conditions and the provider's progress change over time, so
    // refresh the estimate periodically rather than computing it once.
    const interval = setInterval(computeEta, 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mapsLoaded, request, provider]);

  const handleCopyOtp = async () => {
    if (!otp) return;
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied -- non-critical, silently ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading your booking...</p>
        </div>
      </div>
    );
  }

  if (!request || !provider) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-sm w-full text-center rounded-2xl border-slate-200 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Booking not found</h1>
          <p className="text-sm text-slate-500 mb-6">We couldn&apos;t find this service request.</p>
          <Button
            onClick={() => router.push('/consumer/services')}
            className="w-full"
          >
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const providerInitials = provider.business_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('') || 'SP';

  const statusStyle = STATUS_STYLES[request.status] || STATUS_STYLES.expired;
  const statusLabel = STATUS_LABELS[request.status] || request.status;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Confirmation banner */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">Booking confirmed</p>
            <p className="text-sm text-slate-500">₹649.00 paid from your wallet</p>
          </div>
        </div>

        {/* Booking summary */}
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 flex items-start justify-between gap-3 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                {providerInitials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{provider.business_name}</p>
                <p className="text-sm text-slate-500 capitalize truncate">
                  {request.service_category.replace('_', ' ')}
                </p>
              </div>
            </div>
            <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${statusStyle}`}>
              {statusLabel}
            </span>
          </div>

          <div className="p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-slate-500">
                <Phone className="h-4 w-4" />
                Contact
              </span>
              <a
                href={`tel:${provider.phone_number}`}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                {provider.phone_number}
              </a>
            </div>

            {request.service_address && (
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
                  <MapPin className="h-4 w-4" />
                  Location
                </span>
                <span className="text-sm font-medium text-slate-900 text-right">
                  {request.service_address}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                OTP verification
              </span>
              <span className={`text-sm font-medium ${request.otp_verified ? 'text-emerald-600' : 'text-amber-600'}`}>
                {request.otp_verified ? 'Verified' : 'Pending'}
              </span>
            </div>
          </div>
        </Card>

        {/* Provider ETA */}
        {EN_ROUTE_STATUSES.includes(request.status) && (
          <Card className="rounded-2xl border-blue-100 bg-blue-50/60 shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Navigation className="h-4 w-4" />
              </div>
              <p className="font-semibold text-slate-900">Provider is on the way</p>
            </div>

            {routeEta ? (
              <div className="flex items-center gap-6 pl-0.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xl font-bold text-blue-900 leading-tight">{routeEta.duration}</p>
                    <p className="text-xs text-blue-700">estimated arrival</p>
                  </div>
                </div>
                <div className="w-px h-9 bg-blue-200" />
                <div>
                  <p className="text-base font-semibold text-blue-900 leading-tight">{routeEta.distance}</p>
                  <p className="text-xs text-blue-700">away</p>
                </div>
              </div>
            ) : etaError || !request.service_latitude ? (
              <p className="text-sm text-blue-700">
                {request.distance_km
                  ? `Approximately ${request.distance_km.toFixed(1)} km away. Live arrival time is unavailable right now.`
                  : 'Estimated arrival time is unavailable right now.'}
              </p>
            ) : (
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Calculating estimated arrival time...
              </p>
            )}
          </Card>
        )}

        {/* OTP */}
        {!request.otp_verified ? (
          <Card className="rounded-2xl border-slate-200 shadow-sm p-6 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-4">
              <ShieldCheck className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-medium text-slate-500">Service confirmation code</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 w-9 sm:h-14 sm:w-11 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-xl font-semibold text-slate-900"
                >
                  {otp ? otp[i] : ''}
                </div>
              ))}
            </div>

            {otp && (
              <button
                onClick={handleCopyOtp}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy code
                  </>
                )}
              </button>
            )}

            <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-3.5 text-left">
              <ShieldCheck className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Share this code with your provider once they arrive, to confirm the service has started.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="rounded-2xl border-emerald-100 bg-emerald-50/60 shadow-sm p-6 text-center">
            <div className="h-11 w-11 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="font-semibold text-emerald-900">Service confirmed</p>
            <p className="text-sm text-emerald-700 mt-1">
              Your code was verified and the service is now underway.
            </p>
          </Card>
        )}

        {/* Action */}
        <Button
          onClick={() => router.push('/consumer/dashboard')}
          className="w-full"
          size="lg"
        >
          Go to Dashboard
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
