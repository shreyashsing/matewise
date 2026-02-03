'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ServiceRequest {
  id: string;
  provider_id: string;
  consumer_name: string;
  service_category: string;
  status: string;
  otp: string;
  otp_verified: boolean;
}

interface Provider {
  id: string;
  business_name: string;
  business_category: string;
  phone_number: string;
}

export default function ServiceConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch service request
        const requestRes = await fetch(`/api/service-requests?id=${requestId}`);
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
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [requestId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!request || !provider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <h1 className="text-xl font-semibold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">Service request not found</p>
          <Button 
            onClick={() => router.push('/consumer/services')}
            className="mt-4 w-full"
          >
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Success Header */}
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-800 mb-2">Payment Successful!</h1>
            <p className="text-green-700">₹649.00 debited from your wallet</p>
          </div>
        </Card>

        {/* Provider Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Service Provider Details</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Business Name</p>
              <p className="font-medium">{provider.business_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service</p>
              <p className="font-medium">{request.service_category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="font-medium">{provider.phone_number}</p>
            </div>
          </div>
        </Card>

        {/* OTP Display */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="text-center">
            <p className="text-sm text-blue-800 mb-2">Your Service Confirmation OTP</p>
            <div className="bg-white rounded-lg p-6 mb-4">
              <p className="text-5xl font-bold tracking-widest text-blue-600">
                {request.otp}
              </p>
            </div>
            <div className="bg-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium mb-1">
                📱 Show this OTP to the service provider
              </p>
              <p className="text-xs text-blue-700">
                The provider will ask for this OTP when they arrive at your location to confirm the service
              </p>
            </div>
          </div>
        </Card>

        {/* Status Info */}
        <Card className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">OTP Verified</span>
              <span className={`px-3 py-1 ${request.otp_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} rounded-full text-sm font-medium`}>
                {request.otp_verified ? 'Verified ✓' : 'Pending'}
              </span>
            </div>
          </div>
        </Card>

        {/* Action Button */}
        <Button 
          onClick={() => router.push('/consumer/dashboard')}
          className="w-full"
          variant="outline"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
