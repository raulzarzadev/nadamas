import COACH_SCORE from '@/CONSTANTS/COACH_SCORE'
import COACH_SKILLS from '@/CONSTANTS/COACH_SKILLS'

export interface ScorableProfile {
  skills?: Record<string, string> | null
  bio?: string | null
  facePhoto?: { url: string } | null
  workplacePhotos?: { url: string }[] | null
  achievementPhotos?: { url: string }[] | null
  idDocuments?: { url: string; name: string }[] | null
  certifications?: { url: string; name: string }[] | null
}

const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, n))

/**
 * Pure: total auto score for a coach profile, integer clamped 0..MAX.
 * Counts only skill dimensions that exist in the current schema.
 */
export function computeAutoScore(
  profile: ScorableProfile,
  weights = COACH_SCORE
): number {
  let pts = 0

  const validKeys = new Set(COACH_SKILLS.map((d) => d.key))
  const skills = profile.skills ?? {}
  for (const key of Object.keys(skills)) {
    if (validKeys.has(key) && skills[key]) pts += weights.perFilledSkillDimension
  }

  if (profile.bio && profile.bio.trim().length > 0) pts += weights.bio
  if (profile.facePhoto?.url) pts += weights.facePhoto

  const wp = profile.workplacePhotos?.length ?? 0
  pts += Math.min(wp, weights.maxScoredWorkplacePhotos) * weights.perWorkplacePhoto

  const ap = profile.achievementPhotos?.length ?? 0
  pts +=
    Math.min(ap, weights.maxScoredAchievementPhotos) *
    weights.perAchievementPhoto

  const idn = profile.idDocuments?.length ?? 0
  pts += Math.min(idn, weights.maxScoredIdDocuments) * weights.perIdDocument

  const cert = profile.certifications?.length ?? 0
  pts +=
    Math.min(cert, weights.maxScoredCertifications) * weights.perCertification

  return clamp(Math.round(pts), 0, weights.MAX)
}

export interface CoachVerification {
  status: 'pending' | 'verified'
  autoScore: number
  adminScoreOverride?: number
}

/** Pure: the score athletes see — admin override wins, else autoScore. */
export function effectiveScore(
  verification: CoachVerification | null | undefined
): number {
  if (!verification) return 0
  return verification.adminScoreOverride ?? verification.autoScore ?? 0
}
