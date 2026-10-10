import { readFileSync } from 'node:fs'
import { indexSupports, queryInventory, requiredComposite } from './lib/firestore-query-audit.mjs'

const inventory = queryInventory()
const indexes = JSON.parse(readFileSync('firestore.indexes.json', 'utf8')).indexes
const missing = inventory.queries.filter(
  (query) => requiredComposite(query) && !indexes.some((index) => indexSupports(index, query))
)
console.log(JSON.stringify({ ...inventory, indexes: indexes.length, missing }, null, 2))
if (missing.length) process.exitCode = 1
