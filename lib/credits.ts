import { useEffect, useState } from 'react'

const KEY = 'tierjev.credits'
const INITIAL = 10

// Placeholder wallet kept in localStorage until real billing exists.
export function useCredits() {
  const [credits, setCredits] = useState(INITIAL)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored !== null) setCredits(Number(stored))
    } catch {}
  }, [])
  function spend(amount = 1) {
    setCredits((current) => {
      const next = Math.max(0, current - amount)
      try {
        localStorage.setItem(KEY, String(next))
      } catch {}
      return next
    })
  }
  return { credits, spend }
}
