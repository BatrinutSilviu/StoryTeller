import { NextResponse } from 'next/server'
import {prisma} from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const profileId = parseInt(id, 10)
        const profileCategories = await prisma.profileCategories.findMany({
            where: {
                profile_id : profileId
            },
            select: {
                id: true,
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                profile: {
                    select: {
                        id: true,
                        user_id: true,
                        name: true,
                        age: true,
                        gender: true
                    }
                }
            }
        })

        if (!profileCategories) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(profileCategories)
    } catch (error) {
        console.error('Route error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}
