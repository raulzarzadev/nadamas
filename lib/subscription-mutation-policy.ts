/** School actions that expand operation; reads and existing commitments remain available. */
export function schoolMutationRequiresSubscription(method: string, pathname: string) {
  const path = pathname.replace(/^\/api\/schools\/[^/]+\//, '')
  if (method === 'POST')
    return /^(students(?:\/quick|\/[^/]+\/classes)?|classes|class-requests|invitations|access-requests|agenda\/assignments|teachers\/[^/]+\/schedule|classes\/[^/]+\/students)$/.test(
      path
    )
  if (method === 'PUT') return path === 'availability'
  return false
}

/** Each existing release can fund only one replacement for the same school/student. */
export function newReservationSchoolIds(
  events: readonly { scope: string; studentId: string; action: string }[]
) {
  const releases = new Map<string, number>()
  for (const event of events.filter((item) => item.action === 'release')) {
    const key = `${event.scope}|${event.studentId}`
    releases.set(key, (releases.get(key) || 0) + 1)
  }
  const schools = new Set<string>()
  for (const event of events.filter(
    (item) => item.action === 'reserve' && item.scope.startsWith('school:')
  )) {
    const key = `${event.scope}|${event.studentId}`
    const remaining = releases.get(key) || 0
    if (remaining) releases.set(key, remaining - 1)
    else schools.add(event.scope.slice(7))
  }
  return [...schools]
}
