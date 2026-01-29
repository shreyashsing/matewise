import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET() {
    try {
        const response: ApiResponse = {
            success: true,
            message: 'Server is healthy',
            data: {
                status: 'ok',
                timestamp: new Date().toISOString(),
            },
        }

        return NextResponse.json(response, { status: 200 })
    } catch (error) {
        const errorResponse: ApiResponse = {
            success: false,
            error: 'Health check failed',
        }
        return NextResponse.json(errorResponse, { status: 500 })
    }
}
