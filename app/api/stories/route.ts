import { NextResponse } from 'next/server'
import {prisma} from "@/lib/prisma";

export async function GET() {
    try {
        const stories = await prisma.stories.findMany()

        return NextResponse.json(stories)
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        )
    }
}

// POST request
// export async function POST(request: Request) {
//     try {
//         const body = await request.json()
//
//         const newUser = await prisma.user.create({
//             data: {
//                 email: body.email,
//                 name: body.name
//             }
//         })
//
//         return NextResponse.json(newUser, { status: 201 })
//     } catch (error) {
//         return NextResponse.json(
//             { error: 'Failed to create user' },
//             { status: 400 }
//         )
//     }
// }
