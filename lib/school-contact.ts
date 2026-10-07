import { parsePhoneNumberFromString } from 'libphonenumber-js'
export const SCHOOL_CONTACT_TYPES = {
  social: 'Red social',
  whatsapp: 'WhatsApp',
  website: 'Sitio web',
  phone: 'Teléfono',
  email: 'Correo electrónico',
} as const

export const SCHOOL_SOCIAL_NETWORKS = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  x: 'X',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
  other: 'Otra red',
} as const
export type SchoolSocialNetwork = keyof typeof SCHOOL_SOCIAL_NETWORKS

export type SchoolContactType = keyof typeof SCHOOL_CONTACT_TYPES
export interface SchoolContact {
  id: string
  type: SchoolContactType
  label: string
  socialNetwork?: SchoolSocialNetwork
  value: string
  visibility: Array<'public' | 'students' | 'teachers'>
}

export function schoolContactHref(contact: Pick<SchoolContact, 'type' | 'value'>): string | null {
  const value = contact.value.trim()
  if (contact.type === 'email')
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `mailto:${value}` : null
  if (contact.type === 'phone' || (contact.type === 'whatsapp' && /^[+\d ()-]+$/.test(value))) {
    const phone = parsePhoneNumberFromString(value, 'MX')
    if (!phone?.isPossible()) return null
    return contact.type === 'whatsapp'
      ? `https://wa.me/${phone.number.slice(1)}`
      : `tel:${phone.number}`
  }
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    if (
      contact.type === 'whatsapp' &&
      ![
        'wa.me',
        'chat.whatsapp.com',
        'api.whatsapp.com',
        'www.whatsapp.com',
        'whatsapp.com',
      ].includes(url.hostname)
    )
      return null
    return url.href
  } catch {
    return null
  }
}

export function normalizeSchoolContacts(value: unknown): SchoolContact[] | null {
  if (!Array.isArray(value) || value.length > 30) return null
  const ids = new Set<string>()
  const contacts: SchoolContact[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null
    const record = raw as Record<string, unknown>
    if (
      typeof record.id !== 'string' ||
      !/^[\w-]{1,80}$/.test(record.id) ||
      ids.has(record.id) ||
      typeof record.type !== 'string' ||
      !Object.hasOwn(SCHOOL_CONTACT_TYPES, record.type) ||
      typeof record.label !== 'string' ||
      typeof record.value !== 'string'
    )
      return null
    const visibility = Array.isArray(record.visibility)
      ? [...new Set(record.visibility)]
      : [record.visibility]
    if (
      !visibility.length ||
      !visibility.every((item) => ['public', 'students', 'teachers'].includes(item as string)) ||
      (visibility.includes('public') && visibility.length > 1)
    )
      return null
    if (
      record.socialNetwork !== undefined &&
      (typeof record.socialNetwork !== 'string' ||
        !Object.hasOwn(SCHOOL_SOCIAL_NETWORKS, record.socialNetwork))
    )
      return null
    const contact = {
      ...(record.type === 'social' && record.socialNetwork
        ? { socialNetwork: record.socialNetwork as SchoolSocialNetwork }
        : {}),
      visibility: visibility as SchoolContact['visibility'],
      id: record.id,
      type: record.type as SchoolContactType,
      label: record.label.trim(),
      value:
        record.type === 'phone'
          ? parsePhoneNumberFromString(record.value.trim(), 'MX')?.number || record.value.trim()
          : record.value.trim(),
    }
    if (
      !contact.label ||
      contact.label.length > 80 ||
      contact.value.length > 1000 ||
      !schoolContactHref(contact)
    )
      return null
    ids.add(contact.id)
    contacts.push(contact)
  }
  return contacts
}

export function visibleSchoolContacts(
  contacts: SchoolContact[] = [],
  access: { director?: boolean; student?: boolean; teacher?: boolean } = {}
) {
  return contacts.filter(
    (contact) =>
      access.director ||
      contact.visibility.includes('public') ||
      (contact.visibility.includes('students') && access.student) ||
      (contact.visibility.includes('teachers') && access.teacher)
  )
}
