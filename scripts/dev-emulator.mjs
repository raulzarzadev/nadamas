import { spawn } from 'node:child_process'
import net from 'node:net'

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const requiredPorts = [
  { name: 'Firestore', port: 8080 },
  { name: 'Auth', port: 9099 },
  { name: 'Storage', port: 9199 },
]

const children = new Set()
let shuttingDown = false

function run(args) {
  const child = spawn(pnpm, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })

  children.add(child)
  child.once('exit', (code, signal) => {
    children.delete(child)
    if (!shuttingDown && code !== 0) {
      shutdown(code ?? (signal ? 1 : 0))
    }
  })

  return child
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(250)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

async function waitForEmulators(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const checks = await Promise.all(requiredPorts.map(({ port }) => canConnect(port)))
    if (checks.every(Boolean)) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  const ports = requiredPorts.map(({ name, port }) => `${name} ${port}`).join(', ')
  throw new Error(`Firebase emulators did not become ready in time: ${ports}`)
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of children) {
    child.kill('SIGINT')
  }

  setTimeout(() => process.exit(code), 500).unref()
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

run(['emu'])

try {
  await waitForEmulators()
  run(['dev:emu:app'])
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not start Firebase emulators')
  shutdown(1)
}
