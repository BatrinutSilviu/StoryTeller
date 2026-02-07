import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     summary: Creates a new favorite
 *     tags:
 *       - Favorites
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - story_id
 *               - profile_id
 *             properties:
 *               story_id:
 *                 type: integer
 *                 example: 1
 *               profile_id:
 *                 type: integer
 *                 example: 1
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
 *                 date_of_birth:
 *                   type: string
 *                   format: date
 *                 gender:
 *                   type: boolean
 *                 photo:
 *                   type: string
 *                 age:
 *                   type: integer
 *                   description: Calculated age from date_of_birth
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
        const { profile_id, story_id } = body

        if (!profile_id || !story_id) {
            return NextResponse.json(
                { error: 'profile_id and story_id are required' },
                { status: 400 }
            )
        }

        const profileIdParsed = parseInt(profile_id, 10)
        const storyIdParsed = parseInt(story_id, 10)

        const favorite = await prisma.favorites.findFirst({
            where: {
                profile_id: profileIdParsed,
                story_id: storyIdParsed,
            }
        })


        if (favorite) {
            return NextResponse.json(
                { error: 'Profile with this name already exists' },
                { status: 409 }
            )
        }

        const profile = await prisma.favorites.create({
            data: {
                story_id: storyIdParsed,
                profile_id: profileIdParsed,
            }
        })

        return NextResponse.json(profile, { status: 201 })
    } catch (error) {
        console.error('Create favorite error:', error)

        if (error instanceof Error) {
            if (error.message.includes('Unique constraint')) {
                return NextResponse.json(
                    { error: 'Profile already exists' },
                    { status: 409 }
                )
            }
        }

        return NextResponse.json(
            { error: 'Failed to create favorite: ' + error },
            { status: 500 }
        )
    }
}