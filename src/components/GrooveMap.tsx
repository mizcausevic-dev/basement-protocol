import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Section } from '@/components/Section'
import { FAMILIES, familyColor } from '@/lib/families'
import { useTheme } from '@/lib/theme'
import type { Family, PatternMeta } from '@/lib/types'
import { usePack } from '@/pack-context'

const W = 1000
const H = 560
const PAD = { l: 64, r: 24, t: 28, b: 56 }
const MAX_DENSITY = 16
const sx = (density: number) => PAD.l + (Math.sqrt(density) / Math.sqrt(MAX_DENSITY)) * (W - PAD.l - PAD.r)
const sy = (sync: number) => H - PAD.b - sync * (H - PAD.t - PAD.b)

interface Point {
  meta: PatternMeta
  x: number
  y: number
}

/** Places patterns by density and syncopation; identical coordinates fan out on a small ring so every dot stays clickable. */
function layout(patterns: PatternMeta[]): Point[] {
  const groups = new Map<string, PatternMeta[]>()
  for (const p of patterns) {
    const k = `${p.notes_per_bar}|${p.syncopation}`
    groups.set(k, [...(groups.get(k) ?? []), p])
  }
  const out: Point[] = []
  for (const list of groups.values()) {
    list.forEach((p, i) => {
      const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2
      const r = list.length > 1 ? 11 : 0
      out.push({ meta: p, x: sx(p.notes_per_bar) + Math.cos(angle) * r, y: sy(p.syncopation) + Math.sin(angle) * r })
    })
  }
  return out
}

export function GrooveMap() {
  const { manifest, selected, select } = usePack()
  const { mode } = useTheme()
  const [hover, setHover] = useState<PatternMeta | null>(null)
  const [focusFamily, setFocusFamily] = useState<Family | null>(null)
  const points = useMemo(() => (manifest ? layout(manifest.patterns) : []), [manifest])
  const counts = useMemo(() => {
    const c: Partial<Record<Family, number>> = {}
    manifest?.patterns.forEach((p) => (c[p.family] = (c[p.family] ?? 0) + 1))
    return c
  }, [manifest])
  const shown = hover ?? selected

  return (
    <Section
      id="map"
      eyebrow="02 · Groove map"
      title="Fifty grooves, plotted by how busy and how off-grid they are."
      lede="Horizontal is note density per bar. Vertical is a syncopation index: the share of onsets that miss the quarter-note grid, with 16ths weighted heavier than offbeat 8ths. Both numbers are computed from the rendered notes, not hand-tagged."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="surface overflow-hidden p-2 sm:p-4">
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[640px]" role="img" aria-label="Scatter plot of the 50 patterns by density and syncopation">
              <defs>
                <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                <g key={v}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke="var(--roll-grid)" strokeWidth={1} />
                  <text x={PAD.l - 10} y={sy(v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground font-mono text-[12px]">{v.toFixed(2)}</text>
                </g>
              ))}
              {[1, 2, 4, 8, 12, 16].map((v) => (
                <g key={v}>
                  <line x1={sx(v)} x2={sx(v)} y1={PAD.t} y2={H - PAD.b} stroke="var(--roll-grid)" strokeWidth={1} />
                  <text x={sx(v)} y={H - PAD.b + 20} textAnchor="middle" className="fill-muted-foreground font-mono text-[12px]">{v}</text>
                </g>
              ))}
              <text x={(W + PAD.l) / 2} y={H - 10} textAnchor="middle" className="fill-muted-foreground font-mono text-[12px] uppercase tracking-widest">notes per bar (square-root scale)</text>
              <text transform={`translate(16 ${(H - PAD.b + PAD.t) / 2}) rotate(-90)`} textAnchor="middle" className="fill-muted-foreground font-mono text-[12px] uppercase tracking-widest">syncopation index</text>

              {[
                ['Sparse, on the grid', sx(1.4), sy(0.06), 'start'],
                ['Sparse, off the grid', sx(1.4), sy(0.95), 'start'],
                ['Dense, driving', sx(15.5), sy(0.06), 'end'],
                ['Dense, broken', sx(15.5), sy(0.95), 'end'],
              ].map(([label, x, y, anchor]) => (
                <text key={label as string} x={x as number} y={y as number} textAnchor={anchor as 'start' | 'end'} className="fill-[color:var(--muted-foreground)] font-mono text-[11px] uppercase tracking-[0.2em] opacity-60">
                  {label}
                </text>
              ))}

              {points.map(({ meta, x, y }, i) => {
                const color = familyColor(meta.family, mode)
                const dim = focusFamily && focusFamily !== meta.family
                const isSel = selected?.id === meta.id
                const r = meta.bars === 4 ? 9 : meta.bars === 2 ? 7 : 5.5
                return (
                  <motion.g
                    key={meta.id}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.012, type: 'spring', stiffness: 260, damping: 18 }}
                    style={{ transformOrigin: `${x}px ${y}px` }}
                    className="cursor-pointer outline-none"
                    tabIndex={0}
                    role="button"
                    aria-label={`${meta.id} ${meta.name}: ${meta.notes_per_bar} notes per bar, syncopation ${meta.syncopation}`}
                    onMouseEnter={() => setHover(meta)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(meta)}
                    onBlur={() => setHover(null)}
                    onClick={() => select(meta.id, { scroll: true })}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(meta.id, { scroll: true }))}
                  >
                    <g style={{ opacity: dim ? 0.15 : 1, transition: 'opacity 200ms ease' }}>
                      {isSel && <circle cx={x} cy={y} r={r + 7} fill="none" stroke={color} strokeWidth={2} strokeDasharray="3 3" className="flow-dash" />}
                      <circle cx={x} cy={y} r={r} fill={color} fillOpacity={meta.legato ? 0.35 : 0.85} stroke={color} strokeWidth={meta.legato ? 2.5 : 1} filter={isSel || hover?.id === meta.id ? 'url(#dot-glow)' : undefined} />
                    </g>
                  </motion.g>
                )
              })}
            </svg>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="surface min-h-[176px] p-4" aria-live="polite">
            {shown ? (
              <>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{shown.id} · {shown.bpm} BPM · {shown.bars} bar</p>
                <p className="mt-1 text-lg font-semibold text-[color:var(--heading)]">{shown.name}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">density {shown.notes_per_bar} · syncopation {shown.syncopation}</p>
                <p className="mt-2 line-clamp-3 text-sm">{shown.groove}</p>
              </>
            ) : (
              <div className="shimmer h-full min-h-[140px] rounded" />
            )}
          </div>
          <div className="surface p-4">
            <p className="eyebrow mb-3">Families · hover to isolate</p>
            <ul className="space-y-1">
              {FAMILIES.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setFocusFamily(f.id)}
                    onMouseLeave={() => setFocusFamily(null)}
                    onFocus={() => setFocusFamily(f.id)}
                    onBlur={() => setFocusFamily(null)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: f[mode] }} />{f.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">{counts[f.id] ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">Dot size is loop length (1, 2, 4 bars). Hollow dots are legato patterns with intentional overlaps.</p>
          </div>
        </aside>
      </div>
    </Section>
  )
}
