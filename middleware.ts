import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const allowedOrigins = [
    'http://localhost:3000',
    'https://story-teller-batrinutsilvius-projects.vercel.app',
]

export function middleware(request: NextRequest) {
    const origin = request.headers.get('origin') || ''

    const isDevelopment = process.env.NODE_ENV === 'development' ||
        request.nextUrl.hostname === 'localhost'

    const isAllowedOrigin = isDevelopment ||
        allowedOrigins.includes(origin) ||
        origin === ''

    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': isDevelopment ? '*' : (isAllowedOrigin ? origin : 'null'),
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '86400',
            },
        })
    }

    const response = NextResponse.next()

    if (isDevelopment) {
        response.headers.set('Access-Control-Allow-Origin', '*')
    } else if (isAllowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', origin || '*')
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')

    return response
}

export const config = {
    matcher: '/api/:path*',
}
