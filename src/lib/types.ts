export type Family = 'sparse' | 'rolling' | 'offbeat' | 'syncopated' | 'staccato' | 'sustained' | 'acid'
export type DrumTemplate = 'four' | 'halftime' | 'dnb' | 'footwork' | 'broken'

export interface PatternMeta {
  id: string
  name: string
  family: Family
  bpm: number
  tonic: string
  scale: string
  key: string
  root_midi: number
  spelling: 'sharp' | 'flat'
  bars: 1 | 2 | 4
  loop_beats: number
  grid: string
  swing: number
  legato: boolean
  groove: string
  sound: string
  drums: DrumTemplate
  tags: string[]
  file: string
  note_count: number
  notes_per_bar: number
  syncopation: number
  range: string
  chromatic: string[]
  sha256: string
}

export interface Manifest {
  collection: string
  ppq: number
  note_naming: string
  slide_overlap_ticks: number
  pitch_bounds: [number, number]
  families: Family[]
  patterns: PatternMeta[]
}

export interface NoteEvent {
  midi: number
  ticks: number
  durationTicks: number
  velocity: number
}

export interface ParsedPattern {
  meta: PatternMeta
  notes: NoteEvent[]
  ppq: number
  fileBpm: number
  endOfTrackTicks: number
  bytes: number
}

export interface ValidationCheck {
  id: string
  name: string
  status: 'pass' | 'fail'
  detail: string
  problems: string[]
  problem_count: number
}

export interface ValidationReport {
  generated_at_utc: string
  validator: string
  summary: { checks: number; passed: number; failed: number; midi_files: number; note_events: number }
  checks: ValidationCheck[]
  limitations: string[]
  second_parser?: {
    parser: string
    status: 'pass' | 'fail'
    files_parsed: number
    notes_compared: number
    detail: string
    problems: string[]
  }
}
