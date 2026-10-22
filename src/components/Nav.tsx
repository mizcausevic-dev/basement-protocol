import { ThemePicker } from '@/components/ThemePicker'
import { REPO_URL } from '@/lib/data'

const LINKS = [
  ['Lab', '#lab'],
  ['Groove map', '#map'],
  ['Mindmap', '#mindmap'],
  ['Pipeline', '#pipeline'],
  ['Validation', '#validation'],
  ['Brief', '#brief'],
] as const

type Page = 'home' | 'article' | 'media'

const PAGES = [
  ['media', 'Media kit', 'media.html'],
  ['article', 'Article', 'article.html'],
] as const

const linkClass = 'transition-colors hover:text-primary aria-[current=page]:text-primary aria-[current=page]:font-semibold'

export function Nav({ page = 'home' }: { page?: Page }) {
  return (
    <header className="glass sticky top-0 z-40">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8" aria-label="Primary">
        <a href="./" className="flex items-center gap-2.5 font-bold tracking-tight text-[color:var(--heading)]">
          <Logo />
          <span className="max-w-[8.5rem] truncate text-sm sm:max-w-none sm:text-base">Basement Protocol</span>
        </a>
        <div className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex">
          {page === 'home'
            ? LINKS.map(([label, href]) => (
                <a key={href} href={href} className={linkClass}>{label}</a>
              ))
            : <a href="./" className={linkClass}>Lab</a>}
          {PAGES.map(([id, label, href]) => (
            <a key={id} href={href} className={linkClass} aria-current={page === id ? 'page' : undefined}>{label}</a>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={page === 'media' ? 'article.html' : 'media.html'}
            className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary lg:hidden"
          >
            {page === 'media' ? 'Article' : 'Media'}
          </a>
          <ThemePicker />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Source on GitHub"
            className="hidden size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-primary sm:inline-flex"
          >
            <GithubMark className="size-4" />
          </a>
        </div>
      </nav>
    </header>
  )
}

export function Logo({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--card)" stroke="var(--primary)" strokeOpacity="0.5" />
      <path d="M5 20 C 8 20, 8 9, 11 9 S 14 23, 17 23 S 20 12, 23 12 S 26 18, 27 18" fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="6" y="25" width="5" height="2" rx="1" fill="var(--acid)" />
      <rect x="13" y="25" width="3" height="2" rx="1" fill="var(--primary)" />
      <rect x="18" y="25" width="7" height="2" rx="1" fill="var(--hot)" />
    </svg>
  )
}

export function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}
