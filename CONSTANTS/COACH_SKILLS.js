// Coach "carta de habilidades" schema. Single source of truth.
// Add/edit a dimension or option here — the editor and athlete view
// render dynamically from this array. One option selected per dimension.
const COACH_SKILLS = [
  {
    key: 'experiencia',
    label: 'Experiencia',
    options: [
      { value: 'principiantes', label: 'Principiantes' },
      { value: 'amateur', label: 'Amateur' },
      { value: 'profesional', label: 'Profesional' },
    ],
  },
  {
    key: 'tiempoEnsenanza',
    label: 'Tiempo de enseñanza',
    options: [
      { value: 'metodica', label: 'Metódica' },
      { value: 'holistica', label: 'Holística' },
      { value: 'mixta', label: 'Mixta' },
    ],
  },
  {
    key: 'metodologia',
    label: 'Metodología',
    options: [
      { value: 'libre', label: 'Libre' },
      { value: 'sensorial', label: 'Sensorial' },
      { value: 'didactica', label: 'Didáctica' },
      { value: 'porObjetivos', label: 'Por objetivos' },
    ],
  },
  {
    key: 'personalidad',
    label: 'Personalidad',
    options: [
      { value: 'firme', label: 'Firme' },
      { value: 'comprensiva', label: 'Comprensiva' },
      { value: 'adaptable', label: 'Adaptable' },
      { value: 'intensa', label: 'Intensa' },
    ],
  },
  {
    key: 'paciencia',
    label: 'Paciencia',
    options: [
      { value: 'poca', label: 'Poca' },
      { value: 'suficientePrincipiantes', label: 'Suficiente para principiantes' },
      { value: 'muchaConMiedo', label: 'Mucha para personas con miedo' },
    ],
  },
]

export default COACH_SKILLS
