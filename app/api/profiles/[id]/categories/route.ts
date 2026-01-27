import { NextResponse } from 'next/server'
import {prisma} from "@/lib/prisma";

/**
 * @swagger
 * /api/profiles/{profile_id}/categories:
 *   get:
 *     summary: Gets the categories from a profile
 *     description: Returns all categories associated with a specific profile
 *     tags:
 *       - Profiles
 *     parameters:
 *       - in: path
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The profile ID
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   profile_id:
 *                     type: integer
 *                   category_id:
 *                     type: integer
 *                   category:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *       400:
 *         description: Invalid profile ID
 *       404:
 *         description: No categories found
 *       500:
 *         description: Server error
 */
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
