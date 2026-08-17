import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { sha256 } from './plugin-lock.mjs'
import {
  createProfileHome,
  installLockedPlugins,
  readPluginLock,
  removeProfileHome,
  runWebProfile,
} from './profile-harness.mjs'
import {
  createChineseDocxFixture,
  createJpegScanPdf,
  createUnicodeTextPdf,
  jpegDimensions,
  normalizedOcrText,
} from './rich-file-reader-fixtures.mjs'

const EXPECTED_OCR_MARKERS = ['第一集', '父亲', '儿子', '心声']

function flag(name) {
  return process.argv.includes(name)
}

function summary(bytes) {
  return { bytes: bytes.length, sha256: sha256(bytes) }
}

function resultError(result) {
  return result.error?.message
    ?? result.content?.filter(block => block.type === 'text').map(block => block.text).join('\n')
    ?? 'unknown tool failure'
}

async function executeTool(ctx, CallId, name, args, timeoutMs = 120_000) {
  const result = await ctx.tools.execute({
    signal: AbortSignal.timeout(timeoutMs),
    callId: CallId(`story-studio-${name}-${Date.now()}`),
    name,
    arguments: args,
  })
  if (result.isError) throw new Error(`${name} failed: ${resultError(result)}`)
  return result.value
}

async function executeExpectedFailure(ctx, CallId, name, args) {
  const result = await ctx.tools.execute({
    signal: AbortSignal.timeout(30_000),
    callId: CallId(`story-studio-${name}-failure-${Date.now()}`),
    name,
    arguments: args,
  })
  assert.equal(result.isError, true, `${name} unexpectedly accepted an invalid fixture`)
  return resultError(result)
}

async function importResolved(requireFromProfile, packageName) {
  return await import(pathToFileURL(requireFromProfile.resolve(packageName)).href)
}

async function createToolContext(profileDir, workspace) {
  const requireFromProfile = createRequire(join(profileDir, 'package.json'))
  const { Context } = await importResolved(requireFromProfile, '@deepseek-ai/cordis')
  const { default: SystemPrompt } = await importResolved(requireFromProfile, '@deepseek-ai/dsh-system-prompt')
  const { default: ToolRuntime } = await importResolved(requireFromProfile, '@deepseek-ai/dsh-tools')
  const { default: LocalFileSystem } = await importResolved(requireFromProfile, '@deepseek-ai/dsh-fs-local')
  const { CallId } = await importResolved(requireFromProfile, '@deepseek-ai/dsh-llm')
  const richFileReader = await importResolved(requireFromProfile, 'dsh-rich-file-reader')
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(LocalFileSystem, { cwd: workspace })
  await ctx.plugin(richFileReader)
  assert.deepEqual(
    ctx.tools.schemas().map(schema => schema.name).sort(),
    ['ocr_pdf', 'read_rich_file'],
  )
  return { ctx, CallId }
}

function cjkFontPath() {
  const candidates = process.platform === 'win32'
    ? ['C:\\Windows\\Fonts\\msyh.ttc', 'C:\\Windows\\Fonts\\simsun.ttc']
    : process.platform === 'darwin'
      ? [
          '/System/Library/Fonts/Supplemental/Songti.ttc',
          '/System/Library/Fonts/STHeiti Light.ttc',
          '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
        ]
      : [
          '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
          '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
        ]
  const path = candidates.find(candidate => existsSync(candidate))
  if (path === undefined) throw new Error('the Chinese OCR smoke requires an installed CJK font')
  return path
}

function drawScanFixture(createCanvas, GlobalFonts) {
  const fontPath = cjkFontPath()
  if (!GlobalFonts.registerFromPath(fontPath, 'StoryStudioCJK')) {
    throw new Error(`could not register the Chinese OCR fixture font ${fontPath}`)
  }
  const canvas = createCanvas(1870, 2420)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#111111'
  context.font = '120px StoryStudioCJK'
  context.fillText('第一集    父亲    听见    儿子    心声', 120, 260)
  context.font = '92px StoryStudioCJK'
  context.fillText('一九九八年    县城机会出现', 120, 470)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let darkSamples = 0
  for (let offset = 0; offset < pixels.length; offset += 64) {
    if (pixels[offset] < 220 || pixels[offset + 1] < 220 || pixels[offset + 2] < 220) darkSamples += 1
  }
  if (darkSamples < 100) throw new Error('the generated Chinese OCR fixture rendered blank')
  return { fontPath, jpeg: canvas.toBuffer('image/jpeg') }
}

async function writeFixtures(profileDir, workspace) {
  const pluginRequire = createRequire(join(profileDir, 'node_modules/dsh-rich-file-reader/package.json'))
  const { strToU8, zipSync } = pluginRequire('fflate')
  const { createCanvas, GlobalFonts } = pluginRequire('@napi-rs/canvas')
  const referenceDir = join(workspace, '参考资料')
  await mkdir(referenceDir, { recursive: true })

  const docx = createChineseDocxFixture({ strToU8, zipSync })
  const textPdf = createUnicodeTextPdf([
    '第一集 父亲失业那天听见儿子心声',
    '第二集 父子抢先抓住县城商机',
  ])
  const { fontPath, jpeg } = drawScanFixture(createCanvas, GlobalFonts)
  const scanPdf = createJpegScanPdf(jpeg, jpegDimensions(jpeg))
  const damagedPdf = Buffer.from('%PDF-1.4\nthis fixture is intentionally incomplete\n', 'ascii')

  const paths = {
    docx: join(referenceDir, '父子 心声 第一季.docx'),
    textPdf: join(referenceDir, '父子 心声 文本层.pdf'),
    scanPdf: join(referenceDir, '父子 心声 扫描版.pdf'),
    damagedPdf: join(referenceDir, '损坏的剧本.pdf'),
  }
  await Promise.all([
    writeFile(paths.docx, docx),
    writeFile(paths.textPdf, textPdf),
    writeFile(paths.scanPdf, scanPdf),
    writeFile(paths.damagedPdf, damagedPdf),
  ])
  return {
    paths,
    bytes: { docx, textPdf, scanPdf, damagedPdf },
    hashes: {
      docx: summary(docx),
      textPdf: summary(textPdf),
      scanPdf: summary(scanPdf),
      damagedPdf: summary(damagedPdf),
    },
    generation: { cjkFont: fontPath },
  }
}

const keep = flag('--keep')
const skipOcr = flag('--skip-ocr')
const lock = await readPluginLock()
const plugin = lock.plugins.find(candidate => candidate.id === 'rich-file-reader')
if (plugin === undefined) throw new Error('Story Studio plugin lock has no rich-file-reader candidate')

const home = await createProfileHome('story-studio-rich-reader-smoke-')
const isolatedTemp = join(home, 'tmp')
process.env.TMPDIR = isolatedTemp
process.env.TMP = isolatedTemp
process.env.TEMP = isolatedTemp
let activeContext
try {
  await mkdir(isolatedTemp, { recursive: true })
  const installed = await installLockedPlugins({ home, lock, plugins: [plugin] })
  const workspace = join(home, 'workspace')
  await mkdir(workspace, { recursive: true })
  const fixtures = await writeFixtures(installed.profileDir, workspace)

  const firstBoot = await createToolContext(installed.profileDir, workspace)
  activeContext = firstBoot.ctx
  const docxFirst = await executeTool(firstBoot.ctx, firstBoot.CallId, 'read_rich_file', {
    file_path: fixtures.paths.docx,
    limit: 1_200,
  })
  assert.equal(docxFirst.kind, 'word')
  assert.equal(docxFirst.truncated, true)
  assert.match(docxFirst.text, /父子同心/u)
  assert.match(docxFirst.text, /人物\t关系/u)
  assert.match(docxFirst.text, /周建国\t父亲/u)
  const docxSecond = await executeTool(firstBoot.ctx, firstBoot.CallId, 'read_rich_file', {
    file_path: fixtures.paths.docx,
    offset: docxFirst.text.length + 1,
    limit: 1_200,
  })
  assert.equal(docxSecond.offset, docxFirst.text.length + 1)
  assert.notEqual(docxSecond.text, docxFirst.text)
  const docxTail = await executeTool(firstBoot.ctx, firstBoot.CallId, 'read_rich_file', {
    file_path: fixtures.paths.docx,
    offset: docxFirst.totalCharacters - 100,
    limit: 101,
  })
  assert.match(docxTail.text, /第二幕 县城机会/u)

  const textPdf = await executeTool(firstBoot.ctx, firstBoot.CallId, 'read_rich_file', {
    file_path: fixtures.paths.textPdf,
  })
  assert.equal(textPdf.kind, 'pdf')
  assert.match(textPdf.text, /## Page 1\n第一集 父亲失业那天听见儿子心声/u)
  assert.match(textPdf.text, /## Page 2\n第二集 父子抢先抓住县城商机/u)

  const unsupportedError = await executeExpectedFailure(firstBoot.ctx, firstBoot.CallId, 'read_rich_file', {
    file_path: join(workspace, '不支持.txt'),
  })
  assert.match(unsupportedError, /accepts PNG\/JPEG/u)
  const damagedError = await executeExpectedFailure(firstBoot.ctx, firstBoot.CallId, 'read_rich_file', {
    file_path: fixtures.paths.damagedPdf,
  })
  assert.match(damagedError, /could not open this PDF/u)

  let ocr
  if (!skipOcr) {
    const startedAt = Date.now()
    const result = await executeTool(firstBoot.ctx, firstBoot.CallId, 'ocr_pdf', {
      file_path: fixtures.paths.scanPdf,
      language: 'chi_sim',
    }, 240_000)
    const normalized = normalizedOcrText(result.text)
    const markers = Object.fromEntries(EXPECTED_OCR_MARKERS.map(marker => [marker, normalized.includes(marker)]))
    const ocrDiagnostic = `Chinese OCR output did not preserve required markers:\n${result.text}`
    assert.equal(markers['父亲'], true, ocrDiagnostic)
    assert.equal(markers['儿子'], true, ocrDiagnostic)
    assert.equal(markers['心声'], true, ocrDiagnostic)
    ocr = {
      language: 'chi_sim',
      durationMs: Date.now() - startedAt,
      markers,
      preview: result.text.slice(0, 240),
      languageDataBundled: false,
      firstUseNetworkRequired: true,
    }
  }

  await firstBoot.ctx.fiber.dispose()
  activeContext = undefined
  const secondBoot = await createToolContext(installed.profileDir, workspace)
  activeContext = secondBoot.ctx
  const afterRestart = await executeTool(secondBoot.ctx, secondBoot.CallId, 'read_rich_file', {
    file_path: fixtures.paths.textPdf,
  })
  assert.equal(afterRestart.text, textPdf.text)
  await secondBoot.ctx.fiber.dispose()
  activeContext = undefined

  const web = await runWebProfile(installed.env, ['dsh-rich-file-reader'], async url => {
    const endpoint = new URL('/api/rich-file-reader/import', url)
    endpoint.searchParams.set('name', '父子 心声 第一季.docx')
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: fixtures.bytes.docx,
      signal: AbortSignal.timeout(30_000),
    })
    const payload = await response.json()
    assert.equal(response.status, 200)
    assert.equal(payload.ok, true)
    assert.equal(payload.kind, 'word')
    assert.match(payload.text, /第一集 失业那天/u)
    return {
      importStatus: response.status,
      kind: payload.kind,
      totalCharacters: payload.totalCharacters,
      truncated: payload.truncated,
    }
  })

  process.stdout.write(`${JSON.stringify({
    dshRuntime: lock.dshRuntime,
    plugin: installed.results[0],
    home: keep ? home : undefined,
    fixtures: fixtures.hashes,
    fixtureGeneration: fixtures.generation,
    tools: {
      names: ['ocr_pdf', 'read_rich_file'],
      docx: {
        totalCharacters: docxFirst.totalCharacters,
        firstPageCharacters: docxFirst.text.length,
        secondOffset: docxSecond.offset,
        tablePreserved: true,
        explicitPageBreakPreserved: docxTail.text.includes('## Page'),
      },
      textPdf: {
        totalCharacters: textPdf.totalCharacters,
        pages: 2,
        pageBoundariesPreserved: true,
      },
      ocr: ocr ?? { skipped: true },
      invalidInputs: {
        unsupportedExtension: unsupportedError,
        damagedPdf: damagedError,
      },
      restartStable: true,
    },
    web,
  }, undefined, 2)}\n`)
} finally {
  await activeContext?.fiber.dispose()
  if (!keep) await removeProfileHome(home)
}
