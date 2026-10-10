import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? files(path) : /\.[jt]sx?$/.test(entry.name) ? [path] : []
  })
}
function literal(node) {
  return node && ts.isStringLiteralLike(node) ? node.text : undefined
}
function fields(node) {
  if (literal(node)) return [literal(node)]
  if (node && ts.isConditionalExpression(node))
    return [...fields(node.whenTrue), ...fields(node.whenFalse)]
  return []
}
export function queryInventory(root = process.cwd()) {
  const queries = [],
    unresolved = []
  let filterCalls = 0
  for (const path of ['app', 'components', 'context', 'firebase', 'lib'].flatMap((part) =>
    files(join(root, part))
  )) {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    )
    function visit(node) {
      if (ts.isCallExpression(node)) {
        const method = ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : node.expression.getText(source)
        if (method === 'where' || method === 'orderBy') filterCalls++
        // Inspect terminal chained queries, not every intermediate where().
        if (
          !(ts.isPropertyAccessExpression(node.parent) && ts.isCallExpression(node.parent.parent))
        ) {
          const steps = []
          let current = node
          while (
            ts.isCallExpression(current) &&
            ts.isPropertyAccessExpression(current.expression)
          ) {
            steps.unshift({ method: current.expression.name.text, args: current.arguments })
            current = current.expression.expression
          }
          const filters = steps.filter((step) => step.method === 'where')
          const orders = steps.filter((step) => step.method === 'orderBy')
          if (filters.length || orders.length) {
            const location = `${path.slice(root.length + 1)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`
            const collection = steps.find((step) => step.method === 'collection')
            if (
              !collection ||
              !literal(collection.args[0]) ||
              filters.some((step) => !fields(step.args[0]).length)
            ) {
              unresolved.push({
                location,
                text: node.getText(source).replace(/\s+/g, ' ').slice(0, 220),
              })
            } else {
              let shapes = [
                { collection: literal(collection.args[0]), filters: [], orders: [], location },
              ]
              for (const filter of filters)
                shapes = shapes.flatMap((shape) =>
                  fields(filter.args[0]).map((field) => ({
                    ...shape,
                    filters: [...shape.filters, { field, op: literal(filter.args[1]) }],
                  }))
                )
              for (const order of orders)
                shapes = shapes.map((shape) => ({
                  ...shape,
                  orders: [
                    ...shape.orders,
                    { field: literal(order.args[0]), direction: literal(order.args[1]) || 'asc' },
                  ],
                }))
              queries.push(...shapes)
            }
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  // These queries are intentionally built in variables or modular client wrappers.
  for (const collection of ['paymentOrders', 'paymentMovements', 'paymentReservations']) {
    for (const student of [false, true])
      queries.push({
        collection,
        filters: [
          { field: 'scope', op: '==' },
          ...(student ? [{ field: 'studentId', op: 'in' }] : []),
          ...(collection === 'paymentReservations' ? [{ field: 'state', op: '==' }] : []),
        ],
        orders: [
          { field: collection === 'paymentReservations' ? 'date' : 'createdAt', direction: 'desc' },
        ],
        location: 'lib/server/payments/reads.ts:21',
      })
  }
  queries.push({
    collection: 'posts',
    filters: [{ field: 'teamId', op: '==' }],
    orders: [{ field: 'createdAt', direction: 'desc' }],
    location: 'firebase/posts/main.ts:14',
  })
  for (const field of ['coachId', 'athleteId'])
    queries.push({
      collection: 'privateClassEvaluations',
      filters: [{ field, op: '==' }],
      orders: [],
      location: 'lib/server/class-evaluations.ts:34',
    })
  for (const field of ['coachId', 'athleteId'])
    queries.push({
      collection: 'bookings',
      filters: [{ field, op: '==' }],
      orders: [],
      location: 'lib/server/calendar-feeds.ts:109',
    })
  for (const field of ['recipientId', 'actorId'])
    queries.push({
      collection: 'notifications',
      filters: [{ field, op: '==' }],
      orders: [],
      location: 'firebase/notifications/main.ts:11',
    })
  for (const kind of ['coach', 'athlete'])
    queries.push({
      collection: 'users',
      filters: [{ field: `slugs.${kind}`, op: '==' }],
      orders: [],
      location: 'lib/server/slugs.ts:29',
    })
  queries.push({
    collection: 'notifications',
    filters: [
      { field: 'recipientId', op: '==' },
      { field: 'readAt', op: '==' },
    ],
    orders: [],
    location: 'app/api/notifications/read/route.ts:26',
  })
  for (const collection of [
    'events',
    'entries',
    'teams',
    'atheltes',
    'athletes',
    'records',
    'records_V2',
    'results',
    'questions',
    'posts',
  ])
    queries.push({
      collection,
      filters: [{ field: 'userId', op: '==' }],
      orders: [],
      location: 'app/api/admin/users/[id]/route.ts:179',
    })
  for (const [collection, field, op] of [
    ['entries', 'options.isPublic', '=='],
    ['records', 'athleteId', '=='],
    ['records', 'athlete.id', '=='],
    ['results', 'athlete.id', '=='],
    ['teams', 'isPublic', '=='],
    ['teams', 'members', 'array-contains'],
  ])
    queries.push({
      collection,
      filters: [{ field, op }],
      orders: [],
      location: 'firebase (modular client queries)',
    })
  const unique = new Map()
  for (const query of queries) {
    const key = JSON.stringify([query.collection, query.filters, query.orders])
    if (!unique.has(key)) unique.set(key, query)
  }
  return { filterCalls, queries: [...unique.values()], unresolved }
}
export function requiredComposite(query) {
  const equal = query.filters
    .filter((filter) => ['==', 'in'].includes(filter.op))
    .map((filter) => filter.field)
  const other = query.filters
    .filter((filter) => !['==', 'in'].includes(filter.op))
    .map((filter) => filter.field)
  const ordered = query.orders.map((order) => order.field)
  return (
    new Set([...equal, ...other, ...ordered]).size > 1 && (other.length > 0 || ordered.length > 0)
  )
}
export function indexSupports(index, query) {
  if (index.collectionGroup !== query.collection || index.queryScope !== 'COLLECTION') return false
  const equal = query.filters
    .filter((filter) => ['==', 'in'].includes(filter.op))
    .map((filter) => filter.field)
  const range = query.filters
    .filter((filter) => !['==', 'in'].includes(filter.op))
    .map((filter) => filter.field)
  const orders = query.orders.length
    ? query.orders
    : range.map((field) => ({ field, direction: 'asc' }))
  const prefix = equal.filter((field) => !orders.some((order) => order.field === field))
  const fields = index.fields.filter((field) => field.fieldPath !== '__name__')
  return (
    fields.length === prefix.length + orders.length &&
    prefix.every((field) =>
      fields.slice(0, prefix.length).some((item) => item.fieldPath === field)
    ) &&
    orders.every(
      (order, i) =>
        fields[prefix.length + i]?.fieldPath === order.field &&
        fields[prefix.length + i]?.order ===
          (order.direction === 'desc' ? 'DESCENDING' : 'ASCENDING')
    )
  )
}
