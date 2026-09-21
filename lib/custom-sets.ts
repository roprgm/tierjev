import { useEffect, useState } from 'react'
import type { TierSet } from '@/lib/types'

const KEY = 'tierjev.sets'

// Sets the user created, kept in localStorage until accounts exist.
export function useCustomSets() {
  const [sets, setSets] = useState<TierSet[]>([])
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored) setSets(JSON.parse(stored))
    } catch {}
  }, [])
  function save(next: TierSet[]) {
    setSets(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {}
  }
  return {
    sets,
    add: (set: TierSet) => save([...sets.filter((s) => s.id !== set.id), set]),
    update: (set: TierSet) => save(sets.map((s) => (s.id === set.id ? set : s))),
    remove: (id: string) => save(sets.filter((s) => s.id !== id)),
    clear: () => save([]),
  }
}
