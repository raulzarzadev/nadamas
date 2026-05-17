'use client'
import { useState } from 'react'
import { CoachCRUD } from '@/firebase/coaches/main'
import type {
  CoachPrivateContact,
  CoachDocument,
} from '@/firebase/coaches/coach.model'

interface PrivateValue {
  privateContacts?: CoachPrivateContact[]
  idDocuments?: CoachDocument[]
  certifications?: CoachDocument[]
}

export default function PrivateCard({
  uid,
  value,
  saving,
  onSave,
}: {
  uid: string
  value: PrivateValue
  saving: boolean
  onSave: (v: PrivateValue) => void
}) {
  const [draft, setDraft] = useState<PrivateValue>(value || {})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadDoc = (
    file: File,
    apply: (doc: CoachDocument) => void,
    tag: string
  ) => {
    setError(null)
    setBusy(tag)
    CoachCRUD.uploadAsset({ file, uid, scope: 'private' }, (p, url) => {
      if (url) {
        apply({ url, name: file.name })
        setBusy(null)
      }
    })
    setTimeout(() => {
      setBusy((b) => {
        if (b === tag) setError('No se pudo subir el archivo. Intenta de nuevo.')
        return b === tag ? null : b
      })
    }, 30000)
  }

  const contacts = draft.privateContacts || []

  return (
    <section className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] shadow-[var(--shadow-sm)] p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--c-ocean-mid)]">
          Verificación (privado)
        </h2>
        <p className="text-sm text-[var(--c-text-2)]">
          Solo para verificación. No visible para atletas.
        </p>
      </div>
      {error && <p className="text-[var(--c-error,#b91c1c)] text-sm">{error}</p>}

      <div className="flex flex-col gap-2">
        <span className="label-text text-[var(--c-text-2)]">
          Contactos privados
        </span>
        {contacts.map((c, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input input-bordered w-1/3"
              placeholder="Tipo (whatsapp…)"
              value={c.type}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.privateContacts || [])]
                  next[i] = { ...next[i], type: e.target.value }
                  return { ...d, privateContacts: next }
                })
              }
            />
            <input
              className="input input-bordered flex-1"
              placeholder="Valor"
              value={c.value}
              onChange={(e) =>
                setDraft((d) => {
                  const next = [...(d.privateContacts || [])]
                  next[i] = { ...next[i], value: e.target.value }
                  return { ...d, privateContacts: next }
                })
              }
            />
            <button
              type="button"
              aria-label={`Quitar contacto ${i + 1}`}
              className="btn btn-ghost"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  privateContacts: (d.privateContacts || []).filter(
                    (_, idx) => idx !== i
                  ),
                }))
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost self-start"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              privateContacts: [
                ...(d.privateContacts || []),
                { type: '', value: '' },
              ],
            }))
          }
        >
          + Agregar contacto
        </button>
      </div>

      <DocList
        label="Documentos de identificación"
        docs={draft.idDocuments || []}
        busy={busy === 'id'}
        onAdd={(f) =>
          uploadDoc(
            f,
            (doc) =>
              setDraft((d) => ({
                ...d,
                idDocuments: [...(d.idDocuments || []), doc],
              })),
            'id'
          )
        }
        onRemove={(i) =>
          setDraft((d) => ({
            ...d,
            idDocuments: (d.idDocuments || []).filter((_, idx) => idx !== i),
          }))
        }
      />

      <DocList
        label="Certificaciones"
        docs={draft.certifications || []}
        busy={busy === 'cert'}
        onAdd={(f) =>
          uploadDoc(
            f,
            (doc) =>
              setDraft((d) => ({
                ...d,
                certifications: [...(d.certifications || []), doc],
              })),
            'cert'
          )
        }
        onRemove={(i) =>
          setDraft((d) => ({
            ...d,
            certifications: (d.certifications || []).filter(
              (_, idx) => idx !== i
            ),
          }))
        }
      />

      <button
        type="button"
        disabled={saving || !!busy}
        onClick={() => onSave(draft)}
        className="btn btn-primary self-start disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar verificación'}
      </button>
    </section>
  )
}

function DocList({
  label,
  docs,
  busy,
  onAdd,
  onRemove,
}: {
  label: string
  docs: CoachDocument[]
  busy: boolean
  onAdd: (f: File) => void
  onRemove: (i: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label-text text-[var(--c-text-2)]">{label}</span>
      <ul className="flex flex-col gap-1">
        {docs.map((doc, i) => (
          <li
            key={doc.url + i}
            className="flex items-center justify-between text-sm text-[var(--c-ocean)]"
          >
            <span className="truncate">{doc.name}</span>
            <button
              type="button"
              aria-label={`Quitar ${label} ${i + 1}`}
              className="btn btn-ghost btn-xs"
              onClick={() => onRemove(i)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        type="file"
        disabled={busy}
        className="file-input file-input-bordered"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onAdd(f)
        }}
      />
    </div>
  )
}
