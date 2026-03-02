import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {getAuthenticatedAdmin, getAuthenticatedUser} from '@/lib/auth'
import { validateIntId, validateCategoryExists, ValidationError } from '@/lib/validators'
import { generateOrganizedFileName, getMaxFileSize, isValidImageType } from "@/lib/storage-utils"
import { BUCKET_NAME, PUBLIC_URL, r2Client } from "@/lib/r2"
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

/**
 * @swagger
 * /api/categories/{category_id}:
 *   get:
 *     summary: Get a category by ID
 *     description: Returns category details with translations in all languages
 *     tags:
 *       - Categories
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 photo_url:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 categoryTranslations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       language:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           country_code:
 *                             type: string
 *                 _count:
 *                   type: object
 *                   properties:
 *                     storyCategories:
 *                       type: integer
 *                     profileCategories:
 *                       type: integer
 *       400:
 *         description: Invalid category ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ category_id: string }> }
) {
    try {
        const { error: authError } = await getAuthenticatedUser()
        if (authError) return authError

        const { category_id } = await params
        const categoryId = validateIntId(category_id, 'category ID')

        const category = await validateCategoryExists(categoryId)

        const fullCategory = await prisma.categories.findUnique({
            where: { id: categoryId },
            include: {
                categoryTranslations: {
                    include: {
                        language: {
                            select: {
                                id: true,
                                name: true,
                                country_code: true
                            }
                        }
                    },
                    orderBy: {
                        language: {
                            name: 'asc'
                        }
                    }
                },
                _count: {
                    select: {
                        storyCategories: true,
                        profileCategories: true
                    }
                }
            }
        })

        return NextResponse.json(fullCategory)
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            )
        }

        console.error('Get category error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch category' },
            { status: 500 }
        )
    }
}

/**
 * @swagger
 * /api/categories/{category_id}:
 *   put:
 *     summary: Update a category
 *     description: Updates category photo and/or translations
 *     tags:
 *       - Categories
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Category photo (optional)
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 photo_url:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ category_id: string }> }
) {
    try {
        const { user, error: authError } = await getAuthenticatedAdmin()
        if (authError) return authError

        const { category_id } = await params
        const categoryId = validateIntId(category_id, 'category ID')

        const existingCategory = await validateCategoryExists(categoryId)

        const formData = await request.formData()
        const photo = formData.get('photo') as File | null

        let photo_url: string | undefined = undefined

        // Handle photo upload if provided
        if (photo && photo.size > 0) {
            // Validate photo
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

            // Delete old photo from R2 if it exists
            if (existingCategory.photo_url) {
                try {
                    const oldKey = existingCategory.photo_url.replace(`${PUBLIC_URL}/`, '')
                    await r2Client.send(
                        new DeleteObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: oldKey
                        })
                    )
                } catch (deleteError) {
                    console.error('Failed to delete old photo:', deleteError)
                }
            }

            // Upload new photo
            const key = generateOrganizedFileName('category', user.id, photo.name)
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
                        uploadedAt: new Date().toISOString()
                    }
                })
            )

            photo_url = `${PUBLIC_URL}/${key}`
        }

        // Update category
        const updateData: any = {}
        if (photo_url) {
            updateData.photo_url = photo_url
        }

        const updatedCategory = await prisma.categories.update({
            where: { id: categoryId },
            data: updateData,
            include: {
                categoryTranslations: {
                    include: {
                        language: true
                    }
                }
            }
        })

        return NextResponse.json(updatedCategory)
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            )
        }

        console.error('Update category error:', error)
        return NextResponse.json(
            { error: 'Failed to update category' },
            { status: 500 }
        )
    }
}

/**
 * @swagger
 * /api/categories/{category_id}:
 *   delete:
 *     summary: Delete a category
 *     description: Deletes a category and its photo from storage. Cannot delete if category is in use.
 *     tags:
 *       - Categories
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete - category is in use
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ category_id: string }> }
) {
    try {
        const { error: authError } = await getAuthenticatedAdmin()
        if (authError) return authError

        const { category_id } = await params
        const categoryId = validateIntId(category_id, 'category ID')

        const category = await prisma.categories.findUnique({
            where: { id: categoryId },
            include: {
                _count: {
                    select: {
                        storyCategories: true,
                        profileCategories: true
                    }
                }
            }
        })

        if (!category) {
            throw new ValidationError('Category not found', 404)
        }

        // Check if category is in use
        if (category._count.storyCategories > 0 || category._count.profileCategories > 0) {
            return NextResponse.json(
                {
                    error: 'Cannot delete category - it is being used',
                    details: {
                        stories: category._count.storyCategories,
                        profiles: category._count.profileCategories
                    }
                },
                { status: 400 }
            )
        }

        // Delete in transaction
        await prisma.$transaction(async (tx) => {
            // Delete translations
            await tx.categoryTranslations.deleteMany({
                where: { category_id: categoryId }
            })

            // Delete category
            await tx.categories.delete({
                where: { id: categoryId }
            })
        })

        // Delete photo from R2 if it exists
        if (category.photo_url) {
            try {
                const key = category.photo_url.replace(`${PUBLIC_URL}/`, '')
                await r2Client.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: key
                    })
                )
            } catch (r2Error) {
                console.error('Failed to delete photo from R2:', r2Error)
            }
        }

        return NextResponse.json({
            message: 'Category deleted successfully',
            id: categoryId
        })
    } catch (error) {
        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.statusCode }
            )
        }

        console.error('Delete category error:', error)
        return NextResponse.json(
            { error: 'Failed to delete category' },
            { status: 500 }
        )
    }
}
