import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'

/**
 * @swagger
 * /api/stories:
 *   post:
 *     summary: Create a complete story with translation and pages
 *     tags:
 *       - Stories
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true`
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language_id
 *               - title
 *               - pages
 *             properties:
 *               photo_url:
 *                 type: string
 *               story_series_id:
 *                 type: integer
 *               category_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               language_id:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: The Great Adventure
 *               audio_url:
 *                 type: string
 *               pages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - page_number
 *                     - text_content
 *                   properties:
 *                     page_number:
 *                       type: integer
 *                     text_content:
 *                       type: string
 *     responses:
 *       201:
 *         description: Story created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: Request) {
    try {
        const { user, error: authError } = await getAuthenticatedUser()
        if (authError) return authError

        const body = await request.json()
        const {
            photo_url,
            story_series_id,
            category_ids,
            language_id,
            title,
            audio_url,
            pages,
            description
        } = body

        // Validate required fields
        if (!language_id || !title) {
            return NextResponse.json(
                { error: 'language_id and title are required' },
                { status: 400 }
            )
        }

        if (!Array.isArray(pages) || pages.length === 0) {
            return NextResponse.json(
                { error: 'pages array is required and cannot be empty' },
                { status: 400 }
            )
        }

        // Validate language exists
        const language = await prisma.languages.findUnique({
            where: { id: language_id }
        })

        if (!language) {
            return NextResponse.json(
                { error: 'Language not found' },
                { status: 404 }
            )
        }

        // Validate categories if provided
        if (category_ids && category_ids.length > 0) {
            const categories = await prisma.categories.findMany({
                where: { id: { in: category_ids } }
            })

            if (categories.length !== category_ids.length) {
                return NextResponse.json(
                    { error: 'Some categories not found' },
                    { status: 404 }
                )
            }
        }

        // Create story with translation and pages in a transaction
        const story = await prisma.stories.create({
            data: {
                photo_url: photo_url || null,
                story_series_id: story_series_id || null,
                storyCategories: category_ids && category_ids.length > 0 ? {
                    create: category_ids.map((category_id: number) => ({
                        category_id
                    }))
                } : undefined,
                storyTranslations: {
                    create: {
                        language_id,
                        title,
                        description,
                        storyPages: {
                            create: pages.map((page: any) => ({
                                audio_url: audio_url || null,
                                photo_url: photo_url || null,
                                page_number: page.page_number,
                                text_content: page.text_content
                            }))
                        }
                    }
                }
            },
            include: {
                storyCategories: {
                    include: {
                        category: {
                            include: {
                                categoryTranslations: true
                            }
                        }
                    }
                },
                storyTranslations: {
                    include: {
                        language: true,
                        storyPages: {
                            orderBy: {
                                page_number: 'asc'
                            }
                        }
                    }
                }
            }
        })

        return NextResponse.json(story, { status: 201 })
    } catch (error) {
        console.error('Create complete story error:', error)
        return NextResponse.json(
            { error: 'Failed to create story' },
            { status: 500 }
        )
    }
}
