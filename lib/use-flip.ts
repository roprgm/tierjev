import { type RefObject, useLayoutEffect, useRef } from 'react'

const DURATION = 450
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

type Rect = { left: number; top: number; width: number; height: number }

const docRect = (el: Element): Rect => {
  const r = el.getBoundingClientRect()
  return { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height }
}

// Animates elements marked with data-flip="<key>" from where they were on the previous render to
// where they are now. Clones fly in a fixed overlay so row clipping cannot cut them off; a clone whose
// destination lies outside its data-clip ancestor's visible box stops at the clip edge and fades out.
export function useFlip(container: RefObject<HTMLElement | null>, deps: unknown[]) {
  const previous = useRef(new Map<string, Rect>())

  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const tiles = [...root.querySelectorAll<HTMLElement>('[data-flip]')]
    const next = new Map(tiles.map((el) => [el.dataset.flip as string, docRect(el)]))
    const before = previous.current
    previous.current = next
    if (before.size === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;z-index:40;pointer-events:none'
    let flying = 0

    tiles.forEach((el, i) => {
      const from = before.get(el.dataset.flip as string)
      const to = next.get(el.dataset.flip as string)
      if (!from || !to || (from.left === to.left && from.top === to.top)) return

      const clipEl = el.closest<HTMLElement>('[data-clip]')
      const clip = clipEl ? docRect(clipEl) : null
      let target = to
      let fade = false
      if (clip && to.left >= clip.left + clip.width) {
        target = { ...to, left: clip.left + clip.width - to.width }
        fade = true
      }

      const clone = el.cloneNode(true) as HTMLElement
      clone.removeAttribute('data-flip')
      clone.style.cssText += `;position:absolute;margin:0;left:${from.left - scrollX}px;top:${from.top - scrollY}px;width:${from.width}px;height:${from.height}px`
      overlay.appendChild(clone)
      el.style.visibility = 'hidden'
      flying += 1

      const animation = clone.animate(
        [
          { transform: 'translate(0, 0)', opacity: 1 },
          {
            transform: `translate(${target.left - from.left}px, ${target.top - from.top}px)`,
            opacity: fade ? 0 : 1,
          },
        ],
        { duration: DURATION, delay: i * 15, easing: EASING, fill: 'forwards' },
      )
      animation.onfinish = () => {
        el.style.visibility = ''
        clone.remove()
        if (--flying === 0) overlay.remove()
      }
    })

    if (flying > 0) document.body.appendChild(overlay)
    return () => {
      overlay.remove()
      for (const el of tiles) el.style.visibility = ''
    }
  }, deps)
}
