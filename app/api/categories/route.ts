import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Creates a new category
 *     tags:
 *       - Categories
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
 *               - language_id
 *               - photo_url
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sports
 *               language_id:
 *                 type: string
 *                 example: 1
 *               photo_url:
 *                 type: string
 *                 example: www.test.com/photo.jpg
 *     responses:
 *       201:
 *         description: Category created successfully
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
 *         description: Category already exists
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
        const { name, language_id, photo_url } = body

        const languageIdParsed = parseInt(language_id, 10)

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        const existingCategory = await prisma.categoryTranslations.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        })

        if (existingCategory) {
            return NextResponse.json(
                { error: 'Category already exists' },
                { status: 409 }
            )
        }

        const category = await prisma.categories.create({
            data: {
                photo_url: photo_url,
            }
        })

        const categoryTranslation = await prisma.categoryTranslations.create({
            data: {
                category_id: category.id,
                name: name.trim(),
                language_id: languageIdParsed
            }
        })

        return NextResponse.json(categoryTranslation, { status: 201 })
    } catch (error) {
        console.error('Create category error:', error)

        if (error instanceof Error) {
            if (error.message.includes('Unique constraint')) {
                return NextResponse.json(
                    { error: 'Category already exists' },
                    { status: 409 }
                )
            }
        }

        return NextResponse.json(
            { error: 'Failed to create category' },
            { status: 500 }
        )
    }
}