import type { ComponentProps } from 'react'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

// Stable colour per name for items with neither colour nor emoji.
const hue = (name: string) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

type Props = ComponentProps<'span'> & { item: Pick<Item, 'name' | 'emoji' | 'color'>; size?: 'sm' | 'md' }

// The emoji when there is one, otherwise a coloured circle about the size an emoji would take.
export function ItemIcon({ item, size = 'md', className, ...props }: Props) {
  if (item.emoji) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center leading-none',
          size === 'md' ? 'size-8 text-2xl' : 'size-6 text-lg',
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
      style={{ background: item.color ?? `hsl(${hue(item.name)} 65% 55%)` }}
      {...props}
    />
  )
}
