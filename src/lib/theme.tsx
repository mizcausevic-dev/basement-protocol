import { MotionConfig } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export const THEMES = [
  { id: 'cyber', label: 'Cosmic Cyber', swatch: ['#0b0c10', '#66fcf1', '#45a29e'] },
  { id: 'bento', label: 'Bento Grid', swatch: ['#18181d', '#a78bfa', '#38bdf8'] },
  { id: 'swiss', label: 'Swiss Architect', swatch: ['#ffffff', '#e30613', '#0a0a0a'] },
  { id: 'aqua', label: 'Aqua Web 2.0', swatch: ['#e4f1fb', '#0a72e0', '#1aa35a'] },
  { id: 'brutal', label: 'Pop Brutalist', swatch: ['#fff6dd', '#ff3ea5', '#ffe600'] },
  { id: 'steel', label: 'Steel Tactical', swatch: ['#121518', '#ff8c1a', '#9fb83a'] },
  { id: 'parchment', label: 'Parchment', swatch: ['#f2e8d5', '#8b2e16', '#2f5d50'] },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export type Mode = 'dark' | 'light'

interface ThemeState {
  theme: ThemeId
  mode: Mode
  setTheme: (t: ThemeId) => void
  setMode: (m: Mode) => void
  /** Increments on every change so canvases can re-read CSS variables. */
  revision: number
}

const ThemeContext = createContext<ThemeState | null>(null)

function readStored(): { theme: ThemeId; mode: Mode } {
  const el = document.documentElement
  const theme = (el.dataset.theme as ThemeId) || 'cyber'
  const mode = (el.dataset.mode as Mode) || 'dark'
  return { theme, mode }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [{ theme, mode }, setState] = useState(readStored)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = theme
    el.dataset.mode = mode
    el.classList.toggle('dark', mode === 'dark')
    el.style.colorScheme = mode
    try {
      localStorage.setItem('bp-theme', theme)
      localStorage.setItem('bp-mode', mode)
    } catch {
      /* storage can be blocked in private modes; theme still applies for the session */
    }
    setRevision((r) => r + 1)
  }, [theme, mode])

  const setTheme = useCallback((t: ThemeId) => setState((s) => ({ ...s, theme: t })), [])
  const setMode = useCallback((m: Mode) => setState((s) => ({ ...s, mode: m })), [])
  const value = useMemo(() => ({ theme, mode, setTheme, setMode, revision }), [theme, mode, setTheme, setMode, revision])
  return (
    <ThemeContext.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

export function cssVar(name: string, fallback = '#888') {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
