/** Generate native tray bitmaps from the repository-owned brand SVG. */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const buildRoot = join(packageRoot, 'build')
const sourcePath = join(packageRoot, '..', 'dsh-product-story-studio', 'assets', 'workbench', 'qnovel', 'Qnovel.svg')
const source = await readFile(sourcePath, 'utf8')

const BRAND_BLUE = '#4D6BFE'
if (!source.includes('<svg') || /<style\b/iu.test(source)) {
  throw new Error('generate-tray-icons: Qnovel.svg must be a style-free SVG')
}

// The supplied app artwork includes its dark square background. A macOS menu
// bar Template Image must be transparent and monochrome, so remove only the
// first full-canvas background path and recolor the remaining Qnovel artwork.
function removeFirstPath(svg) {
  const firstPathStart = svg.indexOf('<path')
  const firstPathEnd = svg.indexOf('</path>', firstPathStart)
  if (firstPathStart < 0 || firstPathEnd < 0) {
    throw new Error('generate-tray-icons: Qnovel.svg has no removable background path')
  }
  return `${svg.slice(0, firstPathStart)}${svg.slice(firstPathEnd + '</path>'.length)}`
}

const traySource = removeFirstPath(source)
  .replace(/fill="[^"]+"/gu, `fill="${BRAND_BLUE}"`)
if (traySource === source || !traySource.includes(`fill="${BRAND_BLUE}"`)) {
  throw new Error('generate-tray-icons: failed to derive a transparent Qnovel tray source')
}
await writeFile(join(buildRoot, 'tray-icon.svg'), traySource)

const variants = [
  ['tray-iconTemplate.png', '#000000', 16],
  ['tray-iconTemplate@2x.png', '#000000', 32],
  ['tray-icon-blue.png', BRAND_BLUE, 16],
  ['tray-icon-blue@1.25x.png', BRAND_BLUE, 20],
  ['tray-icon-blue@1.5x.png', BRAND_BLUE, 24],
  ['tray-icon-blue@2x.png', BRAND_BLUE, 32],
]

await Promise.all(variants.map(async ([filename, color, size]) => {
  const rendered = traySource.replaceAll(BRAND_BLUE, color)
  await sharp(Buffer.from(rendered))
    .resize({ width: size, height: size, fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(join(buildRoot, filename))
}))
