// Every social image, its size and layout, and the post copy that goes with it.
// Shared by the browser templates (social.js) and node (social.mjs), so it must not touch the DOM.
import { SITE_LABEL, SITE_URL } from './script.js'

export const REPO_URL = 'https://github.com/mizcausevic-dev/basement-protocol'
export const MEDIA_URL = `${SITE_URL}media.html`

// One representative pattern per family, chosen for legible 1, 2, or 4-bar rolls.
export const FAMILY_PICKS = {
  sparse: 'BP07',
  rolling: 'BP08',
  offbeat: 'BP21',
  syncopated: 'BP23',
  staccato: 'BP33',
  sustained: 'BP42',
  acid: 'BP46',
}

export const FAMILY_LINES = {
  sparse: 'Silence does the work. Few hits, long gaps, maximum tension.',
  rolling: 'Forward motion that never lets go of the floor.',
  offbeat: 'The and is the anchor. Bass and kick trade places.',
  syncopated: 'Weight lands where the body does not expect it.',
  staccato: 'Short, clipped, percussive. Bass as a drum.',
  sustained: 'Long tones and slow harmony for pressure and drone.',
  acid: 'Accents, slides, octave jumps. The 303 lineage.',
}

export const FAMILY_COLORS = {
  sparse: '#7dd3fc', rolling: '#66fcf1', offbeat: '#facc15', syncopated: '#fb923c', staccato: '#ff2d55', sustained: '#b18cff', acid: '#a3e635',
}

// Byte caps are the platform limit minus headroom. Bluesky profile banners are capped at 1,000,000 bytes and post images at 2,000,000.
const MB = 1_000_000
export const ASSETS = [
  {
    id: 'instagram-feed', network: 'instagram', use: 'Feed post (4:5)', w: 1080, h: 1350, layout: 'poster', maxBytes: 8 * MB,
    opts: { bg: 'vert-acid', head: 'Fifty *basslines.*', kicker: 'Built for the basement.', sub: 'Free MIDI files for techno, acid, and drum and bass.', visual: 'roll:BP44', stats: true },
    alt: 'Poster for Basement Protocol. Headline: Fifty basslines. Built for the basement. A piano roll shows pattern BP44 Acid Rain, a one-bar acid line in A Phrygian at 130 BPM, with glowing slide curves between notes. Stats read 50 MIDI files, 700 notes, 7 groove families, above the site address.',
  },
  {
    id: 'instagram-story', network: 'instagram', use: 'Story (9:16)', w: 1080, h: 1920, layout: 'story', maxBytes: 8 * MB,
    opts: { bg: 'vert-stack', head: '50 free *bassline* MIDI files.', sub: 'Audition every one in your browser. Then drag the .mid into your DAW.', visual: 'roll:BP11', cta: 'Tap the link to open the lab' },
    alt: 'Vertical story card. Headline: 50 free bassline MIDI files. A tall piano roll shows the first bar of pattern BP11 Marrow, a rolling four-bar line in A Phrygian at 128 BPM. Stats and a button-style label read: Tap the link to open the lab.',
  },
  ...[1, 2, 3, 4, 5].map((n) => ({
    id: `carousel-${String(n).padStart(2, '0')}`, network: 'instagram', also: ['linkedin'], use: `Carousel slide ${n} of 5 (4:5)`, w: 1080, h: 1350, layout: 'slide', maxBytes: 8 * MB,
    opts: { slide: n },
    alt: [
      'Carousel slide 1 of 5. Headline: 50 free bassline MIDI files. Built for the basement. Small piano rolls from four patterns run across the slide, with a prompt to swipe.',
      'Carousel slide 2 of 5. Seven groove families with a bar for how many patterns each holds: sparse 7, rolling 8, offbeat 7, syncopated 8, staccato 7, sustained 6, acid 7.',
      'Carousel slide 3 of 5. Headline: Every note is in the file. A large piano roll of BP44 Acid Rain with its slides highlighted, plus its key, tempo, length, and note count.',
      'Carousel slide 4 of 5. Headline: Validated like software. Three results with check marks: 12 of 12 checks pass, a second parser agrees on all 700 notes, byte-identical on every rebuild.',
      'Carousel slide 5 of 5. A phone screenshot of the pattern lab playing BP44 Acid Rain. Text: Audition every file in your browser. Then drag the .mid into your DAW. Free. The site address is below.',
    ][n - 1],
  })),
  {
    id: 'tiktok-cover', network: 'tiktok', use: 'Video cover (9:16)', w: 1080, h: 1920, layout: 'story', maxBytes: 8 * MB,
    opts: { bg: 'vert-acid', head: 'Every note is *in* *the* *file.*', sub: '50 free bassline MIDI files. The soundtrack is played from the pack itself.', visual: 'roll:BP44', cta: 'Link in bio', tiktok: true },
    alt: 'Vertical cover. Headline: Every note is in the file. A piano roll of BP44 Acid Rain with slide curves. Text: 50 free bassline MIDI files. The soundtrack is played from the pack itself. Link in bio.',
  },
  {
    id: 'youtube-thumbnail', network: 'youtube', use: 'Video thumbnail (16:9)', w: 1280, h: 720, layout: 'thumb', maxBytes: 2 * MB,
    opts: { bg: 'wide-cone' },
    alt: 'Thumbnail with oversized text: 50 free basslines, MIDI. A speaker cone glows on the right behind a short acid piano roll.',
  },
  {
    id: 'youtube-banner', network: 'youtube', use: 'Channel banner (safe area 1546 x 423 centered)', w: 2560, h: 1440, layout: 'banner', maxBytes: 6 * MB,
    opts: { safe: [507, 508, 1546, 423] },
    alt: 'Channel banner. The Basement Protocol logo and name, the line 50 free bassline MIDI files, and the site address, centered over a dark strip of piano rolls from four patterns.',
  },
  {
    id: 'x-post', network: 'x', use: 'In-feed image (16:9)', w: 1600, h: 900, layout: 'wide', maxBytes: 5 * MB,
    opts: { bg: 'hero-basement', head: '50 free bassline *MIDI* files.', sub: 'Real 1, 2, and 4-bar loops with tempo and key inside. Validated like software.', visual: 'roll:BP44' },
    alt: 'Wide card. Headline: 50 free bassline MIDI files. Subhead: Real 1, 2, and 4-bar loops with tempo and key inside. Validated like software. On the right, a piano roll of BP44 Acid Rain with glowing slides.',
  },
  {
    id: 'x-header', network: 'x', use: 'Profile header (3:1)', w: 1500, h: 500, layout: 'banner', maxBytes: 5 * MB,
    opts: { safe: [520, 70, 900, 360], align: 'right' },
    alt: 'Profile header. Basement Protocol logo and name, 50 free bassline MIDI files, and the site address over a strip of piano rolls.',
  },
  {
    id: 'facebook-feed', network: 'facebook', use: 'Feed post (4:5)', w: 1080, h: 1350, layout: 'poster', maxBytes: 8 * MB,
    opts: { bg: 'hero-basement', head: 'Seven groove families. *Fifty* *loops.*', sub: 'Free bassline MIDI for techno, acid house, dub, and drum and bass.', visual: 'families', stats: false },
    alt: 'Feed poster. Headline: Seven groove families. Fifty loops. A bar chart counts patterns per family: sparse 7, rolling 8, offbeat 7, syncopated 8, staccato 7, sustained 6, acid 7. The site address is at the bottom.',
  },
  {
    id: 'og-card', network: 'facebook', also: ['linkedin', 'x', 'threads', 'bluesky', 'reddit'], use: 'Link preview (1.91:1), also the site og:image', w: 1200, h: 630, layout: 'wide', maxBytes: 1 * MB,
    opts: { bg: 'hero-basement', head: '50 free bassline *MIDI* files.', sub: 'Audition every file in your browser. Validated like software.', visual: 'roll:BP44', compact: true },
    alt: 'Link preview card. Headline: 50 free bassline MIDI files. Subhead: Audition every file in your browser. Validated like software. A piano roll of BP44 Acid Rain is on the right.',
  },
  {
    id: 'linkedin-post', network: 'linkedin', use: 'Feed post (4:5)', w: 1080, h: 1350, layout: 'poster', maxBytes: 8 * MB,
    opts: { bg: 'illus-acid', head: 'A MIDI pack, *validated* *like* *software.*', size: 88, sub: 'Deterministic generator. Two independent parsers. A report you can read.', visual: 'checks', stats: false },
    alt: 'Feed poster. Headline: A MIDI pack, validated like software. A panel lists validation checks with check marks, including parsing, tempo and meter, loop boundaries, pitch range, monophony, and a second parser comparing all 700 notes. Stats read 50 MIDI files, 700 notes, 7 groove families.',
  },
  {
    id: 'linkedin-cover', network: 'linkedin', use: 'Profile cover (4:1)', w: 1584, h: 396, layout: 'banner', maxBytes: 8 * MB,
    opts: { safe: [620, 60, 900, 276], align: 'right' },
    alt: 'Profile cover. Basement Protocol logo and name, 50 free bassline MIDI files, and the site address on the right over a strip of piano rolls.',
  },
  {
    id: 'pinterest-pin', network: 'pinterest', use: 'Standard pin (2:3)', w: 1000, h: 1500, layout: 'families', maxBytes: 20 * MB,
    alt: 'Infographic pin titled 7 groove families, 50 free bassline MIDI files. Each family has a short description, a pattern count, and a small piano roll of one real pattern: BP07 Grime Pulse, BP08 Gallop Protocol, BP21 Double Offbeat, BP23 Tresillo Grind, BP33 Morse Floor, BP42 Cinder Drone, and BP46 Resonance Riot.',
  },
  {
    id: 'reddit-post', network: 'reddit', use: 'Image post (1:1)', w: 1080, h: 1080, layout: 'spotlight', maxBytes: 20 * MB,
    opts: { pattern: 'BP44' },
    alt: 'Pattern spotlight for BP44 Acid Rain: a full one-bar piano roll with accent notes and slide curves, and a data panel listing A Phrygian, 130 BPM, 1 bar, 14 notes, acid family, legato slides.',
  },
  {
    id: 'threads-post', network: 'threads', use: 'Feed post (4:5)', w: 1080, h: 1350, layout: 'poster', maxBytes: 8 * MB,
    opts: { bg: 'illus-cymatics', head: 'Hear it before *you* *download* *it.*', sub: 'A browser lab that plays the real .mid files. Fifty of them, free.', visual: 'roll:BP29', stats: true },
    alt: 'Feed poster. Headline: Hear it before you download it. A piano roll shows BP29 Clave Dread, a one-bar syncopated line in B flat Phrygian at 122 BPM. Stats read 50 MIDI files, 700 notes, 7 groove families.',
  },
  {
    id: 'bluesky-post', network: 'bluesky', use: 'Image post (1:1)', w: 1080, h: 1080, layout: 'checks', maxBytes: 1.9 * MB,
    alt: 'Square card titled Validated like software. Twelve validation checks are listed with check marks, from 50 files with matching IDs through to the ZIP matching the validated files byte for byte. The footer reads 12 of 12 pass and gives the site address.',
  },
  {
    id: 'bluesky-banner', network: 'bluesky', use: 'Profile banner (3:1, art centered)', w: 3000, h: 1000, layout: 'banner', maxBytes: 0.95 * MB,
    opts: { safe: [700, 180, 1600, 640] },
    alt: 'Profile banner. Basement Protocol logo and name, 50 free bassline MIDI files, and the site address, centered over a strip of piano rolls.',
  },
]

export const NETWORKS = [
  { id: 'instagram', name: 'Instagram', why: 'Largest visual feed for producers; carousels, Reels, and Stories each get a native size.' },
  { id: 'tiktok', name: 'TikTok', why: 'Producer content travels on sound; the vertical cut leads with the bass.' },
  { id: 'youtube', name: 'YouTube', why: 'Search for "free MIDI pack" lands here; the trailer and Shorts cut both fit.' },
  { id: 'x', name: 'X', why: 'Fast link sharing with music-tech and developer audiences.' },
  { id: 'facebook', name: 'Facebook', why: 'Producer groups and the link-preview card that most other sites reuse.' },
  { id: 'linkedin', name: 'LinkedIn', why: 'The validated-like-software story is a fit for engineering and music-tech readers; the carousel ships as a PDF document post.' },
  { id: 'pinterest', name: 'Pinterest', why: 'Evergreen search traffic for production references; the tall infographic pin suits it.' },
  { id: 'reddit', name: 'Reddit', why: 'Where producers ask for free MIDI; the post is written to inform first, with limits stated.' },
  { id: 'threads', name: 'Threads', why: 'Conversational reach from Instagram audiences, one topic tag per post.' },
  { id: 'bluesky', name: 'Bluesky', why: 'An active music-tech and open-source crowd that rewards plain, specific posts.' },
]

// Limits as of October 2026. Hashtag caps: Instagram 5 per post, Threads 1 topic tag.
export const LIMITS = {
  x: { text: { max: 280, count: 'x' }, alt: { max: 1000 } },
  bluesky: { text: { max: 300, count: 'graphemes' }, alt: { max: 2000 } },
  threads: { text: { max: 500 }, tag: { max: 50 }, alt: { max: 1000 } },
  instagram: { caption: { max: 2200, hashtags: 5 }, alt: { max: 1000 } },
  tiktok: { caption: { max: 2200 } },
  facebook: { text: { max: 5000 } },
  linkedin: { text: { max: 3000 }, alt: { max: 1000 } },
  pinterest: { title: { max: 100 }, description: { max: 500 }, alt: { max: 500 } },
  youtube: { title: { max: 100 }, description: { max: 5000 }, tags: { max: 500, count: 'tags' } },
  reddit: { title: { max: 300 }, body: { max: 40000 } },
}

export const POSTS = [
  {
    network: 'instagram', label: 'Carousel post', assets: ['carousel-01', 'carousel-02', 'carousel-03', 'carousel-04', 'carousel-05'],
    fields: {
      caption: `50 free bassline MIDI files. Built for the basement.

Swipe for what's inside:
1. Seven groove families, from sparse dub pressure to 303 acid
2. Every note is in the file: real 1, 2, and 4-bar loops with tempo and key
3. Validated like software: 12 of 12 checks pass, and a second parser agrees on all 700 notes
4. A browser lab that plays the real files before you download

Royalty-free in your own tracks. Link in bio.

#techno #acidhouse #midi #musicproducer #bassline`,
    },
  },
  {
    network: 'instagram', label: 'Reel', video: '9x16', assets: ['instagram-feed'],
    notes: 'Use instagram-feed as the grid cover (4:5 crop of the Reel).',
    fields: {
      caption: `Thirty seconds, four patterns from the pack: BP01 Concrete Breath, BP11 Marrow, BP44 Acid Rain, and BP50 Last Call. The bass you hear is rendered from the pack's own MIDI files.

50 free bassline MIDI files. Link in bio.

#techno #acidhouse #midi #musicproducer #bassline`,
    },
  },
  {
    network: 'instagram', label: 'Story', assets: ['instagram-story'],
    notes: `Add a link sticker pointing to ${SITE_URL} over the button area. Keep stickers out of the top 250 px and bottom 420 px.`,
    fields: {},
  },
  {
    network: 'tiktok', label: 'Video post', video: '9x16', assets: ['tiktok-cover'],
    notes: 'Upload the 9:16 MP4 and pick tiktok-cover as the cover image. Burned-in captions are not used; upload the VTT text as TikTok captions if you want them.',
    fields: {
      caption: `Every bass note in this video comes straight from the MIDI files in the pack. 50 free basslines for techno, acid, and drum and bass, with a browser lab that plays the real files. Link in bio.

#musicproducer #techno #acid #midi #producertok`,
    },
  },
  {
    network: 'youtube', label: 'Video', video: '16x9', assets: ['youtube-thumbnail'],
    notes: 'Upload basement-protocol-commercial-Cursor.vtt as the English subtitle track.',
    fields: {
      title: 'Basement Protocol: 50 Free Bassline MIDI Files (30-second trailer)',
      description: `Basement Protocol is a free pack of 50 bassline MIDI files for techno, acid house, dub, and drum and bass. Every bass note in this trailer is rendered from the pack's own MIDI files.

Patterns heard:
0:00 BP01 Concrete Breath (sparse, A Aeolian)
0:07 BP11 Marrow (rolling, A Phrygian)
0:15 BP44 Acid Rain (acid, A Phrygian, legato slides)
0:22 BP50 Last Call (acid build, A Aeolian)

What's in the pack:
- 50 loops of 1, 2, or 4 bars, 105 to 174 BPM, with tempo and key in every file
- Seven groove families: sparse, rolling, offbeat, syncopated, staccato, sustained, acid
- CSV exports of all 700 notes and a validation report: 12 of 12 checks pass, and a second parser agrees on every note

Audition every pattern in your browser, then download the ZIP:
${SITE_URL}

Source code (MIT): ${REPO_URL}

Patterns are royalty-free in your own productions. Please don't resell them as a standalone pack.`,
      tags: 'MIDI pack, free MIDI, bassline MIDI, techno bass, acid bass, drum and bass, music production, Web Audio',
    },
  },
  {
    network: 'youtube', label: 'Short', video: '9x16', assets: [],
    fields: {
      title: '50 free bassline MIDI files, played from the files themselves',
      description: `Four patterns from Basement Protocol, a free pack of 50 bassline MIDI files. Audition all of them in the browser: ${SITE_URL}`,
    },
  },
  {
    network: 'x', label: 'Post', assets: ['x-post'], video: '16x9',
    notes: 'Attach either x-post or the 16:9 MP4, not both. The link card uses og-card automatically.',
    fields: {
      text: `50 free bassline MIDI files for techno, acid, and DnB.

Real 1, 2, and 4-bar loops with tempo and key in every file. Play them in your browser, then drag the .mid into your DAW.

12 of 12 checks pass. A second parser agrees on all 700 notes.

${SITE_URL}`,
    },
  },
  {
    network: 'x', label: 'Profile header', assets: ['x-header'], fields: {},
    notes: 'The avatar covers the lower left on desktop, so the art sits right of center.',
  },
  {
    network: 'facebook', label: 'Feed post', assets: ['facebook-feed'], video: '1x1',
    notes: 'Post the image or the 1:1 MP4. A plain link post pulls og-card.',
    fields: {
      text: `Basement Protocol is a free pack of 50 bassline MIDI files for techno, acid house, dub, and drum and bass.

Each loop is 1, 2, or 4 bars with tempo and key written into the file. The site has a lab that plays the real .mid files, a groove map of all 50 patterns, and the full validation report.

Royalty-free in your own tracks.
${SITE_URL}`,
    },
  },
  {
    network: 'linkedin', label: 'Document post (PDF carousel)', assets: ['linkedin-post', 'linkedin-cover'], pdf: true,
    notes: 'Attach basement-protocol-carousel-Cursor.pdf as a document, titled "Basement Protocol: 50 MIDI basslines, validated like software". Use linkedin-post for a single-image version.',
    fields: {
      text: `I shipped a MIDI pack the way I would ship software.

Basement Protocol is 50 bassline MIDI files for underground electronic music. The part this audience may care about is how it was built:

• Patterns are written in a small step-sequencer text format, not drawn by hand
• A deterministic Python generator turns them into MIDI, and a rebuild produces byte-identical files
• A validator runs 12 checks on every build: parsing, tempo and meter, loop boundaries, pitch range, monophony, scale labels, duplicates, and the ZIP itself
• A second, independent parser (@tonejs/midi) reads all 700 notes again and compares them with the CSV exports

The site plays the actual files in the browser with the Web Audio API, so what you hear is what you download.

Free, and royalty-free in your own tracks. The code is MIT licensed.

Site: ${SITE_URL}
Code: ${REPO_URL}

#MusicTech #MIDI #WebAudio`,
    },
  },
  {
    network: 'pinterest', label: 'Pin', assets: ['pinterest-pin'],
    notes: 'Board suggestion: Music Production. Destination link: the site.',
    fields: {
      title: '50 Free Bassline MIDI Files: 7 Groove Families for Techno and Acid',
      description: 'A free pack of 50 bassline MIDI loops for techno, acid house, dub, and drum and bass, sorted into seven groove families: sparse, rolling, offbeat, syncopated, staccato, sustained, and acid. Each file is a 1, 2, or 4-bar loop with tempo and key inside. Play every pattern in your browser, then download the .mid files. Royalty-free in your own tracks.',
      link: SITE_URL,
    },
  },
  {
    network: 'reddit', label: 'Image post with body', assets: ['reddit-post'],
    notes: 'Read each subreddit\'s self-promotion rules first. Many production subreddits limit promotional posts to weekly threads.',
    fields: {
      title: 'I made 50 free bassline MIDI loops (techno, acid, DnB) and a browser lab that plays the actual files',
      body: `Basement Protocol is a free pack of 50 monophonic bassline MIDI files. The image is BP44 Acid Rain, one of the seven acid patterns.

What's in it:
- 50 loops of 1, 2, or 4 bars, 105 to 174 BPM, with tempo and key in each file
- Seven groove families: sparse, rolling, offbeat, syncopated, staccato, sustained, acid
- 5 legato patterns whose notes overlap slightly, for synths that glide on overlapping notes
- CSV exports of every note and a validation report (12 of 12 checks, plus a second parser comparing all 700 notes)

What I couldn't test: imports inside commercial DAWs. The files were parsed with mido and @tonejs/midi. If one misbehaves in your DAW, I'd like to know.

Royalty-free in your own tracks; please don't resell them as a standalone pack.

Lab and download: ${SITE_URL}
Source: ${REPO_URL}`,
    },
  },
  {
    network: 'threads', label: 'Post', assets: ['threads-post'],
    fields: {
      text: `I built a free pack of 50 bassline MIDI files for underground electronic music.

Seven groove families: sparse, rolling, offbeat, syncopated, staccato, sustained, and acid. Loops of 1, 2, or 4 bars between 105 and 174 BPM, with tempo and key written into each file.

There's a browser lab that plays the actual .mid files, so you can hear a pattern before you download anything.

${SITE_LABEL}`,
      tag: 'Music Production',
    },
  },
  {
    network: 'bluesky', label: 'Post', assets: ['bluesky-post', 'bluesky-banner'],
    notes: 'bluesky-banner is the profile banner; the avatar covers the lower left, so the art is centered.',
    fields: {
      text: `Fifty free bassline MIDI files, built for the basement. Seven groove families from sparse dub to 303 acid, 700 notes, and two independent parsers that check every one.

Audition them in your browser before you download:
${SITE_LABEL}`,
    },
  },
]

export const assetFile = (a) => `${a.id}-${a.w}x${a.h}-Cursor.jpg`

// X weights most Latin text as 1 and everything else as 2, and every link as 23.
export function xLength(text) {
  const withLinks = text.replace(/https?:\/\/\S+/g, 'x'.repeat(23))
  let n = 0
  for (const ch of withLinks) {
    const c = ch.codePointAt(0)
    const light = c <= 0x10ff || (c >= 0x2000 && c <= 0x200d) || (c >= 0x2010 && c <= 0x201f) || (c >= 0x2032 && c <= 0x2037)
    n += light ? 1 : 2
  }
  return n
}

export function graphemes(text) {
  return [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text)].length
}

export const hashtags = (text) => text.match(/(^|\s)#[\p{L}\p{N}_]+/gu)?.length ?? 0

export function measure(network, field, value) {
  const rule = LIMITS[network]?.[field]
  if (!rule) return null
  const length = rule.count === 'x' ? xLength(value) : rule.count === 'graphemes' ? graphemes(value) : [...value].length
  const tags = hashtags(value)
  const ok = length <= rule.max && (rule.hashtags === undefined || tags <= rule.hashtags)
  return { field, length, max: rule.max, unit: rule.count === 'x' ? 'X weighted characters (links count as 23)' : rule.count === 'graphemes' ? 'graphemes' : 'characters', hashtags: tags, maxHashtags: rule.hashtags ?? null, ok }
}
