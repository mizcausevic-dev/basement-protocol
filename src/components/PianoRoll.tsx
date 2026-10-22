import { useEffect, useRef } from 'react'
import { cssVar, useTheme } from '@/lib/theme'
import { noteName } from '@/lib/data'
import type { NoteEvent } from '@/lib/types'

interface Props {
  notes: NoteEvent[]
  ppq: number
  loopBeats: number
  root: number
  scale: number[]
  flats: boolean
  getPosition?: () => number | null
  playing?: boolean
  className?: string
}

/** Canvas piano roll. Repaints on resize, theme change, and every frame while playing. */
export function PianoRoll({ notes, ppq, loopBeats, root, scale, flats, getPosition, playing, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { revision } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    const colors = {
      bg: cssVar('--roll-bg'), grid: cssVar('--roll-grid'), bar: cssVar('--roll-bar'),
      note: cssVar('--note'), accent: cssVar('--note-accent'), chromatic: cssVar('--note-chromatic'),
      legato: cssVar('--note-legato'), text: cssVar('--muted-foreground'), primary: cssVar('--primary'),
      black: cssVar('--muted'),
    }
    const mono = cssVar('--font-code', 'monospace')
    const pitches = notes.map((n) => n.midi)
    let lo = Math.min(...pitches, root) - 2
    let hi = Math.max(...pitches, root) + 2
    if (hi - lo < 14) {
      const pad = Math.ceil((14 - (hi - lo)) / 2)
      lo -= pad
      hi += pad
    }
    const span = hi - lo + 1
    const loopTicks = loopBeats * ppq

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const gutter = w < 480 ? 34 : 44
      const gw = w - gutter
      const rowH = h / span
      const x = (tick: number) => gutter + (tick / loopTicks) * gw
      const y = (midi: number) => (hi - midi) * rowH

      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, w, h)
      for (let m = lo; m <= hi; m++) {
        if ([1, 3, 6, 8, 10].includes(m % 12)) {
          ctx.globalAlpha = 0.45
          ctx.fillStyle = colors.black
          ctx.fillRect(gutter, y(m), gw, rowH)
          ctx.globalAlpha = 1
        }
      }
      const stepTicks = ppq / 4
      for (let t = 0; t <= loopTicks; t += stepTicks) {
        const isBar = t % (ppq * 4) === 0
        const isBeat = t % ppq === 0
        ctx.strokeStyle = isBar ? colors.bar : colors.grid
        ctx.globalAlpha = isBar ? 1 : isBeat ? 1 : 0.45
        ctx.lineWidth = isBar ? 1.5 : 1
        ctx.beginPath()
        ctx.moveTo(Math.round(x(t)) + 0.5, 0)
        ctx.lineTo(Math.round(x(t)) + 0.5, h)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.font = `${w < 480 ? 9 : 10}px ${mono}`
      ctx.textBaseline = 'middle'
      for (let m = lo; m <= hi; m++) {
        if (m % 12 === root % 12 || m % 12 === 0) {
          ctx.fillStyle = m % 12 === root % 12 ? colors.primary : colors.text
          ctx.fillText(noteName(m, flats), 4, y(m) + rowH / 2)
        }
      }

      const pos = getPosition?.() ?? null
      const posTick = pos === null ? null : pos * ppq
      const sorted = [...notes].sort((a, b) => a.ticks - b.ticks)
      sorted.forEach((n, i) => {
        const nx = x(n.ticks)
        const nw = Math.max(2, x(n.ticks + n.durationTicks) - nx - 1)
        const ny = y(n.midi) + 1
        const nh = Math.max(3, rowH - 2)
        const inScaleColor = n.velocity >= 115 ? colors.accent : colors.note
        const chromatic = isChromatic(n.midi)
        const active = posTick !== null && posTick >= n.ticks && posTick < n.ticks + n.durationTicks
        ctx.globalAlpha = 0.5 + 0.5 * (n.velocity / 127)
        ctx.fillStyle = chromatic ? colors.chromatic : inScaleColor
        if (active) {
          ctx.shadowColor = ctx.fillStyle as string
          ctx.shadowBlur = 16
        }
        roundRect(ctx, nx, ny, nw, nh, Math.min(4, nh / 2))
        ctx.fill()
        ctx.shadowBlur = 0
        const next = sorted[i + 1]
        if (next && n.ticks + n.durationTicks > next.ticks) {
          ctx.globalAlpha = 0.9
          ctx.fillStyle = colors.legato
          const ox = x(next.ticks)
          ctx.fillRect(ox, ny + nh / 2 - 1.5, Math.max(2, x(n.ticks + n.durationTicks) - ox), 3)
        }
      })
      ctx.globalAlpha = 1

      if (posTick !== null) {
        const px = x(posTick)
        ctx.strokeStyle = colors.primary
        ctx.lineWidth = 2
        ctx.shadowColor = colors.primary
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, h)
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    }

    function isChromatic(midi: number) {
      return !scale.includes((((midi - root) % 12) + 12) % 12)
    }

    const loop = () => {
      draw()
      raf = requestAnimationFrame(loop)
    }
    if (playing) loop()
    else draw()
    const ro = new ResizeObserver(() => draw())
    ro.observe(canvas)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [notes, ppq, loopBeats, root, scale, flats, getPosition, playing, revision])

  return <canvas ref={canvasRef} className={className} role="img" aria-label="Piano roll of the selected bassline" />
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
