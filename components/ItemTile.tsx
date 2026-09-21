'use client'

import type { ComponentProps } from 'react'
import { IconPicker } from '@/components/IconPicker'
import { ItemIcon } from '@/components/ItemIcon'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = ComponentProps<'div'> & { item: Item; onIcon?: (look: Pick<Item, 'emoji' | 'color'>) => void }

export function ItemTile({ item, onIcon, className, ...props }: Props) {
  const icon = <ItemIcon item={item} />
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
