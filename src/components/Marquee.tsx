import { usePack } from '@/pack-context'
import { familyColor } from '@/lib/families'
import { useTheme } from '@/lib/theme'

export function Marquee() {
  const { manifest, select } = usePack()
  const { mode } = useTheme()
  if (!manifest) return <div className="h-14" />
  const items = manifest.patterns
  return (
    <div className="marquee relative mt-8 overflow-hidden border-y border-border py-3 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className="marquee-track gap-8">
        {[...items, ...items].map((p, i) => (
          <button
            key={`${p.id}-${i}`}
            onClick={() => select(p.id, { scroll: true })}
            tabIndex={i < items.length ? 0 : -1}
            aria-hidden={i >= items.length}
            className="flex shrink-0 items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary"
          >
            <span className="size-1.5 rounded-full" style={{ background: familyColor(p.family, mode) }} />
            <span className="text-foreground">{p.id}</span> {p.name} <span className="opacity-60">{p.bpm}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
