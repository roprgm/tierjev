import { cn } from '@/lib/utils'
import type { Item } from '../../shared/types'

type Props = { item: Item; title?: string; className?: string; style?: React.CSSProperties }

export function ItemTile({ item, title, className, style }: Props) {
  return (
    <div
      title={title}
      style={style}
      className={cn(
        'flex size-20 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border bg-background p-1 text-center',
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
