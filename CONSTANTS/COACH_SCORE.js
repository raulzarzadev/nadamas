// Score weights for autoScore. Retune scoring by editing only this file.
// autoScore = clamp( sum of earned points, 0, MAX ).
const COACH_SCORE = {
  MAX: 100,
  perFilledSkillDimension: 8,   // each carta dimension with a value
  bio: 6,                       // non-empty bio
  facePhoto: 12,                // face photo present
  perWorkplacePhoto: 4,         // each, capped by maxScoredWorkplacePhotos
  maxScoredWorkplacePhotos: 3,
  perAchievementPhoto: 4,       // each, capped by maxScoredAchievementPhotos
  maxScoredAchievementPhotos: 3,
  perIdDocument: 10,            // each, capped by maxScoredIdDocuments
  maxScoredIdDocuments: 1,
  perCertification: 10,         // each, capped by maxScoredCertifications
  maxScoredCertifications: 3,
}

export default COACH_SCORE
