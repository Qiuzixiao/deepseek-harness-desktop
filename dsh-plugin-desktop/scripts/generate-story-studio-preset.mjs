import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const require = createRequire(import.meta.url)
const dshRoot = dirname(require.resolve('@deepseek-ai/dsh/package.json'))
const standardPath = join(dshRoot, 'config', 'agent-presets', 'standard', 'agent.cordis.yml')
const personaPath = join(packageRoot, 'resources', 'story-studio', 'persona.md')
const outputPath = join(packageRoot, 'resources', 'agent-presets', 'story-studio', 'agent.cordis.yml')

const standard = await readFile(standardPath, 'utf8')
const persona = (await readFile(personaPath, 'utf8')).trim()
const indentedPersona = persona.split('\n').map(line => `      ${line}`).join('\n')

const personaPattern = /- id: persona\n[\s\S]*?\n- id: agent-instructions/u
const skillPattern = /- id: skill-filesystem\n  name: '@deepseek-ai\/dsh-skill-filesystem'\n/u

if (!personaPattern.test(standard)) throw new Error('the shipped standard preset persona row changed')
if (!skillPattern.test(standard)) throw new Error('the shipped standard preset skill row changed')

const generated = standard
  .replace(
    personaPattern,
    `- id: persona\n  name: '@deepseek-ai/dsh-persona'\n  config:\n    text: |-\n${indentedPersona}\n\n- id: agent-instructions`,
  )
  .replace(
    skillPattern,
    `- id: skill-filesystem\n  name: '@deepseek-ai/dsh-skill-filesystem'\n  config:\n    customSkillDirs:\n      - !!js "process.getBuiltinModule('node:url').fileURLToPath(new URL('skills/', baseUrl))"\n`,
  )

const contents = `# Generated from the matching @deepseek-ai/dsh standard preset.\n# Run: node scripts/generate-story-studio-preset.mjs\n\n${generated}`
const check = process.argv.includes('--check')

if (check) {
  const current = await readFile(outputPath, 'utf8').catch(() => '')
  if (current !== contents) throw new Error('Story Studio agent.cordis.yml is stale; regenerate it')
} else {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, contents)
}
