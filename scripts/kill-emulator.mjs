import { execFileSync } from 'node:child_process'

const emulatorPorts = [4000, 4400, 4500, 8080, 9099, 9150, 9199]
const emulatorCommandPattern =
  /(firebase.*emulators:start|firebase-tools|cloud-firestore-emulator|firestore.*emulator|firebase.*emulator)/i

function listPidsOnPort(port) {
  try {
    const output = execFileSync('lsof', ['-nP', '-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
    })

    return output
      .split('\n')
      .map((pid) => Number(pid.trim()))
      .filter(Number.isInteger)
  } catch {
    return []
  }
}

function commandForPid(pid) {
  try {
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return ''
  }
}

const candidates = new Map()

for (const port of emulatorPorts) {
  for (const pid of listPidsOnPort(port)) {
    const current = candidates.get(pid) ?? { command: commandForPid(pid), ports: [] }
    current.ports.push(port)
    candidates.set(pid, current)
  }
}

if (candidates.size === 0) {
  console.log('no emulator processes running')
  process.exit(0)
}

let killed = 0

for (const [pid, { command, ports }] of candidates) {
  const portList = ports.join(',')

  if (!emulatorCommandPattern.test(command)) {
    console.log(`skipped pid ${pid} on port(s) ${portList}: ${command || 'unknown command'}`)
    continue
  }

  try {
    process.kill(pid, 'SIGTERM')
    killed += 1
    console.log(`stopped emulator pid ${pid} on port(s) ${portList}`)
  } catch (_error) {
    console.log(`could not stop pid ${pid} on port(s) ${portList}`)
  }
}

if (killed === 0) {
  console.log('no matching Firebase emulator processes stopped')
}
