import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface Props {
  id: string
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({ id, eyebrow, title, lede, children, className }: Props) {
  return (
    <section id={id} className={`scroll-mt-20 py-16 sm:py-24 ${className ?? ''}`} aria-labelledby={`${id}-title`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 max-w-3xl"
        >
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h2 id={`${id}-title`} className="text-3xl font-bold leading-[1.05] sm:text-5xl">{title}</h2>
          {lede && <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{lede}</p>}
        </motion.header>
        {children}
      </div>
    </section>
  )
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
