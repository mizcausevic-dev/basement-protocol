#!/usr/bin/env node
// Headless renderer for the commercial and the social images, using the system Chrome via playwright-core.
//
//   node media/render.mjs capture            screenshots of the live site for the product shots
//   node media/render.mjs stills [ratio]     a few frames per format, for review
//   node media/render.mjs video [ratio...]   MP4s, posters, and captions
//   node media/render.mjs social             every social image, the carousel PDF, and the copy sheet
//   node media/render.mjs manifest           media-manifest-Cursor.json from whatever is in media/out
//   node media/render.mjs all                capture, video, social, manifest
//
// Env: CHROME_PATH (browser binary), SITE_URL (site to capture, defaults to the live site).
import { chromium } from 'playwright-core'
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { spawn, spawnSync } from 'node:child_process'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DURATION, FORMATS, FPS, SITE_URL, toVtt } from './studio/script.js'
import { PDF_NAME, renderSocial } from './social.mjs'
import { ASSETS, assetFile } from './studio/social-spec.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'media', 'out')
const BUILD = join(ROOT, 'media', 'build')
const SCREENS = join(ROOT, 'media', 'assets', 'screens')
const NAME = 'basement-protocol-commercial'
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.csv': 'text/csv',
}

function chromePath() {
  const found = [process.env.CHROME_PATH, '/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => p && existsSync(p))
  if (!found) throw new Error('No Chrome or Chromium found. Set CHROME_PATH.')
  return found
}

export function serve() {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://local').pathname))
    const file = join(ROOT, path)
    if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` })))
}

export async function launch() {
  return chromium.launch({ executablePath: chromePath(), args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'] })
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr.slice(-2000)}`)
  return r
}

async function capture(browser) {
  const site = process.env.SITE_URL ?? SITE_URL
  await mkdir(SCREENS, { recursive: true })
  const shots = [
    { kind: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 },
    { kind: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  ]
  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.deviceScaleFactor, isMobile: s.isMobile, hasTouch: s.hasTouch, reducedMotion: 'no-preference' })
    const page = await ctx.newPage()
    await page.goto(`${site}?capture=1#BP44`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    // Offsets are measured below the sticky nav so nothing important sits under it.
    const scrollTo = async (selector, gap) => {
      await page.evaluate(([sel, g]) => {
        const node = document.querySelector(sel)
        const nav = document.querySelector('header')?.offsetHeight ?? 0
        window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - nav - g, behavior: 'instant' })
      }, [selector, gap])
      await page.waitForTimeout(1600)
    }
    const clickIn = (selector) => page.evaluate((sel) => document.querySelector(sel)?.click(), selector)
    await scrollTo('#lab button[aria-label^="Play"]', 28)
    await clickIn('#lab button[aria-label^="Play"]')
    await page.waitForTimeout(1400)
    await page.screenshot({ path: join(SCREENS, `lab-${s.kind}.jpg`), type: 'jpeg', quality: 86 })
    await clickIn('#lab button[aria-label="Stop playback"]')
    await scrollTo('#map', s.kind === 'mobile' ? -40 : -60)
    await page.screenshot({ path: join(SCREENS, `map-${s.kind}.jpg`), type: 'jpeg', quality: 86 })
    await scrollTo('#mindmap svg', s.kind === 'mobile' ? 24 : 16)
    await page.screenshot({ path: join(SCREENS, `mindmap-${s.kind}.jpg`), type: 'jpeg', quality: 86 })
    await ctx.close()
    console.log(`captured ${s.kind} screens from ${site}`)
  }
}

async function openComposition(browser, base, ratio) {
  const { w, h } = FORMATS[ratio]
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.error(`[${ratio}] page error:`, e.message))
  await page.goto(`${base}/media/studio/commercial.html?ratio=${ratio}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => window.__composition)
  return page
}

const frameAt = (page, t) => page.evaluate(async (tt) => (await window.__composition).renderFrame(tt), t)

async function stills(browser, base, ratios) {
  const dir = join(BUILD, 'stills')
  await mkdir(dir, { recursive: true })
  const times = [1.2, 3.9, 4.4, 4.9, 5.3, 5.8, 6.3, 6.7, 7.2, 9.4, 12.6, 17.2, 21.8, 23.2, 24.8, 25.6, 27.4, 29.6]
  for (const ratio of ratios) {
    const page = await openComposition(browser, base, ratio)
    for (const t of times) {
      await frameAt(page, t)
      await page.screenshot({ path: join(dir, `${ratio}-${t.toFixed(1)}.jpg`), type: 'jpeg', quality: 80 })
    }
    await page.close()
    console.log(`stills ${ratio}: ${times.length} frames -> ${dir}`)
  }
}

function normalizeAudio() {
  const src = join(BUILD, 'soundtrack.wav')
  const dst = join(BUILD, 'soundtrack-norm.wav')
  if (!existsSync(src)) throw new Error('media/build/soundtrack.wav is missing. Run: python3 media/soundtrack.py')
  const target = 'I=-14:TP=-1.5:LRA=11'
  const pass1 = run('ffmpeg', ['-hide_banner', '-nostats', '-i', src, '-af', `loudnorm=${target}:print_format=json`, '-f', 'null', '-'])
  const m = JSON.parse(pass1.stderr.slice(pass1.stderr.lastIndexOf('{')))
  const filter = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
  run('ffmpeg', ['-hide_banner', '-y', '-i', src, '-af', filter, '-ar', '48000', '-c:a', 'pcm_s16le', dst])
  return dst
}

export function measureLoudness(file) {
  const r = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
  const summary = r.stderr.slice(r.stderr.lastIndexOf('Summary:'))
  return {
    integrated_lufs: Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]),
    true_peak_dbfs: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1]),
  }
}

async function video(browser, base, ratios) {
  await mkdir(OUT, { recursive: true })
  const wav = normalizeAudio()
  await writeFile(join(OUT, `${NAME}-Cursor.vtt`), toVtt(), 'utf8')
  const frames = Math.round(DURATION * FPS)
  for (const ratio of ratios) {
    const page = await openComposition(browser, base, ratio)
    const file = join(OUT, `${NAME}-${ratio}-Cursor.mp4`)
    const ff = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-i', wav,
      '-map', '0:v', '-map', '1:a',
      // CRF 23 capped at 8 Mbps, YouTube's recommended 1080p30 rate; the film grain otherwise pushes 1080p past 9 Mbps.
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-maxrate', '8M', '-bufsize', '16M', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-g', String(FPS * 2), '-movflags', '+faststart',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
      '-metadata', 'title=Basement Protocol: 50 free bassline MIDI files',
      '-metadata', `comment=${SITE_URL}`,
      '-shortest', file,
    ], { stdio: ['pipe', 'inherit', 'inherit'] })
    const done = new Promise((resolve, reject) => ff.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg exited ${c}`)))))
    const started = Date.now()
    for (let i = 0; i < frames; i++) {
      await frameAt(page, i / FPS)
      const jpg = await page.screenshot({ type: 'jpeg', quality: 93 })
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r))
      if (i % 150 === 0) console.log(`[${ratio}] frame ${i}/${frames}`)
    }
    ff.stdin.end()
    await done
    await frameAt(page, 29.4)
    await page.screenshot({ path: join(OUT, `${NAME}-${ratio}-poster-Cursor.jpg`), type: 'jpeg', quality: 88 })
    await page.close()
    console.log(`[${ratio}] ${frames} frames in ${((Date.now() - started) / 1000).toFixed(0)} s -> ${file}`)
  }
}

function probe(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,bit_rate:stream=codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', file])
  const j = JSON.parse(r.stdout)
  const v = j.streams.find((s) => s.width)
  const a = j.streams.find((s) => s.sample_rate)
  return { duration_s: Number(Number(j.format.duration).toFixed(3)), bitrate_kbps: Math.round(j.format.bit_rate / 1000), video: `${v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate.split('/')[0]} fps`, audio: `${a.codec_name} ${a.sample_rate} Hz ${a.channels === 2 ? 'stereo' : `${a.channels} ch`}` }
}

async function writeManifest() {
  const videos = []
  for (const [ratio, f] of Object.entries(FORMATS)) {
    const file = join(OUT, `${NAME}-${ratio}-Cursor.mp4`)
    if (!existsSync(file)) continue
    videos.push({ ratio, label: f.label, use: f.use, width: f.w, height: f.h, file: `${NAME}-${ratio}-Cursor.mp4`, poster: `${NAME}-${ratio}-poster-Cursor.jpg`, bytes: (await stat(file)).size, ...probe(file), loudness: measureLoudness(file) })
  }
  const socialDir = join(OUT, 'social')
  const present = existsSync(socialDir) ? new Set(await readdir(socialDir)) : new Set()
  const images = []
  for (const a of ASSETS) {
    const file = assetFile(a)
    if (present.has(file)) images.push({ id: a.id, network: a.network, also: a.also ?? [], layout: a.layout, use: a.use, width: a.w, height: a.h, file: `social/${file}`, preview: `social/previews/${a.id}.webp`, bytes: (await stat(join(socialDir, file))).size, alt: a.alt })
  }
  const manifest = {
    title: 'Basement Protocol: 50 free bassline MIDI files',
    duration_s: DURATION,
    fps: FPS,
    captions: `${NAME}-Cursor.vtt`,
    soundtrack: 'Rendered offline by media/soundtrack.py from BP01, BP11, BP44, and BP50 in pack/midi, then loudness-normalized to -14 LUFS integrated, -1.5 dBTP.',
    videos,
    images,
    carousel_pdf: present.has(PDF_NAME) ? { file: `social/${PDF_NAME}`, bytes: (await stat(join(socialDir, PDF_NAME))).size, pages: ASSETS.filter((a) => a.layout === 'slide').length } : null,
    copy_sheet: present.has('POSTS-Cursor.md') ? { markdown: 'social/POSTS-Cursor.md', json: 'social/posts-Cursor.json' } : null,
  }
  await writeFile(join(OUT, 'media-manifest-Cursor.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`manifest: ${videos.length} videos, ${images.length} images -> media/out/media-manifest-Cursor.json`)
  for (const v of videos) console.log(`  ${v.ratio}: ${v.duration_s} s, ${(v.bytes / 1e6).toFixed(1)} MB, ${v.bitrate_kbps} kbps, ${v.loudness.integrated_lufs} LUFS, ${v.loudness.true_peak_dbfs} dBTP`)
}

async function main() {
  const [cmd = 'all', ...rest] = process.argv.slice(2)
  const ratios = rest.filter((r) => r in FORMATS)
  const pick = ratios.length ? ratios : Object.keys(FORMATS)
  const { server, base } = await serve()
  const browser = await launch()
  try {
    if (cmd === 'capture' || cmd === 'all') await capture(browser)
    if (cmd === 'stills') await stills(browser, base, pick)
    if (cmd === 'video' || cmd === 'all') await video(browser, base, pick)
    if (cmd === 'social' || cmd === 'all') await renderSocial(browser, base)
    if (['video', 'social', 'manifest', 'all'].includes(cmd)) await writeManifest()
  } finally {
    await browser.close()
    server.close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
