'use client'

import type { ReactElement } from 'react'
import { Input } from '@/components/ui/field'
import { PopoverContent, PopoverRoot, PopoverTrigger } from '@/components/ui/popup'
import { SWATCHES } from '@/lib/palette'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

const EMOJIS = [
  '😀',
  '😎',
  '🤩',
  '🥳',
  '😈',
  '🤖',
  '👻',
  '💀',
  '🐶',
  '🐱',
  '🦊',
  '🐼',
  '🐸',
  '🦄',
  '🐙',
  '🦋',
  '🌵',
  '🌸',
  '🍀',
  '🌈',
  '⭐',
  '🔥',
  '💧',
  '⚡',
  '🍕',
  '🍔',
  '🍣',
  '🍩',
  '☕',
  '🍺',
  '⚽',
  '🎮',
  '🎸',
  '🎬',
  '📚',
  '💻',
  '🚀',
  '✈️',
  '🚗',
  '🏠',
  '💎',
  '💰',
  '🏆',
  '🎯',
  '❤️',
  '👍',
  '👎',
  '🔴',
]

type Look = Pick<Item, 'emoji' | 'color'>
type Props = { trigger: ReactElement; value: Look; onChange: (look: Look) => void }

export function IconPicker({ trigger, value, onChange }: Props) {
  return (
    <PopoverRoot>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-64 space-y-3 p-3">
        <div className="grid grid-cols-8 gap-1.5">
          {SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              onClick={() => onChange({ ...value, color: hex })}
              className={cn(
                'size-6 cursor-pointer rounded-full ring-ring ring-offset-2 ring-offset-control transition-transform hover:scale-110',
                value.color === hex && 'ring-2',
              )}
              style={{ background: hex }}
            />
          ))}
        </div>
        <Input
          placeholder="Type or paste any emoji"
          className="h-8"
          onChange={(e) => {
            const emoji = e.target.value.trim().slice(0, 8)
            if (emoji) onChange({ ...value, emoji })
          }}
        />
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange({ ...value, emoji })}
              className={cn(
                'rounded p-1 text-lg leading-none transition-colors hover:bg-muted',
                value.emoji === emoji && 'bg-muted',
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => onChange({ ...value, emoji: undefined })}
          >
            No emoji
          </button>
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => onChange({ ...value, color: undefined })}
          >
            No colour
          </button>
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}
