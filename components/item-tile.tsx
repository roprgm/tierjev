'use client'

import type { ComponentProps } from 'react'
import { IconPicker } from '@/components/icon-picker'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

// Stable colour per name for items with neither colour nor emoji.
const hue = (name: string) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

type IconProps = ComponentProps<'span'> & { item: Pick<Item, 'name' | 'emoji' | 'color'>; size?: 'sm' | 'md' }

// The emoji when there is one, otherwise a coloured circle about the size an emoji would take.
export function ItemIcon({ item, size = 'md', className, ...props }: IconProps) {
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

type Props = ComponentProps<'div'> & { item: Item; onIcon?: (look: Pick<Item, 'emoji' | 'color'>) => void }

export function ItemTile({ item, onIcon, className, ...props }: Props) {
  const icon = <ItemIcon item={item} />
  return (
    <div
      {...props}
      data-flip={item.name}
      className={cn(
        'flex size-20 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border bg-background p-1 text-center',
        'hover:shadow-sm',
        className,
      )}
    >
      {item.image ? (
        <img src={item.image} alt="" className="size-10 rounded object-cover" />
      ) : onIcon ? (
        <IconPicker
          value={item}
          onChange={onIcon}
          trigger={
            <button
              type="button"
              aria-label="Change icon"
              className="cursor-pointer rounded-full ring-ring ring-offset-2 ring-offset-background hover:ring-2"
            >
              {icon}
            </button>
          }
        />
      ) : (
        icon
      )}
      <span className="line-clamp-2 text-[11px] leading-tight font-medium">{item.name}</span>
    </div>
  )
}
