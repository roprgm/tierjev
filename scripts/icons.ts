// Rasterises the app mark. Usage: bun scripts/icons.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

// Full-bleed variant: platforms that mask (iOS, Twitter avatars) add their own shape.
const mark = (radius: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="${radius}" fill="#0a0a0a"/>
<rect x="10" y="12" width="12" height="9" rx="2" fill="#f27272"/><rect x="26" y="12" width="28" height="9" rx="2" fill="#262626"/>
<rect x="10" y="27" width="12" height="9" rx="2" fill="#f2a35c"/><rect x="26" y="27" width="28" height="9" rx="2" fill="#262626"/>
<rect x="10" y="42" width="12" height="9" rx="2" fill="#efc95a"/><rect x="26" y="42" width="28" height="9" rx="2" fill="#262626"/>
</svg>`

const render = (svg: string, size: number) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()

mkdirSync('public/icons', { recursive: true })
const jobs: [string, number, number][] = [
  ['public/icons/twitter-400.png', 400, 0],
  ['public/icons/ios-1024.png', 1024, 0],
  ['public/icons/icon-512.png', 512, 0],
  ['public/icons/icon-192.png', 192, 0],
  ['public/icons/icon-512-rounded.png', 512, 14],
  ['app/apple-icon.png', 180, 0],
]
for (const [path, size, radius] of jobs) {
  writeFileSync(path, await render(mark(radius), size))
  console.log(`${path} ${size}×${size}`)
}
