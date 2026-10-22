import { motion } from 'motion/react'
import { ArrowRight, Clock } from 'lucide-react'
import { ARTICLE_META } from '@/lib/article-meta'

export function ArticleTeaser() {
  return (
    <section className="py-16 sm:py-24" aria-labelledby="article-teaser-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.a
          href="article.html"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="surface group grid overflow-hidden p-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
        >
          <div className="relative overflow-hidden">
            <img src="images/article-hero.webp" alt="Illustration of glowing MIDI note blocks rising from a grid above a flowing bass waveform" loading="lazy" className="h-60 w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:h-full" />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <p className="eyebrow">08 · The long read</p>
            <h2 id="article-teaser-title" className="mt-3 text-2xl font-bold leading-tight sm:text-4xl">{ARTICLE_META.title}</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{ARTICLE_META.description}</p>
            <p className="mt-6 inline-flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-primary">Read the article <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock className="size-3.5" /> {ARTICLE_META.readMinutes} min read</span>
            </p>
          </div>
        </motion.a>
      </div>
    </section>
  )
}
