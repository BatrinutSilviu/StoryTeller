import { NextResponse } from 'next/server'
import {prisma} from "@/lib/prisma";
import {getAuthenticatedUser} from "@/lib/auth";

/**
 * @swagger
 * /api/profiles/{profile_id}/categories/languages/{language_id}:
 *   get:
 *     summary: Gets all the categories of a profile
 *     tags:
 *       - Profiles
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The profile ID
 *       - in: path
 *         name: language_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The language ID
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
    { params }: { params: Promise<{ id: string, language_id: string }> }
) {
    try {
        const { user, error } = await getAuthenticatedUser()

        if (error) {
            return error
        }

        const { id, language_id } = await params
        const profileIdParsed = parseInt(id, 10)
        const lanaguageIdParsed = parseInt(language_id, 10)

        const profileCategories = await prisma.profileCategories.findMany({
            where: {
                profile_id : profileIdParsed
            },
            select: {
                id: true,
                category: {
                    select: {
                        id: true,
                        photo_url: true,
                        categoryTranslations: {
                            where: {
                                language_id: lanaguageIdParsed
                            },
                            select: {
                                name: true
                            }
                        }
                    }
                },
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
