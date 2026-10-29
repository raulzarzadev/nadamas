'use client'

import { useState } from 'react'

type Node = { title: string; detail: string; source: string }
type Lane = { title: string; nodes: Node[] }
const views: Record<string, { label: string; intro: string; lanes: Lane[] }> = {
  architecture: {
    label: 'Arquitectura',
    intro:
      'Capas principales y caminos de lectura y escritura. Las flechas indican dependencia o paso de datos.',
    lanes: [
      {
        title: 'Entrada y sesión',
        nodes: [
          {
            title: 'Web pública / PWA',
            detail:
              'Marketing y páginas públicas de escuelas, entrenadores y entrenos. La app usa Next.js App Router; el manifiesto permite instalarla como PWA.',
            source: 'app/(marketing) · public/manifest.json',
          },
          {
            title: 'Cuenta y rol',
            detail:
              'Firebase Auth identifica la cuenta. UserProvider y RoleProvider comparten usuario y modo activo; una cuenta puede tener varios roles.',
            source: 'app/providers.tsx · context/RoleContext.tsx',
          },
          {
            title: 'Acceso y navegación',
            detail:
              'AuthGate protege la sesión, RoleGuard restringe coach y admin, y AppChrome presenta navegación y contexto de escuela.',
            source: 'components/app-chrome · app/(app)/auth-gate.tsx',
          },
        ],
      },
      {
        title: 'Operaciones del producto',
        nodes: [
          {
            title: 'Pantallas y componentes',
            detail:
              'Los espacios athlete, coach, school y admin reutilizan editores, modales, perfiles y componentes de agenda.',
            source: 'app/(app) · components',
          },
          {
            title: 'API autenticada y caché',
            detail:
              'getAuthed comparte lecturas por usuario y URL. Los helpers de mutación invalidan caché para actualizar las vistas.',
            source: 'lib/client/authed-api.ts · docs/data-fetching.md',
          },
          {
            title: 'Reglas del servidor',
            detail:
              'Las rutas API validan acceso y delegan operaciones de escuelas, clases, pagos, suscripciones e invitaciones a servicios.',
            source: 'app/api · lib/server',
          },
          {
            title: 'Firebase Admin / Firestore',
            detail:
              'Persistencia del servidor y transacciones para operaciones coordinadas, permisos y pagos.',
            source: 'lib/server/firebase-admin.ts',
          },
        ],
      },
      {
        title: 'Datos en tiempo real y servicios',
        nodes: [
          {
            title: 'Dominios Firebase del cliente',
            detail:
              'También hay lecturas en tiempo real y escrituras mediante wrappers del cliente; por ejemplo, el editor de coach escucha sus perfiles público y privado.',
            source: 'firebase/coaches/main.ts · firebase/FirebaseCRUD.ts',
          },
          {
            title: 'Firestore y Storage',
            detail:
              'Documentos de dominio y archivos de perfiles, galerías y verificación. Conviven los wrappers del cliente y los servicios del servidor.',
            source: 'firebase · lib/server',
          },
          {
            title: 'Servicios externos',
            detail:
              'Stripe procesa tarjeta para suscripciones; Brevo envía correos; web push entrega avisos y PostHog registra analítica.',
            source:
              'lib/server/subscriptions/card.ts · lib/server/brevo.ts · lib/server/web-push.ts · instrumentation-client.ts',
          },
        ],
      },
    ],
  },
  roles: {
    label: 'Funcionalidades',
    intro:
      'Capacidades agrupadas por modo. Los perfiles de nadador y coach pertenecen a la misma cuenta.',
    lanes: [
      {
        title: 'Atleta',
        nodes: [
          {
            title: 'Inicio y búsqueda',
            detail:
              'Descubrir escuelas, entrenadores y entrenos; acceder al perfil y a la credencial.',
            source: 'app/(app)/athlete/home · athlete/search · profile',
          },
          {
            title: 'Horarios y pagos',
            detail: 'Consultar horarios, reservar o solicitar clases y revisar planes y pagos.',
            source: 'app/(app)/athlete/schedule · athlete/payments',
          },
          {
            title: 'Entrenos y progreso',
            detail: 'Consultar entrenos compartidos o de la próxima clase y registros de progreso.',
            source: 'app/(app)/athlete/training · athlete/progress',
          },
        ],
      },
      {
        title: 'Coach',
        nodes: [
          {
            title: 'Perfil profesional',
            detail:
              'Datos personales compartidos con el nadador, biografía profesional, visibilidad, documentos y verificación.',
            source:
              'components/coach/CoachProfileEditor.tsx · components/profile/PersonalProfileCard.tsx',
          },
          {
            title: 'Agenda y alumnos',
            detail:
              'Publicar horarios, gestionar clases, solicitudes, asistencia, notas e historial de alumnos.',
            source: 'app/(app)/coach/agenda · coach/students · lib/server/attendance.ts',
          },
          {
            title: 'Entrenos y planes',
            detail:
              'Organizar macro ciclos y sesiones, editar bloques y series, compartir entrenos y administrar planes de cobro.',
            source: 'app/(app)/coach/training · coach/payments',
          },
        ],
      },
      {
        title: 'Coordinador',
        nodes: [
          {
            title: 'Escuela',
            detail:
              'Crear y configurar datos, instalaciones, apariencia, eventos, enlaces y calendario.',
            source: 'components/school/SchoolSettings.tsx · school/create',
          },
          {
            title: 'Equipo y clases',
            detail:
              'Invitar atletas y entrenadores, administrar alumnos, profesores y horarios de la escuela.',
            source: 'app/(app)/school/students · school/coaches · school/classes',
          },
          {
            title: 'Cobros y suscripción',
            detail:
              'Los cobros de alumnos se administran en Planes y pagos. La suscripción paga el servicio de Nadamas y controla los límites de la escuela.',
            source: 'school/payments · school/subscription · lib/server/subscriptions',
          },
        ],
      },
      {
        title: 'Administrador',
        nodes: [
          {
            title: 'Supervisión',
            detail:
              'Resumen, escuelas, personas, perfiles adicionales, clases y usuarios de la plataforma.',
            source: 'app/(app)/admin · lib/server/admin-overview.ts',
          },
          {
            title: 'Verificación y comunicación',
            detail: 'Revisar identidad de coaches y administrar email marketing.',
            source: 'admin/verify-queue · admin/marketing',
          },
          {
            title: 'Suscripciones y códigos',
            detail:
              'Revisar transferencias, datos bancarios, exenciones, límites personalizados y códigos promocionales con usos.',
            source: 'components/subscriptions/AdminSubscriptions.tsx',
          },
        ],
      },
    ],
  },
  flows: {
    label: 'Flujos',
    intro:
      'Recorridos principales. Cada paso resume una operación; los permisos y estados pueden cambiar las opciones disponibles.',
    lanes: [
      {
        title: 'Entrar a una escuela',
        nodes: [
          {
            title: 'Invitación',
            detail: 'El coordinador invita por correo o comparte el acceso a su escuela.',
            source: 'lib/server/school-invitations.ts',
          },
          {
            title: 'Cuenta y aceptación',
            detail:
              'La persona inicia sesión y acepta. Se valida su identidad y se agrega el rol a su membresía; un atleta también puede ser entrenador.',
            source: 'school/invitations/[token] · athlete/invitations/[token]',
          },
          {
            title: 'Acceso por rol',
            detail:
              'La membresía y el contexto de escuela determinan las pantallas y acciones disponibles.',
            source: 'lib/server/school-access.ts',
          },
        ],
      },
      {
        title: 'De horario a clase',
        nodes: [
          {
            title: 'Publicar horario',
            detail: 'Coach o coordinador configura fechas, horas, profesor y tipo de clase.',
            source: 'coach/agenda · school/classes',
          },
          {
            title: 'Reservar / solicitar',
            detail:
              'El atleta selecciona una clase. Según configuración puede requerir aprobación y disponibilidad.',
            source: 'athlete/schedule · lib/server/bookings.ts · lib/server/school-classes.ts',
          },
          {
            title: 'Entreno y asistencia',
            detail:
              'Se asigna o edita el entreno de la clase y se registra asistencia y seguimiento.',
            source: 'coach/classes/details · lib/server/attendance.ts',
          },
          {
            title: 'Historial y evaluación',
            detail:
              'La actividad alimenta el historial del alumno; la clase puede evaluarse y consultarse desde sus vistas.',
            source: 'lib/server/school-student-history.ts · lib/server/class-evaluations.ts',
          },
        ],
      },
      {
        title: 'Suscripción de escuela',
        nodes: [
          {
            title: 'Código opcional',
            detail:
              'Un código activo con usos disponibles reserva un uso para la escuela y ofrece precio promocional.',
            source: 'lib/server/subscriptions/store.ts',
          },
          {
            title: 'Tarjeta o transferencia',
            detail:
              'Tarjeta abre Stripe. Transferencia genera importe y concepto NM + tres letras de escuela + ocho caracteres hexadecimales.',
            source: 'lib/server/subscriptions/card.ts · store.ts',
          },
          {
            title: 'Confirmación',
            detail:
              'Stripe confirma mediante eventos del proveedor. En transferencia, la escuela reporta y el administrador revisa el ingreso.',
            source: 'app/api/subscriptions · app/api/subscriptions/admin',
          },
          {
            title: 'Acceso y renovación',
            detail:
              'El periodo, la gracia, las exenciones y los límites determinan el acceso y la continuidad del precio.',
            source: 'lib/subscriptions/engine.ts · lib/server/subscriptions/seats.ts',
          },
        ],
      },
    ],
  },
}

export default function AdminAppMap() {
  const [view, setView] = useState('architecture')
  const [selected, setSelected] = useState<Node | null>(null)
  const current = views[view]
  return (
    <div className="grid min-w-0 gap-5 px-3 sm:px-0">
      <header>
        <h1 className="text-2xl font-extrabold">Mapa de Nadamas</h1>
        <p className="mt-2 text-sm text-(--c-text-2)">
          Arquitectura, funcionalidades y recorridos del producto. Selecciona un bloque para ver su
          detalle y ubicación en el código.
        </p>
      </header>
      <nav aria-label="Vistas del mapa" className="flex flex-wrap gap-2">
        {Object.entries(views).map(([key, item]) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => {
              setView(key)
              setSelected(null)
            }}
            className={`min-h-11 rounded-full px-4 text-sm font-bold ${view === key ? 'bg-(--c-ocean) text-white' : 'border border-(--c-border) bg-white'}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <p className="text-sm text-(--c-text-2)">{current.intro}</p>
      {selected && (
        <aside
          className="rounded-xl border border-(--c-aqua-strong) bg-white p-4"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">{selected.title}</h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="min-h-11 px-3 text-sm"
            >
              Cerrar detalle
            </button>
          </div>
          <p className="text-sm leading-relaxed">{selected.detail}</p>
          <p className="mt-3 break-words text-xs text-(--c-text-2)">Código: {selected.source}</p>
        </aside>
      )}
      {current.lanes.map((lane) => (
        <section key={lane.title} className="rounded-2xl border border-(--c-border) bg-white p-4">
          <h2 className="mb-4 font-bold">{lane.title}</h2>
          <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
            {lane.nodes.map((node, index) => (
              <li
                key={node.title}
                className="flex min-w-0 flex-1 flex-col items-stretch gap-2 lg:flex-row"
              >
                <button
                  type="button"
                  aria-pressed={selected === node}
                  onClick={() => setSelected(node)}
                  className={`min-h-20 min-w-0 flex-1 rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) ${selected === node ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-(--c-surface)'}`}
                >
                  <span className="block text-xs opacity-70">{index + 1}</span>
                  <span className="text-sm font-bold">{node.title}</span>
                </button>
                {index < lane.nodes.length - 1 && (
                  <span aria-hidden="true" className="self-center text-xl text-(--c-aqua-strong)">
                    <span className="lg:hidden">↓</span>
                    <span className="hidden lg:inline">→</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
      <p className="text-xs text-(--c-text-2)">
        Mapa documental basado en las rutas y servicios del repositorio. No representa métricas en
        vivo ni todas las variantes de cada flujo.
      </p>
    </div>
  )
}
