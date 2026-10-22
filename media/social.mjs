// Renders every social card at its native size, keeps each under its platform's byte cap,
// builds the LinkedIn carousel PDF, and writes the copy sheet with every length check spelled out.
import { mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSETS, LIMITS, MEDIA_URL, NETWORKS, POSTS, assetFile, measure } from './studio/social-spec.js'
import { SITE_URL } from './studio/script.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'media', 'out', 'social')
export const PDF_NAME = 'basement-protocol-carousel-Cursor.pdf'

// House style for every published line: no em or en dashes, none of the stock filler words.
const STYLE_BANNED = ['\u2014', '\u2013', 'delve', 'robust', 'intricate', 'tapestry', 'beacon', 'testament', 'landscape', 'pivotal', 'seamless', 'overarching', 'leverage', 'utilize', 'game-changer', 'cutting-edge', 'best-in-class', 'world-class', 'unlock', 'revolutionize', 'future-proof', 'synerg', 'moreover', 'furthermore', 'crucially', 'worth noting', 'at the end of the day', 'in conclusion', 'ultimately']

function styleProblems(text) {
  const low = text.toLowerCase()
  return STYLE_BANNED.filter((w) => low.includes(w))
}

async function renderCard(browser, base, a) {
  const page = await browser.newPage({ viewport: { width: a.w, height: a.h }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${base}/media/studio/social.html?id=${a.id}`, { waitUntil: 'networkidle' })
  const info = await page.evaluate(() => window.__ready)
  if (errors.length) throw new Error(`${a.id}: ${errors.join('; ')}`)
  let quality = 92
  let buf
  for (;;) {
    buf = await page.screenshot({ type: 'jpeg', quality })
    if (buf.length <= a.maxBytes || quality <= 60) break
    quality -= 4
  }
  await page.close()
  if (buf.length > a.maxBytes) throw new Error(`${a.id} is ${buf.length} bytes, over its ${a.maxBytes}-byte cap even at quality ${quality}`)
  await writeFile(join(OUT, assetFile(a)), buf)
  return { bytes: buf.length, quality, overflow: info.overflow }
}

function buildPdf(files) {
  const script = `
import sys
import time
from PIL import Image
out, *paths = sys.argv[1:]
pages = [Image.open(p).convert('RGB') for p in paths]
stamp = time.strptime('2026-10-22', '%Y-%m-%d')
pages[0].save(out, 'PDF', resolution=144, save_all=True, append_images=pages[1:], quality=90,
  title='Basement Protocol: 50 MIDI basslines, validated like software', author='Miz Causevic',
  subject='50 free bassline MIDI files', creationDate=stamp, modDate=stamp)
`
  const r = spawnSync('python3', ['-c', script, join(OUT, PDF_NAME), ...files.map((f) => join(OUT, f))], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`PDF build failed: ${r.stderr}`)
}

// Gallery previews, so the media page does not pull 3000-pixel originals just to show a thumbnail.
function buildPreviews(assets) {
  const script = `
import sys, os
from PIL import Image
src, dst, *pairs = sys.argv[1:]
os.makedirs(dst, exist_ok=True)
for pair in pairs:
    name, out = pair.split('=')
    im = Image.open(os.path.join(src, name)).convert('RGB')
    im.thumbnail((720, 720), Image.LANCZOS)
    im.save(os.path.join(dst, out), 'WEBP', quality=82, method=6)
`
  const r = spawnSync('python3', ['-c', script, OUT, join(OUT, 'previews'), ...assets.map((a) => `${assetFile(a)}=${a.id}.webp`)], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`preview build failed: ${r.stderr}`)
}

function copySheet(rendered) {
  const problems = []
  const networks = NETWORKS.map((n) => {
    const assets = ASSETS.filter((a) => a.network === n.id || a.also?.includes(n.id)).map((a) => {
      const altLimit = LIMITS[n.id]?.alt?.max
      if (altLimit && a.alt.length > altLimit) problems.push(`${a.id} alt text is ${a.alt.length} characters, over ${n.name}'s ${altLimit}`)
      return { id: a.id, file: assetFile(a), use: a.use, width: a.w, height: a.h, bytes: rendered[a.id].bytes, alt: a.alt }
    })
    const posts = POSTS.filter((p) => p.network === n.id).map((p) => {
      const checks = Object.entries(p.fields).map(([f, v]) => measure(n.id, f, v)).filter(Boolean)
      for (const c of checks) if (!c.ok) problems.push(`${n.name} ${p.label} ${c.field}: ${c.length}/${c.max}${c.maxHashtags != null ? `, ${c.hashtags}/${c.maxHashtags} hashtags` : ''}`)
      for (const v of Object.values(p.fields)) for (const w of styleProblems(v)) problems.push(`${n.name} ${p.label}: style word "${w}"`)
      return { label: p.label, video: p.video ?? null, pdf: p.pdf ? PDF_NAME : null, assets: p.assets, notes: p.notes ?? null, fields: p.fields, checks }
    })
    return { ...n, assets, posts }
  })
  for (const a of ASSETS) for (const w of styleProblems(a.alt)) problems.push(`${a.id} alt text: style word "${w}"`)
  return { site: SITE_URL, media_page: MEDIA_URL, limits_as_of: '2026-10', networks, carousel_pdf: PDF_NAME, problems }
}

function markdown(sheet) {
  const lines = [
    '# Basement Protocol social kit',
    '',
    `Images, post copy, and alt text for ${sheet.networks.length} networks. Every length below was measured by \`media/social.mjs\`; limits are as of October 2026.`,
    '',
    `Site: ${sheet.site}  `,
    `Media kit: ${sheet.media_page}`,
    '',
  ]
  for (const n of sheet.networks) {
    lines.push(`## ${n.name}`, '', n.why, '', '| File | Use | Size | Bytes |', '| --- | --- | --- | --- |')
    for (const a of n.assets) lines.push(`| \`${a.file}\` | ${a.use} | ${a.width} x ${a.height} | ${a.bytes.toLocaleString('en-US')} |`)
    lines.push('')
    for (const p of n.posts) {
      lines.push(`### ${p.label}`, '')
      if (p.video) lines.push(`Video: \`basement-protocol-commercial-${p.video}-Cursor.mp4\``, '')
      if (p.pdf) lines.push(`Document: \`${p.pdf}\``, '')
      if (p.notes) lines.push(p.notes, '')
      for (const [f, v] of Object.entries(p.fields)) {
        const c = p.checks.find((k) => k.field === f)
        lines.push(`**${f}**${c ? ` (${c.length} of ${c.max} ${c.unit}${c.maxHashtags != null ? `, ${c.hashtags} of ${c.maxHashtags} hashtags` : ''})` : ''}`, '', '```text', v, '```', '')
      }
    }
    lines.push('**Alt text**', '')
    for (const a of n.assets) lines.push(`- \`${a.id}\`: ${a.alt}`)
    lines.push('')
  }
  return lines.join('\n')
}

export async function renderSocial(browser, base) {
  await mkdir(OUT, { recursive: true })
  const rendered = {}
  const warnings = []
  for (const a of ASSETS) {
    const r = await renderCard(browser, base, a)
    rendered[a.id] = r
    for (const o of r.overflow) warnings.push(`${a.id}: ${JSON.stringify(o)}`)
    console.log(`social ${a.id.padEnd(18)} ${a.w}x${a.h}  ${(r.bytes / 1000).toFixed(0).padStart(5)} KB  q${r.quality}`)
  }
  buildPdf(ASSETS.filter((a) => a.layout === 'slide').map(assetFile))
  buildPreviews(ASSETS)
  const sheet = copySheet(rendered)
  await writeFile(join(OUT, 'posts-Cursor.json'), `${JSON.stringify(sheet, null, 2)}\n`, 'utf8')
  await writeFile(join(OUT, 'POSTS-Cursor.md'), markdown(sheet), 'utf8')
  for (const w of warnings) console.warn(`layout warning ${w}`)
  if (sheet.problems.length) {
    for (const p of sheet.problems) console.error(`copy problem: ${p}`)
    throw new Error(`${sheet.problems.length} copy problems`)
  }
  console.log(`social: ${ASSETS.length} images, ${PDF_NAME}, posts-Cursor.json, POSTS-Cursor.md -> ${OUT}`)
  return { rendered, warnings }
}
