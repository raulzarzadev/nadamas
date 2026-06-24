// Seeds the Firebase emulators with demo data so the redesigned screens have
// something to render. Run via `pnpm seed` (which sets the emulator host vars).
//
// SAFETY: refuses to run unless FIRESTORE_EMULATOR_HOST is set, so it can never
// write to a real project.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    '✗ Emulator host vars not set. Run `pnpm seed` (starts the emulators first with `pnpm emu`).'
  )
  process.exit(1)
}

const projectId = process.env.GCLOUD_PROJECT || 'nadamas-b1ecf'
const app = initializeApp({ projectId })
const auth = getAuth(app)
const db = getFirestore(app)

const now = Date.now()
const DAY_BY_INDEX = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function dateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function inDays(amount) {
  const d = new Date()
  d.setDate(d.getDate() + amount)
  return d
}

async function upsertAuthUser({ uid, email, password, displayName, photoURL }) {
  try {
    await auth.deleteUser(uid)
  } catch {
    // didn't exist — fine
  }
  await auth.createUser({ uid, email, password, displayName, photoURL, emailVerified: true })
}

function metrics(overrides = {}) {
  return {
    communication: 7,
    energy: 6,
    motivation: 8,
    attention: 7,
    goal: 6,
    methodology: 7,
    planning: 6,
    correction: 8,
    ...overrides,
  }
}

// --- Coaches -------------------------------------------------------------
const COACHES = [
  {
    uid: 'coach-raul',
    name: 'Raúl Zarza',
    email: 'raul@nadamas.test',
    photoURL: 'https://i.pravatar.cc/200?img=12',
    bio: 'Coach de técnica y triatlón. Enfoque en eficiencia y mentalidad de competencia.',
    skills: { experiencia: 'profesional', personalidad: 'firme', metodologia: 'porObjetivos' },
    metrics: metrics({ goal: 9, planning: 8 }),
    whatsapp: '+52 55 1234 5678',
    offerings: [
      {
        id: 'off-raul-particular',
        mode: 'fixed',
        placeName: 'Alberca Olímpica CDMX',
        groupType: 'particular',
        currency: 'MXN',
        unit: 'clase',
        priceCents: 35000,
        schedules: [
          {
            id: 'sch-raul-1',
            timeMode: 'fixed',
            days: ['Lun', 'Mié', 'Vie'],
            startTime: '06:00',
            endTime: '07:00',
            availabilityMode: 'always',
          },
          {
            id: 'sch-raul-2',
            timeMode: 'fixed',
            days: ['Mar', 'Jue'],
            startTime: '07:00',
            endTime: '08:00',
            availabilityMode: 'always',
          },
        ],
      },
      {
        id: 'off-raul-grupal',
        mode: 'fixed',
        placeName: 'Alberca Olímpica CDMX',
        groupType: 'grupal',
        maxPeople: 6,
        currency: 'MXN',
        unit: 'clase',
        priceCents: 18000,
        schedules: [
          {
            id: 'sch-raul-3',
            timeMode: 'fixed',
            days: ['Sáb'],
            startTime: '09:00',
            endTime: '10:30',
            availabilityMode: 'always',
          },
        ],
      },
    ],
  },
  {
    uid: 'coach-ana',
    name: 'Ana Lozano',
    email: 'ana@nadamas.test',
    photoURL: 'https://i.pravatar.cc/200?img=45',
    bio: 'Especialista en aguas abiertas y pérdida del miedo al agua. Paciente y adaptable.',
    skills: { experiencia: 'amateur', personalidad: 'comprensiva', paciencia: 'muchaConMiedo' },
    metrics: metrics({ communication: 9, attention: 9, energy: 5 }),
    whatsapp: '+52 442 222 3344',
    offerings: [
      {
        id: 'off-ana-online',
        mode: 'online',
        onlineDetails: 'Sesión por videollamada',
        groupType: 'particular',
        currency: 'MXN',
        unit: 'sesión',
        priceCents: 22000,
        schedules: [
          {
            id: 'sch-ana-open',
            timeMode: 'open',
            days: [],
            startTime: '',
            endTime: '',
          },
        ],
      },
      {
        id: 'off-ana-home',
        mode: 'home',
        coverageArea: 'Querétaro centro',
        groupType: 'particular',
        currency: 'MXN',
        unit: 'clase',
        priceCents: 40000,
        schedules: [
          {
            id: 'sch-ana-1',
            timeMode: 'fixed',
            days: ['Mié', 'Vie'],
            startTime: '18:00',
            endTime: '19:00',
            availabilityMode: 'always',
          },
        ],
      },
    ],
  },
  {
    uid: 'coach-ivan',
    name: 'Iván Cruz',
    email: 'ivan@nadamas.test',
    photoURL: 'https://i.pravatar.cc/200?img=33',
    bio: 'Velocidad y masters. Entrenos intensos por objetivos medibles.',
    skills: { experiencia: 'profesional', personalidad: 'intensa', tiempoEnsenanza: 'metodica' },
    metrics: metrics({ energy: 9, motivation: 9, correction: 9 }),
    whatsapp: '+52 33 9876 5432',
    offerings: [
      {
        id: 'off-ivan-particular',
        mode: 'fixed',
        placeName: 'Deportivo Sur',
        groupType: 'particular',
        currency: 'MXN',
        unit: 'clase',
        priceCents: 30000,
        schedules: [
          {
            id: 'sch-ivan-1',
            timeMode: 'fixed',
            days: ['Lun', 'Jue'],
            startTime: '19:00',
            endTime: '20:00',
            availabilityMode: 'always',
          },
        ],
      },
    ],
  },
]

// --- Athlete -------------------------------------------------------------
const ATHLETE = {
  uid: 'demo-athlete',
  name: 'Atleta Demo',
  email: 'athlete@nadamas.test',
  password: 'password123',
  photoURL: 'https://i.pravatar.cc/200?img=5',
}

async function seed() {
  console.log(`Seeding emulator project "${projectId}"…`)

  // Athlete auth + user doc
  await upsertAuthUser(ATHLETE)
  await db
    .collection('users')
    .doc(ATHLETE.uid)
    .set({
      id: ATHLETE.uid,
      nickname: ATHLETE.name,
      email: ATHLETE.email,
      photoURL: ATHLETE.photoURL,
      roles: { athlete: true },
      createdAt: now,
      updatedAt: now,
    })

  for (const coach of COACHES) {
    await upsertAuthUser({
      uid: coach.uid,
      email: coach.email,
      password: 'password123',
      displayName: coach.name,
      photoURL: coach.photoURL,
    })

    await db
      .collection('users')
      .doc(coach.uid)
      .set({
        id: coach.uid,
        nickname: coach.name,
        email: coach.email,
        photoURL: coach.photoURL,
        roles: { athlete: true, coach: true },
        createdAt: now,
        updatedAt: now,
      })

    await db
      .collection('coaches')
      .doc(coach.uid)
      .set({
        bio: coach.bio,
        skills: coach.skills,
        metrics: coach.metrics,
        classOfferings: coach.offerings,
        publicLinks: [{ kind: 'whatsapp', value: coach.whatsapp }],
        facePhoto: { url: coach.photoURL },
        galleryPhotos: [{ url: coach.photoURL, label: 'Yo' }],
        publicProfileVisible: true,
        verification: { status: 'verified', autoScore: 82 },
        createdAt: now,
        updatedAt: now,
      })
  }

  // Two demo bookings for the athlete with the first coach (so Mis clases shows data).
  const coach = COACHES[0]
  const offering = coach.offerings[0]
  const schedule = offering.schedules[0]
  const bookingDates = [inDays(2), inDays(5)]

  for (const [index, date] of bookingDates.entries()) {
    const dayLabel = DAY_BY_INDEX[date.getDay()]
    const docId = `booking-demo-${index}`
    await db
      .collection('bookings')
      .doc(docId)
      .set({
        id: docId,
        athleteId: ATHLETE.uid,
        athleteName: ATHLETE.name,
        athleteEmail: ATHLETE.email,
        coachId: coach.uid,
        coachName: coach.name,
        offeringId: offering.id,
        scheduleId: schedule.id,
        date: dateKey(date),
        locationName: offering.placeName,
        mode: offering.mode,
        groupType: offering.groupType,
        days: [dayLabel],
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        price: offering.priceCents / 100,
        priceCents: offering.priceCents,
        currency: 'MXN',
        unit: offering.unit,
        status: 'confirmed',
        source: 'marketplace',
        createdAt: now,
        updatedAt: now,
      })
  }

  // Demo in-app notifications: one unread received + one sent, for the coach and
  // the athlete, so the bell/list have data without performing a real booking.
  const demoNotifications = [
    {
      id: 'notif-demo-coach-1',
      recipientId: coach.uid,
      actorId: ATHLETE.uid,
      actorName: ATHLETE.name,
      type: 'booking_confirmed',
      title: 'Nueva clase agendada',
      body: `${ATHLETE.name} agendó una clase contigo.`,
      link: '/coach/agenda',
      readAt: null,
    },
    {
      id: 'notif-demo-athlete-1',
      recipientId: ATHLETE.uid,
      actorId: coach.uid,
      actorName: coach.name,
      type: 'booking_created_by_coach',
      title: 'Tu coach agendó una clase',
      body: `${coach.name} te agendó una clase.`,
      link: '/athlete/bookings',
      readAt: now,
    },
  ]
  for (const notification of demoNotifications) {
    await db
      .collection('notifications')
      .doc(notification.id)
      .set({ ...notification, createdAt: now })
  }

  console.log('✓ Seed complete:')
  console.log(`  • ${COACHES.length} coaches (public, visible in marketplace)`)
  console.log(`  • athlete: ${ATHLETE.email} / ${ATHLETE.password} (uid ${ATHLETE.uid})`)
  console.log('  • 2 demo bookings for the athlete')
  console.log('  • 2 demo notifications (coach + athlete)')
  console.log('\nEmulator UI: http://127.0.0.1:4000')
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('✗ Seed failed:', error)
    process.exit(1)
  })
