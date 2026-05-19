'use client'
import { PhoneField, SelectField, TextField } from '@comps/Inputs/FormFields'
import RichTextArea from '@comps/Inputs/RichTextArea'
import SaveButton from '@comps/SaveButton'
import { useEffect, useMemo, useState } from 'react'
import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp, FaYoutube } from 'react-icons/fa6'
import { FiGlobe, FiLink, FiPlus, FiTrash2 } from 'react-icons/fi'
import type {
  CoachPublicLink,
  CoachPublicLinkKind,
  CoachSocial,
} from '@/firebase/coaches/coach.model'
import { useAutosave } from '@/hooks/useAutosave'
import ProfileSection from './ProfileSection'

const LINK_OPTIONS: {
  kind: CoachPublicLinkKind
  label: string
  placeholder: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { kind: 'whatsapp', label: 'WhatsApp', placeholder: '+52 644 123 4567', icon: FaWhatsapp },
  {
    kind: 'youtube',
    label: 'Canal de YouTube',
    placeholder: 'youtube.com/@tu-canal',
    icon: FaYoutube,
  },
  {
    kind: 'instagram',
    label: 'Instagram',
    placeholder: 'instagram.com/tuusuario',
    icon: FaInstagram,
  },
  { kind: 'facebook', label: 'Facebook', placeholder: 'facebook.com/tuperfil', icon: FaFacebookF },
  { kind: 'tiktok', label: 'TikTok', placeholder: 'tiktok.com/@tuusuario', icon: FaTiktok },
  { kind: 'website', label: 'Sitio web', placeholder: 'tusitio.com', icon: FiGlobe },
  { kind: 'other', label: 'Otro enlace', placeholder: 'https://...', icon: FiLink },
]

interface LinksValue {
  bio?: string
  publicLinks?: CoachPublicLink[]
  socials?: CoachSocial[]
}

function fromLegacySocials(socials: CoachSocial[] = []): CoachPublicLink[] {
  return socials.map((social) => ({
    kind: (LINK_OPTIONS.find((option) => option.kind === social.type)?.kind ||
      'other') as CoachPublicLinkKind,
    value: social.url,
  }))
}

function optionFor(kind: CoachPublicLinkKind) {
  return LINK_OPTIONS.find((option) => option.kind === kind) ?? LINK_OPTIONS[6]
}

export default function LinksCard({
  value,
  saving,
  onSave,
}: {
  value: LinksValue
  saving: boolean
  onSave: (v: LinksValue) => void
}) {
  const initialLinks = useMemo(
    () => value.publicLinks || fromLegacySocials(value.socials),
    [value.publicLinks, value.socials]
  )
  const [bio, setBio] = useState(value.bio || '')
  const [links, setLinks] = useState<CoachPublicLink[]>(initialLinks)

  useEffect(() => setBio(value.bio || ''), [value.bio])
  useEffect(() => setLinks(initialLinks), [initialLinks])

  const { status: autoStatus, saveNow } = useAutosave(JSON.stringify({ bio, links }), () =>
    onSave({ bio, publicLinks: links })
  )

  return (
    <ProfileSection
      title="Presentación y enlaces"
      description="Una bio breve y los canales donde un atleta puede conocerte o contactarte."
      summary={`${bio ? 'Bio lista' : 'Sin bio'} · ${links.length} ${links.length === 1 ? 'enlace' : 'enlaces'}`}
    >
      <RichTextArea
        label="Bio corta"
        helperText="Una frase breve suele leerse mejor que un párrafo largo."
        maxLength={180}
        placeholder="Ej. Entreno nadadores principiantes y de aguas abiertas con sesiones claras, progresivas y humanas."
        value={bio}
        onChange={(event) => setBio(event.target.value)}
      />

      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--c-ocean)]">Enlaces y contactos</h3>
          <p className="text-sm text-[var(--c-text-2)]">
            WhatsApp, redes sociales, canal o cualquier enlace útil.
          </p>
        </div>

        {links.map((link, index) => {
          const option = optionFor(link.kind)
          const LinkIcon = option.icon
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: stored public links do not include ids.
              key={`${link.kind}-${index}`}
              className="grid gap-3 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-bg)] p-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-1 text-xs font-bold text-[var(--c-ocean-mid)]">
                  <LinkIcon className="h-4 w-4" />
                </span>
                <SelectField
                  label="Tipo de enlace"
                  hideLabel
                  className="pl-14"
                  value={link.kind}
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              kind: event.target.value as CoachPublicLinkKind,
                            }
                          : item
                      )
                    )
                  }
                >
                  {LINK_OPTIONS.map((item) => (
                    <option key={item.kind} value={item.kind}>
                      {item.label}
                    </option>
                  ))}
                </SelectField>
              </div>

              {link.kind === 'whatsapp' ? (
                <PhoneField
                  label=""
                  placeholder="WhatsApp"
                  value={link.value}
                  onChange={(nextValue) =>
                    setLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, value: nextValue } : item
                      )
                    )
                  }
                />
              ) : (
                <TextField
                  label={option.label}
                  hideLabel
                  placeholder={option.placeholder}
                  value={link.value}
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, value: event.target.value } : item
                      )
                    )
                  }
                />
              )}

              <button
                type="button"
                aria-label={`Quitar enlace ${index + 1}`}
                className="btn btn-ghost justify-self-end sm:justify-self-auto"
                onClick={() =>
                  setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <FiTrash2 />
              </button>
            </div>
          )
        })}

        <button
          type="button"
          className="btn btn-ghost self-start"
          onClick={() => setLinks((current) => [...current, { kind: 'whatsapp', value: '' }])}
        >
          <FiPlus /> Agregar enlace o contacto
        </button>
      </div>

      <div className="flex justify-end border-t border-[var(--c-border)] pt-5">
        <SaveButton
          status={saving ? 'saving' : autoStatus}
          onClick={saveNow}
          idleLabel="Guardado"
          savedLabel="Guardado"
        />
      </div>
    </ProfileSection>
  )
}
