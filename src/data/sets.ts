import type { TierSet } from '@/lib/types'

const set = (id: string, emoji: string, title: string, criterion: string, items: string): TierSet => ({
  id,
  emoji,
  title,
  criterion,
  items: items.split(',').map((s) => {
    const [emoji, ...rest] = s.trim().split(' ')
    return { emoji, name: rest.join(' ') }
  }),
})

export const SETS: TierSet[] = [
  set(
    'languages', '💻', 'Programming languages', 'Best language to learn first in 2026',
    '🐍 Python,🟨 JavaScript,🔷 TypeScript,🦀 Rust,🐹 Go,☕ Java,💎 Ruby,🐘 PHP,🔶 C++,🇨 C,🍎 Swift,🎯 Kotlin,🧪 Elixir,λ Haskell,🔬 Zig,📊 R',
  ),
  set(
    'frameworks', '⚛️', 'Frontend frameworks', 'Best for shipping a startup fast',
    '⚛️ React,💚 Vue,🔥 Svelte,🅰️ Angular,☀️ Solid,🧡 HTMX,⚡ Qwik,🌟 Astro,🅱️ Preact,🔺 Next.js,🌊 Remix,💧 Nuxt',
  ),
  set(
    'fruits', '🍎', 'Fruits', 'Best fruit for a summer picnic',
    '🍎 Apple,🍌 Banana,🍉 Watermelon,🍇 Grapes,🍓 Strawberry,🍍 Pineapple,🥭 Mango,🍑 Peach,🍒 Cherry,🥝 Kiwi,🍋 Lemon,🥥 Coconut,🍐 Pear,🫐 Blueberry,🍊 Orange,🍈 Melon',
  ),
  set(
    'planets', '🪐', 'Solar system', 'Most habitable place for a future colony',
    '☿️ Mercury,♀️ Venus,🌍 Earth,🔴 Mars,🪐 Jupiter,💫 Saturn,🔵 Uranus,🌀 Neptune,❄️ Pluto,🌙 The Moon,🧊 Europa,🌋 Io,🟠 Titan,🌑 Ceres',
  ),
  set(
    'pizza', '🍕', 'Pizza toppings', 'Belongs on a pizza',
    '🍄 Mushroom,🍍 Pineapple,🌶️ Jalapeño,🫒 Olives,🧄 Garlic,🍅 Tomato,🧀 Extra cheese,🌿 Basil,🧅 Onion,🫑 Bell pepper,🍤 Shrimp,🥓 Bacon,🥚 Egg,🌽 Corn,🍫 Chocolate,🐟 Anchovies',
  ),
  set(
    'databases', '🗄️', 'Databases', 'Best default for a new web app',
    '🐘 PostgreSQL,🐬 MySQL,🍃 MongoDB,🔴 Redis,🪶 SQLite,🔥 Firestore,⚡ DynamoDB,🏛️ Oracle,🪳 CockroachDB,🦆 DuckDB,🔍 Elasticsearch,🌀 Cassandra',
  ),
]
