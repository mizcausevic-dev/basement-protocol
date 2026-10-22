import { ArticleTeaser } from '@/components/ArticleTeaser'
import { Brief } from '@/components/Brief'
import { CommercialTeaser } from '@/components/CommercialTeaser'
import { DropBand } from '@/components/DropBand'
import { Footer } from '@/components/Footer'
import { GrooveMap } from '@/components/GrooveMap'
import { Hero } from '@/components/Hero'
import { Lab } from '@/components/Lab'
import { Marquee } from '@/components/Marquee'
import { Mindmap } from '@/components/Mindmap'
import { Nav } from '@/components/Nav'
import { Pipeline } from '@/components/Pipeline'
import { SoundDesign } from '@/components/SoundDesign'
import { Validation } from '@/components/Validation'
import { PackProvider } from '@/pack-context'

export default function App() {
  return (
    <PackProvider>
      <a href="#lab" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to the pattern lab
      </a>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Lab />
        <GrooveMap />
        <Mindmap />
        <SoundDesign />
        <Pipeline />
        <Validation />
        <DropBand />
        <Brief />
        <CommercialTeaser />
        <ArticleTeaser />
      </main>
      <Footer />
    </PackProvider>
  )
}
