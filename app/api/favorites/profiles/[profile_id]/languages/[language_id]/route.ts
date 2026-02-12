import { NextResponse } from 'next/server'
import {prisma} from "@/lib/prisma";
import {getAuthenticatedUser} from "@/lib/auth";

/**
 * @swagger
 * /api/favorites/profiles/{profile_id}/languages/{language_id}:
 *   get:
 *     summary: Gets all the favorite stories of a profile
 *     tags:
 *       - Favorites
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
    { params }: { params: Promise<{ profile_id: string, language_id: string }> }
) {
    try {
        const { user, error } = await getAuthenticatedUser()

        if (error) {
            return error
        }

        const { profile_id, language_id } = await params
        const profileIdParsed = parseInt(profile_id, 10)
        const languageIdParsed = parseInt(language_id, 10)

        const favorites = await prisma.favorites.findMany({
            where: {
                profile_id : profileIdParsed
            },
            select: {
                id: true,
                story: {
                    select: {
                        id: true,
                        photo_url: true,
                        storyTranslations: {
                            select: {
                                title: true,
                                description: true,
                            },
                            where: {
                                language_id: languageIdParsed

                            }
                        },
                    },
                },
            }
        })

        if (!favorites) {
            return NextResponse.json(
                { error: 'Favorites not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(favorites)
    } catch (error) {
        console.error('Route error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch favorites: ' + error },
            { status: 500 }
        )
    }
}
