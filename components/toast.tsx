'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const notify = useCallback((text: string, ms = 5000) => {
    clearTimeout(timer.current)
    setMessage(text)
    timer.current = setTimeout(() => setMessage(null), ms)
  }, [])
  return { message, notify }
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-4 bottom-6 flex justify-center transition-all duration-300',
        message ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      {message && (
        <p className="max-w-md rounded-lg border bg-background px-4 py-2 text-center text-sm shadow-lg">
          {message}
        </p>
      )}
    </div>
  )
}
