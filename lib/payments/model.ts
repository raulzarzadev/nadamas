export type PaymentScope = { kind: 'school' | 'coach'; id: string }
export type PaymentMode = 'classes' | 'period'
export type PaymentSettings = {
  classesEnabled: boolean
  periodsEnabled: boolean
  allowBookingWithoutBalance: boolean
  cancellationHours: number
  transferDetails?: {
    bank: string
    holder: string
    account: string
    clabe: string
    reference: string
  }
  transferInstructions: string
  timezone: string
}
export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  classesEnabled: false,
  periodsEnabled: false,
  allowBookingWithoutBalance: false,
  cancellationHours: 24,
  transferInstructions: '',
  transferDetails: { bank: '', holder: '', account: '', clabe: '', reference: '' },
  timezone: 'America/Mazatlan',
}
export type PaymentProduct = {
  id: string
  name: string
  mode: PaymentMode
  priceCents: number
  currency: 'MXN'
  classes: number
  months: number
  expiryDays: number | null
  perDay: number | null
  perWeek: number | null
  perPeriod: number | null
  active: boolean
}
export type PaymentOrder = {
  id: string
  scope: string
  studentId: string
  studentName: string
  ownerId: string
  product: PaymentProduct
  method: 'transfer' | 'cash'
  status: 'pending' | 'approved' | 'rejected'
  receiptPath?: string
  receiptType?: string
  createdAt: number
  reviewedAt?: number
  reviewedBy?: string
}
export type PaymentGrant = {
  id: string
  product: PaymentProduct
  startsOn: string
  endsBefore: string | null
  used: number
  reserved: number
  buckets: Record<string, { used: number; reserved: number }>
}
export type PaymentAccount = { grants: PaymentGrant[] }
export type PaymentReservation = {
  id: string
  scope: string
  studentId: string
  sourceId: string
  date: string
  startTime: string
  endsAt?: number
  grantId: string | null
  state: 'reserved' | 'consumed' | 'released' | 'exception'
  actorId: string
  reason?: string
  createdAt: number
}
export type PaymentMovement = {
  id: string
  scope: string
  studentId: string
  actorId: string
  type: string
  description: string
  createdAt: number
  quantity?: number
}
export type PaymentStudent = { id: string; name: string; ownerId: string; isSelf?: boolean }
export type PaymentSnapshot = {
  scope: PaymentScope
  manager: boolean
  settings: PaymentSettings
  products: PaymentProduct[]
  students: PaymentStudent[]
  accounts: Record<string, PaymentAccount>
  orders: PaymentOrder[]
  reservations: PaymentReservation[]
  movements: PaymentMovement[]
}
export const scopeKey = (scope: PaymentScope) => `${scope.kind}:${scope.id}`
