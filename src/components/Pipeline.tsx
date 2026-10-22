import { motion } from 'motion/react'
import { Boxes, FileCode2, Music2, PackageCheck, Rocket, ShieldCheck } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { Section } from '@/components/Section'
import { formatBeats, noteName } from '@/lib/data'
import { usePack } from '@/pack-context'

interface Stage {
  icon: ComponentType<{ className?: string }>
  title: string
  artifact: string
  body: string
}

const STAGES: Stage[] = [
  {
    icon: Music2, title: 'Compose', artifact: 'generator/basement_protocol.py',
    body: '50 hand-written Pattern objects: step strings, intervals, key, tempo, gate, swing. An out-of-scale note that is not declared as chromatic stops the build.',
  },
  {
    icon: FileCode2, title: 'Render', artifact: 'render()',
    body: 'The step language becomes ticks at 480 PPQ. Slides overlap the next note by 30 ticks. Swing is a monotonic time warp, so it can never create an overlap.',
  },
  {
    icon: Boxes, title: 'Encode', artifact: 'build_smf()',
    body: 'Format 0 files with track name, tempo, and 4/4 meta. Note-offs sort before note-ons on shared ticks. End-of-track lands exactly on the loop boundary.',
  },
  {
    icon: ShieldCheck, title: 'Validate', artifact: 'validate.py · validate-tonejs.mjs',
    body: 'mido re-parses every file for 12 checks. @tonejs/midi parses them again in Node and compares every note against the CSV.',
  },
  {
    icon: PackageCheck, title: 'Package', artifact: 'CSVs · manifest · ZIP',
    body: 'Index CSV, note-events CSV, manifest, and README are zipped. Each ZIP member is hash-checked against the validated file.',
  },
  {
    icon: Rocket, title: 'Ship', artifact: 'Vite · gh-pages',
    body: 'This site is a static build. A deploy guard allows only web file types in dist before it is pushed to the gh-pages branch.',
  },
]

const DSL = [
  ['X', 'accent note', 'var(--note-accent)'],
  ['x', 'normal note', 'var(--note)'],
  ['o', 'ghost (short, soft)', 'var(--muted-foreground)'],
  ['S s', 'slide into next note', 'var(--note-legato)'],
  ['-', 'hold previous step', 'var(--foreground)'],
  ['.', 'rest', 'var(--muted-foreground)'],
] as const

const BP44_STEPS = 'XxsxX.xsxX.xsXxx'

export function Pipeline() {
  return (
    <Section
      id="pipeline"
      eyebrow="05 · Pipeline"
      title="From a line of text to a validated MIDI file."
      lede="Nothing in the pack was drawn by hand in a piano roll. Each pattern is a short step string plus a list of intervals, rendered by a dependency-free Python script and checked by two parsers that share no code with it."
    >
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {STAGES.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="surface relative flex flex-col p-4"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary"><s.icon className="size-4.5" /></span>
              <span className="font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
            <p className="mt-0.5 truncate font-mono text-[11px] text-primary" title={s.artifact}>{s.artifact}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            {i < STAGES.length - 1 && (
              <svg className="absolute top-1/2 -right-3 z-10 hidden h-3 w-6 -translate-y-1/2 xl:block" viewBox="0 0 24 12" aria-hidden="true">
                <line x1="0" y1="6" x2="18" y2="6" stroke="var(--primary)" strokeWidth="2" className="flow-dash" />
                <path d="M16 1 L23 6 L16 11" fill="none" stroke="var(--primary)" strokeWidth="2" />
              </svg>
            )}
          </motion.li>
        ))}
      </ol>
      <Decoder />
    </Section>
  )
}

function Decoder() {
  const { manifest, parsed } = usePack()
  const [hover, setHover] = useState<number | null>(null)
  const meta = manifest?.patterns.find((p) => p.id === 'BP44')
  const file = meta ? parsed[meta.id] : undefined
  const noteSteps = [...BP44_STEPS].map((c, i) => ('XxoSs'.includes(c) ? i : -1)).filter((i) => i >= 0)
  const noteIndexForStep = (step: number) => noteSteps.indexOf(step)

  return (
    <div className="surface mt-6 grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <p className="eyebrow mb-2">Live decoder · BP44 Acid Rain, bar 1</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Hover a step to see the note it became in the real file. The bottom row is read back from <span className="mono">BP44_acid-rain-Cursor.mid</span>, not from the source string.
        </p>
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[560px] grid-cols-16 gap-1">
            {[...BP44_STEPS].map((c, i) => {
              const ni = noteIndexForStep(i)
              const active = hover === i
              return (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`Step ${i + 1}: ${c}`}
                  className={`flex h-12 flex-col items-center justify-center rounded-md border font-mono text-base transition-all ${active ? 'scale-105 border-primary bg-primary/15' : 'border-border bg-muted/50'} ${i % 4 === 0 ? 'ring-1 ring-primary/20' : ''}`}
                  style={{ color: c === 'X' ? 'var(--note-accent)' : 'Ss'.includes(c) ? 'var(--note-legato)' : c === '.' ? 'var(--muted-foreground)' : 'var(--note)' }}
                >
                  {c}
                  <span className="text-[9px] text-muted-foreground">{ni >= 0 ? ni + 1 : ''}</span>
                </button>
              )
            })}
            {[...BP44_STEPS].map((_, i) => {
              const ni = noteIndexForStep(i)
              const n = ni >= 0 ? file?.notes[ni] : undefined
              const active = hover === i
              return (
                <div key={`n${i}`} className={`flex h-16 flex-col items-center justify-center rounded-md border text-center font-mono text-[10px] leading-tight transition-colors ${active ? 'border-primary bg-primary/10 text-foreground' : 'border-transparent text-muted-foreground'}`}>
                  {n ? (
                    <>
                      <span className="text-[11px] text-foreground">{noteName(n.midi, meta?.spelling === 'flat')}</span>
                      <span>v{n.velocity}</span>
                      <span>{formatBeats(n.durationTicks, file!.ppq)}b</span>
                    </>
                  ) : ni >= 0 ? <span className="shimmer h-8 w-full rounded" /> : <span aria-hidden="true">·</span>}
                </div>
              )
            })}
          </div>
        </div>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-[color:var(--roll-bg)] p-3 font-mono text-xs leading-relaxed text-foreground">
{`P("BP44", "Acid Rain", "acid", 130, 33, "phrygian",
  ["${BP44_STEPS}"],
  [0, 0, 12, 10, 0, 12, 1, 0, 13, 0, 7, 12, 0, 3],
  gate=0.5, vel=(127, 96, 76))`}
        </pre>
      </div>
      <div>
        <p className="eyebrow mb-3">Step language</p>
        <ul className="space-y-2">
          {DSL.map(([sym, label, color]) => (
            <li key={sym} className="flex items-center gap-3 text-sm">
              <span className="flex h-7 w-10 items-center justify-center rounded border border-border bg-muted/50 font-mono" style={{ color }}>{sym}</span>
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Grids: 4 steps per beat (16ths), 3 (8th triplets), 6 (16th triplets), or 8 (32nds). Root 33 is A1, and intervals are semitones above it, so 13 is the Phrygian Bb an octave up. Gate 0.5 makes normal notes half a step long.
        </p>
      </div>
    </div>
  )
}
