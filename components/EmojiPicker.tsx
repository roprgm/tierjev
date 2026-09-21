'use client'

import { type ReactElement, useState } from 'react'
import { Input } from '@/components/ui/input'
import { PopoverContent, PopoverRoot, PopoverTrigger } from '@/components/ui/popover'

const COMMON = ['😀', '😎', '🤩', '🥳', '😈', '🤖', '👻', '💀', '🐶', '🐱', '🦊', '🐼', '🐸', '🦄', '🐙', '🦋', '🌵', '🌸', '🍀', '🌈', '⭐', '🔥', '💧', '⚡', '🍕', '🍔', '🍣', '🍩', '☕', '🍺', '⚽', '🎮', '🎸', '🎬', '📚', '💻', '🚀', '✈️', '🚗', '🏠', '💎', '💰', '🏆', '🎯', '❤️', '👍', '👎', '🔴']
  ...'😀😎🤩🥳😈🤖👻💀🐶🐱🦊🐼🐸🦄🐙🦋🌵🌸🍀🌈⭐🔥💧⚡🍕🍔🍣🍩☕🍺⚽🎮🎸🎬📚💻🚀✈️🚗🏠💎💰🏆🎯❤️👍👎',
]

type Props = { trigger: ReactElement; onPick: (emoji: string) => void }

export function EmojiPicker({ trigger, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const pick = (emoji: string) => {
    onPick(emoji)
    setOpen(false)
  }
  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-64 space-y-2">
        <Input
          autoFocus
          placeholder="Type or paste any emoji"
          className="h-8"
          onChange={(e) => {
            const value = e.target.value.trim()
            if (value) pick(value.slice(0, 8))
          }}
        />
        <div className="grid grid-cols-8 gap-0.5">
          {COMMON.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => pick(emoji)}
              className="rounded p-1 text-lg leading-none transition-colors hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}
