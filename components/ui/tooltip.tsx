'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { PopupArrow, PopupSurface } from '@/components/ui/popup'
import { cn } from '@/lib/utils'

export function TooltipProvider({
  delay = 500,
  closeDelay = 100,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider closeDelay={closeDelay} delay={delay} {...props} />
}

export const TooltipRoot = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

type TooltipContentProps = Omit<TooltipPrimitive.Popup.Props, 'className'> & {
  align?: TooltipPrimitive.Positioner.Props['align']
  className?: string
  side?: TooltipPrimitive.Positioner.Props['side']
  sideOffset?: TooltipPrimitive.Positioner.Props['sideOffset']
}

export function TooltipContent({
  align = 'center',
  children,
  className,
  side = 'top',
  sideOffset = 8,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner align={align} className="z-50" side={side} sideOffset={sideOffset}>
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
