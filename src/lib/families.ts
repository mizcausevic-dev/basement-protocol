import type { Family } from './types'

export interface FamilyInfo {
  id: Family
  label: string
  line: string
  dark: string
  light: string
}

export const FAMILIES: FamilyInfo[] = [
  { id: 'sparse', label: 'Sparse', line: 'Silence does the work. Few hits, long gaps, maximum tension.', dark: '#7dd3fc', light: '#0369a1' },
  { id: 'rolling', label: 'Rolling', line: 'Forward motion that never lets go of the floor.', dark: '#66fcf1', light: '#0b8f88' },
  { id: 'offbeat', label: 'Offbeat', line: 'The and is the anchor. Bass and kick trade places.', dark: '#facc15', light: '#a16207' },
  { id: 'syncopated', label: 'Syncopated', line: 'Weight lands where the body does not expect it.', dark: '#fb923c', light: '#c2410c' },
  { id: 'staccato', label: 'Staccato', line: 'Short, clipped, percussive. Bass as a drum.', dark: '#ff2d55', light: '#be123c' },
  { id: 'sustained', label: 'Sustained', line: 'Long tones and slow harmony for pressure and drone.', dark: '#b18cff', light: '#6d28d9' },
  { id: 'acid', label: 'Acid', line: 'Accents, slides, octave jumps. The 303 lineage.', dark: '#a3e635', light: '#4d7c0f' },
]

export const FAMILY_BY_ID = Object.fromEntries(FAMILIES.map((f) => [f.id, f])) as Record<Family, FamilyInfo>

export function familyColor(id: Family, mode: 'dark' | 'light') {
  return FAMILY_BY_ID[id][mode]
}

export const SCALE_INTERVALS: Record<string, number[]> = {
  'Aeolian (natural minor)': [0, 2, 3, 5, 7, 8, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
  'Minor pentatonic': [0, 3, 5, 7, 10],
}
