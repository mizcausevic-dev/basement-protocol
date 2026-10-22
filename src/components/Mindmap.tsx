import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Section } from '@/components/Section'
import { FAMILIES, familyColor } from '@/lib/families'
import { useTheme } from '@/lib/theme'
import type { Family, PatternMeta } from '@/lib/types'
import { usePack } from '@/pack-context'

const W = 1200
const H = 1000
const CX = W / 2
const CY = H / 2
const R_FAMILY = 175
const R_LEAF = 338
const polar = (r: number, a: number) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r] as const

interface Leaf {
  meta: PatternMeta
  angle: number
}
interface Branch {
  family: Family
  label: string
  angle: number
  leaves: Leaf[]
}

function buildTree(patterns: PatternMeta[]): Branch[] {
  const groups = FAMILIES.map((f) => ({ f, list: patterns.filter((p) => p.family === f.id) })).filter((g) => g.list.length)
  const slots = patterns.length + groups.length
  const step = (Math.PI * 2) / slots
  let cursor = -Math.PI / 2 - step * 3.5
  return groups.map(({ f, list }) => {
    const leaves = list.map((meta) => {
      const leaf = { meta, angle: cursor }
      cursor += step
      return leaf
    })
    cursor += step
    const mid = (leaves[0].angle + leaves[leaves.length - 1].angle) / 2
    return { family: f.id, label: f.label, angle: mid, leaves }
  })
}

export function Mindmap() {
  const { manifest, report, selected, select } = usePack()
  const { mode } = useTheme()
  const [focus, setFocus] = useState<Family | null>(null)
  const tree = useMemo(() => (manifest ? buildTree(manifest.patterns) : []), [manifest])

  const corners = [
    { x: 24, y: 24, title: 'Conventions', lines: ['MIDI 60 = C4 (scientific pitch)', '480 PPQ · 4/4 · beats from 0', 'Monophonic unless legato-labeled'] },
    { x: W - 264, y: 24, title: 'Deliverables', lines: ['50 Standard MIDI Files', 'Index CSV + note-events CSV', 'ZIP · manifest · report'] },
    {
      x: 24, y: H - 132, title: 'Validation',
      lines: [
        'mido + @tonejs/midi, independently',
        report ? `${report.summary.passed}/${report.summary.checks} checks + cross-parse` : 'Checks + cross-parse',
        report ? `${report.summary.note_events} notes matched to CSV` : 'Notes matched to CSV',
      ],
    },
    { x: W - 264, y: H - 132, title: 'Sound design', lines: ['Kept out of the MIDI', 'Four preview patches here', 'Glide only where notes overlap'] },
  ]

  return (
    <Section
      id="mindmap"
      eyebrow="03 · Mindmap"
      title="The whole collection on one page."
      lede="Seven groove families branch from the core, and every pattern hangs off its family. The four corners hold the rules the pack is built on. Click any pattern to load it in the lab."
    >
      <div className="surface overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[1100px] min-w-[760px]" role="img" aria-label="Radial mindmap of the Basement Protocol collection">
            <defs>
              <radialGradient id="mm-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={CX} cy={CY} r={R_LEAF + 6} fill="none" stroke="var(--roll-grid)" strokeDasharray="2 6" />
            <circle cx={CX} cy={CY} r={R_FAMILY} fill="none" stroke="var(--roll-grid)" strokeDasharray="2 6" />

            {corners.map((c) => {
              const tx = c.x + 120
              const ty = c.y + 54
              return (
                <path key={c.title} d={`M ${CX} ${CY} Q ${(CX + tx) / 2} ${ty} ${tx} ${ty}`} fill="none" stroke="var(--muted-foreground)" strokeOpacity={0.35} strokeWidth={1.2} className="flow-dash" />
              )
            })}

            {tree.map((b) => {
              const [fx, fy] = polar(R_FAMILY, b.angle)
              const color = familyColor(b.family, mode)
              const dim = focus && focus !== b.family
              return (
                <g key={b.family} style={{ opacity: dim ? 0.18 : 1, transition: 'opacity 200ms ease' }}>
                  <motion.path
                    d={`M ${CX} ${CY} L ${fx} ${fy}`}
                    stroke={color}
                    strokeWidth={2.5}
                    strokeOpacity={0.7}
                    fill="none"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                  {b.leaves.map((l, i) => {
                    const [lx, ly] = polar(R_LEAF, l.angle)
                    const [qx, qy] = polar(R_FAMILY + 70, l.angle)
                    const isSel = selected?.id === l.meta.id
                    const deg = (l.angle * 180) / Math.PI
                    const flip = Math.cos(l.angle) < 0
                    const [tx, ty] = polar(R_LEAF + 14, l.angle)
                    return (
                      <g
                        key={l.meta.id}
                        className="cursor-pointer outline-none"
                        tabIndex={0}
                        role="button"
                        aria-label={`${l.meta.id} ${l.meta.name}`}
                        onClick={() => select(l.meta.id, { scroll: true })}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select(l.meta.id, { scroll: true }))}
                        onMouseEnter={() => setFocus(b.family)}
                        onMouseLeave={() => setFocus(null)}
                      >
                        <motion.path
                          d={`M ${fx} ${fy} Q ${qx} ${qy} ${lx} ${ly}`}
                          stroke={color}
                          strokeWidth={isSel ? 2.4 : 1.2}
                          strokeOpacity={isSel ? 1 : 0.45}
                          fill="none"
                          initial={{ pathLength: 0 }}
                          whileInView={{ pathLength: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, delay: 0.5 + i * 0.03, ease: 'easeOut' }}
                        />
                        <circle cx={lx} cy={ly} r={isSel ? 7 : 4.5} fill={isSel ? color : 'var(--card)'} stroke={color} strokeWidth={2} />
                        <text
                          x={tx}
                          y={ty}
                          transform={`rotate(${flip ? deg + 180 : deg} ${tx} ${ty})`}
                          textAnchor={flip ? 'end' : 'start'}
                          dominantBaseline="middle"
                          className="font-mono text-[12px]"
                          fill={isSel ? color : 'var(--foreground)'}
                          fontWeight={isSel ? 700 : 400}
                        >
                          <tspan fill={color}>{l.meta.id}</tspan> {l.meta.name}
                        </text>
                      </g>
                    )
                  })}
                  <g onMouseEnter={() => setFocus(b.family)} onMouseLeave={() => setFocus(null)}>
                    <circle cx={fx} cy={fy} r={34} fill="var(--card)" stroke={color} strokeWidth={2.5} />
                    <text x={fx} y={fy - 4} textAnchor="middle" className="text-[13px] font-semibold" fill="var(--heading)">{b.label}</text>
                    <text x={fx} y={fy + 12} textAnchor="middle" className="font-mono text-[11px]" fill={color}>{b.leaves.length}</text>
                  </g>
                </g>
              )
            })}

            <circle cx={CX} cy={CY} r={110} fill="url(#mm-core)" />
            <circle cx={CX} cy={CY} r={68} fill="var(--card)" stroke="var(--primary)" strokeWidth={2.5} />
            <path d={`M ${CX - 40} ${CY - 2} C ${CX - 30} ${CY - 2}, ${CX - 30} ${CY - 26}, ${CX - 18} ${CY - 26} S ${CX - 6} ${CY + 14}, ${CX + 6} ${CY + 14} S ${CX + 18} ${CY - 14}, ${CX + 30} ${CY - 14} S ${CX + 38} ${CY - 2}, ${CX + 42} ${CY - 2}`} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" />
            <text x={CX} y={CY + 34} textAnchor="middle" className="text-[13px] font-bold" fill="var(--heading)">Basement Protocol</text>
            <text x={CX} y={CY + 50} textAnchor="middle" className="font-mono text-[11px]" fill="var(--muted-foreground)">{manifest?.patterns.length ?? 50} patterns</text>

            {corners.map((c) => (
              <g key={c.title}>
                <rect x={c.x} y={c.y} width={240} height={108} rx={12} fill="var(--card)" stroke="var(--border)" strokeWidth={1.5} />
                <text x={c.x + 16} y={c.y + 26} className="font-mono text-[11px] uppercase tracking-[0.18em]" fill="var(--primary)">{c.title}</text>
                {c.lines.map((line, i) => (
                  <text key={line} x={c.x + 16} y={c.y + 50 + i * 19} className="text-[13px]" fill="var(--foreground)">{line}</text>
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground lg:hidden">Scroll sideways to see the full map.</p>
    </Section>
  )
}
