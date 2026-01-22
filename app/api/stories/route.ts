import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET request
export async function GET() {
    try {
        const { data: stories } = await supabase
            .from('Stories')
            .select('*')
            .limit(5)
            .order('created_at', { ascending: false })

        return NextResponse.json(stories)
        // or with custom status:
        // return NextResponse.json(users, { status: 200 })
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
