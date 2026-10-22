// Single source of truth for the commercial: timing, on-screen copy, and caption cues.
// Imported by the browser composition and by render.mjs (for the WebVTT file), so it must not touch the DOM.

export const FPS = 30
export const BPM = 128
export const BEAT = 60 / BPM
export const BAR = 4 * BEAT
export const DURATION = 16 * BAR

export const SITE_URL = 'https://mizcausevic-dev.github.io/basement-protocol/'
export const SITE_LABEL = 'mizcausevic-dev.github.io/basement-protocol'

export const FORMATS = {
  '16x9': { w: 1920, h: 1080, label: 'Widescreen 16:9', use: 'YouTube, X, LinkedIn, Facebook, Bluesky, Reddit, and the site' },
  '9x16': { w: 1080, h: 1920, label: 'Vertical 9:16', use: 'TikTok, Instagram Reels and Stories, YouTube Shorts, Facebook Reels' },
  '1x1': { w: 1080, h: 1080, label: 'Square 1:1', use: 'Instagram and Facebook feed, LinkedIn, Threads' },
}

export const SCENES = [
  { id: 'open', t0: 0, t1: 2 * BAR },
  { id: 'families', t0: 2 * BAR, t1: 4 * BAR },
  { id: 'roll', t0: 4 * BAR, t1: 8 * BAR },
  { id: 'validate', t0: 8 * BAR, t1: 12 * BAR },
  { id: 'product', t0: 12 * BAR, t1: 15 * BAR },
  { id: 'end', t0: 15 * BAR, t1: 16 * BAR },
]

export const FAMILIES = ['Sparse', 'Rolling', 'Offbeat', 'Syncopated', 'Staccato', 'Sustained', 'Acid']

export const COPY = {
  open1: 'Fifty basslines.',
  open2: 'Built for the basement.',
  familiesEnd: '50 patterns',
  roll1: 'Every note is in the file.',
  roll1Sub: 'Real MIDI loops of 1, 2, or 4 bars, with tempo and key in each one.',
  rollStats: [
    { value: 700, label: 'notes' },
    { value: 50, label: 'MIDI files' },
    { value: 7, label: 'groove families' },
  ],
  validate: 'Validated like software.',
  checks: ['12 of 12 checks pass', 'A second parser agrees on all 700 notes', 'Byte-identical on every rebuild'],
  product1: 'Audition every file in your browser.',
  product2: 'Then drag the .mid into your DAW.',
  free: 'Free. Royalty-free in your own tracks.',
  endTitle: 'Basement Protocol',
  endSub: '50 free bassline MIDI files',
  endCta: 'Open the lab. Download the pack.',
}

// Caption cues: on-screen text plus bracketed sound descriptions for viewers who watch muted or use captions.
export const CUES = [
  { t0: 0.0, t1: 1.85, text: '[Deep sub bass: BP01 Concrete Breath]\nFifty basslines.' },
  { t0: 1.875, t1: 3.7, text: 'Built for the basement.' },
  { t0: 3.75, t1: 7.45, text: '[Kick drum enters]\nSparse. Rolling. Offbeat. Syncopated.\nStaccato. Sustained. Acid. 50 patterns.' },
  { t0: 7.5, t1: 11.2, text: '[Rolling bass: BP11 Marrow]\nEvery note is in the file.\nReal MIDI loops of 1, 2, or 4 bars, with tempo and key in each one.' },
  { t0: 11.25, t1: 14.95, text: '700 notes. 50 MIDI files. 7 groove families.' },
  { t0: 15.0, t1: 16.85, text: '[Acid bass with slides: BP44 Acid Rain]\nValidated like software.' },
  { t0: 16.875, t1: 18.7, text: '12 of 12 checks pass.' },
  { t0: 18.75, t1: 20.6, text: 'A second parser agrees on all 700 notes.' },
  { t0: 20.625, t1: 22.45, text: 'Byte-identical on every rebuild.' },
  { t0: 22.5, t1: 24.35, text: '[Acid build: BP50 Last Call]\nAudition every file in your browser.' },
  { t0: 24.375, t1: 26.2, text: 'Then drag the .mid into your DAW.' },
  { t0: 26.25, t1: 28.1, text: '[Riser builds]\nFree. Royalty-free in your own tracks.' },
  { t0: 28.125, t1: 30.0, text: '[Final bass hit]\nBasement Protocol. 50 free bassline MIDI files.\nmizcausevic-dev.github.io/basement-protocol' },
]

export function toVtt(cues = CUES) {
  const stamp = (s) => {
    const ms = Math.round(s * 1000)
    const h = String(Math.floor(ms / 3_600_000)).padStart(2, '0')
    const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0')
    const sec = String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')
    return `${h}:${m}:${sec}.${String(ms % 1000).padStart(3, '0')}`
  }
  return ['WEBVTT', '', ...cues.flatMap((c, i) => [String(i + 1), `${stamp(c.t0)} --> ${stamp(c.t1)}`, c.text, ''])].join('\n')
}
