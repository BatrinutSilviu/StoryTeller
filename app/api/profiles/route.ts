import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'

/**
 * @swagger
 * /api/profiles:
 *   post:
 *     summary: Creates a new profile
 *     tags:
 *       - Profiles
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Child
 *               age:
 *                 type: int
 *                 example: 12
 *               gender:
 *                 type: boolean
 *                 example: 1 for male, 0 for female
 *     responses:
 *       201:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Profile already exists
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser()
        if (authError) {
            return authError
        }

        const body = await request.json()
        const { name, age, gender } = body

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        const parsedGender = Boolean(gender)

        const existingProfile = await prisma.profiles.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                },
                user_id: {
                    equals: user.id
                }
            }
        })

        if (existingProfile) {
            return NextResponse.json(
                { error: 'Profile already exists' },
                { status: 409 }
            )
        }

        const profile = await prisma.profiles.create({
            data: {
                name: name.trim(),
                age: age,
                gender: parsedGender,
                user_id: user.id
            }
        })

        return NextResponse.json(profile, { status: 201 })
    } catch (error) {
        console.error('Create profile error:', error)

        if (error instanceof Error) {
            if (error.message.includes('Unique constraint')) {
                return NextResponse.json(
                    { error: 'Profile already exists' },
                    { status: 409 }
                )
            }
        }

        return NextResponse.json(
            { error: 'Failed to create profile' },
            { status: 500 }
        )
    }
}