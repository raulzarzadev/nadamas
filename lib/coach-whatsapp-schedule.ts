export const DAY_LABELS: Record<string, string> = {
  Lun: 'Lunes',
  Mar: 'Martes',
  Mié: 'Miércoles',
  Jue: 'Jueves',
  Vie: 'Viernes',
  Sáb: 'Sábado',
  Dom: 'Domingo',
}

export const DAY_WHATSAPP_EMOJIS: Record<string, string> = {
  Lun: '🌞',
  Mar: '🌼',
  Mié: '🌻',
  Jue: '🌺',
  Vie: '🪷',
  Sáb: '🌿',
  Dom: '☀️',
}

export type WhatsappScheduleDay = {
  dayKey: string
  dayLabel: string
  times: {
    label: string
    disabled: boolean
    groupType?: string | null
  }[]
}

export function whatsappWeekLabel(date: Date) {
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
}

export function formatWhatsappScheduleText(days: WhatsappScheduleDay[], periodStart: Date) {
  if (days.length === 0) return ''

  const daysText = days
    .map(
      (day) =>
        `${DAY_WHATSAPP_EMOJIS[day.dayKey] || '▫️'} ${day.dayLabel}\n${day.times
          .map((time) => {
            const marker = time.disabled ? '❌' : '▫️'
            const groupLabel = time.groupType === 'grupal' ? ' (Clases grupales)' : ''
            return `${marker} ${time.label}${groupLabel}`
          })
          .join('\n')}`
    )
    .join('\n\n')

  return `📅 HORARIOS DISPONIBLES\nSemana ${whatsappWeekLabel(
    periodStart
  )}\n\n${daysText}\n\n✅ Los espacios se asignan conforme se van reservando.\n💬 Indícame qué día y horario te interesa para agendar tu lugar.\n⏱️ Cancelación mínima de 24 horas para las clases agendadas. En caso contrario se acredita la clase.`
}
