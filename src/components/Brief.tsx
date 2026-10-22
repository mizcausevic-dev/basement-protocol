import { motion } from 'motion/react'
import { Section } from '@/components/Section'

const POINTS: { n: string; title: string; body: string }[] = [
  { n: '01', title: 'What it is', body: 'A free pack of 50 monophonic MIDI bassline loops for underground electronic music, plus this browser lab that plays the real files, and the open-source generator that builds them.' },
  { n: '02', title: 'Who it is for', body: 'Producers of techno, acid, DnB, bassline house, and electro who start from a groove instead of a blank piano roll. Also teachers who explain bass programming with concrete examples.' },
  { n: '03', title: 'Why it wins', body: 'Every convention is published next to the files: MIDI 60 = C4, zero-based beats, labeled chromatic notes, legato only where stated. Two independent parsers confirm the files say what the CSVs say.' },
  { n: '04', title: 'How it is structured', body: 'Python generator (standard library) writes the pack. Two validators check it. A static Vite and React site reads the same files at runtime, so the site cannot drift from the download.' },
  { n: '05', title: 'How users discover it', body: 'Search intent such as "free techno bassline MIDI" and "acid bassline MIDI pack", the Medium article, GitHub topics, and deep links to single patterns (for example #BP44) shared in producer communities.' },
  { n: '06', title: 'How users engage', body: 'Audition with four preview patches and reference drums, filter by family and length, explore the groove map and mindmap, and read note-by-note tables before downloading.' },
  { n: '07', title: 'How users convert', body: 'Download the ZIP or a single .mid, with no sign-up and no email gate. Secondary conversion is a GitHub star or fork of the generator.' },
  { n: '08', title: 'How it makes money', body: 'Today it does not, by design. Proposed options: a paid extended pack, matching synth preset banks, custom pattern commissions, or a clearly labeled sponsor from a synth or plugin maker.' },
  { n: '09', title: 'How it launches', body: 'GitHub Pages live preview, a v1.0.0 tag on the repo, the Medium article, then targeted posts where producers share MIDI. Measure before scaling any channel.' },
  { n: '10', title: 'How it improves', body: 'Import tests inside Ableton Live, Bitwig, FL Studio, and Logic. Rendered audio previews. New families driven by download data, once a privacy notice and consent-aware analytics exist.' },
]

const KPIS: { kpi: string; event: string; params: string; decision: string }[] = [
  { kpi: 'Pack downloads per visit', event: 'self_serve_cta_click', params: 'cta_target=pack_zip | single_mid, placement', decision: 'Whether the lab converts, and which placement earns it' },
  { kpi: 'Patterns auditioned for a full loop', event: 'tool_complete', params: 'content_type=midi_pattern, offer=pattern_id', decision: 'Which families to extend in the next pack' },
  { kpi: 'Article to lab click-through', event: 'content_engagement_click', params: 'placement=article, destination=lab', decision: 'Whether long-form content is worth a second piece' },
]

export function Brief() {
  return (
    <Section
      id="brief"
      eyebrow="07 · Product brief"
      title="The executive view: what this is and how it grows."
      lede="Assumed business goal: build a credible, free creative-technology asset that earns an audience of producers and proves the generator approach. Page goal: get a visitor to audition, then download."
    >
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {POINTS.map((p, i) => (
          <motion.li
            key={p.n}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: (i % 5) * 0.06 }}
            className="surface flex flex-col p-4"
          >
            <span className="font-mono text-xs text-primary">{p.n}</span>
            <h3 className="mt-1.5 text-base font-semibold">{p.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </motion.li>
        ))}
      </ol>

      <div className="surface mt-6 overflow-hidden p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
          <p className="eyebrow">KPIs mapped to canonical events</p>
          <p className="text-xs text-muted-foreground">Not wired. This site sets no cookies and loads no analytics.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                {['KPI', 'Event', 'Parameters', 'Decision it informs'].map((h) => <th key={h} scope="col" className="px-5 py-2.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {KPIS.map((k) => (
                <tr key={k.kpi} className="border-t border-border">
                  <td className="px-5 py-3 font-medium text-foreground">{k.kpi}</td>
                  <td className="px-5 py-3 font-mono text-xs text-primary">{k.event}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{k.params}</td>
                  <td className="px-5 py-3 text-muted-foreground">{k.decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          Before any measurement ships: publish a privacy notice, document consent defaults, and register these events with their trigger conditions. Repurpose note: the same generator, validator, and lab pattern works for drum grooves, chord progressions, or any rule-based content pack that needs proof it is correct.
        </p>
      </div>
    </Section>
  )
}
