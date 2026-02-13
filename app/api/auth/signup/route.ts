import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password (minimum 6 characters)
 *                 example: SecurePass123!
 *     responses:
 *       201:
 *         description: User account and profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: User's unique ID
 *                     email:
 *                       type: string
 *                       format: email
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                 profile:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: Profile's database ID
 *                     user_id:
 *                       type: string
 *                       format: uuid
 *                       description: Reference to auth user
 *                     name:
 *                       type: string
 *                       description: User's display name
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - invalid input or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User already registered
 *       500:
 *         description: Server error - failed to create account
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to create account
 */
export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()

        const supabase = await createClient()

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        })

        if (signUpError || !authData.user) {
            return NextResponse.json(
                { error: signUpError?.message || 'Signup failed' },
                { status: 400 }
            )
        }

        return NextResponse.json({ user: authData.user }, { status: 201 })
    } catch (error) {
        console.error('Signup error:', error)
        return NextResponse.json(
            { error: 'Failed to create account: ' + error },
            { status: 500 }
        )
    }
}
