import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const exec = promisify(execFile)
const root = new URL('../../', import.meta.url)
const script = new URL('dsh-plugin-desktop/resources/agent-presets/story-studio/skills/story-project/scripts/story-project.mjs', root)

test('Story Studio project contract initializes and reports a short-drama project', async () => {
  const home = await mkdtemp(join(tmpdir(), 'story-studio-project-contract-'))
  const project = join(home, 'story')
  const run = async (...args) => exec(process.execPath, [script.pathname, ...args], { encoding: 'utf8' })

  const initialized = JSON.parse((await run('init', project, '--title', '1998父子局', '--medium', 'short-drama')).stdout)
  assert.equal(initialized.ok, true)
  assert.equal(initialized.medium, 'short-drama')
  const validated = JSON.parse((await run('validate', project)).stdout)
  assert.equal(validated.ok, true)
  const status = JSON.parse((await run('status', project)).stdout)
  assert.equal(status.project.title, '1998父子局')
  assert.equal(status.files.characters, 0)
  const brief = await readFile(join(project, '项目说明.md'), 'utf8')
  assert.match(brief, /原始需求/u)
  assert.match(brief, /冲突/u)
  assert.match(brief, /必须保留内容/u)
  assert.match(brief, /禁止内容/u)
  assert.match(await readFile(join(project, '项目配置.yml'), 'utf8'), /title: 1998父子局/u)
})

test('Story Studio project contract keeps Chinese-only ids deterministic', async () => {
  const home = await mkdtemp(join(tmpdir(), 'story-studio-project-id-'))
  const project = join(home, 'story')
  const run = async (...args) => exec(process.execPath, [script.pathname, ...args], { encoding: 'utf8' })
  const first = JSON.parse((await run('init', project, '--title', '父子同心', '--medium', 'short-drama')).stdout)
  assert.match(first.id, /^story-[a-z0-9]+$/u)
  assert.notEqual(first.id, `story-${Date.now()}`)
})
