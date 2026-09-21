'use client'

import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TierSet } from '@/lib/types'

type Props = { onCreate: (set: TierSet) => void; onError: (message: string) => void }

export function CreateSet({ onCreate, onError }: Props) {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      if (!res.ok) return onError(data.error ?? 'Could not create that set.')
      setTopic('')
      onCreate(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="New set: 90s sitcoms, Argentine rock bands, pasta shapes…"
        maxLength={80}
        required
      />
      <Button type="submit" variant="ghost" disabled={loading} className="w-24 shrink-0">
        {loading ? 'Creating…' : 'Create'}
      </Button>
    </form>
  )
}
