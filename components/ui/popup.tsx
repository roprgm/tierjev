'use client'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
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

export const PopoverRoot = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

type PopoverContentProps = Omit<PopoverPrimitive.Popup.Props, 'className'> & {
  className?: string
  side?: PopoverPrimitive.Positioner.Props['side']
}

export function PopoverContent({ className, side = 'top', ...props }: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner side={side} sideOffset={8} className="z-50">
        <PopoverPrimitive.Popup render={<PopupSurface className={cn('p-2', className)} />} {...props}>
          <PopoverPrimitive.Arrow render={<PopupArrow />} />
          {props.children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export function TooltipProvider({
  delay = 500,
  closeDelay = 100,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider closeDelay={closeDelay} delay={delay} {...props} />
}

export const TooltipRoot = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({
  className,
  children,
  ...props
}: Omit<TooltipPrimitive.Popup.Props, 'className'> & { className?: string }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side="top" sideOffset={8} className="z-50">
        <TooltipPrimitive.Popup
          render={<PopupSurface className={cn('max-w-64 px-2 py-1.5 text-xs leading-4', className)} />}
          {...props}
        >
          <TooltipPrimitive.Arrow render={<PopupArrow />} />
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}
