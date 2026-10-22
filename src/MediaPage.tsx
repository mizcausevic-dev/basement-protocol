import { ArrowRight, AudioLines, Captions, Check, Clapperboard, Copy, Download, FileText, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Footer } from '@/components/Footer'
import { Nav } from '@/components/Nav'
import { Reveal, Section } from '@/components/Section'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { REPO_URL } from '@/lib/data'
import { formatBytes, loadMediaKit, mediaUrl, type MediaManifest, type PostsSheet, type Ratio } from '@/lib/media'

type KitState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; manifest: MediaManifest; sheet: PostsSheet }

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600)
    } catch {
      setCopied(null)
    }
  }
  return { copied, copy }
}

const SOUNDTRACK_PATTERNS = [
  ['BP01', 'Concrete Breath', 'sparse'],
  ['BP11', 'Marrow', 'rolling'],
  ['BP44', 'Acid Rain', 'acid'],
  ['BP50', 'Last Call', 'acid build'],
] as const

const BRAND_COLORS = [
  ['Basement', '#0b0c10'],
  ['Cyan', '#66fcf1'],
  ['Acid', '#d6ff3f'],
  ['Hot', '#ff2d55'],
  ['Ink', '#eafcff'],
  ['Muted', '#8fa3ab'],
] as const

const VIDEO_SIZE: Record<Ratio, string> = {
  '16x9': 'aspect-video w-full',
  '9x16': 'aspect-[9/16] h-[70vh] max-h-[760px] max-w-full',
  '1x1': 'aspect-square w-full max-w-[640px]',
}

export function MediaPage() {
  const [state, setState] = useState<KitState>({ status: 'loading' })

  useEffect(() => {
    let live = true
    loadMediaKit()
      .then(([manifest, sheet]) => live && setState({ status: 'ready', manifest, sheet }))
      .catch((e: Error) => live && setState({ status: 'error', message: e.message }))
    return () => {
      live = false
    }
  }, [])

  return (
    <>
      <Nav page="media" />
      <main>
        <Hero imageCount={state.status === 'ready' ? state.manifest.images.length : null} />
        {state.status === 'loading' && (
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-24 text-muted-foreground sm:px-6 lg:px-8" role="status">
            <LoaderCircle className="size-5 animate-spin" /> Loading the media kit
          </div>
        )}
        {state.status === 'error' && (
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="surface flex items-start gap-3 p-5" role="alert">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[color:var(--hot)]" />
              <div>
                <p className="font-semibold text-[color:var(--heading)]">The media kit did not load.</p>
                <p className="mt-1 text-sm text-muted-foreground">{state.message}. Every file is also in the repo under <a className="text-primary hover:underline" href={`${REPO_URL}/tree/main/media/out`}>media/out</a>.</p>
              </div>
            </div>
          </div>
        )}
        {state.status === 'ready' && (
          <>
            <Spot manifest={state.manifest} />
            <HowItWasMade manifest={state.manifest} />
            <Gallery manifest={state.manifest} sheet={state.sheet} />
            <Carousel manifest={state.manifest} />
            <PostCopy sheet={state.sheet} />
            <Networks manifest={state.manifest} sheet={state.sheet} />
            <Brand />
          </>
        )}
      </main>
      <Footer />
    </>
  )
}

function Hero({ imageCount }: { imageCount: number | null }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <p className="eyebrow">Media kit</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-[1.02] text-[color:var(--heading)] sm:text-6xl">A 30-second spot, played from the pack itself.</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Three cuts of the commercial, {imageCount ?? 'a full set of'} images sized for ten networks, post copy with alt text and measured lengths, and the carousel as a PDF. Share any of it.
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          <a href="#spot" className={buttonVariants({ size: 'lg' })}><Clapperboard /> Watch the spot</a>
          <a href="#social" className={buttonVariants({ variant: 'outline', size: 'lg' })}>Social images</a>
          <a href="#copy" className={buttonVariants({ variant: 'outline', size: 'lg' })}>Post copy</a>
          <a href={mediaUrl('social/POSTS-Cursor.md')} download className={buttonVariants({ variant: 'ghost', size: 'lg' })}><FileText /> Copy sheet (.md)</a>
        </div>
      </div>
    </section>
  )
}

function Spot({ manifest }: { manifest: MediaManifest }) {
  const first = manifest.videos[0]?.ratio ?? '16x9'
  return (
    <Section
      id="spot"
      eyebrow="01 · The spot"
      title="Three cuts, one 30-second spot."
      lede="Every bass note you hear is rendered from four files in the pack. Captions are on by default and include the sound cues, so the spot works muted."
    >
      <Tabs defaultValue={first}>
        <TabsList aria-label="Aspect ratio" className="mb-4">
          {manifest.videos.map((v) => (
            <TabsTrigger key={v.ratio} value={v.ratio} className="px-3">{v.label}</TabsTrigger>
          ))}
        </TabsList>
        {manifest.videos.map((v) => (
          <TabsContent key={v.ratio} value={v.ratio}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="surface flex items-center justify-center overflow-hidden bg-black p-0">
                <video
                  className={`${VIDEO_SIZE[v.ratio]} block bg-black`}
                  controls
                  playsInline
                  preload="metadata"
                  poster={mediaUrl(v.poster)}
                  width={v.width}
                  height={v.height}
                >
                  <source src={mediaUrl(v.file)} type="video/mp4" />
                  <track kind="captions" srcLang="en" label="English" src={mediaUrl(manifest.captions)} default />
                  Your browser cannot play this video. <a href={mediaUrl(v.file)}>Download the MP4</a>.
                </video>
              </div>
              <aside className="surface p-5">
                <p className="eyebrow mb-4">{v.label}</p>
                <dl className="space-y-3 text-sm">
                  <Spec term="Duration">{v.duration_s} s at {manifest.fps} fps</Spec>
                  <Spec term="Frame">{v.width} x {v.height}, {v.video.split(' ')[0].toUpperCase()}</Spec>
                  <Spec term="Audio">{v.audio.replace('aac', 'AAC')}</Spec>
                  <Spec term="Loudness">{v.loudness.integrated_lufs} LUFS integrated, {v.loudness.true_peak_dbfs} dBTP true peak</Spec>
                  <Spec term="File">{formatBytes(v.bytes)}, {(v.bitrate_kbps / 1000).toFixed(1)} Mbps</Spec>
                  <Spec term="Post on">{v.use}</Spec>
                </dl>
                <div className="mt-5 grid gap-2">
                  <a href={mediaUrl(v.file)} download className={buttonVariants()}><Download /> MP4</a>
                  <div className="grid grid-cols-2 gap-2">
                    <a href={mediaUrl(v.poster)} download className={buttonVariants({ variant: 'outline' })}>Poster</a>
                    <a href={mediaUrl(manifest.captions)} download className={buttonVariants({ variant: 'outline' })}><Captions /> Captions</a>
                  </div>
                </div>
              </aside>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  )
}

function Spec({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3">
      <dt className="mono text-xs uppercase tracking-wider text-muted-foreground">{term}</dt>
      <dd className="text-[color:var(--heading)]">{children}</dd>
    </div>
  )
}

function HowItWasMade({ manifest }: { manifest: MediaManifest }) {
  const frames = Math.round(manifest.duration_s * manifest.fps)
  const steps = [
    {
      title: 'The soundtrack is the pack',
      body: (
        <>
          <span className="mono text-xs">media/soundtrack.py</span> reads four MIDI files and renders them with an offline synth: a band-limited saw through a resonant low-pass, glide only where notes overlap, and seeded drums. The mix is normalized to -14 LUFS.
        </>
      ),
      extra: (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {SOUNDTRACK_PATTERNS.map(([id, name, fam]) => (
            <li key={id}>
              <a href={`./#${id}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary hover:text-primary">
                <span className="mono font-semibold">{id}</span> {name} <span className="text-muted-foreground">{fam}</span>
              </a>
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: 'Every frame is a function of time',
      body: `The composition draws frame t from the same timeline the audio used, so the highlighted note in each piano roll is the note you hear. Headless Chrome steps through all ${frames} frames per cut into ffmpeg. Randomness is seeded, so nothing depends on the clock.`,
    },
    {
      title: 'One script, every format',
      body: 'The on-screen text and the caption file come from one script module. The social cards draw their piano rolls from the note-events CSV, then a check fails the build if text spills or a file passes its network limit.',
    },
  ]
  return (
    <Section id="how" eyebrow="02 · How it was made" title="No stock audio. No hand-keyed animation." lede={manifest.soundtrack}>
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.06} className="surface p-5">
            <AudioLines className="size-5 text-primary" />
            <h3 className="mt-3 text-lg font-semibold text-[color:var(--heading)]">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            {s.extra}
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

function Gallery({ manifest, sheet }: { manifest: MediaManifest; sheet: PostsSheet }) {
  const [filter, setFilter] = useState('all')
  const { copied, copy } = useCopy()
  const names = useMemo(() => Object.fromEntries(sheet.networks.map((n) => [n.id, n.name])), [sheet])
  const shown = manifest.images.filter((img) => img.layout !== 'slide' && (filter === 'all' || img.network === filter || img.also.includes(filter)))
  const count = (id: string) => manifest.images.filter((img) => img.network === id || img.also.includes(id)).length
  return (
    <Section
      id="social"
      eyebrow="03 · Social images"
      title="Sized for ten networks."
      lede="Each image is drawn from the pack data at its native size and stays under that network's file limit. Open any one at full size, download it, or copy its alt text."
    >
      <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="Filter by network">
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton>
        {sheet.networks.map((n) => (
          <FilterButton key={n.id} active={filter === n.id} onClick={() => setFilter(n.id)}>
            {n.name} <span className="mono text-[0.7rem] opacity-70">{count(n.id)}</span>
          </FilterButton>
        ))}
      </div>
      {filter !== 'all' && count(filter) > shown.length && (
        <p className="mb-4 text-sm text-muted-foreground">
          {names[filter]} also uses the carousel slides. <a href="#carousel" className="text-primary hover:underline">See the carousel</a>.
        </p>
      )}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((img) => (
          <figure key={img.id} className="surface mb-4 break-inside-avoid overflow-hidden p-0">
            <a href={mediaUrl(img.file)} target="_blank" rel="noopener" className="block bg-black">
              <img src={mediaUrl(img.preview)} alt={img.alt} width={img.width} height={img.height} loading="lazy" decoding="async" className="h-auto w-full" />
            </a>
            <figcaption className="space-y-2.5 p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge>{names[img.network] ?? img.network}</Badge>
                {img.also.map((a) => (
                  <Badge key={a} variant="outline">{names[a] ?? a}</Badge>
                ))}
              </div>
              <p className="text-sm font-medium text-[color:var(--heading)]">{img.use}</p>
              <p className="mono text-xs text-muted-foreground">{img.width} x {img.height} · {formatBytes(img.bytes)} · JPEG</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a href={mediaUrl(img.file)} download className={buttonVariants({ variant: 'outline', size: 'sm' })}><Download /> Download</a>
                <Button variant="ghost" size="sm" onClick={() => copy(img.id, img.alt)} aria-label={`Copy alt text for ${img.use}`}>
                  {copied === img.id ? <Check /> : <Copy />} {copied === img.id ? 'Copied' : 'Alt text'}
                </Button>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button variant={active ? 'default' : 'outline'} size="sm" aria-pressed={active} onClick={onClick}>
      {children}
    </Button>
  )
}

function Carousel({ manifest }: { manifest: MediaManifest }) {
  const slides = manifest.images.filter((img) => img.layout === 'slide')
  if (!slides.length) return null
  return (
    <Section
      id="carousel"
      eyebrow="04 · Carousel"
      title="Five slides, one PDF."
      lede="Post the slides as an Instagram carousel, or upload the PDF to LinkedIn as a document post. Same order, same alt text."
    >
      <ol className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0" aria-label="Carousel slides">
        {slides.map((s, i) => (
          <li key={s.id} className="w-60 shrink-0 snap-start sm:w-72">
            <a href={mediaUrl(s.file)} target="_blank" rel="noopener" className="surface block overflow-hidden p-0">
              <img src={mediaUrl(s.preview)} alt={s.alt} width={s.width} height={s.height} loading="lazy" decoding="async" className="h-auto w-full" />
            </a>
            <p className="mono mt-2 text-xs text-muted-foreground">Slide {i + 1} · {formatBytes(s.bytes)}</p>
          </li>
        ))}
      </ol>
      {manifest.carousel_pdf && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a href={mediaUrl(manifest.carousel_pdf.file)} download className={buttonVariants()}><FileText /> Carousel PDF</a>
          <span className="mono text-xs text-muted-foreground">{manifest.carousel_pdf.pages} pages · {formatBytes(manifest.carousel_pdf.bytes)}</span>
        </div>
      )}
    </Section>
  )
}

function PostCopy({ sheet }: { sheet: PostsSheet }) {
  const { copied, copy } = useCopy()
  return (
    <Section
      id="copy"
      eyebrow="05 · Post copy"
      title="Copy that fits every limit."
      lede={`Lengths are counted the way each network counts them: X weighs a link as 23 characters, Bluesky counts graphemes, Instagram allows five hashtags, Threads one topic tag. Limits as of ${new Date(`${sheet.limits_as_of}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}.`}
    >
      <Tabs defaultValue={sheet.networks[0]?.id}>
        <TabsList aria-label="Network" className="mb-4 h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {sheet.networks.map((n) => (
            <TabsTrigger key={n.id} value={n.id} className="h-8 flex-none border-border px-3 data-active:border-primary">{n.name}</TabsTrigger>
          ))}
        </TabsList>
        {sheet.networks.map((n) => (
          <TabsContent key={n.id} value={n.id} className="space-y-4">
            <p className="max-w-3xl text-sm text-muted-foreground">{n.why}</p>
            {n.posts.map((p) => (
              <article key={p.label} className="surface p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="mr-1 text-lg font-semibold text-[color:var(--heading)]">{p.label}</h3>
                  {p.video && <Badge variant="outline">{p.video.replace('x', ':')} video</Badge>}
                  {p.pdf && <Badge variant="outline">PDF document</Badge>}
                  {p.assets.map((a) => <Badge key={a} variant="secondary" className="mono">{a}</Badge>)}
                </div>
                {p.notes && <p className="mt-2 text-sm text-muted-foreground">{p.notes}</p>}
                {Object.entries(p.fields).map(([field, value]) => {
                  const c = p.checks.find((k) => k.field === field)
                  const key = `${n.id}-${p.label}-${field}`
                  return (
                    <div key={field} className="mt-4">
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <span className="eyebrow">{field}</span>
                        <div className="flex items-center gap-2">
                          {c && (
                            <span className={`mono text-xs ${c.ok ? 'text-primary' : 'text-[color:var(--hot)]'}`} title={c.unit}>
                              {c.length} / {c.max}{c.maxHashtags != null ? ` · #${c.hashtags}/${c.maxHashtags}` : ''}
                            </span>
                          )}
                          <Button variant="outline" size="xs" onClick={() => copy(key, value)} aria-label={`Copy ${n.name} ${p.label} ${field}`}>
                            {copied === key ? <Check /> : <Copy />} {copied === key ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                      </div>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-sans text-sm leading-relaxed text-[color:var(--heading)]">{value}</pre>
                    </div>
                  )
                })}
              </article>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  )
}

function Networks({ manifest, sheet }: { manifest: MediaManifest; sheet: PostsSheet }) {
  return (
    <Section id="networks" eyebrow="06 · Why these ten" title="Where producers actually look." lede="Picked for where people search for and trade MIDI, sample packs, and production tips, plus the two text-first networks where music-tech and open-source folks post.">
      <div className="surface overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Network</th>
              <th scope="col" className="px-4 py-3 font-medium">Why</th>
              <th scope="col" className="px-4 py-3 font-medium">In the kit</th>
            </tr>
          </thead>
          <tbody>
            {sheet.networks.map((n) => {
              const imgs = manifest.images.filter((i) => i.network === n.id || i.also.includes(n.id)).length
              const videos = [...new Set(n.posts.map((p) => p.video).filter(Boolean))]
              return (
                <tr key={n.id} className="border-b border-border last:border-0">
                  <th scope="row" className="px-4 py-3 font-semibold text-[color:var(--heading)]">{n.name}</th>
                  <td className="px-4 py-3 text-muted-foreground">{n.why}</td>
                  <td className="mono px-4 py-3 text-xs whitespace-nowrap">
                    {imgs} image{imgs === 1 ? '' : 's'}{videos.length ? ` · ${videos.map((v) => v!.replace('x', ':')).join(', ')} video` : ''} · {n.posts.length} post{n.posts.length === 1 ? '' : 's'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function Brand() {
  const { copied, copy } = useCopy()
  return (
    <Section id="brand" eyebrow="07 · Brand basics" title="Colors, type, and the mark." lede="Everything in the spot and the cards uses these six colors and two typefaces, both under the SIL Open Font License.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BRAND_COLORS.map(([name, hex]) => (
            <button
              key={hex}
              type="button"
              onClick={() => copy(hex, hex)}
              className="surface group overflow-hidden p-0 text-left transition-colors hover:border-primary"
              aria-label={`Copy ${name} ${hex}`}
            >
              <span className="block h-20 border-b border-border" style={{ background: hex }} />
              <span className="flex items-center justify-between px-3 py-2.5 text-sm">
                <span className="font-medium text-[color:var(--heading)]">{name}</span>
                <span className="mono text-xs text-muted-foreground">{copied === hex ? 'Copied' : hex}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="surface flex flex-col gap-5 p-5">
          <div>
            <p className="eyebrow mb-2">Headlines</p>
            <p className="text-3xl font-bold tracking-tight text-[color:var(--heading)]">Space Grotesk</p>
          </div>
          <div>
            <p className="eyebrow mb-2">Labels and data</p>
            <p className="mono text-xl text-[color:var(--heading)]">JetBrains Mono</p>
          </div>
          <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
            <img src="favicon.svg" alt="" width={40} height={40} className="size-10" />
            <a href="favicon.svg" download="basement-protocol-mark.svg" className={buttonVariants({ variant: 'outline', size: 'sm' })}><Download /> Mark (SVG)</a>
          </div>
        </div>
      </div>
      <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        Background illustrations are AI-generated for this project. Screens are captures of this site.
        <a href="./#lab" className="inline-flex items-center gap-1 text-primary hover:underline">Open the lab <ArrowRight className="size-3.5" /></a>
      </p>
    </Section>
  )
}
