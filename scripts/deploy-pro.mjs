import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const project = 'nadamas-b1ecf'

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}

const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
if (status.error) throw status.error
if (status.status !== 0) process.exit(status.status || 1)
if (status.stdout.trim()) {
  console.error('deploy:pro requiere un árbol de trabajo limpio.')
  process.exit(1)
}

const branch = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' })
if (branch.error) throw branch.error
if (branch.stdout.trim() !== 'main') {
  console.error('deploy:pro solo despliega la rama main.')
  process.exit(1)
}

const firestoreTargets = existsSync('firestore.indexes.json')
  ? 'firestore:rules,firestore:indexes'
  : 'firestore:rules'

if (firestoreTargets === 'firestore:rules') {
  console.log('No se encontró firestore.indexes.json; se omite el despliegue de índices.')
}

run('pnpm', ['exec', 'firebase', 'deploy', '--only', firestoreTargets, '--project', project])
run('git', ['push', 'origin', 'main'])

console.log('\nProducción desplegada: Firebase y main enviados correctamente.')
