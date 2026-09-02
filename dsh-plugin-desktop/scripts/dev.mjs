import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const environment = { ...process.env }
environment.DSH_HOME ??= join(homedir(), '.zenwit-dev')

const child = spawn(process.execPath, ['lib/bin.js'], {
  cwd: new URL('..', import.meta.url),
  env: environment,
  stdio: 'inherit',
})

child.once('error', cause => {
  process.stderr.write(`dsh-plugin-desktop: development launch failed: ${cause.message}\n`)
  process.exitCode = 1
})
child.once('exit', (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal)
    return
  }
  process.exitCode = code ?? 1
})
