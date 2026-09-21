import { type RefObject, useLayoutEffect, useRef } from 'react'

const DURATION = 450
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

type Rect = { left: number; top: number; width: number; height: number }

const docRect = (el: Element): Rect => {
  const r = el.getBoundingClientRect()
  return { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height }
}

// Animates elements marked with data-flip="<key>" from where they were on the previous render to
// where they are now. Each clone flies inside its destination's data-flip-host, so a row's overflow
// clips the whole flight and the tile appears to enter through the row's edge.
export function useFlip(container: RefObject<HTMLElement | null>, deps: unknown[], enabled = true) {
  const previous = useRef(new Map<string, Rect>())

  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const tiles = [...root.querySelectorAll<HTMLElement>('[data-flip]')]
    const next = new Map(tiles.map((el) => [el.dataset.flip as string, docRect(el)]))
    const before = previous.current
    previous.current = next
    if (!enabled || before.size === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cleanups: (() => void)[] = []
    tiles.forEach((el, i) => {
      const key = el.dataset.flip as string
      const from = before.get(key)
      const to = next.get(key)
      const host = el.closest<HTMLElement>('[data-flip-host]')
      if (!from || !to || !host || (from.left === to.left && from.top === to.top)) return

      const hostRect = docRect(host)
      const clone = el.cloneNode(true) as HTMLElement
      clone.removeAttribute('data-flip')
      clone.style.cssText += `;position:absolute;margin:0;z-index:1;pointer-events:none;left:${from.left - hostRect.left + host.scrollLeft}px;top:${from.top - hostRect.top + host.scrollTop}px;width:${from.width}px;height:${from.height}px`
      host.appendChild(clone)
      el.style.visibility = 'hidden'

      const animation = clone.animate(
        [
          { transform: 'translate(0, 0)' },
          { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px)` },
        ],
        { duration: DURATION, delay: i * 15, easing: EASING, fill: 'forwards' },
      )
      const finish = () => {
        el.style.visibility = ''
        clone.remove()
      }
      animation.onfinish = finish
      cleanups.push(finish)
    })
    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }, deps)
}
