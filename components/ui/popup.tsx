import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const arrowBorderPath = 'M0 5.5h1L6 0.5l5 5h1'
const arrowFillPath = 'M0 5.5h1L6 0.5l5 5h1v1.5H0Z'

export function PopupSurface({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative origin-(--transform-origin) rounded-md border bg-control p-1 text-foreground shadow-md shadow-black/25 ring-1 ring-black/30 outline-none',
        'transition-[transform,opacity] duration-150 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  )
}

export function PopupArrow({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        'block h-1.5 w-3 overflow-visible data-[side=bottom]:-top-1.5 data-[side=left]:-right-2.25 data-[side=left]:rotate-90 data-[side=right]:-left-2.25 data-[side=right]:-rotate-90 data-[side=top]:-bottom-1.5 data-[side=top]:rotate-180',
        className,
      )}
      fill="none"
      viewBox="0 0 12 6"
      {...props}
    >
      <path
        className="stroke-black/30"
        d={arrowBorderPath}
        fill="none"
        strokeLinejoin="round"
        strokeWidth="1"
        transform="translate(0 -1)"
        vectorEffect="non-scaling-stroke"
      />
      <path className="fill-control" d={arrowFillPath} />
      <path
        className="stroke-border"
        d={arrowBorderPath}
        fill="none"
        strokeLinejoin="round"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
