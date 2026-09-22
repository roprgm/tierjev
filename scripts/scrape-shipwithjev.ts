// Scrapes the shipwithjev.com catalogue into data/shipwithjev.json.
// Usage: bun scripts/scrape-shipwithjev.ts
import { writeFileSync } from 'node:fs'
import { DOMParser } from 'linkedom'

export type Build = {
  name: string
  slug: string
  kind: string
  category: string
  author: string
  description: string
}

const PAGES = 12
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

function parse(html: string): Build[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return [...doc.querySelectorAll('article')]
    .map((el: Element) => {
      const h3 = el.querySelector('h3')
      const link = h3?.querySelector('a')
      const meta = h3?.parentElement?.querySelector('p')
      return {
        name: text(link) || text(h3),
        slug: (link?.getAttribute('href') ?? '').replace('/builds/', ''),
        kind: text(meta?.querySelector('span.shrink-0')),
        category: text(meta?.querySelector('span.truncate')),
        author: text(el.querySelector('p[class*="text-sm"]')),
        description: text(el.querySelector('p[class*="mt-3"]')),
      }
    })
    .filter((b) => b.name && b.slug)
}

const all: Build[] = []
for (let page = 1; page <= PAGES; page++) {
  const url = `https://www.shipwithjev.com/${page === 1 ? '' : `page/${page}`}`
  const html = await fetch(url).then((r) => r.text())
  const items = parse(html)
  all.push(...items)
  console.log(`page ${page}: ${items.length}`)
}

const seen = new Set<string>()
const builds = all.filter((b) => !seen.has(b.slug) && seen.add(b.slug))
writeFileSync('data/shipwithjev.json', JSON.stringify(builds, null, 2))

function by(key: keyof Build) {
  const counts: Record<string, number> = {}
  for (const b of builds) counts[b[key]] = (counts[b[key]] ?? 0) + 1
  return Object.entries(counts)
}
console.log(`\n${builds.length} builds`)
console.log('categories:', by('category'))
console.log('kinds:', by('kind'))
