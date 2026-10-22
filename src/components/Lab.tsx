import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Download, FileAudio2, Pause, Play, RotateCcw, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type PointerEvent } from 'react'
import { engine, PRESETS, type PresetId } from '@/audio/engine'
import { MiniRoll } from '@/components/MiniRoll'
import { Oscilloscope } from '@/components/Oscilloscope'
import { PianoRoll } from '@/components/PianoRoll'
import { Section } from '@/components/Section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatBeats, midiUrl, noteName } from '@/lib/data'
import { FAMILIES, FAMILY_BY_ID, familyColor, SCALE_INTERVALS } from '@/lib/families'
import { useTheme } from '@/lib/theme'
import type { Family, ParsedPattern, PatternMeta } from '@/lib/types'
import { usePack } from '@/pack-context'

const getPosition = () => engine.position()
const first = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : (v as number))

interface Filters {
  query: string
  families: Family[]
  bars: string
  legatoOnly: boolean
}

function matches(p: PatternMeta, f: Filters) {
  if (f.families.length && !f.families.includes(p.family)) return false
  if (f.bars !== 'any' && String(p.bars) !== f.bars) return false
  if (f.legatoOnly && !p.legato) return false
  const q = f.query.trim().toLowerCase()
  if (!q) return true
  return [p.id, p.name, p.key, p.groove, p.sound, p.family, ...p.tags, String(p.bpm)].join(' ').toLowerCase().includes(q)
}

export function Lab() {
  const { manifest, parsed, error } = usePack()
  const [filters, setFilters] = useState<Filters>({ query: '', families: [], bars: 'any', legatoOnly: false })
  const visible = useMemo(() => manifest?.patterns.filter((p) => matches(p, filters)) ?? [], [manifest, filters])

  return (
    <Section
      id="lab"
      eyebrow="01 · Pattern lab"
      title={<>Audition all fifty. <span className="text-primary">Hear the file, not a mockup.</span></>}
      lede="Every loop below is fetched as the real .mid file and parsed in your browser, then played through a small Web Audio bass synth. What you see in the piano roll is exactly what lands in your DAW."
    >
      {error && (
        <p role="alert" className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}. Refresh to retry, or grab the ZIP from the download band below.
        </p>
      )}
      <Player visible={visible} />
      <Browser filters={filters} setFilters={setFilters} visible={visible} parsed={parsed} total={manifest?.patterns.length ?? 0} />
    </Section>
  )
}

function Player({ visible }: { visible: PatternMeta[] }) {
  const { selected, parsed, playing, togglePlay, select, bpm, setBpm, manifest, preset, setPreset } = usePack()
  const [drums, setDrums] = useState(engine.drumsOn)
  const [glide, setGlide] = useState(engine.glideOnOverlap)
  const [velocity, setVelocity] = useState(engine.velocitySensitive)
  const [volume, setVolume] = useState(engine.volume)
  const [showNotes, setShowNotes] = useState(false)
  const file = selected ? parsed[selected.id] : undefined

  const step = useCallback((dir: 1 | -1) => {
    if (!manifest || !selected) return
    const list = visible.some((p) => p.id === selected.id) ? visible : manifest.patterns
    const i = list.findIndex((p) => p.id === selected.id)
    const next = list[(i + dir + list.length) % list.length]
    if (next) select(next.id)
  }, [manifest, selected, visible, select])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (t && (t.closest('input, textarea, select, button, a, [role="slider"], [role="listbox"], [role="option"], [contenteditable="true"]'))) return
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowRight' || e.key === 'k') step(1)
      else if (e.key === 'ArrowLeft' || e.key === 'j') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, step])

  if (!selected) {
    return <div className="surface shimmer h-[520px]" aria-busy="true" aria-label="Loading the player" />
  }

  const fam = FAMILY_BY_ID[selected.family]
  const loopTicks = file ? selected.loop_beats * file.ppq : 0

  return (
    <div className={`surface relative overflow-hidden p-0 ${playing ? 'gradient-border' : ''}`}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 border-b border-border p-4 sm:p-6 lg:border-r lg:border-b-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex flex-wrap items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="rounded border border-border px-1.5 py-0.5 text-foreground">{selected.id}</span>
                  <FamilyChip family={selected.family} />
                  {selected.legato && <span className="rounded px-1.5 py-0.5 text-[color:var(--note-legato)] ring-1 ring-current/40">legato</span>}
                  {selected.chromatic.length > 0 && <span className="rounded px-1.5 py-0.5 text-[color:var(--note-chromatic)] ring-1 ring-current/40">chromatic</span>}
                </div>
                <h3 className="truncate text-2xl font-bold sm:text-3xl">{selected.name}</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground sm:text-sm">
                  {selected.key} · {selected.bpm} BPM · {selected.bars} {selected.bars === 1 ? 'bar' : 'bars'} · {selected.grid} grid
                  {selected.swing !== 50 ? ` · swing ${selected.swing}%` : ''} · {selected.range}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" aria-label="Previous pattern" onClick={() => step(-1)}><ChevronLeft /></Button>
                <Button
                  size="lg"
                  onClick={togglePlay}
                  aria-label={playing ? 'Stop playback' : `Play ${selected.name}`}
                  className={`h-10 min-w-28 px-4 font-semibold ${playing ? 'pulse-glow' : ''}`}
                >
                  {playing ? <Pause /> : <Play />} {playing ? 'Stop' : 'Play'}
                </Button>
                <Button variant="outline" size="icon" aria-label="Next pattern" onClick={() => step(1)}><ChevronRight /></Button>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="relative mt-5 overflow-hidden rounded-xl border border-border">
            {file ? (
              <PianoRoll
                notes={file.notes}
                ppq={file.ppq}
                loopBeats={selected.loop_beats}
                root={selected.root_midi}
                scale={SCALE_INTERVALS[selected.scale] ?? []}
                flats={selected.spelling === 'flat'}
                getPosition={getPosition}
                playing={playing}
                className="block h-64 w-full sm:h-80"
              />
            ) : (
              <div className="shimmer h-64 sm:h-80" aria-label="Loading MIDI file" />
            )}
            <div className="pointer-events-none absolute right-2 bottom-2 flex flex-wrap justify-end gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Legend color="var(--note)" label="note" />
              <Legend color="var(--note-accent)" label="accent ≥115" />
              <Legend color="var(--note-chromatic)" label="chromatic" />
              <Legend color="var(--note-legato)" label="legato overlap" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-1.5">Groove</p>
              <p className="text-sm leading-relaxed">{selected.groove}</p>
              {selected.chromatic.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {selected.chromatic.map((c) => <li key={c}><span className="text-[color:var(--note-chromatic)]">●</span> {c}</li>)}
                </ul>
              )}
            </div>
            <div>
              <p className="eyebrow mb-1.5">Suggested sound <span className="text-muted-foreground normal-case tracking-normal">(not in the MIDI)</span></p>
              <p className="text-sm leading-relaxed">{selected.sound}</p>
              <p className="mt-2 text-xs text-muted-foreground">{fam.line}</p>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-5 p-4 sm:p-6" aria-label="Playback controls">
          <div>
            <Oscilloscope playing={playing} className="block h-20 w-full rounded-lg border border-border" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="eyebrow" htmlFor="bpm-slider">Tempo</label>
              <div className="flex items-center gap-1.5 font-mono text-sm">
                <span className="text-foreground tabular-nums">{bpm}</span> BPM
                {bpm !== selected.bpm && (
                  <Button variant="ghost" size="icon-xs" aria-label={`Reset tempo to ${selected.bpm} BPM`} onClick={() => setBpm(selected.bpm)}>
                    <RotateCcw />
                  </Button>
                )}
              </div>
            </div>
            <Slider id="bpm-slider" aria-label="Tempo in BPM" min={70} max={190} step={1} value={[bpm]} onValueChange={(v) => setBpm(first(v))} />
            <p className="text-[11px] text-muted-foreground">File tempo is {selected.bpm}. Changes apply at the next loop boundary.</p>
          </div>

          <div className="space-y-2">
            <span className="eyebrow block">Preview patch</span>
            <Select value={preset} onValueChange={(v) => v && setPreset(v as PresetId)}>
              <SelectTrigger className="w-full" aria-label="Preview patch">
                <SelectValue>{PRESETS[preset].label}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {(Object.keys(PRESETS) as PresetId[]).map((id) => (
                  <SelectItem key={id} value={id}>
                    <span className="flex flex-col">
                      <span>{PRESETS[id].label}</span>
                      <span className="text-xs text-muted-foreground">{PRESETS[id].blurb}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <SwitchRow
              id="sw-drums" label="Reference drums" hint="Synthesized kick, clap, hats with sidechain duck."
              checked={drums} onChange={(c) => { setDrums(c); engine.drumsOn = c; engine.refresh() }}
            />
            <SwitchRow
              id="sw-glide" label="Glide on overlaps" hint="Only where notes overlap in the file, like a mono legato synth."
              checked={glide} onChange={(c) => { setGlide(c); engine.glideOnOverlap = c }}
            />
            <SwitchRow
              id="sw-vel" label="Velocity sensitive" hint="Turn off to hear the groove on a fixed-velocity patch."
              checked={velocity} onChange={(c) => { setVelocity(c); engine.velocitySensitive = c }}
            />
          </div>

          <div className="space-y-2">
            <label className="eyebrow" htmlFor="vol-slider">Volume</label>
            <Slider id="vol-slider" aria-label="Volume" min={0} max={1} step={0.01} value={[volume]} onValueChange={(v) => { const n = first(v); setVolume(n); engine.setVolume(n) }} />
          </div>

          <FileFacts meta={selected} file={file} loopTicks={loopTicks} />

          <div className="mt-auto flex flex-wrap gap-2">
            <a href={midiUrl(selected)} download className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85">
              <Download className="size-4" /> {selected.id}.mid
            </a>
            <Button variant="outline" className="h-9" onClick={() => setShowNotes((s) => !s)} aria-expanded={showNotes} aria-controls="note-table">
              <FileAudio2 /> {showNotes ? 'Hide' : 'Show'} notes
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Keys: Space play or stop · ← → or J K switch pattern</p>
        </aside>
      </div>

      <AnimatePresence initial={false}>
        {showNotes && file && (
          <motion.div
            id="note-table"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border"
          >
            <NoteTable meta={selected} file={file} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FileFacts({ meta, file, loopTicks }: { meta: PatternMeta; file?: ParsedPattern; loopTicks: number }) {
  const rows: [string, string][] = file
    ? [
        ['Parsed by', '@tonejs/midi, in this browser'],
        ['Resolution', `${file.ppq} PPQ`],
        ['Tempo meta', `${Math.round(file.fileBpm * 100) / 100} BPM`],
        ['End of track', `tick ${file.endOfTrackTicks} ${file.endOfTrackTicks === loopTicks ? '= loop end' : `≠ ${loopTicks}`}`],
        ['Notes', String(file.notes.length)],
        ['File size', `${file.bytes} bytes`],
        ['SHA-256', `${meta.sha256.slice(0, 12)}…`],
      ]
    : []
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="eyebrow mb-2">File facts</p>
      {file ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="truncate text-right text-foreground" title={k === 'SHA-256' ? meta.sha256 : v}>{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="shimmer h-24 rounded" />
      )}
    </div>
  )
}

function NoteTable({ meta, file }: { meta: PatternMeta; file: ParsedPattern }) {
  const scale = SCALE_INTERVALS[meta.scale] ?? []
  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full min-w-[560px] text-left font-mono text-xs">
        <caption className="sr-only">Note events for {meta.id} {meta.name}</caption>
        <thead className="sticky top-0 bg-card text-muted-foreground">
          <tr>
            {['#', 'MIDI', 'Name', 'Start (beats)', 'Length (beats)', 'Velocity', 'Flags'].map((h) => (
              <th key={h} scope="col" className="px-4 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {file.notes.map((n, i) => {
            const next = file.notes[i + 1]
            const overlap = next && n.ticks + n.durationTicks > next.ticks
            const chromatic = !scale.includes((((n.midi - meta.root_midi) % 12) + 12) % 12)
            return (
              <tr key={i} className="border-t border-border/60">
                <td className="px-4 py-1.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-1.5">{n.midi}</td>
                <td className="px-4 py-1.5 text-foreground">{noteName(n.midi, meta.spelling === 'flat')}</td>
                <td className="px-4 py-1.5">{formatBeats(n.ticks, file.ppq)}</td>
                <td className="px-4 py-1.5">{formatBeats(n.durationTicks, file.ppq)}</td>
                <td className="px-4 py-1.5">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-1.5 rounded-full bg-primary" style={{ width: `${(n.velocity / 127) * 40}px` }} />
                    {n.velocity}
                  </span>
                </td>
                <td className="px-4 py-1.5">
                  {chromatic && <span className="mr-2 text-[color:var(--note-chromatic)]">chromatic</span>}
                  {overlap && <span className="text-[color:var(--note-legato)]">legato +{formatBeats(n.ticks + n.durationTicks - next.ticks, file.ppq)}</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SwitchRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-[11px] leading-snug text-muted-foreground">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-1" />
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[color:var(--roll-bg)]/85 px-1.5 py-0.5">
      <span className="size-2 rounded-sm" style={{ background: color }} /> {label}
    </span>
  )
}

export function FamilyChip({ family }: { family: Family }) {
  const { mode } = useTheme()
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: familyColor(family, mode) }} />
      {FAMILY_BY_ID[family].label}
    </span>
  )
}

function Browser({ filters, setFilters, visible, parsed, total }: {
  filters: Filters
  setFilters: (f: Filters | ((f: Filters) => Filters)) => void
  visible: PatternMeta[]
  parsed: Record<string, ParsedPattern>
  total: number
}) {
  const { mode } = useTheme()
  const { selected, select, playing } = usePack()
  const dirty = filters.query || filters.families.length || filters.bars !== 'any' || filters.legatoOnly

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search patterns"
            placeholder="Search name, key, tag, BPM…"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            className="h-9 pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            multiple
            variant="outline"
            size="sm"
            spacing={1}
            aria-label="Filter by groove family"
            value={filters.families}
            onValueChange={(v) => setFilters((f) => ({ ...f, families: v as Family[] }))}
            className="flex-wrap"
          >
            {FAMILIES.map((fam) => (
              <ToggleGroupItem key={fam.id} value={fam.id} aria-label={fam.label} className="data-[pressed]:border-primary data-[pressed]:bg-primary/12 data-[pressed]:text-primary">
                <span className="size-2 rounded-full" style={{ background: fam[mode] }} /> {fam.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Filter by loop length"
            value={[filters.bars]}
            onValueChange={(v) => setFilters((f) => ({ ...f, bars: (v[0] as string) ?? 'any' }))}
          >
            {['any', '1', '2', '4'].map((b) => (
              <ToggleGroupItem key={b} value={b} className="data-[pressed]:bg-primary/12 data-[pressed]:text-primary">
                {b === 'any' ? 'Any length' : `${b} bar`}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={filters.legatoOnly} onCheckedChange={(c) => setFilters((f) => ({ ...f, legatoOnly: c }))} size="sm" />
            Legato only
          </label>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <p aria-live="polite">Showing <span className="text-foreground">{visible.length}</span> of {total} patterns</p>
        {dirty ? (
          <Button variant="ghost" size="xs" onClick={() => setFilters({ query: '', families: [], bars: 'any', legatoOnly: false })}>
            <X /> Clear filters
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="surface mt-4 flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-lg font-semibold text-foreground">No pattern matches that combination.</p>
          <p className="max-w-md text-sm text-muted-foreground">Try a single family, or clear the search. Every family has at least six patterns, so the grid is never empty for long.</p>
          <Button variant="outline" onClick={() => setFilters({ query: '', families: [], bars: 'any', legatoOnly: false })}>Clear filters</Button>
        </div>
      ) : (
        <motion.ul layout className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {visible.map((p) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
              >
                <PatternCard
                  meta={p}
                  file={parsed[p.id]}
                  active={selected?.id === p.id}
                  live={selected?.id === p.id && playing}
                  color={familyColor(p.family, mode)}
                  onSelect={() => select(p.id, { scroll: true })}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  )
}

function PatternCard({ meta, file, active, live, color, onSelect }: {
  meta: PatternMeta
  file?: ParsedPattern
  active: boolean
  live: boolean
  color: string
  onSelect: () => void
}) {
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--px', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--py', `${e.clientY - r.top}px`)
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerMove={onMove}
      aria-pressed={active}
      aria-label={`${meta.id} ${meta.name}, ${meta.key}, ${meta.bpm} BPM, ${meta.bars} bar`}
      className={`sheen surface group block h-full w-full p-3.5 text-left transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${active ? '!border-primary ring-1 ring-primary/40' : ''} ${live ? 'gradient-border' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: color }} />
          {meta.id} · {FAMILY_BY_ID[meta.family].label}
        </span>
        <span>{meta.bpm} BPM</span>
      </div>
      <p className="mt-1.5 truncate text-base font-semibold text-[color:var(--heading)]">{meta.name}</p>
      <p className="truncate text-xs text-muted-foreground">{meta.key} · {meta.bars} bar</p>
      <div className="mt-3 rounded-md border border-border bg-[color:var(--roll-bg)] p-1.5 text-muted-foreground">
        <MiniRoll notes={file?.notes ?? []} loopTicks={meta.loop_beats * (file?.ppq ?? 480)} color={color} className="block h-12 w-full" />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {meta.legato && <Badge variant="outline" className="h-5 text-[10px]">legato</Badge>}
        {meta.chromatic.length > 0 && <Badge variant="outline" className="h-5 text-[10px]">chromatic</Badge>}
        {meta.swing !== 50 && <Badge variant="outline" className="h-5 text-[10px]">swing {meta.swing}</Badge>}
        {meta.tags.slice(0, 2).map((t) => <Badge key={t} variant="secondary" className="h-5 text-[10px]">{t}</Badge>)}
        {live && <Badge className="h-5 text-[10px]">playing</Badge>}
      </div>
    </button>
  )
}
