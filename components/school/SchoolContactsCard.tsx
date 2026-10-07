'use client'

import { useState } from 'react'
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaTelegram,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6'
import { FiEdit2, FiExternalLink, FiLink, FiMail, FiPhone, FiPlus, FiTrash2 } from 'react-icons/fi'
import HttpsUrlInput from '@/components/ui/https-url-input'
import PhoneNumberInput from '@/components/ui/phone-number-input'
import Sheet from '@/components/ui/sheet'
import { patchAuthed } from '@/lib/client/authed-api'
import type { School } from '@/lib/school'
import {
  SCHOOL_CONTACT_TYPES,
  SCHOOL_SOCIAL_NETWORKS,
  type SchoolContact,
  type SchoolContactType,
  type SchoolSocialNetwork,
  schoolContactHref,
} from '@/lib/school-contact'

export const CONTACT_VISIBILITY = {
  public: 'Todos',
  students: 'Alumnos',
  teachers: 'Profes',
} as const
const SOCIAL_ICONS = {
  instagram: FaInstagram,
  tiktok: FaTiktok,
  facebook: FaFacebook,
  youtube: FaYoutube,
  x: FaXTwitter,
  linkedin: FaLinkedin,
  telegram: FaTelegram,
  other: FiLink,
}

export function SchoolContactIcon({
  type,
  socialNetwork,
}: {
  type: SchoolContactType
  socialNetwork?: SchoolSocialNetwork
}) {
  const Icon =
    type === 'social' && socialNetwork
      ? SOCIAL_ICONS[socialNetwork]
      : type === 'whatsapp'
        ? FaWhatsapp
        : type === 'phone'
          ? FiPhone
          : type === 'email'
            ? FiMail
            : FiLink
  return <Icon aria-hidden="true" className="size-4 shrink-0" />
}

export default function SchoolContactsCard({
  school,
  canManage,
  onUpdated,
}: {
  school: School
  canManage: boolean
  onUpdated: (school: School) => void
}) {
  const [form, setForm] = useState<SchoolContact | null>(null)
  const [whatsappAsLink, setWhatsappAsLink] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const contacts = school.contacts || []
  async function save(next: SchoolContact[]) {
    setBusy(true)
    setMessage('')
    try {
      const response = await patchAuthed(`/api/schools/${school.id}`, { contacts: next })
      const payload = (await response.json()) as { school: School }
      onUpdated(payload.school)
      setForm(null)
      setMessage('Enlaces y contactos actualizados.')
    } catch {
      setMessage('No pudimos guardar los cambios. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--c-surface) text-(--c-ocean)">
            <FiLink aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-(--c-ocean)">Enlaces y contactos</h2>
            <p className="mt-1 text-sm text-(--c-text-2)">
              Redes sociales, grupos de WhatsApp, teléfonos y correos.
            </p>
          </div>
        </div>
        {canManage && (
          <button
            type="button"
            disabled={busy || contacts.length >= 30}
            className="btn btn-outline btn-sm gap-1"
            onClick={() => {
              setMessage('')
              setWhatsappAsLink(false)
              setForm({
                id: crypto.randomUUID(),
                type: 'social',
                label: SCHOOL_SOCIAL_NETWORKS.instagram,
                socialNetwork: 'instagram',
                value: '',
                visibility: ['public'],
              })
            }}
          >
            <FiPlus aria-hidden="true" />
            Agregar
          </button>
        )}
      </div>
      {contacts.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className="flex flex-wrap items-center gap-2 rounded-(--r-sm) bg-(--c-surface) px-3 py-2"
            >
              <a
                href={schoolContactHref(contact) || undefined}
                target={['email', 'phone'].includes(contact.type) ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-(--c-ocean) focus-visible:outline-2"
              >
                <SchoolContactIcon type={contact.type} socialNetwork={contact.socialNetwork} />
                <span className="min-w-0">
                  <span className="block break-words">{contact.label}</span>
                  <span className="block break-all text-xs font-normal text-(--c-text-2)">
                    {contact.value}
                  </span>
                </span>
                <FiExternalLink aria-hidden="true" className="size-3 shrink-0" />
              </a>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] text-(--c-text-2)">
                {contact.visibility.map((audience) => CONTACT_VISIBILITY[audience]).join(' · ')}
              </span>
              {canManage && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setMessage('')
                      setWhatsappAsLink(/^https?:/.test(contact.value))
                      setForm(contact)
                    }}
                    aria-label={`Editar ${contact.label}`}
                    className="btn btn-ghost size-11 p-0"
                  >
                    <FiEdit2 aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save(contacts.filter((item) => item.id !== contact.id))}
                    aria-label={`Eliminar ${contact.label}`}
                    className="btn btn-ghost size-11 p-0 text-rose-700"
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {message && !form && (
        <p role="status" className="mt-3 text-sm text-(--c-text-2)">
          {message}
        </p>
      )}
      <Sheet
        open={form !== null}
        onClose={() => setForm(null)}
        closeDisabled={busy}
        label="Enlace o contacto"
      >
        {form && (
          <form
            className="grid min-w-0 gap-4 px-4 py-1 sm:px-1"
            onSubmit={(event) => {
              event.preventDefault()
              if (!form.visibility.length) {
                setMessage('Selecciona quién puede ver este contacto.')
                return
              }
              if (!schoolContactHref(form)) {
                setMessage('Revisa el enlace, teléfono o correo.')
                return
              }
              void save([...contacts.filter((item) => item.id !== form.id), form])
            }}
          >
            <h2 className="text-lg font-bold">
              {contacts.some((contact) => contact.id === form.id) ? 'Editar' : 'Agregar'} enlace o
              contacto
            </h2>
            <fieldset disabled={busy} className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">Tipo</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SCHOOL_CONTACT_TYPES).map(([value, label]) => {
                  const type = value as SchoolContactType
                  const selected = form.type === type
                  return (
                    <label
                      key={type}
                      className={`relative flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${selected ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface)'} has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--c-ocean) ${busy ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="radio"
                        name="contact-type"
                        value={type}
                        checked={selected}
                        className="sr-only"
                        onChange={() =>
                          setForm({
                            ...form,
                            type,
                            socialNetwork: type === 'social' ? 'instagram' : undefined,
                            label:
                              type === 'social'
                                ? SCHOOL_SOCIAL_NETWORKS.instagram
                                : SCHOOL_CONTACT_TYPES[type],
                            value: '',
                          })
                        }
                      />
                      <SchoolContactIcon type={type} />
                      {label}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            {form.type === 'social' && (
              <fieldset disabled={busy} className="grid gap-2">
                <legend className="mb-1 text-sm font-semibold">Red social</legend>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SCHOOL_SOCIAL_NETWORKS).map(([value, label]) => {
                    const network = value as SchoolSocialNetwork
                    const selected = form.socialNetwork === network
                    return (
                      <label
                        key={network}
                        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold ${selected ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface)'} has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--c-ocean)`}
                      >
                        <input
                          type="radio"
                          name="contact-social-network"
                          checked={selected}
                          className="sr-only"
                          onChange={() =>
                            setForm({ ...form, socialNetwork: network, label, value: '' })
                          }
                        />
                        <SchoolContactIcon type="social" socialNetwork={network} />
                        {label}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )}
            <label className="grid min-w-0 gap-1 text-sm font-semibold">
              Etiqueta
              <input
                required
                maxLength={80}
                disabled={busy}
                className="min-h-11 w-full min-w-0 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
                value={form.label}
                placeholder={SCHOOL_CONTACT_TYPES[form.type]}
                onChange={(event) => setForm({ ...form, label: event.target.value })}
              />
            </label>
            {form.type === 'whatsapp' && (
              <fieldset disabled={busy} className="flex flex-wrap gap-2">
                <legend className="mb-2 text-sm font-semibold">WhatsApp</legend>
                {[
                  [false, 'Número de teléfono'],
                  [true, 'Enlace de grupo'],
                ].map(([asLink, label]) => (
                  <label
                    key={String(asLink)}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-(--c-border) px-3 text-xs font-semibold"
                  >
                    <input
                      type="radio"
                      name="whatsapp-mode"
                      className="size-4 accent-(--c-ocean)"
                      checked={whatsappAsLink === asLink}
                      onChange={() => {
                        setWhatsappAsLink(asLink as boolean)
                        setForm({ ...form, value: '' })
                      }}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            )}
            <label
              htmlFor="school-contact-value"
              className="grid min-w-0 gap-1 text-sm font-semibold"
            >
              {form.type === 'email'
                ? 'Correo electrónico'
                : form.type === 'phone'
                  ? 'Teléfono'
                  : form.type === 'whatsapp'
                    ? whatsappAsLink
                      ? 'Enlace de grupo'
                      : 'Número de WhatsApp'
                    : 'Enlace'}
              {form.type === 'phone' || (form.type === 'whatsapp' && !whatsappAsLink) ? (
                <PhoneNumberInput
                  id="school-contact-value"
                  value={form.value}
                  onChange={(value) => setForm({ ...form, value })}
                  disabled={busy}
                  required
                />
              ) : form.type !== 'email' ? (
                <HttpsUrlInput
                  id="school-contact-value"
                  value={form.value}
                  onChange={(value) => setForm({ ...form, value })}
                  disabled={busy}
                  required
                  placeholder={
                    form.type === 'whatsapp' ? 'chat.whatsapp.com/…' : 'ejemplo.com/perfil'
                  }
                />
              ) : (
                <input
                  id="school-contact-value"
                  required
                  maxLength={1000}
                  disabled={busy}
                  type="email"
                  className="min-h-11 w-full min-w-0 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
                  value={form.value}
                  placeholder="contacto@escuela.com"
                  onChange={(event) => setForm({ ...form, value: event.target.value })}
                />
              )}
            </label>
            {form.type === 'whatsapp' && !whatsappAsLink && schoolContactHref(form) && (
              <p className="break-all text-xs font-normal text-(--c-text-2)">
                Enlace automático:{' '}
                <a
                  href={schoolContactHref(form) || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-(--c-ocean) underline"
                >
                  {schoolContactHref(form)}
                </a>
              </p>
            )}
            <fieldset disabled={busy} className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">Quién puede verlo</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CONTACT_VISIBILITY).map(([value, label]) => {
                  const audience = value as SchoolContact['visibility'][number]
                  return (
                    <label
                      key={value}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--r-sm)] border border-(--c-border) px-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-(--c-ocean)"
                        checked={form.visibility.includes(audience)}
                        onChange={(event) => {
                          const visibility =
                            audience === 'public'
                              ? event.target.checked
                                ? (['public'] as SchoolContact['visibility'])
                                : []
                              : event.target.checked
                                ? [...form.visibility.filter((item) => item !== 'public'), audience]
                                : form.visibility.filter((item) => item !== audience)
                          setForm({ ...form, visibility })
                        }}
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <p className="text-xs text-(--c-text-2)">
              Los contactos restringidos solo se muestran a miembros activos de esta escuela. La
              dirección puede verlos todos.
            </p>
            {message && (
              <p role="alert" className="text-sm text-rose-700">
                {message}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn btn-primary min-h-11">
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </form>
        )}
      </Sheet>
    </section>
  )
}
