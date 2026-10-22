import { useEffect, useRef } from 'react'
import { engine } from '@/audio/engine'
import { cssVar, useTheme } from '@/lib/theme'

export function Oscilloscope({ playing, className }: { playing: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { revision } = useTheme()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const stroke = cssVar('--primary')
    const faint = cssVar('--roll-grid')
    const bg = cssVar('--roll-bg')
    const buf = new Float32Array(2048)
    let raf = 0
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = faint
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()
      const analyser = engine.getAnalyser()
      if (analyser && playing) {
        analyser.getFloatTimeDomainData(buf)
        let start = 0
        for (let i = 1; i < buf.length / 2; i++) {
          if (buf[i - 1] < 0 && buf[i] >= 0) {
            start = i
            break
          }
        }
        const len = 1024
        ctx.strokeStyle = stroke
        ctx.lineWidth = 2
        ctx.shadowColor = stroke
        ctx.shadowBlur = 8
        ctx.beginPath()
        for (let i = 0; i < len; i++) {
          const v = buf[start + i] ?? 0
          const px = (i / len) * w
          const py = h / 2 - v * h * 0.45
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
        ctx.shadowBlur = 0
        raf = requestAnimationFrame(draw)
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [playing, revision])

  return <canvas ref={ref} className={className} aria-label="Live oscilloscope of the audio output" role="img" />
}
