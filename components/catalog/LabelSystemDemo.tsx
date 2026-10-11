'use client'
import { useState } from 'react'
import StudentLabelColorSelector from '@/components/coach/StudentLabelColorSelector'
import LabelChip, { type ColorLabel } from '@/components/ui/label-chip'
import LabelFilterBar from '@/components/ui/label-filter-bar'
import Sheet from '@/components/ui/sheet'

export default function LabelSystemDemo() {
  const [labels, setLabels] = useState<ColorLabel[]>([
    { id: 'team', name: 'Equipo', color: 'amber' },
    { id: 'payment', name: 'Falta pago', color: 'blue' },
    { id: 'new', name: 'Nuevos', color: 'green' },
  ])
  const [selected, setSelected] = useState('')
  const [assigned, setAssigned] = useState(['team', 'new'])
  const [editor, setEditor] = useState<ColorLabel | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('blue')
  function edit(label: ColorLabel) {
    setEditor(label)
    setName(label.name)
    setColor(label.color || 'blue')
  }
  function save() {
    if (!editor || !name.trim()) return
    const label = { ...editor, name: name.trim(), color }
    setLabels((current) =>
      current.some((item) => item.id === label.id)
        ? current.map((item) => (item.id === label.id ? label : item))
        : [...current, label]
    )
    setAssigned((current) => [...new Set([...current, label.id])])
    setEditor(null)
  }
  return (
    <div className="grid gap-4">
      <p className="text-sm text-(--c-text-2)">
        Selecciona un filtro, crea o edita etiquetas y quítalas del perfil de ejemplo. Esta
        demostración conserva los cambios solo mientras está abierta.
      </p>
      <LabelFilterBar
        labels={labels}
        value={selected}
        onChange={setSelected}
        total={3}
        counts={{ team: 2, payment: 1, new: 1 }}
        onCreate={() => edit({ id: `demo-${Date.now()}`, name: '', color: 'blue' })}
        onEdit={edit}
      />
      <div className="rounded-xl border border-(--c-border) p-3">
        <p className="mb-2 text-sm font-semibold">Etiquetas del atleta</p>
        <div className="flex flex-wrap gap-1.5">
          {labels
            .filter((label) => assigned.includes(label.id))
            .map((label) => (
              <LabelChip
                key={label.id}
                label={label}
                onRemove={() => setAssigned((current) => current.filter((id) => id !== label.id))}
              />
            ))}
          {!assigned.length && <span className="text-xs">Sin etiquetas</span>}
        </div>
        <p className="mb-2 mt-3 text-xs text-(--c-text-2)">Versión pequeña para listas</p>
        <div className="flex gap-1.5">
          {labels
            .filter((label) => assigned.includes(label.id))
            .map((label) => (
              <LabelChip key={label.id} label={label} size="tiny" />
            ))}
        </div>
      </div>
      {editor && (
        <Sheet
          open
          label={editor.name ? 'Editar etiqueta' : 'Crear etiqueta'}
          onClose={() => setEditor(null)}
          keyboardAware
        >
          <form
            className="grid min-w-0 gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
          >
            <h2 className="text-xl font-bold">
              {editor.name ? 'Editar etiqueta' : 'Crear etiqueta'}
            </h2>
            <label className="grid gap-1 text-sm font-semibold">
              Nombre de la etiqueta
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                required
                className="h-11 min-w-0 w-full rounded-xl border border-(--c-border) bg-white px-3"
              />
            </label>
            <StudentLabelColorSelector value={color} onChange={setColor} />
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              Guardar etiqueta
            </button>
          </form>
        </Sheet>
      )}
    </div>
  )
}
