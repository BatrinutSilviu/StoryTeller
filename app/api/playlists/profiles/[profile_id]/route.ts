import { NextResponse } from 'next/server'
import {prisma} from "@/lib/prisma";
import {getAuthenticatedUser} from "@/lib/auth";

/**
 * @swagger
 * /api/playlists/profiles/{profile_id}:
 *   get:
 *     summary: Gets all the playlists of a profile
 *     tags:
 *       - Playlists
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: profile_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The profile ID
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
    { params }: { params: Promise<{ profile_id: string }> }
) {
    try {
        const { user, error } = await getAuthenticatedUser()

        if (error) {
            return error
        }

        const { profile_id } = await params

        if (!profile_id) {
            return NextResponse.json(
                { error: 'profile_id is required' },
                { status: 400 }
            )
        }

        const profileIdParsed = parseInt(profile_id, 10)

        const existingProfile = await prisma.profiles.findUnique({
            where: { id: profileIdParsed }
        })

        if (!existingProfile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        const playlist = await prisma.playlists.findMany({
            where: {
                profile_id : profileIdParsed
            },
            select: {
                id: true,
                name: true,
                playlistStories: {
                    select: {
                        id: true,
                        order: true,
                        story_id: true,
                    },
                    orderBy: {
                        order: 'asc'
                    }
                },
            }
        })

        if (!playlist) {
            return NextResponse.json(
                { error: 'Playlist not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(playlist)
    } catch (error) {
        console.error('Route error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch playlist: ' + error },
            { status: 500 }
        )
    }
}
