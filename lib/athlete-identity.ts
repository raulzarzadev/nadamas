export type IdentityProfileType = 'user' | 'additional'

export interface AthleteIdentity {
  profileId: string
  profileType: IdentityProfileType
  numericId: string
  qrToken: string
  createdAt: number
  rotatedAt?: number
}

export interface AthleteCredential extends AthleteIdentity {
  name: string
  photoURL?: string
  birthDate?: string
  gender?: string
}

export const credentialQrValue = (token: string) => `nadamas:credential:${token}`

export function parseCredentialQr(value: string) {
  const match = value.trim().match(/^nadamas:credential:([a-f0-9]{64})$/)
  return match?.[1] || null
}
