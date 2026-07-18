export interface ProgressScaleOption {
  value: number
  label: string
  emoji?: string
}

export const PROGRESS_LEVELS: ProgressScaleOption[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]

export const PROGRESS_SUBLEVELS: ProgressScaleOption[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]

export const PROGRESS_RESULTS: Required<ProgressScaleOption>[] = [
  { value: 1, label: 'Triste', emoji: '😢' },
  { value: 2, label: 'Enojado', emoji: '😠' },
  { value: 3, label: 'Neutro', emoji: '😐' },
  { value: 4, label: 'Feliz', emoji: '😊' },
]

export function progressResultEmoji(value: number | undefined) {
  return PROGRESS_RESULTS.find((item) => item.value === value)?.emoji || ''
}
