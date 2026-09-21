import { useEffect, useState } from 'react'
import type { TierSet } from '@/lib/types'

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) setValue(JSON.parse(stored))
    } catch {}
  }, [key])
  const save = (next: T) => {
    setValue(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {}
  }
  return [value, save] as const
}

// Placeholder wallet kept in localStorage until real billing exists.
export function useCredits() {
  const [credits, save] = useStored('tierjev.credits', 10)
  return { credits, spend: (amount = 1) => save(Math.max(0, credits - amount)) }
}

// Sets the user created, kept in localStorage until accounts exist.
export function useCustomSets() {
  const [sets, save] = useStored<TierSet[]>('tierjev.sets', [])
  return {
    sets,
    add: (set: TierSet) => save([...sets.filter((s) => s.id !== set.id), set]),
    update: (set: TierSet) => save(sets.map((s) => (s.id === set.id ? set : s))),
    remove: (id: string) => save(sets.filter((s) => s.id !== id)),
    clear: () => save([]),
  }
}

// Seconds left until `until` (epoch ms), ticking once a second. 0 when null or elapsed.
export function useCountdown(until: number | null) {
  const left = () => (until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0)
  const [seconds, setSeconds] = useState(left)
  useEffect(() => {
    setSeconds(left())
    if (!until) return
    const id = setInterval(() => setSeconds(left()), 1000)
    return () => clearInterval(id)
  }, [until])
  return seconds
}

export const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
