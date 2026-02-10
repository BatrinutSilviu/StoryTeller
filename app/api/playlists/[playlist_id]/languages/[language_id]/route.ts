import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'

/**
 * @swagger
 * /api/playlists/{playlist_id}/languages/{language_id}:
 *   get:
 *     summary: Get a playlist by ID
 *     tags:
 *       - Playlists
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlist_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
 *       - in: path
 *         name: language_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Language ID
 *     responses:
 *       200:
 *         description: Playlist details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 profile_id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 playlistStories:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Playlist not found
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ playlist_id: string, language_id: string }> }
) {
    try {
        const { user, error: authError } = await getAuthenticatedUser()
        if (authError) return authError

        const { playlist_id, language_id } = await params
        const parsedPlaylistId = parseInt(playlist_id, 10)
        const parsedLanguageId = parseInt(language_id, 10)

        if (isNaN(parsedPlaylistId)) {
            return NextResponse.json(
                { error: 'Invalid playlist ID' },
                { status: 400 }
            )
        }

        if (isNaN(parsedLanguageId)) {
            return NextResponse.json(
                { error: 'Invalid language ID' },
                { status: 400 }
            )
        }

        const playlist = await prisma.playlists.findUnique({
            where: { id: parsedPlaylistId },
            include: {
                profile: {
                    select: {
                        user_id: true,
                    }
                },
                playlistStories: {
                    orderBy: {
                        order: 'asc'
                    },
                    include: {
                        story: {
                            include: {
                                storyTranslations: {
                                    select: {
                                        id: true,
                                        title: true,
                                    },
                                    where: {
                                        language_id: parsedLanguageId
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!playlist) {
            return NextResponse.json(
                { error: 'Playlist not found' },
                { status: 404 }
            )
        }

        if (playlist.profile.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Forbidden - you can only view your own playlists' },
                { status: 403 }
            )
        }

        return NextResponse.json(playlist)
    } catch (error) {
        console.error('Get playlist error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch playlist' },
            { status: 500 }
        )
    }
}
