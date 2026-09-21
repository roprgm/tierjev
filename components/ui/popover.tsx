'use client'

import { Popover } from '@base-ui/react/popover'
import { PopupArrow, PopupSurface } from '@/components/ui/popup'
import { cn } from '@/lib/utils'

export const PopoverRoot = Popover.Root
export const PopoverTrigger = Popover.Trigger

type Props = Omit<Popover.Popup.Props, 'className'> & {
  className?: string
  side?: Popover.Positioner.Props['side']
}

export function PopoverContent({ className, side = 'top', ...props }: Props) {
  return (
    <Popover.Portal>
      <Popover.Positioner side={side} sideOffset={8} className="z-50">
        <Popover.Popup render={<PopupSurface className={cn('p-2', className)} />} {...props}>
          <Popover.Arrow render={<PopupArrow />} />
          {props.children}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  )
}
