import type { CoachPublic } from '@/firebase/coaches/coach.model'

export function coachDisplayPhoto(
  coach: Pick<CoachPublic, 'facePhoto' | 'galleryPhotos' | 'workplacePhotos' | 'achievementPhotos'>,
  fallbackUrl?: string | null
) {
  return (
    coach.facePhoto?.url ||
    coach.galleryPhotos?.find((photo) => photo.label === 'Yo')?.url ||
    coach.galleryPhotos?.find((photo) => photo.url)?.url ||
    coach.workplacePhotos?.find((photo) => photo.url)?.url ||
    coach.achievementPhotos?.find((photo) => photo.url)?.url ||
    fallbackUrl ||
    null
  )
}
