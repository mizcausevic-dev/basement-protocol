import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { THEMES, useTheme, type ThemeId } from '@/lib/theme'

export function ThemePicker() {
  const { theme, mode, setTheme, setMode } = useTheme()
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0]
  return (
    <div className="flex items-center gap-1.5">
      <Select value={theme} onValueChange={(v) => v && setTheme(v as ThemeId)}>
        <SelectTrigger size="sm" aria-label="Theme" className="h-8 min-w-0 gap-2 text-xs">
          <Swatch colors={current.swatch} />
          <SelectValue className="hidden sm:flex">{current.label}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false} className="min-w-48">
          {THEMES.map((t) => (
            <SelectItem key={t.id} value={t.id} className="text-sm">
              <Swatch colors={t.swatch} />
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
      >
        {mode === 'dark' ? <Sun /> : <Moon />}
      </Button>
    </div>
  )
}

function Swatch({ colors }: { colors: readonly string[] }) {
  return (
    <span className="flex overflow-hidden rounded-sm border border-border" aria-hidden="true">
      {colors.map((c) => (
        <span key={c} className="block h-3.5 w-2" style={{ background: c }} />
      ))}
    </span>
  )
}
