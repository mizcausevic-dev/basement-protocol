import type { NoteEvent } from '@/lib/types'

interface Props {
  notes: NoteEvent[]
  loopTicks: number
  color: string
  className?: string
}

export function MiniRoll({ notes, loopTicks, color, className }: Props) {
  if (!notes.length) return <div className={`shimmer rounded-md ${className ?? ''}`} />
  const lo = Math.min(...notes.map((n) => n.midi)) - 1
  const hi = Math.max(...notes.map((n) => n.midi)) + 1
  const span = Math.max(12, hi - lo)
  const w = 400
  const h = 60
  const rowH = h / span
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      {Array.from({ length: Math.round(loopTicks / 480) + 1 }, (_, i) => (
        <line key={i} x1={(i * 480 * w) / loopTicks} x2={(i * 480 * w) / loopTicks} y1={0} y2={h}
          stroke="currentColor" strokeOpacity={i % 4 === 0 ? 0.25 : 0.08} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {notes.map((n, i) => (
        <rect key={i} x={(n.ticks / loopTicks) * w} y={(hi - n.midi) * rowH - rowH / 2}
          width={Math.max(2, (n.durationTicks / loopTicks) * w - 1)} height={Math.max(2.5, rowH)} rx={1.5}
          fill={color} fillOpacity={0.45 + 0.55 * (n.velocity / 127)} />
      ))}
    </svg>
  )
}
