export type SwimEquipment = 'Tabla' | 'Aletas' | 'Paletas' | 'Pull' | 'Snorkel'

const paths: Record<SwimEquipment, string> = {
  Tabla: 'M8 3h8a4 4 0 0 1 4 4v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a4 4 0 0 1 4-4Z M8 8h8 M8 12h8',
  Aletas: 'M6 3h4l1 6-1 11H2L5 9Z M15 3h4l1 6 2 11h-8L14 9Z M5 10h5 M15 10h5',
  Paletas:
    'M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Z M8 10h8 M8 14h8 M8 6v1 M16 6v1 M8 17v1 M16 17v1',
  Pull: 'M7 3c4 0 3 5 5 5s1-5 5-5c3 0 4 4 4 9s-1 9-4 9c-4 0-3-5-5-5s-1 5-5 5c-3 0-4-4-4-9s1-9 4-9Z',
  Snorkel: 'M16 3v12a6 6 0 0 1-12 0v-2h4v2a2 2 0 0 0 4 0V3Z M12 6h4 M4 13H2v4h3',
}

export default function SwimEquipmentIcon({ equipment }: { equipment: SwimEquipment }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={paths[equipment]} />
    </svg>
  )
}
