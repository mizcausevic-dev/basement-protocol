import { GithubMark, Logo } from '@/components/Nav'
import { REPO_URL } from '@/lib/data'

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] lg:px-8">
        <div>
          <a href="./" className="flex items-center gap-2.5 font-bold text-[color:var(--heading)]">
            <Logo /> Basement Protocol
          </a>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            50 validated MIDI basslines and the open generator behind them. Built by Miz Causevic at{' '}
            <a href="https://kineticgain.com" className="text-primary hover:underline">Kinetic Gain</a>.
          </p>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">Project</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href={REPO_URL} className="inline-flex items-center gap-1.5 hover:text-primary"><GithubMark className="size-3.5" /> Source on GitHub</a></li>
            <li><a href="article.html" className="hover:text-primary">The article</a></li>
            <li><a href="#validation" className="hover:text-primary">Validation report</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">Fine print</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>Code: MIT license. Patterns: royalty-free for your own productions, see <a href={`${REPO_URL}/blob/main/LICENSE-PATTERNS.md`} className="text-primary hover:underline">LICENSE-PATTERNS</a>.</li>
            <li>Illustrations are AI-generated for this project.</li>
            <li>No cookies, no analytics, no forms. Your theme choice is kept in this browser's local storage, and audio is synthesized locally.</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
