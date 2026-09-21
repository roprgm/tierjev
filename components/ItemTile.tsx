'use client'

import type { ComponentProps } from 'react'
import { EmojiPicker } from '@/components/EmojiPicker'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = ComponentProps<'div'> & { item: Item; onEmoji?: (emoji: string) => void }

// Stable colour per name for items without an emoji.
const hue = (name: string) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

export function ItemTile({ item, onEmoji, className, ...props }: Props) {
  const color = { background: `hsl(${hue(item.name)} 65% 55%)` }
  const dot = onEmoji ? (
    <button
      type="button"
      aria-label="Choose an emoji"
      className="block size-7 cursor-pointer rounded-full ring-ring ring-offset-2 ring-offset-background hover:ring-2"
      style={color}
    />
  ) : (
    <span className="block size-7 rounded-full" style={color} />
  )
  return (
    <div
      {...props}
      data-flip={item.name}
      className={cn(
        'flex size-20 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border bg-background p-1 text-center',
        'transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transition-none',
        className,
      )}
    >
      {item.image ? (
        <img src={item.image} alt="" className="size-10 rounded object-cover" />
      ) : item.emoji ? (
        <span className="text-2xl leading-none">{item.emoji}</span>
      ) : onEmoji ? (
        <EmojiPicker trigger={dot} onPick={onEmoji} />
      ) : (
        dot
      )}
      <span className="line-clamp-2 text-[11px] leading-tight font-medium">{item.name}</span>
    </div>
  )
}
