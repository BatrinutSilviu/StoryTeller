import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'
import { generateOrganizedFileName, getMaxFileSize, isValidImageType } from "@/lib/storage-utils"
import { BUCKET_NAME, PUBLIC_URL, r2Client } from "@/lib/r2"
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

/**
 * @swagger
 * /api/profiles/{id}:
 *   put:
 *     summary: Update a profile
 *     description: Updates profile information and optionally replaces the photo
 *     tags:
 *       - Profiles
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Child
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "2012-05-15"
 *               gender:
 *                 type: boolean
 *                 example: true
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: New profile photo (optional)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 date_of_birth:
 *                   type: string
 *                   format: date
 *                 gender:
 *                   type: boolean
 *                 photo_url:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not your profile
 *       404:
 *         description: Profile not found
 *       409:
 *         description: Profile name already exists
 *       500:
 *         description: Server error
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error: authError } = await getAuthenticatedUser()
        if (authError) return authError

        const { id } = await params
        const profileId = parseInt(id, 10)

        if (isNaN(profileId)) {
            return NextResponse.json(
                { error: 'Invalid profile ID' },
                { status: 400 }
            )
        }

        const existingProfile = await prisma.profiles.findUnique({
            where: { id: profileId }
        })

        if (!existingProfile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        if (existingProfile.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Forbidden - you can only update your own profiles' },
                { status: 403 }
            )
        }

        const formData = await request.formData()
        const name = formData.get('name') as string | null
        const date_of_birth = formData.get('date_of_birth') as string | null
        const gender = formData.get('gender') as string | null
        const photo = formData.get('photo') as File | null

        if (name !== null && name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Name cannot be empty' },
                { status: 400 }
            )
        }

        let dateOfBirth: Date | null | undefined = undefined
        if (date_of_birth !== null && date_of_birth !== '') {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
                return NextResponse.json(
                    { error: 'Invalid date format. Use YYYY-MM-DD' },
                    { status: 400 }
                )
            }

            dateOfBirth = new Date(date_of_birth)

            if (isNaN(dateOfBirth.getTime())) {
                return NextResponse.json(
                    { error: 'Invalid date' },
                    { status: 400 }
                )
            }

            if (dateOfBirth > new Date()) {
                return NextResponse.json(
                    { error: 'Date of birth cannot be in the future' },
                    { status: 400 }
                )
            }
        }

        if (name && name.trim().toLowerCase() !== existingProfile.name.toLowerCase()) {
            const duplicateProfile = await prisma.profiles.findFirst({
                where: {
                    name: { equals: name, mode: 'insensitive' },
                    user_id: user.id,
                    id: { not: profileId }
                }
            })

            if (duplicateProfile) {
                return NextResponse.json(
                    { error: 'Profile with this name already exists' },
                    { status: 409 }
                )
            }
        }

        let photo_url: string | undefined = undefined
        if (photo && photo.size > 0) {
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

            if (existingProfile.photo_url) {
                try {
                    const oldKey = existingProfile.photo_url.replace(`${PUBLIC_URL}/`, '')
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

        const updateData: any = {
            ...(name && { name: name.trim() }),
            ...(dateOfBirth !== undefined && { date_of_birth: dateOfBirth }),
            ...(gender !== null && { gender: gender === 'true' || gender === '1' }),
            ...(photo_url && { photo_url })
        }

        const updatedProfile = await prisma.profiles.update({
            where: { id: profileId },
            data: updateData
        })

        return NextResponse.json(updatedProfile)
    } catch (error) {
        console.error('Update profile error:', error)
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        )
    }
}

/**
 * @swagger
 * /api/profiles/{id}:
 *   delete:
 *     summary: Delete a profile
 *     description: Deletes a profile and its associated photo from storage
 *     tags:
 *       - Profiles
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile deleted successfully
 *                 id:
 *                   type: integer
 *       400:
 *         description: Invalid profile ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not your profile
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error: authError } = await getAuthenticatedUser()
        if (authError) return authError

        const { id } = await params
        const profileId = parseInt(id, 10)

        if (isNaN(profileId)) {
            return NextResponse.json(
                { error: 'Invalid profile ID' },
                { status: 400 }
            )
        }

        // Check profile exists and belongs to user
        const profile = await prisma.profiles.findUnique({
            where: { id: profileId },
            include: {
                profileCategories: true,
                favorites: true,
                playlists: {
                    include: {
                        playlistStories: true
                    }
                }
            }
        })

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        if (profile.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Forbidden - you can only delete your own profiles' },
                { status: 403 }
            )
        }

        const playlistIds = profile.playlists.map(p => p.id)

        // Execute all database deletions in a single transaction
        const result = await prisma.$transaction(async (tx) => {
            // Step 1: Delete playlist stories
            const deletedPlaylistStories = playlistIds.length > 0
                ? await tx.playlistStories.deleteMany({
                    where: { playlist_id: { in: playlistIds } }
                })
                : { count: 0 }

            // Step 2: Delete playlists
            const deletedPlaylists = await tx.playlists.deleteMany({
                where: { profile_id: profileId }
            })

            // Step 3: Delete favorites
            const deletedFavorites = await tx.favorites.deleteMany({
                where: { profile_id: profileId }
            })

            // Step 4: Delete profile categories
            const deletedProfileCategories = await tx.profileCategories.deleteMany({
                where: { profile_id: profileId }
            })

            // Step 5: Delete the profile itself
            await tx.profiles.delete({
                where: { id: profileId }
            })

            return {
                deletedPlaylistStories: deletedPlaylistStories.count,
                deletedPlaylists: deletedPlaylists.count,
                deletedFavorites: deletedFavorites.count,
                deletedProfileCategories: deletedProfileCategories.count,
            }
        })

        // Step 6: Delete photo from R2 AFTER successful db transaction
        // (outside transaction since R2 is not part of the db)
        if (profile.photo_url) {
            try {
                const key = profile.photo_url.replace(`${PUBLIC_URL}/`, '')
                await r2Client.send(
                    new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: key
                    })
                )
                console.log(`Deleted photo from R2: ${key}`)
            } catch (r2Error) {
                // Log but don't fail - profile is already deleted from db
                console.error('Failed to delete photo from R2:', r2Error)
            }
        }

        return NextResponse.json({
            message: 'Profile deleted successfully',
            id: profileId,
            deleted: {
                playlistStories: result.deletedPlaylistStories,
                playlists: result.deletedPlaylists,
                favorites: result.deletedFavorites,
                profileCategories: result.deletedProfileCategories,
                photo: !!profile.photo_url
            }
        })
    } catch (error) {
        console.error('Delete profile error:', error)
        return NextResponse.json(
            { error: 'Failed to delete profile' },
            { status: 500 }
        )
    }
}

/**
 * @swagger
 * /api/profiles/{id}:
 *   get:
 *     summary: Get a profile by ID
 *     description: Returns profile information including calculated age
 *     tags:
 *       - Profiles
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID
 *     responses:
 *       200:
 *         description: Profile details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 date_of_birth:
 *                   type: string
 *                   format: date
 *                 age:
 *                   type: integer
 *                 gender:
 *                   type: boolean
 *                 photo_url:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Profile not found
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error: authError } = await getAuthenticatedUser()
        if (authError) return authError

        const { id } = await params
        const profileId = parseInt(id, 10)

        if (isNaN(profileId)) {
            return NextResponse.json(
                { error: 'Invalid profile ID' },
                { status: 400 }
            )
        }

        const profile = await prisma.profiles.findUnique({
            where: { id: profileId },
            include: {
                profileCategories: {
                    include: {
                        category: {
                            include: {
                                categoryTranslations: true
                            }
                        }
                    }
                }
            }
        })

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        if (profile.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Forbidden - you can only view your own profiles' },
                { status: 403 }
            )
        }

        return NextResponse.json({
            ...profile,
            date_of_birth: profile.date_of_birth?.toISOString().split('T')[0],
        })
    } catch (error) {
        console.error('Get profile error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}
