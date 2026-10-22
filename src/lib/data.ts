import { Midi } from '@tonejs/midi'
import type { Manifest, ParsedPattern, PatternMeta, ValidationReport } from './types'

export const PACK_BASE = 'pack/'
export const ZIP_FILE = `${PACK_BASE}basement-protocol-50-bass-midi-Cursor.zip`
export const INDEX_CSV = `${PACK_BASE}pattern-index-Cursor.csv`
export const EVENTS_CSV = `${PACK_BASE}note-events-Cursor.csv`
export const REPORT_JSON = `${PACK_BASE}validation-report-Cursor.json`
export const REPO_URL = 'https://github.com/mizcausevic-dev/basement-protocol'
export const SITE_URL = 'https://mizcausevic-dev.github.io/basement-protocol/'

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export const loadManifest = () => getJson<Manifest>(`${PACK_BASE}manifest-Cursor.json`)
export const loadReport = () => getJson<ValidationReport>(REPORT_JSON)

const midiCache = new Map<string, Promise<ParsedPattern>>()

export function midiUrl(meta: PatternMeta) {
  return `${PACK_BASE}midi/${meta.file}`
}

/** Fetches the real .mid file and parses it with @tonejs/midi, so playback reflects the file itself. */
export function loadMidi(meta: PatternMeta): Promise<ParsedPattern> {
  const cached = midiCache.get(meta.id)
  if (cached) return cached
  const job = (async () => {
    const res = await fetch(midiUrl(meta))
    if (!res.ok) throw new Error(`${meta.file} returned HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    const midi = new Midi(buf)
    const track = midi.tracks[0]
    return {
      meta,
      ppq: midi.header.ppq,
      fileBpm: midi.header.tempos[0]?.bpm ?? meta.bpm,
      endOfTrackTicks: track?.endOfTrackTicks ?? 0,
      bytes: buf.byteLength,
      notes: (track?.notes ?? [])
        .map((n) => ({ midi: n.midi, ticks: n.ticks, durationTicks: n.durationTicks, velocity: Math.round(n.velocity * 127) }))
        .sort((a, b) => a.ticks - b.ticks),
    }
  })()
  midiCache.set(meta.id, job)
  job.catch(() => midiCache.delete(meta.id))
  return job
}

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

export function noteName(midi: number, preferFlats = false) {
  const names = preferFlats ? FLATS : SHARPS
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`
}

export function formatBeats(ticks: number, ppq: number) {
  const v = ticks / ppq
  return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}
