import { motion } from 'motion/react'
import { Check, Waves } from 'lucide-react'
import { useMemo } from 'react'
import { PRESETS, type PresetId } from '@/audio/engine'
import { Section } from '@/components/Section'
import { familyColor } from '@/lib/families'
import { useTheme } from '@/lib/theme'
import { usePack } from '@/pack-context'

const PATCH_NOTES: Record<PresetId, { match: RegExp; recipe: string[] }> = {
  sub: {
    match: /\bsine\b|\bsub\b/i,
    recipe: ['Sine or triangle, mono', 'Low-pass around 200 Hz, soft saturation', 'Short release so rests stay silent'],
  },
  acid: {
    match: /303|acid|resonan/i,
    recipe: ['Saw or square into a resonant low-pass', 'Map velocity to filter envelope depth', 'Legato mode so overlaps glide'],
  },
  reese: {
    match: /reese|detun/i,
    recipe: ['Two saws detuned 10 to 20 cents', 'Separate clean sine sub under 100 Hz', 'Slow filter or phaser movement'],
  },
  growl: {
    match: /distort|growl|drive|fm|square|bite/i,
    recipe: ['Square plus saw, drive before the filter', 'Fast envelope, low sustain', 'High-pass the drive, keep the sub clean'],
  },
}

export function SoundDesign() {
  const { manifest, preset, setPreset, select } = usePack()
  const { mode } = useTheme()
  const suits = useMemo(() => {
    const out = {} as Record<PresetId, { id: string; name: string; family: string }[]>
    for (const id of Object.keys(PATCH_NOTES) as PresetId[]) {
      out[id] = (manifest?.patterns ?? []).filter((p) => PATCH_NOTES[id].match.test(p.sound)).slice(0, 6)
    }
    return out
  }, [manifest])

  return (
    <Section
      id="sound"
      eyebrow="04 · Sound design"
      title="The MIDI is the score. The patch is the sound."
      lede="No synth settings are baked into the files. Each pattern carries a separate sound suggestion, and the lab offers four basic preview patches so you can hear how the same notes change character."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <motion.figure
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7 }}
          className="surface relative overflow-hidden p-0"
        >
          <img src="images/illus-cymatics.webp" alt="Illustration of sand forming a radial cymatics pattern on a vibrating speaker cone, crossed by a glowing sine wave" loading="lazy" className="h-72 w-full object-cover sm:h-96 lg:h-full" />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-5 pt-16 text-[#d7dee2]">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#66fcf1]">Three rules the files follow</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li><span className="text-[#66fcf1]">Glide is never assumed.</span> Only the five legato patterns overlap notes, by 30 ticks.</li>
              <li><span className="text-[#66fcf1]">Velocity is a bonus.</span> Accents and ghosts add shape, but every groove holds at a fixed velocity.</li>
              <li><span className="text-[#66fcf1]">Range stays low.</span> Every note sits between C#1 and C4 (MIDI 25 to 60).</li>
            </ul>
          </figcaption>
        </motion.figure>

        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(PATCH_NOTES) as PresetId[]).map((id, i) => {
            const active = preset === id
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className={`surface relative flex flex-col overflow-hidden p-4 ${active ? '!border-primary' : ''}`}
              >
                {id === 'acid' && (
                  <img src="images/illus-acid.webp" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.13]" />
                )}
                <div className="relative flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 text-lg font-semibold text-[color:var(--heading)]"><Waves className="size-4 text-primary" /> {PRESETS[id].label}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{PRESETS[id].blurb}</p>
                  </div>
                </div>
                <ul className="relative mt-3 space-y-1 text-sm">
                  {PATCH_NOTES[id].recipe.map((r) => (
                    <li key={r} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />{r}</li>
                  ))}
                </ul>
                {suits[id]?.length > 0 && (
                  <div className="relative mt-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Suggested for</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {suits[id].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setPreset(id); select(p.id, { scroll: true }) }}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[11px] transition-colors hover:border-primary hover:text-primary"
                          title={`${p.name}: load with the ${PRESETS[id].label} patch`}
                        >
                          <span className="size-1.5 rounded-full" style={{ background: familyColor(p.family as never, mode) }} />
                          {p.id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setPreset(id)}
                  aria-pressed={active}
                  className={`relative mt-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary hover:text-primary'}`}
                >
                  {active ? <><Check className="size-4" /> Preview patch in use</> : 'Use as preview patch'}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
