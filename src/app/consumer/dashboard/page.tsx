'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ConsumerDashboard() {
    const router = useRouter()
    
    useEffect(() => {
        // Redirect to services page
        router.replace('/consumer/services')
    }, [router])
    
    return null
}
