import { NextResponse } from 'next/server'
import {prisma} from "@/lib/prisma";
import {getAuthenticatedUser} from "@/lib/auth";

/**
 * @swagger
 * /api/stories/{story_id}/categories/language/{language_id}:
 *   get:
 *     summary: Gets all the categories of a story
 *     tags:
 *       - Stories
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: story_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The story ID
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
        const storyIdParsed = parseInt(id, 10)
        const languageIdParsed = parseInt(language_id, 10)

        const storyCategories = await prisma.storyCategories.findMany({
            where: {
                story_id : storyIdParsed
            },
            select: {
                id: true,
                category: {
                    select: {
                        id: true,
                        photo_url: true,
                        categoryTranslations: {
                            where: {
                                language_id: languageIdParsed
                            },
                            select: {
                                name: true
                            }
                        }
                    }
                },
            }
        })

        if (!storyCategories) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(storyCategories)
    } catch (error) {
        console.error('Route error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}
