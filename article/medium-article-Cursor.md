# 50 Free Techno and Acid Bassline MIDI Files, Built Like Software

### A step-sequencer language, a roughly 700-line Python generator, and two independent MIDI parsers that check all 700 notes before you drag a single loop into your DAW.

![Glowing MIDI note blocks rising from a grid above a flowing bass waveform](images/article-hero.webp)

*Illustration: AI-generated for this project.*

When you drag a free MIDI bassline into a session, you are trusting the file on three points. The notes land where they appear to land. The octave is the one you think it is. Nothing overlaps unless somebody meant it to.

Most of the time you cannot check any of that until the loop is already playing and something sounds wrong. So I built a bass pack the way I would build software. Every pattern is defined in code, rendered by a deterministic generator, and checked by two parsers that share no code with the generator or with each other. The conventions behind the files are published next to them.

The result is **Basement Protocol**: 50 monophonic bassline loops for techno, acid, drum and bass, bassline house, electro, and the darker rooms in between. It is free, it is open source, and you can audition every file in the browser before downloading anything.

- **Live lab:** [mizcausevic-dev.github.io/basement-protocol](https://mizcausevic-dev.github.io/basement-protocol/)
- **Source and pack:** [github.com/mizcausevic-dev/basement-protocol](https://github.com/mizcausevic-dev/basement-protocol)

> **Key takeaways**
>
> - 50 Standard MIDI Files, 700 note events, tempos from 105 to 174 BPM, loops of 1, 2, or 4 bars.
> - Seven groove families: sparse, rolling, offbeat, syncopated, staccato, sustained, and acid.
> - Monophonic by default. Only five patterns are labeled legato, and only those contain overlaps, each exactly 30 ticks long.
> - Every out-of-scale note is declared and explained. There are nine, across seven patterns.
> - Validation ran 12 checks with mido plus a full second pass with @tonejs/midi. All passed. The limitations are listed below.

## What is in the pack

The download is a 33 KB ZIP. It contains 50 `.mid` files, an index CSV with one row per pattern, a note-events CSV with one row per note, and a README that spells out the conventions.

| Family | Patterns | What the bass does |
| --- | --- | --- |
| Sparse | 7 | Few hits, long gaps. Silence carries the tension. |
| Rolling | 8 | Constant forward motion that never lets go of the floor. |
| Offbeat | 7 | The "and" of the beat is the anchor, so bass and kick trade places. |
| Syncopated | 8 | Weight lands where the body does not expect it. |
| Staccato | 7 | Short, clipped, percussive notes. Bass as a drum. |
| Sustained | 6 | Long tones and slow movement for pressure and drone. |
| Acid | 7 | Accents, slides, and octave jumps from the 303 lineage. |

Loop lengths split into 12 one-bar, 25 two-bar, and 13 four-bar patterns. Keys lean dark. There are 27 patterns in natural minor (Aeolian), 15 in Phrygian, 6 in Dorian, and one each in Locrian and minor pentatonic. The tonal centers spread across twelve roots, so you are not stuck transposing everything out of A minor.

Tempo follows the genre each pattern was written for. 41 of the 50 sit between 120 and 140 BPM for techno and house. Four sit between 170 and 174 for drum and bass, one is a 160 BPM footwork pattern, and the slowest is a 105 BPM drone.

## Seven ways a bassline can move

A bass pack is only useful if the patterns are actually different from each other. A pack where 30 loops are the same eighth-note pulse in different keys is really one loop. So the collection is organized by *how the bass moves*, and the validator checks that no two patterns share a rhythm.

**Sparse** patterns average between 1.25 and 4 notes per bar. [BP01 Concrete Breath](https://mizcausevic-dev.github.io/basement-protocol/#BP01) is a long root, a fifth answering on the "and" of beat three, and a low pickup back into the loop. This is dub-techno weight. The space between notes is the point.

**Rolling** patterns like [BP08 Gallop Protocol](https://mizcausevic-dev.github.io/basement-protocol/#BP08) keep the sixteenths moving. One rolling pattern uses an eighth-note-triplet grid and another uses sixteenth triplets, so they roll differently than a straight grid.

**Offbeat** patterns put the bass between the kicks. That is the classic trance and bassline-house trick that makes a sidechained bass pump. [BP18 Niche Bounce](https://mizcausevic-dev.github.io/basement-protocol/#BP18) adds 58 percent swing.

**Syncopated** patterns borrow from older rhythmic families. [BP23 Tresillo Grind](https://mizcausevic-dev.github.io/basement-protocol/#BP23) uses 3-3-2 tresillo cells, and [BP29 Clave Dread](https://mizcausevic-dev.github.io/basement-protocol/#BP29) compresses a 3-2 son clave into one bar. [BP27 Footwork Fracture](https://mizcausevic-dev.github.io/basement-protocol/#BP27) runs at 160 BPM on a triplet grid.

**Staccato** patterns treat the bass as percussion. [BP32 Stutter Code](https://mizcausevic-dev.github.io/basement-protocol/#BP32) is written on a 32nd-note grid. [BP37 Chicago Jack](https://mizcausevic-dev.github.io/basement-protocol/#BP37) swings at 56 percent.

**Sustained** patterns hold notes for up to a full bar. [BP40 Reese Cathedral](https://mizcausevic-dev.github.io/basement-protocol/#BP40) is a 174 BPM legato line that uses a Gb (the flat second) for a Neapolitan sense of dread.

**Acid** patterns use what a 303-style sequencer is known for: accents, slides, and octave jumps. [BP44 Acid Rain](https://mizcausevic-dev.github.io/basement-protocol/#BP44) is the textbook one-bar version. [BP50 Last Call](https://mizcausevic-dev.github.io/basement-protocol/#BP50) is a four-bar build that gets denser toward the end, for a riser.

## Writing basslines as text

None of these patterns were drawn in a piano roll. Each one is a short string of steps plus a list of intervals. Here is BP44 exactly as it appears in the generator:

```python
P("BP44", "Acid Rain", "acid", 130, 33, "phrygian",
  ["XxsxX.xsxX.xsXxx"],
  [0, 0, 12, 10, 0, 12, 1, 0, 13, 0, 7, 12, 0, 3],
  gate=0.5, vel=(127, 96, 76))
```

Every character in the step string is one sixteenth note:

| Symbol | Meaning |
| --- | --- |
| `X` | Accented note (velocity 127 in this pattern) |
| `x` | Normal note (velocity 96) |
| `o` | Ghost note, shorter and softer |
| `S` / `s` | Accented or normal note that slides into the next note |
| `-` | Hold the previous note through this step |
| `.` | Rest |

The second list holds semitone intervals above the root. Root 33 is A1, so `12` is A2, `13` is the Phrygian Bb above it, and `1` is the Bb just above the root. Gate 0.5 makes normal notes half a step long, which gives acid lines their clipped feel.

Writing patterns as text has two practical benefits. First, a pattern is reviewable. A diff of `"X.x..x..x.x..X.x"` tells you exactly which sixteenth moved. Second, the generator can enforce musical rules at build time. If a pattern contains a note outside its scale and the note is not declared as a deliberate chromatic departure, the build stops with an error.

Grids other than straight sixteenths use the same language with a different step size: 3 steps per beat for eighth-note triplets, 6 for sixteenth triplets, and 8 for 32nds. At 480 ticks per quarter note, every one of those grids divides evenly, so every step lands on a whole tick.

## The MIDI details that usually go unexplained

### Note names: MIDI 60 is C4

The pack uses scientific pitch notation, where MIDI note 60 is C4 and A4 (MIDI 69) is 440 Hz. DAWs disagree about this. Ableton Live labels MIDI 60 as C3, and FL Studio labels it C5. That means the note your DAW calls "A1" might be A2 in the CSV. **The MIDI note numbers are authoritative.** Names are a convenience, and the README says which convention they follow.

Every note sits between MIDI 25 and MIDI 60, which is C#1 to C4 in this naming.

### Positions start at beat zero

Start positions in the CSV are zero-based quarter-note beats. A note at `0` is on the downbeat of bar one, and a note at `4.5` is on the "and" of beat one in bar two. The CSV also carries the raw tick values at 480 PPQ, so you never have to trust a rounded decimal.

### End of track sits exactly on the loop boundary

Every file ends with its end-of-track event on the exact loop tick: 1920 for one bar, 3840 for two, 7680 for four. No note runs past that boundary. A file that ends one tick early or late can produce a loop with a gap or a stray extra beat when a DAW uses the file length for the clip length, so the validator checks this on every file.

### Note-offs come before note-ons

When one note ends on the same tick where the next note of the same pitch starts, the file writes the note-off first. If the order were reversed, a parser could pair the new note-on with the old note-off and cut the new note to zero length. The generator sorts events so that cannot happen.

## Glide is never assumed

A real 303-style slide happens when one note holds over into the start of the next, and the synth's portamento carries the pitch between them. Most synths only do this in a mono legato mode. On a polyphonic patch, overlapping notes just ring together.

So the pack is **monophonic by default**. Only five patterns are labeled legato: BP40, BP44, BP46, BP47, and BP49. In those, each slide note extends exactly 30 ticks (a sixteenth of a beat) past the start of the next note. That is long enough for a legato-mode synth to glide, and short enough that a non-legato patch only hears a very brief overlap. Across the whole pack there are 31 overlaps, all inside those five patterns, and the validator fails the build if an overlap shows up anywhere else.

## Swing that cannot break anything

Three patterns use swing: 54, 56, and 58 percent. Swing is usually implemented by pushing every second sixteenth later. Done naively, that can push a long note's end past the start of the next note and create an overlap that nobody wrote.

The generator applies swing as a **monotonic time warp** instead. Each eighth note is split at a "knee" that moves later as swing increases. Everything before the knee stretches and everything after it compresses. Because the warp never reverses the order of two points in time, a note that ended before the next one started still does after swing is applied. Overlaps cannot appear by accident.

## Nine notes outside the key, all on purpose

Dark bass music lives on a few notes that do not belong to the scale. The pack has nine such notes across seven patterns, and each one is labeled in the CSV with the reason it is there:

- **Leading tones** that pull into the root. A D# into E in [BP04 Sub Station](https://mizcausevic-dev.github.io/basement-protocol/#BP04) and [BP38 Monolith](https://mizcausevic-dev.github.io/basement-protocol/#BP38), and an E into F in BP40.
- **Tritones** used as tension. A C# against G that resolves down in [BP19 Sidechain Ghost](https://mizcausevic-dev.github.io/basement-protocol/#BP19), and an F# against C that is the hook in [BP48 Wrong Turn](https://mizcausevic-dev.github.io/basement-protocol/#BP48) and never resolves.
- **Passing tones** in BP26 and BP42 that step chromatically between two scale notes.
- **The Neapolitan flat second**, the Gb in BP40.

If you are learning bass programming, these are the nine notes worth studying. They are where the patterns stop sounding like a scale exercise.

## What was validated, and what was not

Claims about a pack are only as good as the checks behind them. So here is exactly what ran. The validator is `generator/validate.py`, using mido 1.3.3 on Python 3.12. It re-parses every file from disk and does not import the generator's note data.

| Check | Result |
| --- | --- |
| Exactly 50 MIDI files, IDs consistent across files and both CSVs | Pass |
| Every file parses | Pass, 50 of 50 |
| Tempo and 4/4 meta at tick 0, 480 PPQ, loop length of 1, 2, or 4 bars | Pass |
| End-of-track on the loop boundary, every note-on paired with a note-off | Pass |
| Pitches 24 to 64, velocities 1 to 127, positive durations, notes inside the loop | Pass, 700 notes |
| Monophonic, with overlaps only in legato-labeled patterns | Pass, 31 intentional overlaps |
| Both CSVs match the parsed MIDI exactly | Pass |
| Every out-of-scale note is labeled | Pass, 9 notes |
| No duplicate, transposed, re-velocitied, or re-tempoed patterns | Pass, 0 rhythm twins |
| All seven families and all three loop lengths present | Pass |
| Ghost notes are no longer than the pattern's typical note | Pass, 11 ghost notes |
| ZIP passes its CRC test and every member matches the validated file | Pass |

Then a second, independent parser runs: `@tonejs/midi` 2.0.28 on Node. It re-reads all 50 files and compares PPQ, tempo, time signature, end-of-track tick, and every note's pitch, start, duration, and velocity against the CSVs. It passed on all 700 notes.

The duplicate check is stricter than it sounds. It fingerprints each pattern four ways: exact notes, notes with key, velocity, and tempo stripped out, rhythm with durations, and onsets alone. No two patterns share an onset grid. The closest pair, BP13 and BP34, shares most of its onsets, but BP13 is a 172 BPM reese line of held eighths and BP34 is a clipped 135 BPM staccato pattern, so their rhythm-with-duration fingerprints differ. Once pitch is included, the most similar pair (BP08 and BP31) scores 0.50 against a failure threshold of 0.85.

The generator is also deterministic. Running it twice produces byte-identical MIDI files and CSVs, and each file's SHA-256 hash is listed in the manifest.

**What the checks cannot tell you:**

- Whether a groove *feels* good. That is a judgment, and the only automated feel check is the ghost-note proxy.
- How glide will behave on your synth. That depends on the instrument, not the file.
- How the files behave inside every commercial DAW. They were parsed with two libraries, not imported into Ableton Live, Bitwig, FL Studio, or Logic.
- Whether two patterns *sound* similar. The duplicate check compares sets of onsets and pitches, not perception.

## Hear the file, not a mockup

The live lab is a static site, but nothing in it is a pre-rendered demo. When you pick a pattern, the browser fetches the actual `.mid` file from the pack, parses it with @tonejs/midi, and plays those parsed notes. The piano roll, the note table, and the file facts panel all come from that same parse. If a file were wrong, the lab would show it wrong.

Playback uses a small Web Audio synth with one persistent voice, the way a monophonic hardware bass synth works. Two oscillators run into a waveshaper for drive, then a resonant low-pass filter, with a clean sine sub alongside. Glide only happens when the parsed file contains an overlap, and you can turn it off. A velocity switch flattens every note to one level, so you can hear that each groove still works on a patch that ignores velocity.

Timing uses a lookahead scheduler. A timer wakes every 25 milliseconds and schedules any notes falling in the next 150 milliseconds on the audio clock, so playback stays steady when the page is busy. Tempo changes wait for the next loop boundary, so the groove never stumbles mid-bar.

There are four preview patches (clean sub, acid saw, reese, and growl) and a set of synthesized reference drums with sidechain ducking. The drum pattern follows each pattern's style: four-on-the-floor, halftime, drum and bass, footwork, or broken.

Beyond the player there is a groove map that plots all 50 patterns by note density and syncopation, a radial mindmap of the collection, a live decoder that shows how BP44's step string becomes notes, and the validation report rendered straight from the JSON in the pack.

## Sound design stays out of the MIDI

Each pattern comes with a suggested sound in the index CSV, for example "single saw into a resonant 18 dB low-pass, accent boosts envelope" for BP44. Those suggestions are notes for you, not settings in the file. MIDI is the score. The patch is the sound, and it is yours to choose.

A few starting points that suit the families:

- **Sparse and sustained:** a sine or triangle sub, low-passed around 200 Hz, with gentle saturation and a short release so the rests stay silent.
- **Acid:** a saw or square into a resonant low-pass, with velocity mapped to filter-envelope depth and legato mode on.
- **Rolling drum and bass:** two saws detuned 10 to 20 cents, with a separate clean sine underneath.
- **Staccato and syncopated:** square plus saw with drive before the filter, a fast envelope, and low sustain.

## How to use the pack in your DAW

1. Download the ZIP from the lab or the GitHub repository and unzip it anywhere.
2. Set your project tempo to the pattern's BPM. It is listed in the index CSV and stored in the file's tempo meta.
3. Drag the `.mid` file onto a mono synth track. Each file is exactly 1, 2, or 4 bars long, so it loops cleanly.
4. If the pattern is labeled legato, turn on your synth's legato or portamento mode to hear the slides.
5. If the octave sounds wrong, check your DAW's note-name convention before transposing. The note numbers are correct.

## Frequently asked questions

**Can I use these basslines in commercial releases?**
Yes. The patterns are royalty-free for use in your own productions, released or not. You cannot resell or redistribute them as a standalone MIDI pack. The full terms are in `LICENSE-PATTERNS.md` in the repository, and the code is MIT licensed.

**Why does my DAW say the root is C3 when the CSV says C4?**
Your DAW uses a different octave-naming convention. The pack uses MIDI 60 = C4. Ableton Live shows MIDI 60 as C3, and FL Studio shows it as C5. The MIDI note number is the same in every case.

**Do I need a synth with glide?**
No. Forty-five of the 50 patterns contain no overlaps at all. The five legato patterns sound best with glide, but they still play correctly without it.

**What tempo are the patterns?**
Each file contains its own tempo, from 105 to 174 BPM. Most patterns sit between 120 and 140 BPM.

**Will these work with a 303 clone or a hardware sequencer?**
They are standard MIDI files, so anything that accepts MIDI can play them. Many 303-style instruments trigger slide from overlapping notes over MIDI, which is exactly what the five legato patterns contain. Check your instrument's manual to confirm how it handles legato input.

**Can I regenerate or modify the patterns?**
Yes. The generator uses only the Python standard library. Edit a step string, run `python3 generator/basement_protocol.py`, then run both validators to confirm nothing broke.

## What comes next

The most valuable next step is the one the validation report admits is missing: import tests inside Ableton Live, Bitwig, FL Studio, and Logic, with screenshots of each clip's length and note positions. After that, rendered audio previews for people who want to hear a pattern without a browser synth, and new families based on what people actually download.

The approach also travels well beyond bass. The same generator-plus-validator pattern works for drum grooves, chord progressions, or any content pack where the buyer needs proof that the files are correct before they commit to using them.

If you make something with these, I would like to hear it.

- **Audition all 50 patterns:** [mizcausevic-dev.github.io/basement-protocol](https://mizcausevic-dev.github.io/basement-protocol/)
- **Download the pack and the source:** [github.com/mizcausevic-dev/basement-protocol](https://github.com/mizcausevic-dev/basement-protocol)

---

*Built by Miz Causevic at [Kinetic Gain LLC](https://kineticgain.com). Illustrations in this article and on the site are AI-generated.*
