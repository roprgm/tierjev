import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const fieldChrome =
  'w-full rounded-lg border bg-muted/40 shadow-groove placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldChrome, 'h-10 px-3 text-sm', className)} {...props} />
}
