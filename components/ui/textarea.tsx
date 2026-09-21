import type { ComponentProps } from 'react'
import { fieldChrome } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldChrome, 'px-3 py-2 text-sm', className)} {...props} />
}
