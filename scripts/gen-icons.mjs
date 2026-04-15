import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const svgPath = resolve(root, 'public/icon.svg')
const outDir = resolve(root, 'public')

const svg = readFileSync(svgPath)

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-maskable-512.png', size: 512, padding: 0.12 },
]

mkdirSync(outDir, { recursive: true })

for (const { name, size, padding } of sizes) {
  let pipeline = sharp(svg).resize(size, size, { fit: 'contain', background: { r: 128, g: 32, b: 32, alpha: 1 } })
  if (padding) {
    const inner = Math.round(size * (1 - padding * 2))
    const offset = Math.round(size * padding)
    const innerBuf = await sharp(svg).resize(inner, inner).png().toBuffer()
    pipeline = sharp({
      create: {
        width: size, height: size, channels: 4,
        background: { r: 128, g: 32, b: 32, alpha: 1 },
      },
    }).composite([{ input: innerBuf, top: offset, left: offset }])
  }
  const buf = await pipeline.png().toBuffer()
  writeFileSync(resolve(outDir, name), buf)
  console.log(`✓ ${name} (${size}x${size})`)
}
