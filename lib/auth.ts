import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function getAuthenticatedUser() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error('Auth error:', authError) // Log for debugging
        return {
            user: null,
            error: NextResponse.json(
                { error: 'Unauthorized - Invalid or missing authentication token' },
                { status: 401 }
            )
        }
    }

    return { user, error: null }
}