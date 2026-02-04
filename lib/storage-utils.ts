import { randomUUID } from 'crypto'

// Generate unique filename
export function generateFileName(originalName: string, prefix?: string): string {
    const timestamp = Date.now()
    const uuid = randomUUID().split('-')[0] // Short UUID
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg'

    // Format: prefix/timestamp-uuid.ext
    // Example: avatars/1704123456789-a1b2c3d4.jpg
    const filename = `${timestamp}-${uuid}.${ext}`

    return prefix ? `${prefix}/${filename}` : filename
}

// Organize by type and date
export function generateOrganizedFileName(
    type: 'avatar' | 'story-cover' | 'story-page' | 'audio',
    userId: string,
    originalName: string
): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const uuid = randomUUID().split('-')[0]
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg'

    // Format: type/year/month/userId-uuid.ext
    // Example: avatars/2024/01/user123-a1b2c3d4.jpg
    return `${type}/${year}/${month}/${userId}-${uuid}.${ext}`
}

// Validate file type
export function isValidImageType(mimetype: string): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    return validTypes.includes(mimetype)
}

export function isValidAudioType(mimetype: string): boolean {
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
    return validTypes.includes(mimetype)
}

// Get file size limit
export function getMaxFileSize(type: 'image' | 'audio'): number {
    return type === 'image'
        ? 5 * 1024 * 1024   // 5MB for images
        : 50 * 1024 * 1024  // 50MB for audio
}
