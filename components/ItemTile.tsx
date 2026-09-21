import type { ComponentProps } from 'react'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = ComponentProps<'div'> & { item: Item }

export function ItemTile({ item, className, ...props }: Props) {
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
      ) : (
        <span className="text-2xl leading-none">{item.emoji}</span>
      )}
      <span className="line-clamp-2 text-[11px] leading-tight font-medium">{item.name}</span>
    </div>
  )
}
