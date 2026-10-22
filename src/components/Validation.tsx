import { motion } from 'motion/react'
import { CheckCircle2, CircleAlert, FileJson, TriangleAlert, XCircle } from 'lucide-react'
import { Counter } from '@/components/Counter'
import { Section } from '@/components/Section'
import { REPORT_JSON } from '@/lib/data'
import { usePack } from '@/pack-context'

export function Validation() {
  const { report } = usePack()
  const second = report?.second_parser
  const passed = report ? report.summary.passed + (second?.status === 'pass' ? 1 : 0) : 0
  const total = report ? report.summary.checks + (second ? 1 : 0) : 0
  const generated = report ? new Date(report.generated_at_utc) : null

  return (
    <Section
      id="validation"
      eyebrow="06 · Validation"
      title="Checks that actually ran, with their limits stated."
      lede="This panel renders the validation report shipped inside the pack. If a check had failed, it would show here in red. Nothing on this page is a projected result."
    >
      {!report ? (
        <div className="surface shimmer h-96" aria-busy="true" aria-label="Loading validation report" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <div className="surface p-5">
              <div className="flex items-center gap-3">
                {passed === total ? <CheckCircle2 className="size-8 text-primary" /> : <XCircle className="size-8 text-destructive" />}
                <div>
                  <p className="font-mono text-3xl font-semibold text-[color:var(--heading)]"><Counter to={passed} />/{total}</p>
                  <p className="text-xs text-muted-foreground">checks passed, including the second parser</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-xs">
                {[
                  ['MIDI files', report.summary.midi_files],
                  ['Note events', report.summary.note_events],
                  ['Failed', report.summary.failed],
                  ['Parsers', second ? 2 : 1],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-lg border border-border bg-muted/40 p-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="mt-1 text-xl text-foreground"><Counter to={v as number} /></dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[11px] leading-snug text-muted-foreground">
                Generated {generated?.toISOString().replace('T', ' ').slice(0, 16)} UTC by {report.validator}.
              </p>
              <a href={REPORT_JSON} className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <FileJson className="size-4" /> Raw report JSON
              </a>
            </div>

            {second && (
              <div className="surface p-5">
                <p className="eyebrow mb-2">Second, independent parser</p>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {second.status === 'pass' ? <CheckCircle2 className="size-4 text-primary" /> : <XCircle className="size-4 text-destructive" />}
                  {second.parser}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{second.detail}.</p>
                <p className="mt-2 font-mono text-xs text-foreground">{second.files_parsed} files · {second.notes_compared} notes compared · {second.problems.length} problems</p>
              </div>
            )}

            <div className="surface p-5">
              <p className="eyebrow mb-3 flex items-center gap-1.5"><TriangleAlert className="size-3.5" /> Limitations</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {report.limitations.map((l) => <li key={l} className="leading-snug">{l}</li>)}
              </ul>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <ol className="surface divide-y divide-border overflow-hidden p-0">
              {report.checks.map((c, i) => (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 px-4 py-3.5 sm:px-5"
                >
                  {c.status === 'pass' ? <CheckCircle2 className="mt-0.5 size-5 text-primary" aria-label="pass" /> : <CircleAlert className="mt-0.5 size-5 text-destructive" aria-label="fail" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] leading-relaxed break-words text-muted-foreground">{c.detail}</p>
                    {c.problems.length > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-xs text-destructive">
                        {c.problems.slice(0, 5).map((p) => <li key={p}>{p}</li>)}
                      </ul>
                    )}
                  </div>
                </motion.li>
              ))}
            </ol>

            <div className="surface p-5">
              <p className="eyebrow mb-2">Reproduce it yourself</p>
              <pre className="overflow-x-auto rounded-lg border border-border bg-[color:var(--roll-bg)] p-3 font-mono text-xs leading-relaxed text-foreground">
{`python3 generator/basement_protocol.py   # stdlib only, writes pack/
pip install -r generator/requirements.txt  # mido 1.3.3
python3 generator/validate.py             # 12 checks, writes the report
npm ci && node scripts/validate-tonejs.mjs  # second parser`}
              </pre>
              <p className="mt-3 text-xs text-muted-foreground">
                The generator is deterministic. Running it again produces byte-identical MIDI files, and each file's SHA-256 is listed in the manifest.
              </p>
            </div>
          </div>
        </div>
      )}
    </Section>
  )
}
