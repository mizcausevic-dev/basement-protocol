// Time-driven composition for the 30-second spot. Every frame is a pure function of t,
// so render.mjs can step through it frame by frame and get identical output on every run.
import { BAR, BEAT, COPY, DURATION, FAMILIES, FORMATS, FPS, SCENES, SITE_LABEL } from './script.js'

const params = new URLSearchParams(location.search)
const RATIO = params.get('ratio') in FORMATS ? params.get('ratio') : '16x9'
const { w: W, h: H } = FORMATS[RATIO]

const IMG = {
  'wide-cone': '/media/assets/wide-cone.jpg',
  'vert-stack': '/media/assets/vert-stack.jpg',
  'vert-acid': '/media/assets/vert-acid.jpg',
  'square-cone': '/media/assets/square-cone.jpg',
  'hero-basement': '/public/images/hero-basement.webp',
  'illus-acid': '/public/images/illus-acid.webp',
  'illus-bigroom': '/public/images/illus-bigroom.webp',
  'illus-cymatics': '/public/images/illus-cymatics.webp',
}
const SCREENS = (kind) => ({
  lab: `/media/assets/screens/lab-${kind}.jpg`,
  map: `/media/assets/screens/map-${kind}.jpg`,
  mindmap: `/media/assets/screens/mindmap-${kind}.jpg`,
})

const LAYOUTS = {
  '16x9': {
    open: { x: 140, y: 300, w: 1040, size: 150, ring: [1530, 560] },
    slam: { y: 540, size: 260, maxW: 1640 },
    roll: { head: { x: 140, y: 110, w: 1640, size: 96 }, sub: 36, rect: [140, 390, 1640, 540] },
    stats: { size: 120, label: 30 },
    validate: { head: { x: 140, y: 170, w: 820, size: 104 }, checks: { y: 470, gap: 104, size: 40 }, rect: [1040, 250, 740, 580] },
    product: { head: { x: 80, y: 250, w: 700, size: 76 }, sub: 34, cards: { kind: 'desktop', cx: 1500, cy: 540, w: 620 } },
    free: { y: 540, size: 150, w: 1560 },
    end: { logo: 150, title: 132, sub: 46, url: 32 },
    hud: { x: 140, y: 990, size: 19 },
    brand: { right: 140, top: 70 },
    imgs: { open: 'wide-cone', families: 'hero-basement', roll: 'illus-cymatics', validate: 'illus-acid', product: 'illus-bigroom', end: 'hero-basement' },
    tint: 'linear-gradient(90deg, rgba(5,7,10,0.92) 0%, rgba(5,7,10,0.55) 45%, rgba(5,7,10,0.1) 75%)',
  },
  '9x16': {
    open: { x: 80, y: 300, w: 920, size: 132, ring: [740, 1330] },
    slam: { y: 880, size: 220, maxW: 900 },
    roll: { head: { x: 80, y: 270, w: 900, size: 104 }, sub: 38, rect: [80, 800, 920, 620] },
    stats: { size: 104, label: 26 },
    validate: { head: { x: 80, y: 270, w: 900, size: 108 }, checks: { y: 560, gap: 92, size: 36 }, rect: [80, 930, 920, 500] },
    product: { head: { x: 80, y: 270, w: 900, size: 96 }, sub: 40, cards: { kind: 'mobile', cx: 540, cy: 1040, w: 380 } },
    free: { y: 880, size: 136, w: 920 },
    end: { logo: 180, title: 124, sub: 46, url: 30 },
    hud: { x: 80, y: 1490, size: 20 },
    brand: null,
    imgs: { open: 'vert-stack', families: 'vert-stack', roll: 'illus-cymatics', validate: 'vert-acid', product: 'illus-bigroom', end: 'vert-stack' },
    tint: 'linear-gradient(180deg, rgba(5,7,10,0.9) 0%, rgba(5,7,10,0.55) 32%, rgba(5,7,10,0.15) 60%, rgba(5,7,10,0.55) 100%)',
  },
  '1x1': {
    open: { x: 80, y: 250, w: 900, size: 116, ring: [622, 590] },
    slam: { y: 540, size: 200, maxW: 920 },
    roll: { head: { x: 80, y: 86, w: 920, size: 76 }, sub: 30, rect: [80, 340, 920, 580] },
    stats: { size: 92, label: 24 },
    validate: { head: { x: 80, y: 86, w: 920, size: 80 }, checks: { y: 250, gap: 70, size: 32 }, rect: [80, 510, 920, 420] },
    product: { head: { x: 80, y: 70, w: 920, size: 60 }, sub: 28, cards: { kind: 'desktop', cx: 540, cy: 720, w: 620 } },
    free: { y: 540, size: 118, w: 920 },
    end: { logo: 130, title: 104, sub: 38, url: 26 },
    hud: { x: 80, y: 1010, size: 16 },
    brand: { right: 80, top: 40 },
    imgs: { open: 'square-cone', families: 'hero-basement', roll: 'illus-cymatics', validate: 'illus-acid', product: 'illus-bigroom', end: 'square-cone' },
    tint: 'linear-gradient(180deg, rgba(5,7,10,0.88) 0%, rgba(5,7,10,0.5) 40%, rgba(5,7,10,0.35) 100%)',
  },
}
const LY = LAYOUTS[RATIO]
const IMG_POS = { 'hero-basement': RATIO === '1x1' ? '72% center' : 'center', 'vert-stack': 'center 40%' }
const IMG_DIM = { roll: 0.22, product: 0.42 }

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeOut = (v) => 1 - (1 - v) ** 3
const easeOutExpo = (v) => (v >= 1 ? 1 : 1 - 2 ** (-10 * v))
const easeInOut = (v) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2)
const backOut = (v) => 1 + 2.7 * (v - 1) ** 3 + 1.7 * (v - 1) ** 2
const lerp = (a, b, k) => a + (b - a) * k
const scene = (id) => SCENES.find((s) => s.id === id)
const inScene = (t, id) => t >= scene(id).t0 && t < scene(id).t1

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let r = Math.imul(a ^ (a >>> 15), 1 | a)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function el(tag, cls, parent, style) {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (style) Object.assign(n.style, style)
  if (parent) parent.append(n)
  return n
}

// "*word*" marks an accent-colored word.
function words(parent, text, cls = '') {
  const out = []
  for (const raw of text.split(' ')) {
    const accent = raw.startsWith('*')
    const span = el('span', `word ${accent ? cls || 'accent' : ''}`, parent)
    span.textContent = raw.replace(/\*/g, '') + ' '
    out.push(span)
  }
  return out
}

function animWords(spans, t, tIn, tOut, { stagger = 0.05, dur = 0.55, rise = 0.42, blur = 10, outDur = 0.2 } = {}) {
  const out = clamp01((t - tOut) / outDur)
  spans.forEach((s, i) => {
    const p = easeOut(clamp01((t - tIn - i * stagger) / dur))
    s.style.opacity = String(p * (1 - out))
    s.style.transform = `translateY(${((1 - p) * rise - out * 0.2).toFixed(4)}em)`
    s.style.filter = p < 1 ? `blur(${((1 - p) * blur).toFixed(2)}px)` : 'none'
  })
}

function show(node, on) {
  if (node.__display === undefined) node.__display = node.style.display === 'none' ? '' : node.style.display
  node.style.display = on ? node.__display : 'none'
}

async function loadImage(src) {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

async function build() {
  const [timeline, manifest] = await Promise.all([
    fetch('/media/build/timeline.json').then((r) => r.json()),
    fetch('/pack/manifest-Cursor.json').then((r) => r.json()),
  ])
  const meta = Object.fromEntries(manifest.patterns.map((p) => [p.id, p]))

  const stage = el('div', 'stage', document.body, { width: `${W}px`, height: `${H}px` })
  const world = el('div', 'layer', stage)

  const bgLayer = el('div', 'layer', world)
  const bgs = {}
  await Promise.all(Object.values(LY.imgs).map((n) => loadImage(IMG[n])))
  for (const sc of SCENES) {
    const name = LY.imgs[sc.id]
    const d = el('div', 'bg', bgLayer, { backgroundImage: `url(${IMG[name]})`, backgroundPosition: IMG_POS[name] ?? 'center' })
    if (IMG_DIM[sc.id]) d.style.filter = `brightness(${IMG_DIM[sc.id]}) saturate(1.1)`
    bgs[sc.id] = d
  }
  const tint = el('div', 'layer', world, { background: LY.tint })
  const pulse = el('div', 'layer', world, { mixBlendMode: 'screen' })

  const fx = el('canvas', 'layer', world)
  fx.width = W
  fx.height = H
  const ctx = fx.getContext('2d')

  const cardsLayer = el('div', 'layer', world, { perspective: '2400px', perspectiveOrigin: '50% 45%' })
  const shade = el('div', 'layer', world, { background: 'radial-gradient(ellipse at center, rgba(5,7,10,0.9) 0%, rgba(5,7,10,0.6) 45%, rgba(5,7,10,0.15) 80%)', opacity: 0 })
  const text = el('div', 'layer', world)

  // Scene 1: cold open.
  const open = el('div', '', text, { position: 'absolute', left: `${LY.open.x}px`, top: `${LY.open.y}px`, width: `${LY.open.w}px` })
  const openEyebrow = el('div', 'eyebrow', open, { marginBottom: '28px' })
  openEyebrow.textContent = 'Basement Protocol  ·  Free MIDI pack'
  const open1 = el('div', 'headline', open, { fontSize: `${LY.open.size}px` })
  const open1W = words(open1, COPY.open1)
  const open2 = el('div', 'headline', open, { fontSize: `${LY.open.size}px`, marginTop: '0.08em' })
  const open2W = words(open2, 'Built for the *basement.*')

  // Scene 2: family slam, one word per beat.
  const slamWrap = el('div', '', text, { position: 'absolute', left: 0, right: 0, top: `${LY.slam.y}px`, textAlign: 'center' })
  const slam = el('div', 'headline', slamWrap, { display: 'inline-block', transform: 'translateY(-50%)', textTransform: 'uppercase', letterSpacing: '-0.045em' })
  const slamCount = el('div', 'eyebrow', text, { position: 'absolute', left: 0, right: 0, textAlign: 'center' })
  const slamWords = [...FAMILIES, COPY.familiesEnd]
  const slamSizes = slamWords.map((w) => {
    slam.style.fontSize = `${LY.slam.size}px`
    slam.textContent = w
    return Math.min(LY.slam.size, (LY.slam.size * LY.slam.maxW) / slam.offsetWidth)
  })
  const famRow = el('div', '', text, {
    position: 'absolute',
    left: RATIO === '16x9' ? '140px' : '64px',
    right: RATIO === '16x9' ? '140px' : '64px',
    top: `${LY.slam.y + (RATIO === '9x16' ? 280 : 250)}px`,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: RATIO === '16x9' ? '10px 14px' : '8px 10px',
  })
  const famChipEls = FAMILIES.map((name) => {
    const c = el('div', 'eyebrow', famRow, {
      padding: '7px 12px',
      border: '1px solid rgba(234,252,255,0.22)',
      borderRadius: '999px',
      letterSpacing: '0.12em',
      opacity: '0.28',
    })
    c.textContent = name
    return c
  })

  // Scene 3: piano roll of BP11.
  const rollHead = el('div', '', text, { position: 'absolute', left: `${LY.roll.head.x}px`, top: `${LY.roll.head.y}px`, width: `${LY.roll.head.w}px` })
  const roll1 = el('div', 'headline', rollHead, { fontSize: `${LY.roll.head.size}px` })
  const roll1W = words(roll1, 'Every note is *in* *the* *file.*')
  const roll1Sub = el('div', 'sub', rollHead, { fontSize: `${LY.roll.sub}px`, marginTop: '22px', maxWidth: '30em' })
  const roll1SubW = words(roll1Sub, COPY.roll1Sub)
  const stats = el('div', '', text, { position: 'absolute', left: `${LY.roll.head.x}px`, top: `${LY.roll.head.y}px`, width: `${LY.roll.head.w}px`, display: 'flex', gap: RATIO === '16x9' ? '120px' : '56px' })
  const statEls = COPY.rollStats.map((s) => {
    const box = el('div', '', stats)
    const v = el('div', 'headline mono', box, { fontSize: `${LY.stats.size}px`, color: 'var(--cyan)', letterSpacing: '-0.04em' })
    const l = el('div', 'eyebrow', box, { fontSize: `${LY.stats.label}px`, color: 'var(--muted)', marginTop: '10px', letterSpacing: '0.12em' })
    l.textContent = s.label
    return { box, v, value: s.value }
  })

  // Scene 4: validation.
  const valHead = el('div', '', text, { position: 'absolute', left: `${LY.validate.head.x}px`, top: `${LY.validate.head.y}px`, width: `${LY.validate.head.w}px` })
  const valW = words(el('div', 'headline', valHead, { fontSize: `${LY.validate.head.size}px` }), 'Validated *like* *software.*', 'acid')
  const checkEls = COPY.checks.map((c, i) => {
    const row = el('div', 'check', text, {
      position: 'absolute', left: `${LY.validate.head.x}px`, top: `${LY.validate.checks.y + i * LY.validate.checks.gap}px`,
      fontSize: `${LY.validate.checks.size}px`, width: `${LY.validate.head.w + 120}px`,
    })
    const tick = el('span', 'tick', row, { width: `${LY.validate.checks.size * 1.35}px`, height: `${LY.validate.checks.size * 1.35}px`, fontSize: `${LY.validate.checks.size * 0.8}px` })
    tick.textContent = '✓'
    const label = el('span', '', row)
    label.textContent = c
    return { row, tick, label }
  })

  // Scene 5: product cards.
  const cardSpec = LY.product.cards
  const screens = SCREENS(cardSpec.kind)
  await Promise.all(Object.values(screens).map(loadImage))
  const aspect = cardSpec.kind === 'mobile' ? 844 / 390 : 900 / 1440
  const cardH = cardSpec.w * aspect + 44
  const cards = ['map', 'mindmap', 'lab'].map((k) => {
    const c = el('div', 'card', cardsLayer, { width: `${cardSpec.w}px`, height: `${cardH}px`, left: `${cardSpec.cx - cardSpec.w / 2}px`, top: `${cardSpec.cy - cardH / 2}px` })
    const chrome = el('div', 'chrome', c)
    el('i', '', chrome); el('i', '', chrome); el('i', '', chrome)
    const url = el('span', 'url', chrome)
    url.textContent = cardSpec.kind === 'mobile' ? 'basement-protocol' : SITE_LABEL
    const img = el('img', '', c)
    img.src = screens[k]
    img.alt = ''
    return c
  })
  const prodHead = el('div', '', text, {
    position: 'absolute',
    left: `${LY.product.head.x}px`,
    top: `${LY.product.head.y}px`,
    width: `${LY.product.head.w}px`,
    zIndex: '3',
    textShadow: '0 2px 28px rgba(5,7,10,0.9), 0 0 48px rgba(5,7,10,0.7)',
  })
  const prod1W = words(el('div', 'headline', prodHead, { fontSize: `${LY.product.head.size}px` }), 'Audition every file *in* *your* *browser.*')
  const prod2W = words(el('div', 'sub', prodHead, { fontSize: `${LY.product.sub}px`, marginTop: '22px', color: 'var(--ink)' }), 'Then drag the *.mid* into your DAW.', 'acid')
  const freeWrap = el('div', '', text, { position: 'absolute', left: `${(W - LY.free.w) / 2}px`, width: `${LY.free.w}px`, top: `${LY.free.y}px`, textAlign: 'center' })
  const free = el('div', 'headline', freeWrap, { fontSize: `${LY.free.size}px`, transform: 'translateY(-50%)' })
  const freeW = words(free, '*Free.* Royalty-free in your own tracks.', 'acid')

  // Scene 6: end card.
  const end = el('div', '', text, { position: 'absolute', left: 0, right: 0, top: `${H / 2}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' })
  const logo = el('div', '', end, { width: `${LY.end.logo}px`, height: `${LY.end.logo}px`, marginBottom: '34px' })
  logo.innerHTML = '<svg viewBox="0 0 32 32" width="100%" height="100%"><rect x="1" y="1" width="30" height="30" rx="8" fill="#0b0c10" stroke="#66fcf1" stroke-opacity="0.6"/><path d="M5 20 C 8 20, 8 9, 11 9 S 14 23, 17 23 S 20 12, 23 12 S 26 18, 27 18" fill="none" stroke="#66fcf1" stroke-width="2.4" stroke-linecap="round"/><rect x="6" y="25" width="5" height="2" rx="1" fill="#d6ff3f"/><rect x="13" y="25" width="3" height="2" rx="1" fill="#66fcf1"/><rect x="18" y="25" width="7" height="2" rx="1" fill="#ff2d55"/></svg>'
  const endTitleW = words(el('div', 'headline', end, { fontSize: `${LY.end.title}px` }), COPY.endTitle)
  const endSub = el('div', 'sub', end, { fontSize: `${LY.end.sub}px`, marginTop: '18px', color: 'var(--ink)' })
  const endSubW = words(endSub, '*50* *free* bassline MIDI files', 'acid')
  const urlPill = el('div', 'pill mono', end, { marginTop: '44px', fontSize: `${LY.end.url}px` })
  urlPill.innerHTML = `<span style="width:12px;height:12px;border-radius:99px;background:#66fcf1;box-shadow:0 0 14px #66fcf1"></span>${SITE_LABEL}`
  const endCta = el('div', 'eyebrow', end, { marginTop: '30px', color: 'var(--muted)', fontSize: `${Math.round(LY.end.url * 0.7)}px` })
  endCta.textContent = COPY.endCta

  // HUD: what is actually sounding, straight from the timeline.
  const hud = el('div', 'hud', world, { left: `${LY.hud.x}px`, top: `${LY.hud.y}px`, fontSize: `${LY.hud.size}px` })
  el('span', 'dot', hud)
  const hudText = el('span', '', hud)
  const hudBars = el('span', 'bars', hud)
  const barTicks = [0, 1, 2, 3].map(() => el('span', '', hudBars))
  let brand = null
  if (LY.brand) {
    brand = el('div', 'eyebrow', world, { position: 'absolute', right: `${LY.brand.right}px`, top: `${LY.brand.top}px`, color: 'var(--ink)', fontSize: '18px' })
    brand.innerHTML = 'Basement <span style="color:#66fcf1">Protocol</span>'
  }

  const overlay = el('div', 'layer', stage)
  el('div', 'layer vignette', overlay)
  const grain = el('canvas', 'grain layer', overlay)
  grain.width = Math.round(W / 2)
  grain.height = Math.round(H / 2)
  const gctx = grain.getContext('2d')
  const gimg = gctx.createImageData(grain.width, grain.height)
  const flash = el('div', 'layer flash', overlay)

  const particles = (() => {
    const r = mulberry32(7)
    return Array.from({ length: 140 }, () => ({ x: r() * W, y: r() * H, v: 12 + r() * 38, s: 0.8 + r() * 2.4, ph: r() * Math.PI * 2, a: 0.2 + r() * 0.5 }))
  })()

  const notes = timeline.notes
  const kicks = timeline.drums.kick
  const sections = timeline.sections
  const cuts = SCENES.slice(1).map((s) => s.t0)

  function kickPulse(t) {
    let p = 0
    for (const k of kicks) if (k <= t && t - k < 0.4) p = Math.max(p, Math.exp(-(t - k) / 0.11))
    return p
  }

  function drawRings(t, cx, cy, strength) {
    const scale = Math.min(W, H) / 1080
    for (const n of notes) {
      const age = t - n.t0
      if (age < 0 || age > 1.5) continue
      for (let k = 0; k < 3; k++) {
        const a = age - k * 0.09
        if (a < 0) continue
        const life = 1 - a / 1.5
        ctx.beginPath()
        ctx.arc(cx, cy, (50 + a * 620) * scale, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(102,252,241,${(0.5 * life ** 1.8 * (n.vel / 127) * strength * (1 - k * 0.28)).toFixed(4)})`
        ctx.lineWidth = (2 + 5 * life) * scale
        ctx.stroke()
      }
    }
  }

  function drawParticles(t, kp, color) {
    for (const p of particles) {
      const y = (((p.y - t * p.v) % H) + H) % H
      const x = p.x + Math.sin(t * 0.7 + p.ph) * 18
      ctx.fillStyle = `rgba(${color},${(p.a * (0.35 + 0.65 * kp)).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(x, y, p.s, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
  const noteName = (p, spelling) => `${(spelling === 'flat' ? NAMES_FLAT : NAMES_SHARP)[p % 12]}${Math.floor(p / 12) - 1}`

  function roundRect(x, y, w, h, r) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
  }

  // Pages through the section a window at a time, like a DAW following the playhead,
  // so the highlighted note is always the one actually sounding.
  function drawRoll(t, sectionId, rect, windowBeats, revealAt, accentRGB, alpha) {
    const sec = sections.find((s) => s.section === sectionId)
    const winDur = windowBeats * BEAT
    const page = Math.max(0, Math.floor((t - sec.t0) / winDur))
    const winT0 = sec.t0 + page * winDur
    const all = notes.filter((n) => n.section === sectionId)
    const list = all.filter((n) => n.t0 >= winT0 - 1e-6 && n.t0 < winT0 + winDur)
    const [bx, ry, bw, rh] = rect
    const gutter = Math.round(Math.min(W, H) / 18)
    const rx = bx + gutter
    const rw = bw - gutter - 14
    const lo = Math.min(...all.map((n) => n.pitch)) - 2
    const hi = Math.max(...all.map((n) => n.pitch)) + 2
    const rowH = rh / (hi - lo + 1)
    const reveal = page === 0 ? easeOutExpo(clamp01((t - revealAt) / 0.9)) : 1
    const phase = t
    const spelling = meta[sec.pattern].spelling
    const loopBars = meta[sec.pattern].bars
    const winBars = windowBeats / 4
    const barA = ((page * winBars) % loopBars) + 1
    const rangeLabel = loopBars > winBars ? `BARS ${barA}-${barA + winBars - 1} OF ${loopBars}` : `${loopBars}-BAR LOOP`
    ctx.save()
    ctx.globalAlpha = alpha
    roundRect(bx, ry, bw, rh, 22)
    ctx.fillStyle = 'rgba(8,10,14,0.8)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(102,252,241,0.22)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.save()
    roundRect(bx, ry, bw, rh, 22)
    ctx.clip()
    for (let p = lo; p <= hi; p++) {
      if (p % 12 === 9) {
        ctx.fillStyle = 'rgba(102,252,241,0.06)'
        ctx.fillRect(rx, ry + (hi - p) * rowH, rw * reveal, rowH)
      }
    }
    for (let b = 0; b <= windowBeats; b++) {
      const x = rx + (b / windowBeats) * rw
      if (x > rx + rw * reveal) break
      ctx.fillStyle = b % 4 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'
      ctx.fillRect(x, ry, b % 4 === 0 ? 2 : 1, rh)
    }
    const px = (tt) => rx + ((tt - winT0) / winDur) * rw
    for (let i = 0; i < list.length; i++) {
      const n = list[i]
      if (!n.slide) continue
      const m = list[i + 1]
      if (!m) continue
      const x0 = px(n.t1) - 4
      const x1 = px(m.t0) + 4
      if (x1 > rx + rw * reveal) continue
      const y0 = ry + (hi - n.pitch + 0.5) * rowH
      const y1 = ry + (hi - m.pitch + 0.5) * rowH
      ctx.beginPath()
      ctx.moveTo(x0 - 18, y0)
      ctx.bezierCurveTo(x0 + 10, y0, x1 - 10, y1, x1 + 18, y1)
      ctx.strokeStyle = 'rgba(214,255,63,0.95)'
      ctx.lineWidth = 4
      ctx.shadowColor = 'rgba(214,255,63,0.9)'
      ctx.shadowBlur = 16
      ctx.stroke()
      ctx.shadowBlur = 0
    }
    for (const n of list) {
      const x0 = px(n.t0)
      const x1 = px(n.t1)
      if (x0 > rx + rw * reveal) continue
      const y = ry + (hi - n.pitch) * rowH + rowH * 0.12
      const active = phase >= n.t0 && phase < n.t1
      const accent = n.vel >= 120
      const ghost = n.vel < 85
      const base = accent ? accentRGB : '102,252,241'
      ctx.fillStyle = active ? 'rgba(240,255,252,1)' : `rgba(${base},${ghost ? 0.45 : accent ? 1 : 0.78})`
      if (active) {
        ctx.shadowColor = `rgba(${base},1)`
        ctx.shadowBlur = 34
      }
      roundRect(x0 + 1, y, Math.max(6, x1 - x0 - 2), rowH * 0.76, Math.min(8, rowH * 0.3))
      ctx.fill()
      ctx.shadowBlur = 0
    }
    if (reveal > 0.98) {
      const x = px(phase)
      const g = ctx.createLinearGradient(x - 60, 0, x, 0)
      g.addColorStop(0, 'rgba(102,252,241,0)')
      g.addColorStop(1, 'rgba(102,252,241,0.18)')
      ctx.fillStyle = g
      ctx.fillRect(x - 60, ry, 60, rh)
      ctx.fillStyle = 'rgba(234,252,255,0.95)'
      ctx.fillRect(x - 1, ry, 2.5, rh)
    }
    ctx.restore()
    ctx.font = `500 ${Math.round(Math.min(W, H) / 60)}px "JetBrains Mono"`
    ctx.fillStyle = 'rgba(143,163,171,0.95)'
    const top = Math.max(...all.map((n) => n.pitch))
    const bottom = Math.min(...all.map((n) => n.pitch))
    ctx.textBaseline = 'middle'
    ctx.fillText(noteName(top, spelling), bx + 12, ry + (hi - top + 0.5) * rowH)
    ctx.fillText(noteName(bottom, spelling), bx + 12, ry + (hi - bottom + 0.5) * rowH)
    const label = `${sec.pattern} ${sec.name.toUpperCase()}  ·  ${rangeLabel}`
    const lw = ctx.measureText(label).width
    roundRect(bx + bw - lw - 34, ry + 10, lw + 22, 32, 8)
    ctx.fillStyle = 'rgba(8,10,14,0.92)'
    ctx.fill()
    ctx.fillStyle = 'rgba(143,163,171,0.95)'
    ctx.textAlign = 'right'
    ctx.fillText(label, bx + bw - 23, ry + 26)
    ctx.textAlign = 'left'
    ctx.restore()
  }

  let frameIndex = 0
  function renderFrame(t) {
    frameIndex = Math.round(t * FPS)
    const kp = kickPulse(t)
    const cur = SCENES.find((s) => t >= s.t0 && t < s.t1) ?? SCENES[SCENES.length - 1]

    // Backgrounds: hard cuts on the downbeat, slow push-in, a nudge on every kick.
    for (const sc of SCENES) {
      const on = sc === cur
      const d = bgs[sc.id]
      d.style.opacity = on ? '1' : '0'
      if (!on) continue
      const p = clamp01((t - sc.t0) / (sc.t1 - sc.t0))
      const s = 1.02 + 0.07 * easeInOut(p) + 0.012 * kp
      d.style.transform = `scale(${s.toFixed(4)}) translate(${(-1.2 * p).toFixed(3)}%, ${(-0.6 * p).toFixed(3)}%)`
    }
    tint.style.opacity = cur.id === 'families' || cur.id === 'end' ? '0.55' : '1'
    const ring = cur.id === 'open' ? LY.open.ring : [W / 2, cur.id === 'end' ? H / 2 - 120 : LY.slam.y]
    pulse.style.background = `radial-gradient(circle at ${ring[0]}px ${ring[1]}px, rgba(102,252,241,${(0.22 * kp).toFixed(3)}) 0%, rgba(102,252,241,0) 55%)`

    ctx.clearRect(0, 0, W, H)
    if (cur.id === 'open' || cur.id === 'families' || cur.id === 'end') drawRings(t, ring[0], ring[1], cur.id === 'families' ? 0.7 : 1)
    drawParticles(t, kp, cur.id === 'validate' ? '214,255,63' : '102,252,241')
    if (cur.id === 'roll') drawRoll(t, 'groove', LY.roll.rect, 8, scene('roll').t0 + 0.15, '102,252,241', 1)
    if (cur.id === 'validate') drawRoll(t, 'acid', LY.validate.rect, 8, scene('validate').t0 + 0.1, '214,255,63', 1)

    // Scene 1
    show(open, cur.id === 'open')
    openEyebrow.style.opacity = String(easeOut(clamp01((t - 0.1) / 0.6)) * (1 - clamp01((t - 3.55) / 0.2)))
    animWords(open1W, t, 0.25, 3.55, { stagger: 0.09, dur: 0.7 })
    animWords(open2W, t, BAR, 3.55, { stagger: 0.07, dur: 0.6 })

    // Scene 2
    const fam = scene('families')
    show(slamWrap, cur.id === 'families')
    show(slamCount, cur.id === 'families')
    show(famRow, cur.id === 'families')
    if (cur.id === 'families') {
      const k = Math.min(7, Math.floor((t - fam.t0) / BEAT))
      const lt = t - (fam.t0 + k * BEAT)
      slam.textContent = slamWords[k]
      slam.style.fontSize = `${slamSizes[k]}px`
      const sc = 1 + 0.16 * Math.exp(-lt / 0.08)
      const dx = 16 * Math.exp(-lt / 0.07)
      slam.style.transform = `translateY(-50%) scale(${sc.toFixed(4)})`
      slam.style.color = k === 7 ? 'var(--acid)' : 'var(--ink)'
      slam.style.textShadow = `${dx.toFixed(2)}px 0 rgba(255,45,85,0.85), ${(-dx).toFixed(2)}px 0 rgba(102,252,241,0.85)`
      slamCount.style.top = `${Math.max(LY.hud.y * 0.08, LY.slam.y - slamSizes[k] * 0.62)}px`
      slamCount.textContent = k < 7 ? `Groove family ${String(k + 1).padStart(2, '0')} / 07` : 'Seven families  ·  one pack'
      famChipEls.forEach((c, i) => {
        const seen = k >= i
        const now = k === i
        c.style.opacity = String(k === 7 ? '0.95' : now ? '1' : seen ? '0.72' : '0.28')
        c.style.color = now || k === 7 ? 'var(--acid)' : 'var(--ink)'
        c.style.borderColor = now || k === 7 ? 'rgba(214,255,63,0.8)' : 'rgba(234,252,255,0.22)'
      })
    }

    // Scene 3
    const rl = scene('roll')
    show(rollHead, cur.id === 'roll' && t < rl.t0 + 2 * BAR)
    animWords(roll1W, t, rl.t0 + 0.05, rl.t0 + 2 * BAR - 0.25, { stagger: 0.06 })
    animWords(roll1SubW, t, rl.t0 + 0.45, rl.t0 + 2 * BAR - 0.25, { stagger: 0.025, dur: 0.5, rise: 0.3, blur: 6 })
    show(stats, cur.id === 'roll' && t >= rl.t0 + 2 * BAR)
    statEls.forEach((s, i) => {
      const t0 = rl.t0 + 2 * BAR + i * 0.16
      const p = easeOut(clamp01((t - t0) / 0.5))
      const count = easeOutExpo(clamp01((t - t0) / 0.42))
      const out = clamp01((t - (rl.t1 - 0.2)) / 0.2)
      s.box.style.opacity = String(p * (1 - out))
      s.box.style.transform = `translateY(${((1 - p) * 30).toFixed(2)}px)`
      s.v.textContent = String(Math.round(s.value * count))
    })

    // Scene 4
    const va = scene('validate')
    show(valHead, cur.id === 'validate')
    animWords(valW, t, va.t0 + 0.05, va.t1 - 0.2, { stagger: 0.07 })
    checkEls.forEach((c, i) => {
      const t0 = va.t0 + (i + 1) * BAR
      const on = cur.id === 'validate' && t >= t0 - 0.01
      show(c.row, on)
      if (!on) return
      const p = easeOut(clamp01((t - t0) / 0.45))
      const pop = backOut(clamp01((t - t0) / 0.35))
      const out = clamp01((t - (va.t1 - 0.2)) / 0.2)
      c.row.style.opacity = String(p * (1 - out))
      c.label.style.transform = `translateX(${((1 - p) * 40).toFixed(2)}px)`
      c.tick.style.transform = `scale(${pop.toFixed(4)})`
      c.tick.style.boxShadow = `0 0 ${(30 * Math.exp(-(t - t0) / 0.3)).toFixed(1)}px rgba(214,255,63,0.9)`
    })

    // Scene 5
    const pr = scene('product')
    const onProduct = cur.id === 'product'
    show(cardsLayer, onProduct)
    show(prodHead, onProduct && t < pr.t0 + 2 * BAR)
    show(freeWrap, onProduct && t >= pr.t0 + 2 * BAR)
    if (onProduct) {
      const p = clamp01((t - pr.t0) / (pr.t1 - pr.t0))
      const enter = easeOutExpo(clamp01((t - pr.t0) / 0.9))
      const fan = easeOut(clamp01((t - pr.t0 - 0.25) / 1.0))
      const breakP = clamp01((t - (pr.t0 + 2 * BAR)) / BAR)
      const shake = breakP * breakP * 7
      const r = mulberry32(frameIndex + 99)
      const sx = (r() - 0.5) * shake
      const sy = (r() - 0.5) * shake
      const spread = cardSpec.kind === 'mobile' ? 210 : cardSpec.w * 0.14
      const conf = [
        { x: -spread * fan, z: -320 * fan, ry: 24 * fan, rot: -3 * fan },
        { x: spread * fan, z: -320 * fan, ry: -24 * fan, rot: 3 * fan },
        { x: 0, z: 40 * enter, ry: -9 + 6 * p, rot: 0 },
      ]
      cards.forEach((c, i) => {
        const k = conf[i]
        const y = (1 - enter) * 180 + sy
        const s = 1 - 0.1 * easeInOut(breakP)
        c.style.opacity = String((i === 2 ? enter : fan * 0.9) * (1 - 0.82 * easeInOut(clamp01(breakP * 3))))
        c.style.transform = `translate3d(${(k.x + sx).toFixed(2)}px, ${y.toFixed(2)}px, ${k.z.toFixed(2)}px) rotateY(${k.ry.toFixed(3)}deg) rotateZ(${k.rot.toFixed(3)}deg) rotateX(${(4 - 3 * p).toFixed(3)}deg) scale(${s.toFixed(4)})`
      })
      world.style.transform = `scale(${(1 + 0.035 * breakP * breakP).toFixed(4)})`
      shade.style.opacity = String(easeInOut(clamp01(breakP * 3)).toFixed(3))
    } else {
      world.style.transform = 'none'
      shade.style.opacity = cur.id === 'end' ? '1' : '0'
    }
    animWords(prod1W, t, pr.t0 + 0.1, pr.t0 + 2 * BAR - 0.2, { stagger: 0.06 })
    animWords(prod2W, t, pr.t0 + BAR, pr.t0 + 2 * BAR - 0.2, { stagger: 0.05 })
    animWords(freeW, t, pr.t0 + 2 * BAR, pr.t1 - 0.08, { stagger: 0.08, dur: 0.45, outDur: 0.08 })

    // Scene 6
    const en = scene('end')
    show(end, cur.id === 'end')
    if (cur.id === 'end') {
      const lp = backOut(clamp01((t - en.t0) / 0.5))
      logo.style.transform = `scale(${(0.6 + 0.4 * lp).toFixed(4)})`
      logo.style.opacity = String(clamp01((t - en.t0) / 0.25))
      logo.style.filter = `drop-shadow(0 0 ${(18 + 40 * kp).toFixed(1)}px rgba(102,252,241,0.55))`
      const pp = easeOut(clamp01((t - en.t0 - 0.45) / 0.5))
      urlPill.style.opacity = String(pp)
      urlPill.style.transform = `translateY(${((1 - pp) * 24).toFixed(2)}px)`
      endCta.style.opacity = String(easeOut(clamp01((t - en.t0 - 0.75) / 0.5)))
      end.style.transform = `translateY(-50%) translateY(${RATIO === '9x16' ? -40 : 0}px)`
    }
    animWords(endTitleW, t, en.t0 + 0.12, 99, { stagger: 0.08 })
    animWords(endSubW, t, en.t0 + 0.3, 99, { stagger: 0.05 })

    // HUD
    const sec = sections.find((s) => t >= s.t0 && t < s.t1) ?? sections[sections.length - 1]
    show(hud, cur.id !== 'end')
    if (cur.id !== 'end') {
      const m = meta[sec.pattern]
      const key = m.key.replace(/\s*\(.*\)/, '')
      const tempo = m.bpm === 128 ? '128 BPM' : RATIO === '16x9' ? `file ${m.bpm} BPM, played at 128` : `${m.bpm} BPM file at 128`
      hudText.innerHTML = `${RATIO === '9x16' ? '' : 'NOW PLAYING  '}<b>${m.id}</b> ${m.name}  ·  ${key}  ·  ${tempo}`
      const barIn = Math.floor((t - sec.t0) / BAR)
      barTicks.forEach((b, i) => b.classList.toggle('on', i <= barIn % 4))
      hud.style.opacity = String(clamp01(t / 0.4))
    }
    if (brand) show(brand, cur.id !== 'end')

    // Grain, flash on cuts.
    const r = mulberry32(frameIndex * 7919 + 13)
    const data = gimg.data
    for (let i = 0; i < data.length; i += 4) {
      const v = (r() * 255) | 0
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
    gctx.putImageData(gimg, 0, 0)
    let f = 0
    for (const c of cuts) if (t >= c && t - c < 0.3) f = Math.max(f, Math.exp(-(t - c) / 0.07))
    flash.style.opacity = String((0.5 * f).toFixed(3))
  }

  await document.fonts.ready
  await Promise.all(['400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 64px "Space Grotesk"`)))
  await Promise.all(['400', '600'].map((w) => document.fonts.load(`${w} 32px "JetBrains Mono"`)))
  // Slam sizes depend on loaded font metrics, so measure again now.
  slamWords.forEach((w, i) => {
    slam.style.fontSize = `${LY.slam.size}px`
    slam.textContent = w
    slamSizes[i] = Math.min(LY.slam.size, (LY.slam.size * LY.slam.maxW) / slam.offsetWidth)
  })
  renderFrame(Number(params.get('t') ?? 0))
  return { renderFrame, duration: DURATION, fps: FPS, width: W, height: H }
}

window.__composition = build()
