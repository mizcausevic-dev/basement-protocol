// Static social cards. Each card is laid out with flexbox, then the piano rolls are drawn as SVG into
// whatever space the layout gave them, straight from the pack's note-events CSV.
import { COPY, SITE_LABEL } from './script.js'
import { ASSETS, FAMILY_COLORS, FAMILY_LINES, FAMILY_PICKS } from './social-spec.js'

const params = new URLSearchParams(location.search)
const A = ASSETS.find((a) => a.id === params.get('id')) ?? ASSETS[0]
const { w: W, h: H } = A
const O = A.opts ?? {}

const IMG = {
  'wide-cone': '/media/assets/wide-cone.jpg',
  'vert-stack': '/media/assets/vert-stack.jpg',
  'vert-acid': '/media/assets/vert-acid.jpg',
  'square-cone': '/media/assets/square-cone.jpg',
  'hero-basement': '/public/images/hero-basement.webp',
  'illus-acid': '/public/images/illus-acid.webp',
  'illus-bigroom': '/public/images/illus-bigroom.webp',
  'illus-cymatics': '/public/images/illus-cymatics.webp',
  'lab-mobile': '/media/assets/screens/lab-mobile.jpg',
}
const CYAN = '#66fcf1'
const ACID = '#d6ff3f'

// The report's check names are written for engineers; these fit on a card and say the same thing.
const SHORT_CHECKS = {
  count: '50 files, IDs match across files and CSVs',
  parse: 'Every file parses with mido',
  meta: 'Tempo and 4/4 at tick 0, 480 PPQ',
  boundary: 'Loops end on the boundary, every note closes',
  ranges: 'Pitches C1 to E4, velocities 1 to 127',
  monophony: 'Monophonic, overlaps only where labeled',
  csv_match: 'CSV exports match the MIDI exactly',
  scale: 'Every out-of-scale note is labeled',
  distinct: 'No duplicate or transposed patterns',
  coverage: 'All 7 families, 1, 2, and 4-bar loops',
  ghost_proxy: 'Ghost notes stay short (proxy check)',
  zip: 'ZIP matches the validated files byte for byte',
}

const LOGO = '<svg viewBox="0 0 32 32" width="100%" height="100%"><rect x="1" y="1" width="30" height="30" rx="8" fill="#0b0c10" stroke="#66fcf1" stroke-opacity="0.6"/><path d="M5 20 C 8 20, 8 9, 11 9 S 14 23, 17 23 S 20 12, 23 12 S 26 18, 27 18" fill="none" stroke="#66fcf1" stroke-width="2.4" stroke-linecap="round"/><rect x="6" y="25" width="5" height="2" rx="1" fill="#d6ff3f"/><rect x="13" y="25" width="3" height="2" rx="1" fill="#66fcf1"/><rect x="18" y="25" width="7" height="2" rx="1" fill="#ff2d55"/></svg>'

let M = {}
let EV = {}
let REPORT = null
let PATTERNS = []
let FAMILY_IDS = []

function parseCsv(text) {
  const [head, ...rows] = text.trim().split(/\r?\n/)
  const cols = head.split(',')
  return rows.map((r) => {
    const v = r.split(',')
    return Object.fromEntries(cols.map((c, i) => [c, v[i]]))
  })
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let r = Math.imul(a ^ (a >>> 15), 1 | a)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const rich = (text, cls = 'accent') => text.replace(/\|/g, ' | ').split(' ').map((w) => (w === '|' ? '<br>' : w)).map((w) => (w.startsWith('*') ? `<span class="${cls}">${w.replace(/\*/g, '')}</span>` : w)).join(' ')
const keyOf = (m) => m.key.replace(/\s*\(.*\)/, '')
const barsOf = (m) => `${m.bars} BAR${m.bars > 1 ? 'S' : ''}`
const slidesOf = (id) => EV[id].filter((n) => n.ov > 0).length

function brand(size) {
  return `<div class="brand" style="gap:${size * 0.36}px;font-size:${size * 0.52}px"><div style="width:${size}px;height:${size}px;flex:none">${LOGO}</div><span>Basement <b>Protocol</b></span></div>`
}

function pill(fs, text = SITE_LABEL) {
  return `<div class="pill mono" style="font-size:${fs}px;padding:${fs * 0.55}px ${fs * 1.1}px;gap:${fs * 0.5}px;white-space:nowrap;flex:none"><span style="width:${fs * 0.45}px;height:${fs * 0.45}px;border-radius:99px;background:${CYAN};box-shadow:0 0 14px ${CYAN};flex:none"></span>${text}</div>`
}

function stats(fs, gap) {
  const notes = PATTERNS.reduce((s, p) => s + p.note_count, 0)
  const items = [[PATTERNS.length, 'MIDI files'], [notes, 'notes'], [FAMILY_IDS.length, 'groove families']]
  return `<div class="stats" style="gap:${gap}px">${items.map(([v, l]) => `<div class="stat"><div class="v" style="font-size:${fs}px">${v}</div><div class="l" style="font-size:${fs * 0.24}px;margin-top:${fs * 0.14}px">${l}</div></div>`).join('')}</div>`
}

function background(name, { dim = 0.45, pos = 'center', blur = 0, tint } = {}) {
  const img = name ? `<div class="bg" style="inset:${blur ? '-3%' : '0'};background-image:url(${IMG[name]});background-position:${pos};filter:brightness(${dim}) saturate(1.1)${blur ? ` blur(${blur}px)` : ''}"></div>` : ''
  return `${img}<div class="tint" style="background:${tint ?? 'linear-gradient(180deg, rgba(5,7,10,0.86) 0%, rgba(5,7,10,0.55) 45%, rgba(5,7,10,0.8) 100%)'}"></div>`
}

// seq is a list of pattern IDs or [id, repeats]; all segments share one pitch range so a strip reads as one line.
function rollSvg(seq, w, h, o = {}) {
  const { accent = CYAN, slideColor = ACID, labels = true, glow = true, segLabels = false, padRows = 2, minNoteH = 0 } = o
  const segs = []
  let beat0 = 0
  for (const item of seq) {
    const [id, times = 1] = Array.isArray(item) ? item : [item]
    for (let k = 0; k < times; k++) {
      segs.push({ id, b0: beat0, beats: M[id].loop_beats })
      beat0 += M[id].loop_beats
    }
  }
  const total = beat0
  const all = segs.flatMap((s) => EV[s.id])
  const top = Math.max(...all.map((n) => n.p))
  const bottom = Math.min(...all.map((n) => n.p))
  const lo = bottom - padRows
  const hi = top + padRows
  const fs = o.fontSize ?? Math.max(12, Math.min(26, h / 15))
  const gx = labels ? Math.round(fs * 3.4) : 0
  const rw = w - gx - (labels ? 6 : 0)
  const rowH = h / (hi - lo + 1)
  const X = (b) => gx + (b / total) * rw
  const Y = (p) => (hi - p) * rowH
  const fid = `g${Math.random().toString(36).slice(2, 8)}`
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`]
  out.push(`<defs><filter id="${fid}" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="${Math.max(2, rowH * 0.28).toFixed(1)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`)
  const rootPc = M[segs[0].id].root_midi % 12
  for (let p = lo; p <= hi; p++) if (p % 12 === rootPc) out.push(`<rect x="${gx}" y="${Y(p)}" width="${rw}" height="${rowH}" fill="${accent}" opacity="0.07"/>`)
  const sixteenth = rw / total / 4
  for (let q = 0; q <= total * 4; q++) {
    const b = q / 4
    const x = X(b)
    if (q % 16 === 0) out.push(`<rect x="${x - 1}" y="0" width="2" height="${h}" fill="#fff" opacity="0.16"/>`)
    else if (q % 4 === 0) out.push(`<rect x="${x - 0.5}" y="0" width="1" height="${h}" fill="#fff" opacity="0.07"/>`)
    else if (sixteenth > 14) out.push(`<rect x="${x - 0.5}" y="0" width="1" height="${h}" fill="#fff" opacity="0.03"/>`)
  }
  const notes = []
  const slides = []
  for (const sg of segs) {
    const list = EV[sg.id]
    list.forEach((n, i) => {
      const x0 = X(sg.b0 + n.s)
      const x1 = X(sg.b0 + n.s + n.d)
      const nh = Math.max(rowH * 0.72, minNoteH)
      const y = Y(n.p) + (rowH - nh) / 2
      const op = n.v >= 120 ? 1 : n.v < 90 ? 0.42 : 0.78
      const r = Math.min(8, nh * 0.42)
      notes.push(`<rect x="${(x0 + 1).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(4, x1 - x0 - 2).toFixed(1)}" height="${nh.toFixed(1)}" rx="${r.toFixed(1)}" fill="${accent}" opacity="${op}"/>`)
      const m = list[i + 1]
      if (n.ov > 0 && m) {
        const ax = X(sg.b0 + n.s + n.d) - 4
        const bx = X(sg.b0 + m.s) + 4
        const ay = Y(n.p) + rowH / 2
        const by = Y(m.p) + rowH / 2
        const k = Math.max(10, rowH * 0.8)
        slides.push(`<path d="M${(ax - k).toFixed(1)} ${ay.toFixed(1)} C ${(ax + k * 0.6).toFixed(1)} ${ay.toFixed(1)}, ${(bx - k * 0.6).toFixed(1)} ${by.toFixed(1)}, ${(bx + k).toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="${slideColor}" stroke-width="${Math.max(2.5, rowH * 0.2).toFixed(1)}" stroke-linecap="round"/>`)
      }
    })
    if (segLabels && sg.b0 > 0) out.push(`<rect x="${X(sg.b0) - 1.5}" y="0" width="3" height="${h}" fill="${accent}" opacity="0.35"/>`)
  }
  out.push(`<g${glow ? ` filter="url(#${fid})"` : ''}>${notes.join('')}</g>`)
  if (slides.length) out.push(`<g${glow ? ` filter="url(#${fid})"` : ''}>${slides.join('')}</g>`)
  if (segLabels) {
    let last = null
    for (const sg of segs) {
      if (sg.id === last) continue
      last = sg.id
      out.push(`<text x="${X(sg.b0) + fs * 0.6}" y="${fs * 1.3}" font-family="JetBrains Mono" font-size="${fs}" fill="#8fa3ab" letter-spacing="1">${sg.id} ${M[sg.id].name.toUpperCase()}</text>`)
    }
  }
  if (labels) {
    for (const p of top === bottom ? [top] : [top, bottom]) out.push(`<text x="4" y="${Y(p) + rowH / 2}" dominant-baseline="middle" font-family="JetBrains Mono" font-size="${fs}" fill="#8fa3ab">${all.find((n) => n.p === p).name}</text>`)
  }
  out.push('</svg>')
  return out.join('')
}

const rollSlot = (seq, opts = {}, style = '') => `<div class="panel-body" style="${style}" data-roll='${JSON.stringify(seq)}' data-opts='${JSON.stringify(opts)}'></div>`

function rollPanel(id, fs, pad, { accent, extra = '' } = {}) {
  const m = M[id]
  return `<div class="panel grow">
    <div class="panel-head" style="font-size:${fs}px;padding:${pad * 0.8}px ${pad}px 0"><span><b>${id}</b> ${m.name.toUpperCase()}</span><span>${keyOf(m).toUpperCase()} · ${m.bpm} BPM · ${barsOf(m)}${extra}</span></div>
    ${rollSlot([id], { accent, fontSize: fs }, `margin:${pad * 0.7}px ${pad}px ${pad}px`)}
  </div>`
}

function familiesPanel(fs, { lines = false, pad = fs } = {}) {
  const max = Math.max(...FAMILY_IDS.map((f) => PATTERNS.filter((p) => p.family === f).length))
  const rows = FAMILY_IDS.map((f) => {
    const n = PATTERNS.filter((p) => p.family === f).length
    const label = f[0].toUpperCase() + f.slice(1)
    return `<div style="display:flex;flex-direction:column;justify-content:center;gap:${fs * 0.3}px;flex:1">
      <div class="row" style="gap:${fs * 0.7}px">
        <div style="width:${fs * 6.4}px;font-weight:600;font-size:${fs}px;color:var(--ink)">${label}</div>
        <div class="bar-track" style="height:${fs * 0.62}px"><div class="bar-fill" style="width:${(n / max) * 100}%;background:${FAMILY_COLORS[f]};box-shadow:0 0 18px ${FAMILY_COLORS[f]}"></div></div>
        <div class="mono" style="width:${fs * 1.6}px;text-align:right;font-size:${fs * 0.92}px;color:${FAMILY_COLORS[f]};font-weight:600">${n}</div>
      </div>
      ${lines ? `<div class="sub" style="font-size:${fs * 0.62}px;margin-left:${fs * 7.1}px">${FAMILY_LINES[f]}</div>` : ''}
    </div>`
  }).join('')
  return `<div class="panel grow">
    <div class="panel-head" style="font-size:${fs * 0.6}px;padding:${pad * 0.8}px ${pad}px 0"><span><b>PATTERNS</b> PER FAMILY</span><span>${PATTERNS.length} TOTAL</span></div>
    <div style="flex:1;display:flex;flex-direction:column;padding:${pad * 0.4}px ${pad}px ${pad * 0.7}px">${rows}</div>
  </div>`
}

function checksPanel(fs, { pad = fs, cols = 1 } = {}) {
  const passed = REPORT.checks.filter((c) => c.status === 'pass').length
  const rows = REPORT.checks.map((c) => {
    const ok = c.status === 'pass'
    return `<div class="tick-row${ok ? '' : ' fail'}" style="gap:${fs * 0.6}px;font-size:${fs}px;flex:1"><span class="t" style="width:${fs * 1.2}px;height:${fs * 1.2}px;font-size:${fs * 0.72}px">${ok ? '✓' : '✕'}</span><span>${SHORT_CHECKS[c.id] ?? c.name}</span></div>`
  }).join('')
  return `<div class="panel grow">
    <div class="panel-head" style="font-size:${fs * 0.66}px;padding:${pad * 0.8}px ${pad}px 0"><span><b>VALIDATION</b> REPORT</span><span style="color:var(--acid)">${passed} / ${REPORT.checks.length} PASS</span></div>
    <div style="flex:1;display:grid;grid-template-columns:repeat(${cols},1fr);grid-auto-rows:1fr;column-gap:${fs}px;padding:${pad * 0.5}px ${pad}px ${pad * 0.7}px">${rows}</div>
  </div>`
}

function chips(fs, id) {
  const m = M[id]
  const items = [keyOf(m), `${m.bpm} BPM`, barsOf(m).toLowerCase(), `${m.note_count} notes`, `${m.family} family`]
  const sl = slidesOf(id)
  return `<div class="chips" style="gap:${fs * 0.5}px">${items.map((t) => `<span class="chip" style="font-size:${fs}px;padding:${fs * 0.4}px ${fs * 0.85}px">${t}</span>`).join('')}${sl ? `<span class="chip acid" style="font-size:${fs}px;padding:${fs * 0.4}px ${fs * 0.85}px">${sl} legato slides</span>` : ''}</div>`
}

function grainCanvas(seed, alpha = 0.08) {
  const c = document.createElement('canvas')
  c.className = 'grain-static'
  c.width = Math.round(W / 2)
  c.height = Math.round(H / 2)
  c.style.opacity = String(alpha)
  const g = c.getContext('2d')
  const img = g.createImageData(c.width, c.height)
  const r = mulberry32(seed)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (r() * 255) | 0
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  return c
}

const frame = (inset, inner) => `<div class="frame" style="left:${inset[3]}px;top:${inset[0]}px;right:${inset[1]}px;bottom:${inset[2]}px">${inner}</div>`
const topbar = (size, right) => `<div class="row between">${brand(size)}<div class="eyebrow" style="font-size:${size * 0.36}px">${right}</div></div>`

function visual(kind, fs, pad) {
  if (kind.startsWith('roll:')) return rollPanel(kind.slice(5), fs, pad)
  if (kind === 'families') return familiesPanel(fs * 1.6, { lines: true, pad })
  if (kind === 'checks') return checksPanel(fs * 1.2, { pad })
  return ''
}

const LAYOUTS = {
  poster() {
    return background(O.bg, { dim: 0.42 }) + frame([64, 72, 64, 72], `
      ${topbar(56, 'Free MIDI pack')}
      <div class="headline" style="font-size:${O.size ?? 100}px;margin-top:52px">${rich(O.head)}</div>
      ${O.kicker ? `<div class="headline" style="font-size:58px;margin-top:18px;color:var(--acid)">${O.kicker}</div>` : ''}
      <div class="sub" style="font-size:34px;margin-top:22px">${O.sub}</div>
      <div class="grow" style="display:flex;margin-top:44px">${visual(O.visual, 20, 30)}</div>
      ${O.stats ? `<div style="margin-top:40px">${stats(76, 84)}</div>` : ''}
      <div class="row between" style="margin-top:40px">${pill(22)}<div class="eyebrow" style="font-size:17px;color:var(--muted);white-space:nowrap">Royalty-free</div></div>`)
  },

  story() {
    const right = O.tiktok ? 190 : 80
    return background(O.bg, { dim: 0.45, pos: 'center 40%', tint: 'linear-gradient(180deg, rgba(5,7,10,0.65) 0%, rgba(5,7,10,0.8) 14%, rgba(5,7,10,0.62) 60%, rgba(5,7,10,0.4) 100%)' }) + frame([250, right, 420, 80], `
      ${brand(60)}
      <div class="headline" style="font-size:${O.tiktok ? 104 : 116}px;margin-top:56px">${rich(O.head)}</div>
      <div class="sub" style="font-size:38px;margin-top:26px">${O.sub}</div>
      <div class="grow" style="display:flex;margin-top:48px">${visual(O.visual, 22, 30)}</div>
      <div style="margin-top:44px">${stats(O.tiktok ? 64 : 72, O.tiktok ? 48 : 70)}</div>
      <div style="margin-top:44px;display:flex;flex-direction:column;align-items:flex-start;gap:18px">
        <div class="pill" style="font-size:34px;font-weight:600;padding:20px 38px;background:var(--cyan);color:#0b0c10;border-color:var(--cyan)">${O.cta} →</div>
        <div class="mono" style="font-size:24px;color:var(--muted)">${SITE_LABEL}</div>
      </div>`)
  },

  thumb() {
    return background(O.bg, { dim: 0.62, pos: 'right center', tint: 'linear-gradient(90deg, rgba(5,7,10,0.96) 0%, rgba(5,7,10,0.85) 42%, rgba(5,7,10,0.2) 75%, rgba(5,7,10,0.35) 100%)' }) + `
      <div style="position:absolute;left:640px;top:396px;width:540px;height:196px">${rollSlot([['BP44', 2]], { labels: false, accent: CYAN }, 'position:absolute;inset:0')}</div>
      <div style="position:absolute;left:64px;top:58px">
        <div class="headline" style="font-size:236px;line-height:0.86;letter-spacing:-0.05em"><span class="accent">50</span> FREE</div>
        <div class="headline" style="font-size:150px;line-height:0.9;letter-spacing:-0.045em;margin-top:8px">BASSLINES</div>
        <div class="row" style="gap:26px;margin-top:34px">
          <span style="font:700 72px 'Space Grotesk';background:var(--acid);color:#0b0c10;border-radius:18px;padding:4px 26px 8px;letter-spacing:-0.02em">MIDI</span>
          <span class="eyebrow" style="font-size:30px;color:var(--ink)">Techno · Acid · DnB</span>
        </div>
      </div>
      <div style="position:absolute;left:64px;bottom:44px">${brand(46)}</div>`
  },

  wide() {
    const s = H / 900
    const inset = 72 * s
    return background(O.bg, { dim: 0.5, tint: 'linear-gradient(90deg, rgba(5,7,10,0.94) 0%, rgba(5,7,10,0.75) 48%, rgba(5,7,10,0.5) 100%)' }) + frame([inset, inset, inset, inset], `
      <div class="row grow" style="gap:${56 * s}px;align-items:stretch">
        <div style="width:${(O.compact ? 0.47 : 0.45) * W}px;display:flex;flex-direction:column;flex:none">
          ${brand(52 * s)}
          <div style="flex:1"></div>
          <div class="headline" style="font-size:${(O.compact ? 104 : 100) * s}px">${rich(O.head)}</div>
          <div class="sub" style="font-size:${(O.compact ? 38 : 34) * s}px;margin-top:${24 * s}px">${O.sub}</div>
          <div style="flex:1"></div>
          <div class="row">${pill(22 * s)}</div>
        </div>
        <div class="grow" style="display:flex;flex:1">${visual(O.visual, 20 * Math.max(s, 0.85), 30 * s)}</div>
      </div>`)
  },

  banner() {
    const [sx, sy, sw, sh] = O.safe
    const fs = sh
    const strip = [['BP01', 2], 'BP11', ['BP44', 4], 'BP50']
    return `<div class="tint" style="background:radial-gradient(ellipse at ${sx + sw / 2}px ${sy + sh / 2}px, #10202a 0%, #0b0c10 60%, #07080b 100%)"></div>
      <div style="position:absolute;left:0;right:0;top:${H * 0.14}px;height:${H * 0.72}px;opacity:0.62">${rollSlot(strip, { labels: false, glow: true }, 'position:absolute;inset:0')}</div>
      <div class="tint" style="background:radial-gradient(ellipse ${sw * 0.62}px ${sh * 0.7}px at ${sx + (O.align === 'right' ? sw * 0.55 : sw / 2)}px ${sy + sh / 2}px, rgba(5,7,10,0.92) 0%, rgba(5,7,10,0.7) 55%, rgba(5,7,10,0) 100%)"></div>
      <div style="position:absolute;left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px;display:flex;align-items:center;justify-content:${O.align === 'right' ? 'flex-end' : 'center'}">
        <div data-fit class="row" style="gap:${fs * 0.1}px">
          <div style="width:${fs * 0.44}px;height:${fs * 0.44}px;flex:none;filter:drop-shadow(0 0 ${fs * 0.06}px rgba(102,252,241,0.6))">${LOGO}</div>
          <div style="display:flex;flex-direction:column;gap:${fs * 0.03}px">
            <div class="headline" style="font-size:${fs * 0.21}px;white-space:nowrap">Basement <span class="accent">Protocol</span></div>
            <div class="sub" style="font-size:${fs * 0.095}px;color:var(--ink);white-space:nowrap"><span class="acid">50 free</span> bassline MIDI files</div>
            <div class="mono" style="font-size:${fs * 0.062}px;color:var(--muted);white-space:nowrap;margin-top:${fs * 0.02}px">${SITE_LABEL}</div>
          </div>
        </div>
      </div>`
  },

  families() {
    const rows = FAMILY_IDS.map((f) => {
      const id = FAMILY_PICKS[f]
      const m = M[id]
      const n = PATTERNS.filter((p) => p.family === f).length
      return `<div class="panel" style="flex:1;flex-direction:row;align-items:stretch;border-radius:22px;padding:16px 20px;gap:22px;border-color:${FAMILY_COLORS[f]}40">
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:6px;min-width:0">
          <div class="row" style="gap:14px"><span style="width:14px;height:14px;border-radius:99px;background:${FAMILY_COLORS[f]};box-shadow:0 0 12px ${FAMILY_COLORS[f]}"></span><span style="font-size:34px;font-weight:700;color:var(--ink)">${f[0].toUpperCase() + f.slice(1)}</span><span class="mono" style="font-size:18px;color:${FAMILY_COLORS[f]};letter-spacing:0.08em">${n} PATTERNS</span></div>
          <div class="sub" style="font-size:20px">${FAMILY_LINES[f]}</div>
        </div>
        <div style="width:360px;flex:none;display:flex;flex-direction:column;gap:6px">
          <div class="mono" style="font-size:14px;color:var(--muted);letter-spacing:0.06em;white-space:nowrap">${id} ${m.name.toUpperCase()} · ${m.bpm} BPM</div>
          ${rollSlot([id], { labels: false, accent: FAMILY_COLORS[f], padRows: 0.6, minNoteH: 7 }, 'position:relative;flex:1')}
        </div>
      </div>`
    }).join('')
    return background('hero-basement', { dim: 0.3, blur: 6 }) + frame([60, 60, 56, 60], `
      ${topbar(48, 'Free MIDI pack')}
      <div class="headline" style="font-size:92px;margin-top:40px">7 groove <span class="accent">families.</span></div>
      <div class="sub" style="font-size:29px;margin-top:16px">50 free bassline MIDI files for techno, acid, dub, and drum and bass.</div>
      <div class="grow" style="display:flex;flex-direction:column;gap:12px;margin-top:32px">${rows}</div>
      <div class="row between" style="margin-top:30px">${pill(22)}<div class="eyebrow" style="font-size:16px;color:var(--muted);white-space:nowrap">Save for later</div></div>`)
  },

  spotlight() {
    const id = O.pattern
    return background('illus-acid', { dim: 0.32 }) + frame([60, 64, 60, 64], `
      ${topbar(50, 'Pattern spotlight')}
      <div class="headline" style="font-size:80px;margin-top:40px">Every note is <span class="accent">in the file.</span></div>
      <div class="grow" style="display:flex;margin-top:36px">${rollPanel(id, 19, 28)}</div>
      <div style="margin-top:28px">${chips(21, id)}</div>
      <div class="row between" style="margin-top:28px">${pill(22)}<div class="eyebrow" style="font-size:16px;color:var(--muted);white-space:nowrap">1 of ${PATTERNS.length} files</div></div>`)
  },

  checks() {
    const sp = REPORT.second_parser
    return background('illus-acid', { dim: 0.3 }) + frame([60, 64, 60, 64], `
      ${topbar(50, 'Validation report')}
      <div class="headline" style="font-size:78px;margin-top:38px">Validated <span class="acid">like software.</span></div>
      <div class="grow" style="display:flex;margin-top:34px">${checksPanel(26, { pad: 28 })}</div>
      <div class="sub" style="font-size:24px;margin-top:24px;color:var(--ink)">Second parser: <span class="mono acid">${sp.parser.split(' on ')[0]}</span> agrees on ${sp.notes_compared} of ${REPORT.summary.note_events} notes.</div>
      <div class="row between" style="margin-top:24px">${pill(22)}<div class="eyebrow" style="font-size:16px;color:var(--muted);white-space:nowrap">Free MIDI pack</div></div>`)
  },

  slide() {
    const n = O.slide
    const chrome = (inner, footRight) => frame([64, 72, 64, 72], `
      <div class="row between">${brand(50)}<div class="counter" style="font-size:22px"><b>${String(n).padStart(2, '0')}</b> / 05</div></div>
      ${inner}
      <div class="row between" style="margin-top:36px">
        <div class="dots" style="gap:10px">${[1, 2, 3, 4, 5].map((k) => `<i class="${k === n ? 'on' : ''}" style="width:${k === n ? 40 : 12}px;height:12px"></i>`).join('')}</div>
        ${footRight}
      </div>`)
    const swipe = '<div class="eyebrow" style="font-size:20px;color:var(--ink)">Swipe →</div>'
    if (n === 1) {
      return background('vert-stack', { dim: 0.4, pos: 'center 35%' }) + chrome(`
        <div class="headline" style="font-size:124px;margin-top:64px">50 free bassline <span class="accent">MIDI</span> files.</div>
        <div class="headline" style="font-size:64px;margin-top:22px;color:var(--acid)">Built for the basement.</div>
        <div class="grow" style="display:flex;margin-top:56px"><div class="panel grow">
          <div class="panel-head" style="font-size:18px;padding:24px 28px 0"><span><b>4 PATTERNS</b> FROM THE PACK</span><span>16 BARS · 128 BPM</span></div>
          ${rollSlot([['BP01', 2], 'BP11', ['BP44', 4], 'BP50'], { labels: false, segLabels: true, fontSize: 15 }, 'margin:18px 28px 28px')}
        </div></div>`, swipe)
    }
    if (n === 2) {
      return background('hero-basement', { dim: 0.32, blur: 4 }) + chrome(`
        <div class="headline" style="font-size:104px;margin-top:64px">Seven groove <span class="accent">families.</span></div>
        <div class="sub" style="font-size:34px;margin-top:20px">Pick by feel, not by genre tag.</div>
        <div class="grow" style="display:flex;margin-top:48px">${familiesPanel(34, { lines: true, pad: 32 })}</div>`, swipe)
    }
    if (n === 3) {
      return background('illus-acid', { dim: 0.32 }) + chrome(`
        <div class="headline" style="font-size:104px;margin-top:64px">Every note is <span class="accent">in the file.</span></div>
        <div class="sub" style="font-size:34px;margin-top:20px">${COPY.roll1Sub}</div>
        <div class="grow" style="display:flex;margin-top:44px">${rollPanel('BP44', 20, 30)}</div>
        <div style="margin-top:30px">${chips(22, 'BP44')}</div>`, swipe)
    }
    if (n === 4) {
      const big = COPY.checks.map((c) => `<div class="tick-row" style="gap:24px;font-size:40px;font-weight:600"><span class="t" style="width:54px;height:54px;font-size:32px">✓</span><span>${c}</span></div>`).join('')
      return background('illus-acid', { dim: 0.28 }) + chrome(`
        <div class="headline" style="font-size:104px;margin-top:64px">Validated <span class="acid">like software.</span></div>
        <div class="ticks" style="gap:26px;margin-top:52px">${big}</div>
        <div class="grow" style="display:flex;margin-top:48px">${checksPanel(20, { pad: 26, cols: 2 })}</div>`, swipe)
    }
    return background('illus-bigroom', { dim: 0.34 }) + chrome(`
      <div class="headline" style="font-size:96px;margin-top:64px">Audition every file <span class="accent">in your browser.</span></div>
      <div class="grow" style="position:relative;margin-top:44px">
        <div class="phone" data-phone style="left:0;top:0;bottom:0"><img src="${IMG['lab-mobile']}" alt=""></div>
        <div data-phone-text style="position:absolute;right:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:34px">
          <div class="headline" style="font-size:58px">Then drag the <span class="acid">.mid</span> into your DAW.</div>
          <div class="sub" style="font-size:32px;color:var(--ink)">${COPY.free}</div>
          <div class="pill" style="align-self:flex-start;font-size:30px;font-weight:600;padding:18px 32px;background:var(--cyan);color:#0b0c10;border-color:var(--cyan)">Open the lab →</div>
        </div>
      </div>`, `<div class="mono" style="font-size:22px;color:var(--muted)">${SITE_LABEL}</div>`)
  },
}

function hydrate(root) {
  for (const slot of root.querySelectorAll('[data-roll]')) {
    const r = slot.getBoundingClientRect()
    slot.innerHTML = rollSvg(JSON.parse(slot.dataset.roll), Math.round(r.width), Math.round(r.height), JSON.parse(slot.dataset.opts || '{}'))
  }
  for (const phone of root.querySelectorAll('[data-phone]')) {
    const h = phone.getBoundingClientRect().height
    const w = (h - 28) * (1170 / 2532) + 28
    phone.style.width = `${w}px`
    const text = root.querySelector('[data-phone-text]')
    if (text) text.style.left = `${w + 56}px`
  }
  for (const node of root.querySelectorAll('[data-fit]')) {
    const box = node.parentElement.getBoundingClientRect()
    const r = node.getBoundingClientRect()
    const k = Math.min(1, box.width / r.width, box.height / r.height)
    if (k < 1) {
      node.style.transform = `scale(${k})`
      node.style.transformOrigin = getComputedStyle(node.parentElement).justifyContent === 'flex-end' ? 'right center' : 'center'
    }
  }
}

// Anything that spills past the canvas, or a text box whose content is wider than the box, is a layout bug.
function overflowReport(stage) {
  const bad = []
  const sr = stage.getBoundingClientRect()
  for (const node of stage.querySelectorAll('.headline, .sub, .pill, .chip, .stat, .brand, .panel, .eyebrow, .mono, .tick-row, .phone')) {
    const r = node.getBoundingClientRect()
    if (r.width === 0) continue
    const out = r.left < sr.left - 1 || r.top < sr.top - 1 || r.right > sr.right + 1 || r.bottom > sr.bottom + 1
    const clipped = node.scrollWidth > node.clientWidth + 2 && getComputedStyle(node).overflow !== 'visible'
    if (out || clipped) bad.push({ cls: node.className, text: node.textContent.trim().slice(0, 60), rect: [r.left, r.top, r.right, r.bottom].map(Math.round) })
  }
  for (const panel of stage.querySelectorAll('.panel')) {
    const pr = panel.getBoundingClientRect()
    for (const node of panel.querySelectorAll('.tick-row, .sub, .row, [data-roll]')) {
      const r = node.getBoundingClientRect()
      if (r.bottom > pr.bottom + 1 || r.right > pr.right + 1) bad.push({ cls: `clipped-by-panel ${node.className}`, text: node.textContent.trim().slice(0, 60), rect: [r.left, r.top, r.right, r.bottom].map(Math.round) })
    }
  }
  for (const node of stage.querySelectorAll('[data-roll]')) {
    const r = node.getBoundingClientRect()
    if (r.height < 60 || r.width < 120) bad.push({ cls: 'roll-too-small', rect: [r.width, r.height].map(Math.round) })
  }
  return bad
}

async function build() {
  const [manifest, csv, report] = await Promise.all([
    fetch('/pack/manifest-Cursor.json').then((r) => r.json()),
    fetch('/pack/note-events-Cursor.csv').then((r) => r.text()),
    fetch('/pack/validation-report-Cursor.json').then((r) => r.json()),
  ])
  PATTERNS = manifest.patterns
  FAMILY_IDS = manifest.families
  M = Object.fromEntries(PATTERNS.map((p) => [p.id, p]))
  REPORT = report
  EV = {}
  for (const row of parseCsv(csv)) {
    ;(EV[row.pattern_id] ??= []).push({ p: Number(row.midi_note), name: row.note_name, s: Number(row.start_beat), d: Number(row.duration_beats), v: Number(row.velocity), ov: Number(row.legato_overlap_beats) })
  }
  for (const list of Object.values(EV)) list.sort((a, b) => a.s - b.s)

  await document.fonts.ready
  await Promise.all(['400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 64px "Space Grotesk"`)))
  await Promise.all(['400', '600'].map((w) => document.fonts.load(`${w} 32px "JetBrains Mono"`)))

  const stage = document.createElement('div')
  stage.className = 'stage'
  Object.assign(stage.style, { width: `${W}px`, height: `${H}px` })
  stage.innerHTML = LAYOUTS[A.layout]()
  document.body.append(stage)
  const vignette = document.createElement('div')
  vignette.className = 'layer vignette'
  vignette.style.opacity = A.layout === 'banner' ? '0.5' : '0.8'
  stage.append(vignette)
  if (A.layout !== 'banner') stage.append(grainCanvas(A.id.length * 7919 + W))

  await Promise.all([...stage.querySelectorAll('img')].map((img) => img.decode().catch(() => {})))
  await Promise.all(Object.values(IMG).filter((src) => stage.innerHTML.includes(src)).map((src) => {
    const img = new Image()
    img.src = src
    return img.decode().catch(() => {})
  }))
  hydrate(stage)
  return { id: A.id, w: W, h: H, overflow: overflowReport(stage) }
}

window.__ready = build()
