import { useEffect, useState } from 'react'

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
