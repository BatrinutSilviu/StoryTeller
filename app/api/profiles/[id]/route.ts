import { NextResponse } from 'next/server'
import {prisma} from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const userId = parseInt(id, 10)

        const profiles = await prisma.profiles.findMany({
            where: {
                user_id : userId
            },
            select: {
                id: true,
                user_id: true,
                name: true,
                age: true,
                gender: true
            }
        })

        if (!profiles) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(profiles)
    } catch (error) {
        console.error('Route error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}
