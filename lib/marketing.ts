export type MarketingStatus = 'subscribed' | 'unsubscribed' | 'pending'
export interface MarketingRecipient {
  id: string
  name: string
  email: string
  status: MarketingStatus
  eligible: boolean
}
export function normalizeMarketingStatus(value: unknown): MarketingStatus {
  return value === 'subscribed' || value === 'unsubscribed' ? value : 'pending'
}
export function normalizeMarketingEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}
export function validMarketingEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
}
export function escapeMarketingHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char
  )
}
