import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { COMMERCIAL_16X9 } from '@/lib/media'

export function CommercialTeaser() {
  return (
    <section id="spot" className="scroll-mt-20 py-16 sm:py-24" aria-labelledby="spot-title">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="surface overflow-hidden bg-black p-0"
        >
          <video className="block aspect-video w-full bg-black" controls playsInline preload="none" poster={COMMERCIAL_16X9.poster} width={1920} height={1080}>
            <source src={COMMERCIAL_16X9.src} type="video/mp4" />
            <track kind="captions" srcLang="en" label="English" src={COMMERCIAL_16X9.captions} default />
            Your browser cannot play this video. <a href={COMMERCIAL_16X9.src}>Download the MP4</a>.
          </video>
        </motion.div>
        <div>
          <p className="eyebrow">08 · The spot</p>
          <h2 id="spot-title" className="mt-3 text-3xl font-bold leading-[1.05] sm:text-5xl">Thirty seconds, played from the pack.</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every bass note in the spot is rendered from BP01, BP11, BP44, and BP50. The media kit has vertical and square cuts, social images for ten networks, and post copy that fits each one.
          </p>
          <a href="media.html" className={`${buttonVariants({ size: 'lg' })} mt-6`}>
            Open the media kit <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  )
}
