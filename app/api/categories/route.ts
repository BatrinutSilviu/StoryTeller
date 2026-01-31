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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sports
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
        const { name } = body

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        const existingCategory = await prisma.categories.findFirst({
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
                name: name.trim(),
            }
        })

        return NextResponse.json(category, { status: 201 })
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