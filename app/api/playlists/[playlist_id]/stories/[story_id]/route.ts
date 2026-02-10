import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'

/**
 * @swagger
 * /api/playlists/{playlist_id}/stories/{story_id}:
 *   delete:
 *     summary: Remove story from playlist
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
 *         name: story_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Story ID
 *     responses:
 *       200:
 *         description: Story removed from playlist successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Playlist or story not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ playlist_id: string; story_id: string }> }
) {
    try {
        const { user, error: authError } = await getAuthenticatedUser()
        if (authError) return authError

        const { playlist_id, story_id } = await params
        const parsedPlaylistId = parseInt(playlist_id, 10)
        const parsedStoryId = parseInt(story_id, 10)

        const playlist = await prisma.playlists.findUnique({
            where: { id: parsedPlaylistId },
            include: {
                profile: {
                    select: {
                        user_id: true
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
                { error: 'Forbidden' },
                { status: 403 }
            )
        }

        const playlistStory = await prisma.playlistStories.findFirst({
            where: {
                playlist_id: parsedPlaylistId,
                story_id: parsedStoryId
            }
        })

        if (!playlistStory) {
            return NextResponse.json(
                { error: 'Story not found in playlist' },
                { status: 404 }
            )
        }

        await prisma.playlistStories.delete({
            where: {
                id: playlistStory.id
            }
        })

        await prisma.playlistStories.updateMany({
            where: {
                playlist_id: parsedPlaylistId,
                order: {
                    gt: playlistStory.order
                }
            },
            data: {
                order: {
                    decrement: 1
                }
            }
        })

        return NextResponse.json({
            message: 'Story removed from playlist successfully'
        })
    } catch (error) {
        console.error('Remove story from playlist error:', error)
        return NextResponse.json(
            { error: 'Failed to remove story from playlist' },
            { status: 500 }
        )
    }
}
