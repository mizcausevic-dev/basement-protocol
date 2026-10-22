// Second, independent parser pass: @tonejs/midi (JavaScript) must agree with the
// note-event CSV and the index for every file. Results are merged into
// pack/validation-report-Cursor.json under "second_parser".
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import tonejs from '@tonejs/midi'

const { Midi } = tonejs
const PACK = join(dirname(fileURLToPath(import.meta.url)), '..', 'pack')
const PPQ = 480

function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [head, ...body] = rows
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])))
}

const index = parseCsv(readFileSync(join(PACK, 'pattern-index-Cursor.csv'), 'utf8'))
const events = parseCsv(readFileSync(join(PACK, 'note-events-Cursor.csv'), 'utf8'))
const files = readdirSync(join(PACK, 'midi')).filter((f) => f.endsWith('.mid'))
const problems = []
let notesChecked = 0

for (const row of index) {
  const file = row.midi_filename.split('/').pop()
  let midi
  try {
    midi = new Midi(readFileSync(join(PACK, 'midi', file)))
  } catch (err) {
    problems.push(`${file}: parse error ${err.message}`)
    continue
  }
  const loop = Number(row.loop_bars) * 4 * PPQ
  if (midi.header.ppq !== PPQ) problems.push(`${file}: ppq ${midi.header.ppq}`)
  const tempo = midi.header.tempos[0]
  if (!tempo || tempo.ticks !== 0 || Math.abs(tempo.bpm - Number(row.bpm)) > 0.01) problems.push(`${file}: tempo ${tempo?.bpm}`)
  const ts = midi.header.timeSignatures[0]
  if (!ts || ts.ticks !== 0 || ts.timeSignature.join('/') !== '4/4') problems.push(`${file}: time signature`)
  if (midi.tracks.length !== 1) problems.push(`${file}: ${midi.tracks.length} tracks`)
  const track = midi.tracks[0]
  if (track.endOfTrackTicks !== loop) problems.push(`${file}: end of track ${track.endOfTrackTicks} != ${loop}`)
  const parsed = track.notes
    .map((n) => [n.midi, n.ticks, n.durationTicks, Math.round(n.velocity * 127)])
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
  const expected = events
    .filter((e) => e.pattern_id === row.pattern_id)
    .map((e) => [Number(e.midi_note), Number(e.start_tick), Number(e.duration_ticks), Number(e.velocity)])
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
  if (parsed.length !== expected.length) {
    problems.push(`${file}: ${parsed.length} notes parsed, CSV has ${expected.length}`)
    continue
  }
  parsed.forEach((p, i) => {
    notesChecked++
    if (p.join() !== expected[i].join()) problems.push(`${file}: note ${i} parsed ${p} vs CSV ${expected[i]}`)
    if (p[1] + p[2] > loop) problems.push(`${file}: note ${i} crosses the loop boundary`)
  })
}
if (files.length !== 50) problems.push(`${files.length} MIDI files on disk`)

const reportPath = join(PACK, 'validation-report-Cursor.json')
const report = JSON.parse(readFileSync(reportPath, 'utf8'))
const pkg = JSON.parse(readFileSync(join(PACK, '..', 'node_modules', '@tonejs', 'midi', 'package.json'), 'utf8'))
report.second_parser = {
  parser: `@tonejs/midi ${pkg.version} on Node ${process.version}`,
  status: problems.length ? 'fail' : 'pass',
  files_parsed: files.length,
  notes_compared: notesChecked,
  detail: 'PPQ, tempo, 4/4 time signature, end-of-track tick, and every note (pitch, start tick, duration, velocity) compared with the CSVs',
  problems: problems.slice(0, 25),
}
writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(`[${problems.length ? 'FAIL' : 'PASS'}] @tonejs/midi ${pkg.version}: ${files.length} files, ${notesChecked} notes compared`)
for (const p of problems.slice(0, 25)) console.log(`  - ${p}`)
process.exit(problems.length ? 1 : 0)
