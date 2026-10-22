import { marked } from 'marked'
import { motion, useScroll, useSpring } from 'motion/react'
import { ArrowLeft, Check, Copy, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import articleMd from '../article/medium-article-Cursor.md?raw'
import { Footer } from '@/components/Footer'
import { Nav } from '@/components/Nav'
import { Button } from '@/components/ui/button'
import { ARTICLE_META } from '@/lib/article-meta'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function renderArticle(md: string) {
  const html = marked.parse(md, { async: false, gfm: true })
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const toc: { id: string; text: string }[] = []
  doc.querySelectorAll('h2').forEach((h) => {
    const text = h.textContent ?? ''
    h.id = slug(text)
    toc.push({ id: h.id, text })
  })
  doc.querySelectorAll('a[href^="http"]').forEach((a) => {
    a.setAttribute('rel', 'noopener')
  })
  doc.querySelectorAll('img').forEach((img, i) => {
    if (i > 0) img.setAttribute('loading', 'lazy')
  })
  return { html: doc.body.innerHTML, toc }
}

export function ArticlePage() {
  const { html, toc } = useMemo(() => renderArticle(articleMd), [])
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.3 })
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(articleMd)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <motion.div aria-hidden="true" style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary" />
      <Nav home="./" onArticle />
      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:px-8 lg:py-16">
        <article className="min-w-0">
          <div className="mx-auto max-w-[720px]">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <a href="./" className="inline-flex items-center gap-1.5 hover:text-primary"><ArrowLeft className="size-4" /> Back to the lab</a>
              <span className="font-mono text-xs">{ARTICLE_META.author} · {ARTICLE_META.readMinutes} min read</span>
            </div>
            <div className="prose-article" dangerouslySetInnerHTML={{ __html: html }} />
            <div className="surface mt-12 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[color:var(--heading)]">Publishing on Medium?</p>
                <p className="text-sm text-muted-foreground">Copy the Markdown or download it. The hero image ships in the repo as <span className="mono">article/medium-hero-Cursor.jpg</span>.</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={copy}>{copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy Markdown'}</Button>
                <a href="article/medium-article-Cursor.md" download className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/85">
                  <Download className="size-4" /> .md
                </a>
              </div>
            </div>
          </div>
        </article>
        <aside className="hidden lg:block">
          <nav aria-label="Article sections" className="sticky top-24">
            <p className="eyebrow mb-3">On this page</p>
            <ol className="space-y-2 border-l border-border pl-4 text-sm">
              {toc.map((t) => (
                <li key={t.id}><a href={`#${t.id}`} className="text-muted-foreground transition-colors hover:text-primary">{t.text}</a></li>
              ))}
            </ol>
            <a href="./#lab" className="mt-6 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/85">Open the pattern lab</a>
          </nav>
        </aside>
      </main>
      <Footer />
    </>
  )
}
