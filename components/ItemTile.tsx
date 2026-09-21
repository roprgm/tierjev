import type { ComponentProps } from 'react'
import type { Item } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = ComponentProps<'div'> & { item: Item; animate?: boolean }

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

export function ItemTile({ item, animate = true, className, style, ...props }: Props) {
  return (
    <div
      {...props}
      style={{ viewTransitionName: animate ? `tile-${slug(item.name)}` : undefined, ...style }}
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
