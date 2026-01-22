import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        console.log('Fetching profile with ID:', id)

        const { data: profile, error } = await supabase
            .from('Profile_Categories')
            .select('*')
            .eq('profile_id', id)

        if (error) {
            console.error('Supabase error:', error)
            throw error
        }

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(profile)
    } catch (error) {
        console.error('Route error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}
