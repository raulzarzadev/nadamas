import type { OnboardingInput } from '@/lib/onboarding/model'
import type { RoleName } from '@/lib/roles'
export interface SetupAction {
  title: string
  description: string
  href: string
  role: RoleName
}
export interface SetupPath {
  id: string
  title: string
  introduction: string
  actions: SetupAction[]
}
export function setupPaths(input: OnboardingInput): SetupPath[] {
  const paths: SetupPath[] = []
  if (input.interests.includes('swimmer'))
    paths.push({
      id: 'swimmer',
      title: 'Como nadador',
      introduction:
        'Encuentra con quién nadar y qué entrenar. Tus clases y tu progreso se reúnen en tu perfil.',
      actions: [
        {
          title: 'Buscar un profe',
          description: 'Conoce entrenadores y elige quién te acompaña.',
          href: '/athlete/search',
          role: 'athlete',
        },
        {
          title: 'Encontrar una escuela',
          description: 'Explora escuelas y sus horarios disponibles.',
          href: '/athlete/search?school',
          role: 'athlete',
        },
        {
          title: 'Elegir un entreno',
          description: 'Encuentra un plan para seguir desde tu perfil.',
          href: '/athlete/search?plans',
          role: 'athlete',
        },
      ],
    })
  if (input.interests.includes('coach'))
    paths.push({
      id: 'coach',
      title: 'Como entrenador',
      introduction:
        input.coachContext === 'school'
          ? 'Prepara tu perfil y pide al coordinador una invitación como profesor de su escuela.'
          : 'Prepara tu espacio, invita a tus atletas y comparte tu perfil.',
      actions: [
        {
          title: 'Crear mi perfil de entrenador',
          description: 'Presenta tu experiencia, especialidades y contacto.',
          href: '/coach/coach-profile',
          role: 'coach',
        },
        ...(input.coachContext !== 'school'
          ? [
              {
                title: 'Configurar mis horarios',
                description: 'Organiza las clases que quieres ofrecer.',
                href: '/coach/agenda',
                role: 'coach' as const,
              },
              {
                title: 'Crear mis planes',
                description: 'Prepara entrenamientos para tus atletas.',
                href: '/coach/training',
                role: 'coach' as const,
              },
              {
                title: 'Invitar a mis atletas',
                description: 'Añade a tus alumnos y comparte tu espacio.',
                href: '/coach/students',
                role: 'coach' as const,
              },
            ]
          : []),
        ...(input.coachContext !== 'independent'
          ? [
              {
                title: 'Vincularme a mi escuela',
                description: 'Revisa tus invitaciones; el coordinador te agrega como profesor.',
                href: '/notifications',
                role: 'coach' as const,
              },
            ]
          : []),
      ],
    })
  if (input.interests.includes('coordinator'))
    paths.push({
      id: 'coordinator',
      title: 'Como coordinador',
      introduction:
        'Crea tu escuela y reúne al equipo. Una suscripción incluye a todos tus profes.',
      actions: [
        {
          title: 'Crear mi escuela',
          description: 'La primera escuela de su propietario tiene 15 días de prueba.',
          href: '/school/create',
          role: 'school',
        },
        {
          title: 'Configurar un plan de pago',
          description: 'Define paquetes y mensualidades para tus alumnos.',
          href: '/school/payments',
          role: 'school',
        },
        {
          title: 'Crear horarios de clases',
          description: 'Organiza los días, horas y grupos de tu escuela.',
          href: '/school/classes',
          role: 'school',
        },
        {
          title: 'Agregar a mis profes',
          description: 'Invita a tu equipo después de configurar planes y horarios.',
          href: '/school/coaches',
          role: 'school',
        },
        {
          title: 'Agregar a mis alumnos',
          description: 'Incorpora alumnos y asígnalos a sus clases.',
          href: '/school/students',
          role: 'school',
        },
      ],
    })
  return paths
}
