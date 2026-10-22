import { animate, useInView } from 'motion/react'
import { useEffect, useRef } from 'react'

interface Props {
  to: number
  from?: number
  duration?: number
  decimals?: number
  suffix?: string
  className?: string
}

/** Interpolates a number with Motion's animate() and writes text directly, so React never re-renders per frame. */
export function Counter({ to, from = 0, duration = 1.6, decimals = 0, suffix = '', className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  useEffect(() => {
    const el = ref.current
    if (!el || !inView) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      el.textContent = to.toFixed(decimals) + suffix
      return
    }
    const controls = animate(from, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = v.toFixed(decimals) + suffix
      },
    })
    return () => controls.stop()
  }, [inView, to, from, duration, decimals, suffix])

  return (
    <span ref={ref} className={className}>
      {from.toFixed(decimals)}
      {suffix}
    </span>
  )
}
