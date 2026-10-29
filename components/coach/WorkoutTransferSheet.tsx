'use client'

import { useState } from 'react'
import { FiCheck, FiCopy, FiDownload, FiUpload } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import type { ObjectiveWorkout } from '@/lib/training-planner'
import {
  exportWorkoutText,
  importWorkoutText,
  WORKOUT_IMPORT_ERROR,
  WORKOUT_TEXT_HEADER,
  WORKOUT_TEXT_LIMIT,
} from '@/lib/workout-transfer'

export default function WorkoutTransferSheet({
  workout,
  allowImport,
  disabled,
  onClose,
  onImport,
  maxImportBlocks,
}: {
  workout?: ObjectiveWorkout
  allowImport: boolean
  disabled: boolean
  onClose: () => void
  onImport: (workout: ObjectiveWorkout) => void
  maxImportBlocks?: number
}) {
  const [mode, setMode] = useState<'export' | 'import'>(workout ? 'export' : 'import')
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const output = workout ? exportWorkoutText(workout) : ''
  const actionClass =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-(--c-aqua-strong) focus-visible:ring-inset disabled:opacity-40'
  return (
    <Sheet
      open
      onClose={onClose}
      label="Exportar / importar entreno"
      keyboardAware
      size="lg"
      footer={
        mode === 'export' ? (
          <button
            type="button"
            disabled={!workout || disabled}
            className={`${actionClass} w-full bg-(--c-ocean) text-white`}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(output)
                setCopied(true)
                setError('')
              } catch {
                setError('No pudimos copiarlo. Selecciona el texto y cópialo manualmente.')
              }
            }}
          >
            {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
            {copied ? 'Copiado' : 'Copiar texto'}
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || !allowImport || !input.trim()}
            className={`${actionClass} w-full bg-(--c-ocean) text-white`}
            onClick={() => {
              try {
                const imported = importWorkoutText(input)
                if (maxImportBlocks !== undefined && imported.blocks.length > maxImportBlocks) {
                  setError(`Puedes agregar hasta ${maxImportBlocks} bloques más.`)
                  return
                }
                onImport(imported)
              } catch {
                setError(WORKOUT_IMPORT_ERROR)
              }
            }}
          >
            <FiUpload aria-hidden="true" />
            Importar como nuevo entreno
          </button>
        )
      }
    >
      <div className="grid min-w-0 gap-4 pb-4">
        <h2 className="text-xl font-bold">Exportar / importar entreno</h2>
        <fieldset aria-label="Acción de transferencia" className="flex gap-2">
          <button
            type="button"
            disabled={!workout}
            aria-pressed={mode === 'export'}
            onClick={() => {
              setMode('export')
              setError('')
            }}
            className={`${actionClass} border border-(--c-border) ${mode === 'export' ? 'bg-(--c-ocean) text-white' : 'bg-white text-(--c-ocean)'}`}
          >
            <FiDownload aria-hidden="true" />
            Exportar
          </button>
          {allowImport && (
            <button
              type="button"
              aria-pressed={mode === 'import'}
              onClick={() => {
                setMode('import')
                setError('')
              }}
              className={`${actionClass} border border-(--c-border) ${mode === 'import' ? 'bg-(--c-ocean) text-white' : 'bg-white text-(--c-ocean)'}`}
            >
              <FiUpload aria-hidden="true" />
              Importar
            </button>
          )}
        </fieldset>
        <p className="text-sm leading-relaxed text-(--c-text-2)">
          {mode === 'export'
            ? 'Copia esta ficha para pegarla en una hoja o documento, o en Importar desde otra sesión. Incluye bloques, series, pausas y observaciones.'
            : 'Pega la ficha completa, desde la cabecera hasta FIN DEL ENTRENO. También se acepta el formato anterior. Se añadirá como un entreno nuevo.'}
        </p>
        <label className="grid min-w-0 gap-2 text-sm font-semibold">
          {mode === 'export' ? 'Texto del entreno' : 'Texto para importar'}
          <textarea
            rows={5}
            readOnly={mode === 'export'}
            disabled={disabled}
            value={mode === 'export' ? output : input}
            maxLength={WORKOUT_TEXT_LIMIT}
            onChange={(event) => {
              setInput(event.target.value)
              setError('')
            }}
            placeholder={`Pega aquí el texto que comienza con ${WORKOUT_TEXT_HEADER}`}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="box-border min-h-40 max-h-80 w-full min-w-0 max-w-full resize-none overflow-y-auto rounded-xl border border-(--c-border) bg-white p-3 font-mono text-sm leading-relaxed outline-none [field-sizing:content] focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset"
          />
        </label>
        {mode === 'import' && (
          <p className="text-xs text-(--c-text-2)">
            Después de importar, guarda tus cambios para conservarlos.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}
