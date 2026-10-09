'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { getAuthed } from '@/lib/client/authed-api'
import { type SchoolContact, schoolContactHref } from '@/lib/school-contact'
import { SchoolContactIcon } from './SchoolContactsCard'

export default function SchoolPublicContacts({
  schoolId,
  initialContacts,
}: {
  schoolId: string
  initialContacts: SchoolContact[]
}) {
  const { user } = useUser() as { user: { uid?: string; id?: string } | null | undefined }
  const accountId = user?.uid || user?.id
  const [contacts, setContacts] = useState(initialContacts)
  const [loadedAccount, setLoadedAccount] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    setContacts(initialContacts)
    setLoadedAccount(null)
    if (accountId)
      getAuthed(`/api/schools/${schoolId}/contacts`)
        .then((response) => response.json() as Promise<{ contacts: SchoolContact[] }>)
        .then((payload) => {
          if (active) {
            setContacts(payload.contacts)
            setLoadedAccount(accountId)
          }
        })
        .catch(() => {})
    return () => {
      active = false
    }
  }, [schoolId, initialContacts, accountId])
  const visible = accountId && loadedAccount === accountId ? contacts : initialContacts
  if (!visible.length) return null
  return (
    <section
      className="mt-3 rounded-none border-0 bg-white p-3 sm:mt-8 sm:rounded-3xl sm:border sm:border-(--c-border) sm:p-8"
      aria-labelledby="school-contacts-title"
    >
      <h2 id="school-contacts-title" className="text-xl font-extrabold text-(--c-ocean)">
        Enlaces y contactos
      </h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {visible.map((contact) => (
          <li key={contact.id}>
            <a
              href={schoolContactHref(contact) || undefined}
              target={['email', 'phone'].includes(contact.type) ? undefined : '_blank'}
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-3 rounded-xl bg-(--school-surface) px-4 py-3 text-sm font-semibold text-(--school-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <SchoolContactIcon type={contact.type} socialNetwork={contact.socialNetwork} />
              <span className="break-words">{contact.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
