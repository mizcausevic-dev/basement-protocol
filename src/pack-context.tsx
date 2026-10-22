import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { engine, type PresetId } from '@/audio/engine'
import { loadManifest, loadMidi, loadReport } from '@/lib/data'
import type { Manifest, ParsedPattern, PatternMeta, ValidationReport } from '@/lib/types'

interface PackState {
  manifest: Manifest | null
  report: ValidationReport | null
  parsed: Record<string, ParsedPattern>
  error: string | null
  selected: PatternMeta | null
  playing: boolean
  select: (id: string, opts?: { scroll?: boolean; play?: boolean }) => void
  togglePlay: () => void
  stop: () => void
  playSelected: () => Promise<void>
  bpm: number
  setBpm: (bpm: number) => void
  preset: PresetId
  setPreset: (id: PresetId) => void
}

const PackContext = createContext<PackState | null>(null)

export function PackProvider({ children }: { children: ReactNode }) {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [parsed, setParsed] = useState<Record<string, ParsedPattern>>({})
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [bpm, setBpmState] = useState(128)
  const bpmRef = useRef(128)
  const [preset, setPresetState] = useState<PresetId>(engine.presetId)

  useEffect(() => {
    engine.onStateChange = setPlaying
    let alive = true
    ;(async () => {
      try {
        const [m, r] = await Promise.all([loadManifest(), loadReport().catch(() => null)])
        if (!alive) return
        setManifest(m)
        setReport(r)
        const fromHash = window.location.hash.replace('#', '').toUpperCase()
        const initial = m.patterns.find((p) => p.id === fromHash) ?? m.patterns[0]
        setSelectedId(initial.id)
        setBpmState(initial.bpm)
        bpmRef.current = initial.bpm
        const results = await Promise.all(m.patterns.map((p) => loadMidi(p).catch(() => null)))
        if (!alive) return
        const map: Record<string, ParsedPattern> = {}
        results.forEach((r) => r && (map[r.meta.id] = r))
        setParsed(map)
        const failed = m.patterns.length - Object.keys(map).length
        if (failed) setError(`${failed} MIDI file(s) failed to load`)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      alive = false
      engine.stop()
    }
  }, [])

  const selected = useMemo(
    () => manifest?.patterns.find((p) => p.id === selectedId) ?? null,
    [manifest, selectedId],
  )

  const startPattern = useCallback(async (meta: PatternMeta, tempo: number) => {
    const p = await loadMidi(meta)
    await engine.play({
      notes: p.notes, ppq: p.ppq, loopBeats: meta.loop_beats, bpm: tempo, swing: meta.swing, drums: meta.drums,
    })
  }, [])

  const select = useCallback<PackState['select']>((id, opts) => {
    const meta = manifest?.patterns.find((p) => p.id === id)
    if (!meta) return
    setSelectedId(id)
    setBpmState(meta.bpm)
    bpmRef.current = meta.bpm
    history.replaceState(null, '', `#${id}`)
    if (opts?.scroll) document.getElementById('lab')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (opts?.play || engine.playing) void startPattern(meta, meta.bpm)
  }, [manifest, startPattern])

  const playSelected = useCallback(async () => {
    if (selected) await startPattern(selected, bpmRef.current)
  }, [selected, startPattern])

  const stop = useCallback(() => engine.stop(), [])
  const togglePlay = useCallback(() => {
    if (engine.playing) engine.stop()
    else void playSelected()
  }, [playSelected])

  const setBpm = useCallback((v: number) => {
    bpmRef.current = v
    setBpmState(v)
    engine.setBpm(v)
  }, [])

  const setPreset = useCallback((id: PresetId) => {
    engine.setPreset(id)
    setPresetState(id)
  }, [])

  const value = useMemo<PackState>(() => ({
    manifest, report, parsed, error, selected, playing, select, togglePlay, stop, playSelected, bpm, setBpm, preset, setPreset,
  }), [manifest, report, parsed, error, selected, playing, select, togglePlay, stop, playSelected, bpm, setBpm, preset, setPreset])

  return <PackContext.Provider value={value}>{children}</PackContext.Provider>
}

export function usePack() {
  const ctx = useContext(PackContext)
  if (!ctx) throw new Error('usePack must be used inside PackProvider')
  return ctx
}
