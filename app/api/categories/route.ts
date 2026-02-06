import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2Client, BUCKET_NAME, PUBLIC_URL } from '@/lib/r2'
import { generateOrganizedFileName, isValidImageType, getMaxFileSize } from '@/lib/storage-utils'

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Creates a new category with photo
 *     tags:
 *       - Categories
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - language_id
 *               - photo
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sports
 *               language_id:
 *                 type: string
 *                 example: 1
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Category photo image file
 *     responses:
 *       201:
 *         description: Category created successfully
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

        const formData = await request.formData()
        const name = formData.get('name') as string
        const language_id = formData.get('language_id') as string
        const photo = formData.get('photo') as File

        const languageIdParsed = parseInt(language_id, 10)

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        if (isNaN(languageIdParsed)) {
            return NextResponse.json(
                { error: 'Valid language_id is required' },
                { status: 400 }
            )
        }

        if (isNaN(languageIdParsed)) {
            return NextResponse.json(
                { error: 'Valid language_id is required' },
                { status: 400 }
            )
        }

        if (!isValidImageType(photo.type)) {
            return NextResponse.json(
                { error: `Invalid file type: ${photo.type}. Must be JPEG, PNG, WebP, or GIF` },
                { status: 400 }
            )
        }

        const maxSize = getMaxFileSize('image')
        if (photo.size > maxSize) {
            return NextResponse.json(
                { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
                { status: 400 }
            )
        }

        const existingCategory = await prisma.categoryTranslations.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                },
                language_id: languageIdParsed
            }
        })

        if (existingCategory) {
            return NextResponse.json(
                { error: 'Category already exists' },
                { status: 409 }
            )
        }

        const key = generateOrganizedFileName(
            'category',
            user.id,
            photo.name
        )

        const arrayBuffer = await photo.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        await r2Client.send(
            new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: photo.type,
                Metadata: {
                    userId: user.id,
                    originalName: photo.name,
                    uploadedAt: new Date().toISOString(),
                },
            })
        )

        const photo_url = `${PUBLIC_URL}/${key}`

        const category = await prisma.categories.create({
            data: {
                photo_url: photo_url,
                categoryTranslations: {
                    create: {
                        name: name.trim(),
                        language_id: languageIdParsed
                    }
                }
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
            { error: 'Failed to create category: ' + error },
            { status: 500 }
        )
    }
}