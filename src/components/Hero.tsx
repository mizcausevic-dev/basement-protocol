import { motion, useMotionValue, useSpring } from 'motion/react'
import { Download, Pause, Play, ShieldCheck } from 'lucide-react'
import { useRef, type PointerEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Counter } from '@/components/Counter'
import { usePack } from '@/pack-context'
import { ZIP_FILE } from '@/lib/data'

export function Hero() {
  const { manifest, report, playing, togglePlay, selected } = usePack()
  const stageRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(-200)
  const y = useMotionValue(-200)
  const sx = useSpring(x, { stiffness: 320, damping: 18, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 320, damping: 18, mass: 0.6 })

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current
    if (!el || e.pointerType === 'touch') return
    const r = el.getBoundingClientRect()
    x.set(e.clientX - r.left - 60)
    y.set(e.clientY - r.top - 60)
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  const bpms = manifest?.patterns.map((p) => p.bpm) ?? []
  const notes = manifest?.patterns.reduce((s, p) => s + p.note_count, 0) ?? 0
  const checks = report ? report.summary.passed + (report.second_parser?.status === 'pass' ? 1 : 0) : 0
  const totalChecks = report ? report.summary.checks + (report.second_parser ? 1 : 0) : 0

  return (
    <section className="px-3 pt-4 sm:px-6 lg:px-8" aria-labelledby="hero-title">
      <div
        ref={stageRef}
        onPointerMove={onMove}
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[calc(var(--radius)*2)] border border-white/10 bg-[#07080b] text-[#d7dee2]"
      >
        <img
          src="images/hero-basement.webp"
          alt="Illustration of a concrete basement club where a speaker stack sends glowing sub-bass waves over a crowd"
          className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-90"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080b] via-[#07080b]/85 to-[#07080b]/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080b] via-transparent to-transparent" />
        <div className="spotlight pointer-events-none absolute inset-0" />
        <motion.div
          aria-hidden="true"
          style={{ x: sx, y: sy }}
          className="pointer-events-none absolute left-0 top-0 hidden size-[120px] rounded-full border border-[#66fcf1]/50 shadow-[0_0_40px_rgba(102,252,241,0.35)] md:block"
        />

        <div className="relative z-10 grid min-h-[620px] items-end px-5 pb-8 pt-20 sm:px-10 sm:pb-12 lg:min-h-[680px] lg:px-14">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#66fcf1]/30 bg-black/40 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#66fcf1]"
            >
              <span className="flicker size-1.5 rounded-full bg-[#ff2d55]" />
              50 MIDI basslines · free download
            </motion.p>
            <motion.h1
              id="hero-title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-[2.6rem] font-bold leading-[0.95] !text-white sm:text-6xl lg:text-7xl"
            >
              Fifty basslines built for the{' '}
              <span className="bg-gradient-to-r from-[#66fcf1] via-[#d6ff3f] to-[#45a29e] bg-clip-text text-transparent">basement.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 max-w-xl text-base leading-relaxed text-[#b9c4c9] sm:text-lg"
            >
              Basement Protocol is a pack of 50 hand-composed, monophonic bassline loops for techno, acid, DnB, bassline house,
              and the darker rooms in between. Audition every file here, then drag the same MIDI into your DAW.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button size="lg" onClick={togglePlay} disabled={!selected} className={`h-11 px-5 text-sm font-semibold ${playing ? 'pulse-glow' : ''}`}>
                {playing ? <Pause /> : <Play />}
                {playing ? 'Stop' : `Play ${selected?.id ?? ''} ${selected?.name ?? ''}`}
              </Button>
              <a
                href={ZIP_FILE}
                download
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur transition hover:border-[#66fcf1]/60 hover:bg-white/10"
              >
                <Download className="size-4" /> Download the pack
              </a>
              <a href="#validation" className="inline-flex items-center gap-1.5 text-sm text-[#8fa3ab] hover:text-[#66fcf1]">
                <ShieldCheck className="size-4" /> {checks ? `${checks}/${totalChecks} validation checks passed` : 'Validation report'}
              </a>
            </motion.div>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-5">
            {[
              { label: 'Patterns', node: <Counter to={manifest?.patterns.length ?? 0} /> },
              { label: 'Note events', node: <Counter to={notes} /> },
              { label: 'BPM range', node: bpms.length ? <><Counter to={Math.min(...bpms)} />–<Counter to={Math.max(...bpms)} /></> : '—' },
              { label: 'Groove families', node: <Counter to={manifest?.families.length ?? 0} /> },
              { label: 'Independent parsers', node: <Counter to={report?.second_parser ? 2 : report ? 1 : 0} /> },
            ].map((s) => (
              <div key={s.label} className="bg-[#0b0d11]/85 px-4 py-4 backdrop-blur">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7f939b]">{s.label}</dt>
                <dd className="mt-1 font-mono text-2xl font-semibold text-white sm:text-3xl">{s.node}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
