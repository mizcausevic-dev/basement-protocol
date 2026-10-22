import { motion, useMotionValue, useSpring } from 'motion/react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useEffect, useState, type PointerEvent } from 'react'
import { EVENTS_CSV, INDEX_CSV, PACK_BASE, ZIP_FILE } from '@/lib/data'
import { usePack } from '@/pack-context'

function useFileSize(url: string) {
  const [size, setSize] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        const n = Number(r.headers.get('content-length'))
        if (alive && r.ok && n > 0) setSize(n)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [url])
  return size
}

export function DropBand() {
  const { manifest } = usePack()
  const zipSize = useFileSize(ZIP_FILE)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 300, damping: 15, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 300, damping: 15, mass: 0.4 })

  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType === 'touch') return
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * 0.3)
    y.set((e.clientY - (r.top + r.height / 2)) * 0.3)
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <section className="px-3 py-10 sm:px-6 lg:px-8" aria-labelledby="drop-title">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[calc(var(--radius)*2)] border border-white/10 bg-[#05070a] text-[#d7dee2]">
        <img src="images/illus-bigroom.webp" alt="Illustration of a warehouse crowd under cyan laser beams, with a glowing ring of sound around the stage" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/70 to-[#05070a]/30" />
        <div className="relative grid gap-8 px-5 py-14 sm:px-10 sm:py-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-14">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#66fcf1]">The drop</p>
            <h2 id="drop-title" className="mt-3 text-3xl font-bold leading-[1.02] !text-white sm:text-5xl">Take all fifty into your session.</h2>
            <p className="mt-4 text-base leading-relaxed text-[#b9c4c9] sm:text-lg">
              One ZIP with {manifest?.patterns.length ?? 50} Standard MIDI Files, the pattern index, the note-event table, and a README with the
              conventions. Royalty-free for use in your own tracks.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <a className="inline-flex items-center gap-1.5 text-[#c5d3d8] hover:text-[#66fcf1]" href={INDEX_CSV} download><FileSpreadsheet className="size-4" /> Pattern index CSV</a>
              <a className="inline-flex items-center gap-1.5 text-[#c5d3d8] hover:text-[#66fcf1]" href={EVENTS_CSV} download><FileSpreadsheet className="size-4" /> Note-events CSV</a>
              <a className="inline-flex items-center gap-1.5 text-[#c5d3d8] hover:text-[#66fcf1]" href={`${PACK_BASE}PACK-README-Cursor.txt`}><FileText className="size-4" /> Pack README</a>
            </div>
          </div>
          <motion.a
            href={ZIP_FILE}
            download
            onPointerMove={onMove}
            onPointerLeave={reset}
            style={{ x: sx, y: sy }}
            className="pulse-glow group inline-flex h-16 items-center justify-center gap-3 self-start rounded-2xl bg-[#66fcf1] px-8 text-base font-bold text-[#0b0c10] shadow-[0_20px_60px_-20px_rgba(102,252,241,0.7)] lg:self-end"
          >
            <Download className="size-5 transition-transform group-hover:translate-y-0.5" />
            Download the ZIP
            {zipSize && <span className="font-mono text-xs font-medium opacity-70">{(zipSize / 1024).toFixed(1)} KB</span>}
          </motion.a>
        </div>
      </div>
    </section>
  )
}
