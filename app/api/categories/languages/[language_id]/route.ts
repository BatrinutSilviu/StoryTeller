import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'

/**
 * @swagger
 * /api/categories/languages/{language_id}:
 *   get:
 *     summary: Gets all the categories by language
 *     tags:
 *       - Categories
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: language_id
 *         required: true
 *         schema:
 *           type: integer
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
    { params }: { params: Promise<{ language_id: string }> }
) {
    try {
        const { user, error } = await getAuthenticatedUser()

        if (error) {
            return error
        }

        const { language_id } = await params
        const languageIdParsed = parseInt(language_id, 10)

        const categories = await prisma.categoryTranslations.findMany({
            where: {
                language_id: languageIdParsed
            },
            select: {
                id: true,
                name: true,
                category: {
                    select: {
                        photo_url: true,
                    }
                }
            },
            orderBy: {
                name: 'asc'
            },
        })

        if (!categories) {
            return NextResponse.json(
                { error: 'Categories not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(categories)
    } catch (error) {
        console.error('Route error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        )
    }
}