import type { ComponentProps } from 'react'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

// Stable colour per name for items with neither colour nor emoji.
const hue = (name: string) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

type Props = ComponentProps<'span'> & { item: Pick<Item, 'name' | 'emoji' | 'color'>; size?: 'sm' | 'md' }

// Emoji on a coloured disc when both exist, a bare emoji, or a coloured dot.
export function ItemIcon({ item, size = 'md', className, ...props }: Props) {
  const disc = size === 'md' ? 'size-9 text-lg' : 'size-7 text-sm'
  if (item.color) {
    return (
      <span
        className={cn('flex shrink-0 items-center justify-center rounded-full leading-none', disc, className)}
        style={{ background: item.color }}
        {...props}
      >
        {item.emoji}
      </span>
    )
  }
  if (item.emoji) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center leading-none',
          size === 'md' ? 'size-9 text-2xl' : 'size-7 text-lg',
          className,
        )}
        {...props}
      >
        {item.emoji}
      </span>
    )
  }
  return (
    <span
      className={cn('block shrink-0 rounded-full', size === 'md' ? 'size-7' : 'size-5', className)}
      style={{ background: `hsl(${hue(item.name)} 65% 55%)` }}
      {...props}
    />
  )
}
