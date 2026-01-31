import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function getAuthenticatedUser() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return {
            user: null,
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    return { user, error: null }
}
