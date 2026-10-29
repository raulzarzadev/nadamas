export interface SchoolSetupFacts {
  paymentPlan: boolean
  schedules: boolean
  teachers: boolean
  students: boolean
}
export interface SchoolSetupStep {
  id: string
  title: string
  description: string
  href: string
  complete: boolean
}
export interface SchoolSetupSnapshot {
  schoolId: string
  schoolName: string
  slug: string
  steps: SchoolSetupStep[]
}
export function schoolSetupSteps(facts: SchoolSetupFacts): SchoolSetupStep[] {
  return [
    {
      id: 'school',
      title: 'Crear tu escuela',
      description: 'Tu escuela ya tiene nombre y su propio enlace.',
      href: '/school/settings',
      complete: true,
    },
    {
      id: 'payments',
      title: 'Configurar un plan de pago',
      description: 'Crea al menos un paquete o una mensualidad activa para tus alumnos.',
      href: '/school/payments',
      complete: facts.paymentPlan,
    },
    {
      id: 'schedules',
      title: 'Crear horarios de clases',
      description: 'Organiza los días, horas y grupos de tu escuela.',
      href: '/school/classes',
      complete: facts.schedules,
    },
    {
      id: 'teachers',
      title: 'Agregar a tus profes',
      description: 'Invita a tu equipo. Este paso se completa cuando otro profesor se incorpora.',
      href: '/school/coaches',
      complete: facts.teachers,
    },
    {
      id: 'students',
      title: 'Agregar a tus alumnos',
      description: 'Registra a tus alumnos para incorporarlos a sus clases.',
      href: '/school/students',
      complete: facts.students,
    },
  ]
}
