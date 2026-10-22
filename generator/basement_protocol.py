#!/usr/bin/env python3
"""Basement Protocol: 50 underground bassline MIDI patterns.

Composes every pattern from a step-sequencer notation, renders it to ticks,
writes Standard MIDI Files with a dependency-free encoder, and exports the
pattern index CSV, the note-event CSV, a JSON manifest for the web player,
and a ZIP pack.

Run:  python3 generator/basement_protocol.py
Then: python3 generator/validate.py
"""

from __future__ import annotations

import csv
import hashlib
import json
import shutil
import struct
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

PPQ = 480
SLIDE_OVERLAP_TICKS = 30  # 1/16 of a beat: long enough for glide-capable synths to detect legato
MIN_PITCH, MAX_PITCH = 24, 64  # C1..E4 in scientific pitch notation (MIDI 60 = C4)
PACK_NAME = "basement-protocol-50-bass-midi-Cursor"
SUFFIX = "-Cursor"

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "pack"

SCALES: dict[str, tuple[str, tuple[int, ...]]] = {
    "aeolian": ("Aeolian (natural minor)", (0, 2, 3, 5, 7, 8, 10)),
    "phrygian": ("Phrygian", (0, 1, 3, 5, 7, 8, 10)),
    "dorian": ("Dorian", (0, 2, 3, 5, 7, 9, 10)),
    "locrian": ("Locrian", (0, 1, 3, 5, 6, 8, 10)),
    "minor_pentatonic": ("Minor pentatonic", (0, 3, 5, 7, 10)),
}

SHARPS = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
FLATS = ("C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B")

FAMILIES = ("sparse", "rolling", "offbeat", "syncopated", "staccato", "sustained", "acid")

# Step characters: X accent, x normal, o ghost, S/s slide (accent/normal) into the next note,
# '-' holds the previous note one more step, '.' rest.
NOTE_CHARS = set("XxoSs")


def note_name(midi: int, spelling: str = "sharp") -> str:
    names = FLATS if spelling == "flat" else SHARPS
    return f"{names[midi % 12]}{midi // 12 - 1}"


@dataclass
class Pattern:
    pid: str
    name: str
    family: str
    bpm: int
    root: int
    scale: str
    bars: list[str]
    pitches: list[int]
    groove: str
    sound: str
    grid: int = 4
    gate: float = 0.85
    swing: int = 50
    spelling: str = "sharp"
    vel: tuple[int, int, int] = (122, 100, 76)  # accent, normal, ghost
    chromatic: dict[int, str] = field(default_factory=dict)  # interval class -> reason
    drums: str = "four"  # web-player drum template: four | halftime | dnb | footwork | broken
    tags: list[str] = field(default_factory=list)

    @property
    def loop_bars(self) -> int:
        return len(self.bars)

    @property
    def loop_ticks(self) -> int:
        return self.loop_bars * 4 * PPQ

    @property
    def legato(self) -> bool:
        return any(c in "Ss" for c in "".join(self.bars))

    @property
    def tonic(self) -> str:
        names = FLATS if self.spelling == "flat" else SHARPS
        return names[self.root % 12]

    @property
    def scale_label(self) -> str:
        return SCALES[self.scale][0]

    @property
    def slug(self) -> str:
        return "-".join("".join(ch for ch in w if ch.isalnum()) for w in self.name.lower().split())

    @property
    def filename(self) -> str:
        return f"{self.pid}_{self.slug}{SUFFIX}.mid"


@dataclass
class Note:
    start: int
    dur: int
    pitch: int
    vel: int
    slide: bool
    chromatic: str  # empty when the note is in the stated scale

    @property
    def end(self) -> int:
        return self.start + self.dur


def swing_warp(tick: int, swing: int) -> int:
    """Piecewise-linear time warp that delays every second 16th inside each 8th.

    Monotonic, so note order is preserved and swing can never create overlaps.
    """
    if swing == 50:
        return tick
    eighth = PPQ // 2
    sixteenth = PPQ // 4
    delay = round((swing - 50) / 100 * eighth)
    base, pos = divmod(tick, eighth)
    knee = sixteenth + delay
    if pos <= sixteenth:
        warped = pos * knee / sixteenth
    else:
        warped = knee + (pos - sixteenth) * (eighth - knee) / (eighth - sixteenth)
    return base * eighth + round(warped)


def render(p: Pattern) -> list[Note]:
    steps_per_bar = p.grid * 4
    for i, bar in enumerate(p.bars):
        if len(bar) != steps_per_bar:
            raise ValueError(f"{p.pid} bar {i + 1}: {len(bar)} steps, expected {steps_per_bar}")
    seq = "".join(p.bars)
    tps = PPQ // p.grid
    if PPQ % p.grid:
        raise ValueError(f"{p.pid}: grid {p.grid} does not divide PPQ {PPQ}")

    events: list[tuple[int, int, str]] = []  # (start_step, held_steps, char)
    i = 0
    while i < len(seq):
        ch = seq[i]
        if ch in NOTE_CHARS:
            held = 1
            while i + held < len(seq) and seq[i + held] == "-":
                held += 1
            events.append((i, held, ch))
            i += held
        elif ch in ".-":
            if ch == "-" and not events:
                raise ValueError(f"{p.pid}: hold before any note")
            i += 1
        else:
            raise ValueError(f"{p.pid}: unknown step char {ch!r}")

    if len(events) != len(p.pitches):
        raise ValueError(f"{p.pid}: {len(events)} notes but {len(p.pitches)} pitches")

    scale_pcs = set(SCALES[p.scale][1])
    accent, normal, ghost = p.vel
    gate_ticks = round(p.gate * tps)
    notes: list[Note] = []
    for idx, ((step, held, ch), interval) in enumerate(zip(events, p.pitches)):
        start = step * tps
        slide = ch in "Ss"
        if slide:
            if idx + 1 >= len(events):
                raise ValueError(f"{p.pid}: final note cannot slide across the loop boundary")
            end = events[idx + 1][0] * tps + SLIDE_OVERLAP_TICKS
        else:
            last_step_ticks = round(0.5 * tps) if ch == "o" and held == 1 else gate_ticks
            end = (step + held - 1) * tps + last_step_ticks
        start_w, end_w = swing_warp(start, p.swing), swing_warp(end, p.swing)
        pitch = p.root + interval
        ic = interval % 12
        chrom = ""
        if ic not in scale_pcs:
            if ic not in p.chromatic:
                raise ValueError(f"{p.pid}: {note_name(pitch)} is outside {p.scale} and undeclared")
            chrom = p.chromatic[ic]
        vel = accent if ch in "XS" else ghost if ch == "o" else normal
        notes.append(Note(start_w, end_w - start_w, pitch, vel, slide, chrom))
    return notes


# ---------------------------------------------------------------------------
# The collection. Intervals are semitones relative to `root` (a MIDI note).
# ---------------------------------------------------------------------------

P = Pattern
PATTERNS: list[Pattern] = [
    # ----- SPARSE: silence is the instrument --------------------------------
    P("BP01", "Concrete Breath", "sparse", 124, 33, "aeolian",
      ["X-----....x-....", "X---..o......x--"], [0, 7, 0, 0, -2],
      "Long root breath, a fifth answers on the and of 3, a low b7 pickup drops back into the loop.",
      "Clean sine sub with gentle tape saturation; dub-techno weight.", gate=0.9, tags=["dub techno"]),
    P("BP02", "Pressure Drop", "sparse", 140, 29, "phrygian",
      ["X------.......x-", "X----..x-.x---..", "X------.....x-x-", "X-----..o..x--x-"],
      [0, 1, 0, 12, 1, 0, 7, 8, 0, -2, 12, 1],
      "Halftime sub slabs that leave beat 3 to the snare; Phrygian b2 grinds against the root at every bar end.",
      "Pure sine sub layered with a band-passed square for phone-speaker translation.",
      gate=0.95, spelling="flat", drums="halftime", tags=["halftime", "deep dubstep"]),
    P("BP03", "Flick Switch", "sparse", 127, 38, "aeolian",
      ["X--o..........x."], [0, 0, 12],
      "Dotted hit plus a ghost flick, then nothing until an octave pickup on the last 16th.",
      "Round analog sub with a short click transient; minimal techno.", spelling="flat", tags=["minimal"]),
    P("BP04", "Sub Station", "sparse", 174, 28, "aeolian",
      ["X-----....x----.", "X-----....x----.", "X-----....x--x-.", "X-----....x--x--"],
      [0, 0, 8, 8, 0, 3, 5, -2, -2, -1],
      "Two-step DnB sub that follows the kick; bar 4 climbs D to D# to pull hard into E.",
      "Sine sub, mono below 120 Hz, light clipping for loudness.", gate=0.95, drums="dnb",
      chromatic={11: "D# leading tone (harmonic-minor lean) resolving up into the E root"}, tags=["dnb"]),
    P("BP05", "Empty Room", "sparse", 118, 35, "locrian",
      ["X---............", "...X---.........", "......X---......", ".........X--.x-."],
      [0, 0, 0, 6, 1],
      "One hit per bar, displaced a dotted 8th later every bar; the Locrian b5 cracks the cycle on bar 4.",
      "Dark triangle sub with a slow low-pass sweep; warehouse intro tension.", gate=0.9, tags=["displacement"]),
    P("BP06", "Ghost Signal", "sparse", 130, 31, "phrygian",
      ["..x....o.....X-."], [0, 1, 0],
      "Three hits that dodge every kick: the and of 1, a b2 ghost on the a of 2, a held root on the e of 4.",
      "Muted FM sub with a pitch blip on attack; hypnotic, minimal.", gate=0.6, spelling="flat"),
    P("BP07", "Grime Pulse", "sparse", 140, 37, "aeolian",
      ["X.....x.X-....x-", "X.....x.X--...x."], [0, 12, 0, 10, 0, 12, 3, 2],
      "Square-wave grime riff: root, octave flick, root, b7, then a b3 to 2 descent that hangs on the edge.",
      "Hollow square wave, no filter envelope, slight pitch drop on attack; eskibeat menace.",
      gate=0.8, drums="halftime", tags=["grime"]),

    # ----- ROLLING: forward motion that never lets go ----------------------
    P("BP08", "Gallop Protocol", "rolling", 145, 30, "phrygian",
      [".xxX.xxX.xxX.xxX", ".xxX.xxX.xxX.xXx"],
      [0] * 12 + [0] * 9 + [1, 3, 1],
      "Gallop 16ths on 2-3-4 of every beat, kick owns the downbeat; bar 2 flips into a G to A Phrygian turn.",
      "Tight saw through a 24 dB low-pass, short decay, heavy sidechain; psy-techno gallop.",
      gate=0.85, tags=["psy", "gallop"]),
    P("BP09", "Iron Lung", "rolling", 136, 36, "aeolian",
      ["..xX..xX..xX..xX"], [0, 0, 0, 0, 0, 0, -2, 3],
      "Rumble pairs on the and and the a of every beat, touching end to end; beat 4 lifts Bb to Eb.",
      "Distorted sine fed through reverb then a low-pass: classic rumble character.",
      gate=1.0, spelling="flat", tags=["rumble", "hard techno"]),
    P("BP10", "Downtown Drift", "rolling", 124, 38, "dorian",
      ["..xx.xXx..xx.xX.", "..xx.xXx..xX.x-x"],
      [0, 0, 0, 12, 0, 0, 0, 9, 7, 0, 0, 0, 12, 0, 0, 3, 5, -2],
      "Walking tech-house roll with a Dorian major sixth (B) that brightens the dark root before a C pickup.",
      "Warm Moog-style ladder filter, moderate resonance, rounded attack.", gate=0.9, tags=["tech house"]),
    P("BP11", "Marrow", "rolling", 128, 33, "phrygian",
      ["XxxXxxXxxXxxXxxx"] * 4,
      [12, 0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 0, 0] * 2
      + [12, 0, 0, 12, 0, 0, 13, 1, 1, 13, 1, 1, 12, 0, 0, 0]
      + [12, 0, 0, 12, 0, 0, 12, 0, 0, 10, -2, -2, 7, 0, 0, 0],
      "Unbroken 16ths with octave accents grouped 3-3-3-3-4; bar 3 shifts up a Phrygian half step, bar 4 falls.",
      "Saw plus sub, filter tracking velocity so the 3-3-3-3-4 accents bloom.",
      gate=0.75, tags=["polymeter", "hypnotic"]),
    P("BP12", "Tunnel Vision", "rolling", 130, 40, "phrygian",
      [".xx.xx.xx.xx", ".xx.xx.xX.Xx"], [0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 1, 3, 5, 1],
      "8th-note-triplet roll that skips every beat, so the line tumbles against a straight kick.",
      "Plucky square-saw blend, short decay, chorus off; shuffled warehouse roll.",
      grid=3, gate=0.85, tags=["triplet"]),
    P("BP13", "Reese Rail", "rolling", 172, 38, "aeolian",
      ["x-x-x-x-x-x-x-x-", "x-x-x-x-x-x-x---"], [0, 0, 0, 0, 0, 0, 5, 3, 0, 0, 0, 0, -2, -4, -5],
      "Continuous DnB 8ths that touch end to end, then a stepwise C-Bb-A descent sinks the second bar.",
      "Two detuned saws (8 to 15 cents) over a clean sine sub: classic Reese.",
      gate=1.0, spelling="flat", drums="dnb", tags=["dnb", "reese"]),
    P("BP14", "Rolling Stock", "rolling", 133, 34, "aeolian",
      ["xxx.xxx.xxx.xxx.", "xxx.xxx.xxx.xxx."],
      [0, 12, 7, 0, 12, 7, 0, 12, 10, 0, 12, 7, -4, 8, 3, -4, 8, 3, -2, 10, 5, -2, 10, 7],
      "Root-octave-fifth arpeggio cells on the first three 16ths of each beat; bar 2 shifts to Gb and Ab.",
      "Digital saw with fast filter envelope and stereo-safe mono low end; melodic techno.",
      gate=0.8, spelling="flat", tags=["melodic techno", "arp"]),
    P("BP15", "Undertow", "rolling", 126, 41, "aeolian",
      ["x..x..x..x..x..x..x..xxx", "x..x..x..x..x..xxxx..xxx"],
      [0, 0, 12, 0, 0, 0, 12, 0, 3, 5, 0, 0, 12, 0, 0, 0, 3, 5, 7, 8, 7, 3],
      "Straight 8ths interrupted by 16th-triplet rolls that drag the line into each bar like an undertow.",
      "Rubbery FM bass with short pitch envelope, filter half open.",
      grid=6, gate=0.85, spelling="flat", tags=["triplet roll"]),

    # ----- OFFBEAT: the and is the anchor ------------------------------------
    P("BP16", "Hiccup", "offbeat", 126, 32, "aeolian",
      [".oX..oX..oX..oX-"], [12, 0, 12, 0, 12, 0, 10, 0],
      "A ghost octave on every e hiccups into the offbeat root; the last one ducks to F# first.",
      "Punchy saw-square with short decay; sidechained house offbeat.", gate=0.8),
    P("BP17", "Trance Engine", "offbeat", 138, 35, "aeolian",
      ["..x...x...x...x."] * 4, [0] * 4 + [-4] * 4 + [-2] * 4 + [5, 5, 7, 7],
      "Pure offbeat 8ths carrying a four-bar i-VI-VII-iv-v progression: the harmonic motor of a big room.",
      "Supersaw-adjacent mono saw, filter mostly open, sidechain pumping hard.", gate=0.7),
    P("BP18", "Niche Bounce", "offbeat", 138, 40, "aeolian",
      ["..X..oX...X..oX.", "..X..oX...X.X.XX"], [0, 12, 0, 0, 12, 7, 0, 12, 0, 3, 5, 7, 10],
      "Swung bassline-house offbeats with octave ghosts on beats 2 and 4; bar 2 runs G-A-B-D into the loop.",
      "Organ-like square stack with a wobbling low-pass; UK bassline.",
      gate=0.6, swing=58, drums="broken", tags=["bassline", "uk garage"]),
    P("BP19", "Sidechain Ghost", "offbeat", 132, 31, "aeolian",
      ["..X-..x-..X-..x-", "..X-..x-..X-.xX-"], [0, 0, 0, 0, 0, 12, 6, 5, 0],
      "Offbeats that hold until the next kick; bar 2 drops a tritone C# that resolves down to C.",
      "Sine plus saturated triangle, heavy kick ducking so the hold breathes.",
      gate=1.0, spelling="sharp",
      chromatic={6: "C# tritone (b5) as a deliberate dissonance resolving down to C"}),
    P("BP20", "Lean Back", "offbeat", 122, 36, "dorian",
      ["...X...x...X..xX"], [0, 7, 12, 9, 0],
      "Every hit lands on the a, a 16th early, so the bass leans into each beat instead of sitting on it.",
      "Soft-knee saw with low resonance; late-night deep tech.", gate=0.75, spelling="flat"),
    P("BP21", "Double Offbeat", "offbeat", 128, 37, "phrygian",
      ["..x...xx..x...xx", "..x...xx..x..xxx"], [0, 0, 12, 0, 0, 1, 0, 0, 12, 0, 3, 1, -2],
      "Single offbeats on beats 1 and 3, doubled and-a pairs on 2 and 4; the Phrygian D grinds the turn.",
      "Mid-forward square with drive; peak-time warehouse.", gate=0.7),
    P("BP22", "Offbeat Halo", "offbeat", 121, 42, "dorian",
      ["..X--.x--.X--.x-", "..X--.x--.X--x--", "..X--.x--.X--.x-", "..X--.x--.X-x-x-"],
      [0, 7, 9, 7, 0, 7, 10, 12, 0, 7, 9, 7, -2, 5, 3, 2, -5],
      "Offbeats sustained across the kick, outlining Dorian chord tones; bar 4 descends to resolve.",
      "Rounded saw with slow attack and chorus kept above 200 Hz; dub-house halo.", gate=1.0),

    # ----- SYNCOPATED: weight in unexpected places --------------------------
    P("BP23", "Tresillo Grind", "syncopated", 125, 39, "phrygian",
      ["X--x--x-X--x--x-", "X--x--x-X--x-x-x"], [0, 0, 1, 0, 0, 12, 0, 0, 1, 0, 3, 1, -2],
      "3-3-2 tresillo cells per half bar; the Phrygian E half step grinds against D# every cycle.",
      "Gritty square through a wave-folder, low-pass at 800 Hz; afro-tech tension."),
    P("BP24", "Electro Circuit", "syncopated", 128, 31, "minor_pentatonic",
      ["X..x...xX.x..x..", "X..x...xX.x.x.x."], [0, 12, 10, 0, 12, 3, 0, 12, 10, 0, 3, 5, 7],
      "Detroit-electro octave funk on a minor pentatonic: dotted pushes and a rising answer in bar 2.",
      "808-style sine bass with long decay, or a 101-style square with fast envelope.",
      gate=0.8, spelling="flat", drums="broken", tags=["electro"]),
    P("BP25", "Dotted Horizon", "syncopated", 132, 33, "aeolian",
      ["X---..x---..X---", "..x---..X---..x-"], [0, 7, 12, 0, 7, 10],
      "Dotted-quarter hits every six 16ths; the cycle closes early on a b7, creating a two-bar horizon.",
      "Long-decay sine sub with tight saturation; hypnotic techno.", gate=0.9),
    P("BP26", "Broken Stairs", "syncopated", 132, 35, "aeolian",
      ["X..x..x.x.x..x..", "X.x..x..x.x..X.x"], [0, 0, 12, 0, 10, 7, 0, 0, 12, 0, 7, 6, 5],
      "Swung breakbeat bass; bar 2 walks down F#, F, E chromatically into the loop.",
      "Mid-heavy saw with distortion pre-filter; UK bass and breaks.",
      gate=0.8, swing=54, drums="broken",
      chromatic={6: "F natural as a chromatic passing tone between F# and E"}),
    P("BP27", "Footwork Fracture", "syncopated", 160, 32, "phrygian",
      ["X-xX--x--X--", "X--x-x--X-x-"], [0, 0, 12, 0, -2, 0, 3, 1, 7, -2],
      "Triplet-grid 808 hits that fracture against straight hats; constant cut-offs drive the 160 BPM rush.",
      "808 sine with long decay and pitch drop, hard-clipped; footwork and juke.",
      grid=3, gate=0.95, drums="footwork", tags=["footwork"]),
    P("BP28", "Jungle Pressure", "syncopated", 170, 31, "aeolian",
      ["X-----x-..X---..", "X-----x-..x-x-x-"], [0, 12, -2, 0, 12, 3, 2, 0],
      "Long sub, octave stab, then a delayed hit on the and of 3; bar 2 breaks into a Bb-A-G stepdown.",
      "Pure sine sub with a slight pitch envelope; ragga-jungle pressure.",
      gate=0.95, spelling="flat", drums="dnb", tags=["jungle"]),
    P("BP29", "Clave Dread", "syncopated", 122, 34, "phrygian",
      ["X--x--x---x-x---"], [0, 0, 1, 0, 12],
      "Son clave 3-2 compressed into one bar; the third hit lands on the Phrygian b2 for dread.",
      "Dry percussive sine with a bandpassed click on top; tribal techno.", gate=0.9, spelling="flat"),
    P("BP30", "Pentameter", "syncopated", 129, 30, "aeolian",
      ["X--..x--..x--..x", "--..x--..x--..x-", "-..x--..x--..x--", "..x--..x--..X--."],
      [0, 10, 7, 0, 10, 7, 0, 10, 7, 0, 10, 7, 0],
      "Hits every five 16ths with a three-note pitch cycle, so rhythm and melody realign only at the loop.",
      "Low-passed saw-sine blend, medium release; long-form hypnotic.", gate=0.9, tags=["polymeter"]),

    # ----- STACCATO: short, clipped, percussive ------------------------------
    P("BP31", "Body Machine", "staccato", 118, 33, "aeolian",
      ["XxxxXxxxXxxxX.xx"], [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 3, 5, 7],
      "Machine-gun EBM 16ths with an octave on every and; one dropped 16th on beat 4 kicks off a C-D-E climb.",
      "Analog square with very fast decay and drive; EBM and industrial.", gate=0.4, tags=["ebm"]),
    P("BP32", "Stutter Code", "staccato", 126, 36, "aeolian",
      ["X---....x-x-....X---....xxxx...."], [0, 12, 10, 0, 7, 7, 10, 12],
      "32nd-grid stutters: 8th hits, a 16th octave pair, then a four-step ratchet climbing into beat 4.",
      "Clipped saw with sample-and-hold filter movement; glitchy techno.",
      grid=8, gate=0.5, spelling="flat", tags=["ratchet"]),
    P("BP33", "Morse Floor", "staccato", 130, 35, "phrygian",
      ["X.x..x.x..x.x...", "X.x..x.x..x.xxx."], [0, 0, 1, 0, 12, 0, 0, 0, 1, 0, 12, 1, 3, 5],
      "Dot-dash staccato code with a Phrygian C sting; bar 2 ends on a rapid three-note climb.",
      "Very short square plucks, resonance moderate; minimal stripped-back floor.", gate=0.3),
    P("BP34", "Pistons", "staccato", 135, 32, "phrygian",
      ["X.x.X.x.X.x.X.x.", "X.x.X.x.X.x.X.x."],
      [0, 12, 0, 12, 0, 12, 0, 12, 1, 13, 1, 13, 0, 12, -2, 10],
      "Industrial 8ths alternating root and octave like pistons; bar 2 shifts the whole engine up a half step.",
      "Distorted square into a bitcrusher, short gate; industrial techno.", gate=0.35, tags=["industrial"]),
    P("BP35", "Clipped Wings", "staccato", 125, 31, "dorian",
      [".X.x..x..x.X..x.", ".X.x..x..x.X.xx."], [0, 0, 12, 0, 9, 7, 0, 0, 12, 0, 9, 10, 12],
      "Funky clipped 16ths off the beat; the Dorian E gives the dark groove a lift.",
      "Plucky saw with envelope-driven filter, short release; groovy tech.", gate=0.35),
    P("BP36", "Needle Drop", "staccato", 140, 30, "aeolian",
      ["X...x.x..x...xx."], [0, 19, 12, 24, 0, 12],
      "Wide leaps: low root, then needle-short stabs an octave-plus-fifth and two octaves up.",
      "Aggressive midrange FM with feedback, very short decay; peak-time menace.", gate=0.3),
    P("BP37", "Chicago Jack", "staccato", 124, 41, "aeolian",
      ["x.xx.xx.x.xx.xx."], [0, 0, 12, 0, 0, 12, 0, 0, -2, 3],
      "Swung jacking 16ths: pairs of short hits with octave jumps, the original warehouse body language.",
      "Short 101-style square with a little portamento off; raw Chicago.",
      gate=0.4, swing=56, spelling="flat", tags=["chicago"]),

    # ----- SUSTAINED: long tones, slow motion -------------------------------
    P("BP38", "Monolith", "sustained", 120, 28, "aeolian",
      ["X---------------", "x-------x-------", "X---------------", "X-----------x---"],
      [0, 8, 7, 0, 0, -1],
      "Four-bar pedal: E, then C and B, back to E, finally a D# leading tone that reopens the cycle.",
      "Sine sub plus a quiet saw an octave up, slow filter LFO; drone techno.", gate=1.0,
      chromatic={11: "D# leading tone resolving to E at the loop seam"}, tags=["drone"]),
    P("BP39", "Fog Machine", "sustained", 120, 38, "dorian",
      ["X------.X------.", "X------.X--.X--."], [0, -2, 0, 5, 9],
      "Half-bar holds with a breath before each, closing on the bright Dorian B before the loop.",
      "Detuned triangle pad-bass, slow attack; dub techno fog.", gate=1.0, tags=["dub techno"]),
    P("BP40", "Reese Cathedral", "sustained", 174, 29, "aeolian",
      ["S---------------", "S---------------", "S-------S-------", "S-----------x---"],
      [0, -4, -2, 1, 0, -1],
      "LEGATO. Whole-note Reese tones that overlap into each other for glide: F, Db, Eb, Gb, F, E.",
      "Two detuned saws with slow phase drift over a sine sub; set portamento on legato only.",
      gate=1.0, spelling="flat", drums="dnb", vel=(110, 100, 76),
      chromatic={1: "Gb (b2) Neapolitan color for dread", 11: "E leading tone resolving to F"},
      tags=["dnb", "reese", "legato"]),
    P("BP41", "Tidal Lock", "sustained", 122, 36, "aeolian",
      ["X-----------x---", "----------x-----"], [0, 3, -2],
      "Long tones that start on the a and cross the barline, so harmony shifts against the downbeat.",
      "Warm low-passed saw, long release, no sidechain; deep and hypnotic.", gate=1.0, spelling="flat"),
    P("BP42", "Cinder Drone", "sustained", 105, 35, "aeolian",
      ["X-------x-------", "x-------x-------", "X-------x-------", "x---x---x---x---"],
      [0, 12, 10, 7, 0, 12, 3, 5, 6, 7],
      "Slow half notes swapping octaves, then a chromatic D-E-F-F# climb back to B.",
      "Dark-disco saw with chorus and slow filter, 105 BPM EBM-wave.", gate=0.97,
      chromatic={6: "F natural chromatic passing tone between E and F#"}, tags=["darkwave"]),
    P("BP43", "Long Shadow", "sustained", 126, 31, "phrygian",
      ["..X-------------", "..X-------..x---", "..X-------------", "..X-----..x-x---"],
      [0, 0, 1, 0, 0, -2, -4],
      "Each bar starts late on the and and sustains, leaving the downbeat to the kick; Phrygian Ab shadows.",
      "Saturated sine with long release and gentle kick ducking.", gate=1.0, spelling="flat"),

    # ----- ACID: accents, slides, octave jumps -------------------------------
    P("BP44", "Acid Rain", "acid", 130, 33, "phrygian",
      ["XxsxX.xsxX.xsXxx"], [0, 0, 12, 10, 0, 12, 1, 0, 13, 0, 7, 12, 0, 3],
      "LEGATO. Classic one-bar acid line: accented roots, slides into the octave and Phrygian Bb.",
      "Single saw into a resonant 18 dB low-pass, accent boosts envelope; glide on legato only.",
      gate=0.5, vel=(127, 96, 76), tags=["acid", "legato"]),
    P("BP45", "Squelch Theory", "acid", 136, 40, "aeolian",
      ["X.xX.xx.X.xX.x.x", "X.xX.xx.XxxX.xXx"],
      [0, -12, 0, 12, 0, 0, 7, 0, 3, 5, 0, -12, 0, 12, 0, 0, -12, 0, 10, 0, 12, 7],
      "Accent-driven acid without slides: two-octave drops and stabs make the filter do the talking.",
      "Square wave, high resonance, cutoff low, accent pushing envelope; hard acid.",
      gate=0.5, vel=(127, 92, 76)),
    P("BP46", "Resonance Riot", "acid", 140, 38, "phrygian",
      ["X.sxX.xsxX..sxXx", "X.sxX.xsx.Xx.sxx"],
      [0, 12, 13, 0, 12, 15, 13, 0, 7, 8, 0, 12, 0, 12, 10, 0, 12, 15, 17, 0, 3, 5, 1, 0],
      "LEGATO. Two-bar acid riot with slides up to Eb and F; bar 2 reaches G3 before diving to the root.",
      "Saw with self-oscillating resonance and drive after the filter; glide on legato only.",
      gate=0.5, vel=(127, 96, 76), tags=["acid", "legato"]),
    P("BP47", "Rubber Sun", "acid", 125, 43, "dorian",
      ["X.xsx.Xx.xsxX.x.", "X.xsx.Xx.xsxX.x.", "X.xsx.Xx.xsxX.x.", "X.xsx.Xx.sxsxXxx"],
      [0, 0, 12, 10, 0, 12, 0, 7, 5, 0, 12,
       0, 0, 12, 10, 0, 12, 0, 9, 10, 0, 12,
       0, 0, 15, 14, 0, 12, 0, 7, 5, 0, 12,
       0, 0, 12, 10, 0, 12, 7, 5, 3, 2, 0, -2, -5],
      "LEGATO. Four-bar acid house phrase: same rhythm, evolving slides; bar 4 cascades down to D.",
      "Square with medium resonance and slow cutoff automation across the four bars.",
      gate=0.5, vel=(127, 96, 76), tags=["acid house", "legato"]),
    P("BP48", "Wrong Turn", "acid", 132, 36, "aeolian",
      ["XxX.xX.xXx.xX.xx"], [0, 12, 0, 6, 0, 12, 0, 7, 6, 0, 12, 3],
      "Acid stabs built around a tritone F# that refuses to resolve; the wrong note is the hook.",
      "Distorted saw, resonance high, short decay; unsettling peak-time acid.",
      gate=0.5, vel=(127, 92, 76), spelling="sharp",
      chromatic={6: "F# tritone (b5) used as the hook, deliberately unresolved"}),
    P("BP49", "Acid Spiral", "acid", 138, 41, "phrygian",
      ["XsxXsxXsxXsx.XXx", "XsxXsxXsx.XsxXxx"],
      [0, 12, 13, 0, 12, 15, 0, 12, 17, 0, 12, 19, 0, 12, 0,
       0, 12, 10, 0, 12, 8, 0, 7, 5, 0, 12, 10, 0, 12, 0],
      "LEGATO. Slide cells spiral up F-Gb-Ab-Bb-C, then bar 2 unwinds back down through Eb and Db.",
      "Saw with resonance near self-oscillation and a delay throw on accents; glide on legato only.",
      gate=0.5, spelling="flat", vel=(127, 96, 76), tags=["acid", "legato"]),
    P("BP50", "Last Call", "acid", 128, 45, "aeolian",
      ["..X...x...X...x.", "..X.x.x...X.x.x.", "..X.xxx...X.xxx.", "XxXxXxXxXxXxXxXx"],
      [0, 12, 0, 12,
       0, 7, 12, 0, 7, 12,
       0, 7, 10, 12, 0, 7, 10, 12,
       0, 0, 3, 3, 5, 5, 7, 7, 8, 8, 10, 10, 12, 12, 14, 15],
      "Four-bar density build: offbeat acid stabs fill in until bar 4 runs a full 16th scale riser into the drop.",
      "Acid saw with cutoff automated open across the build; drop it on the downbeat after bar 4.",
      gate=0.5, vel=(127, 96, 76), tags=["build", "riser"]),
]


# ---------------------------------------------------------------------------
# Standard MIDI File writer (format 0, one track, 480 PPQ)
# ---------------------------------------------------------------------------

def vlq(value: int) -> bytes:
    if value < 0:
        raise ValueError("negative delta")
    out = [value & 0x7F]
    value >>= 7
    while value:
        out.append((value & 0x7F) | 0x80)
        value >>= 7
    return bytes(reversed(out))


def meta(kind: int, data: bytes) -> bytes:
    return bytes([0xFF, kind]) + vlq(len(data)) + data


def build_smf(p: Pattern, notes: list[Note]) -> bytes:
    tempo_us = round(60_000_000 / p.bpm)
    head: list[tuple[int, int, bytes]] = [
        (0, 0, meta(0x03, f"{p.pid} {p.name}".encode("ascii"))),
        (0, 0, meta(0x01, f"{p.tonic} {p.scale_label} | {p.bpm} BPM | {p.loop_bars} bar loop".encode("ascii"))),
        (0, 0, meta(0x58, bytes([4, 2, 24, 8]))),
        (0, 0, meta(0x51, tempo_us.to_bytes(3, "big"))),
    ]
    # Sort key: tick, then note-offs (0) before note-ons (1) so repeated pitches never collide.
    body: list[tuple[int, int, bytes]] = []
    for n in notes:
        body.append((n.start, 1, bytes([0x90, n.pitch, n.vel])))
        body.append((n.end, 0, bytes([0x80, n.pitch, 0])))
    body.sort(key=lambda e: (e[0], e[1]))
    events = head + body
    track = bytearray()
    last = 0
    for tick, _, data in events:
        track += vlq(tick - last) + data
        last = tick
    if last > p.loop_ticks:
        raise ValueError(f"{p.pid}: event past loop boundary")
    track += vlq(p.loop_ticks - last) + meta(0x2F, b"")
    header = b"MThd" + struct.pack(">IHHH", 6, 0, 1, PPQ)
    return header + b"MTrk" + struct.pack(">I", len(track)) + bytes(track)


# ---------------------------------------------------------------------------
# Analysis used by the index and the web player
# ---------------------------------------------------------------------------

def fmt_beats(ticks: int) -> str:
    return f"{ticks / PPQ:.6f}".rstrip("0").rstrip(".") or "0"


def syncopation_index(p: Pattern, notes: list[Note]) -> float:
    """Share of onsets that avoid the quarter-note grid, weighted by how far off-grid they sit."""
    weights = []
    for n in notes:
        pos = n.start % PPQ
        if pos == 0:
            weights.append(0.0)
        elif pos % (PPQ // 2) == 0:
            weights.append(0.6)
        else:
            weights.append(1.0)
    return round(sum(weights) / len(weights), 3)


def manifest_entry(p: Pattern, notes: list[Note]) -> dict:
    pitches = [n.pitch for n in notes]
    lo, hi = min(pitches), max(pitches)
    chrom = sorted({(n.pitch % 12, n.chromatic) for n in notes if n.chromatic})
    return {
        "id": p.pid,
        "name": p.name,
        "family": p.family,
        "bpm": p.bpm,
        "tonic": p.tonic,
        "scale": p.scale_label,
        "key": f"{p.tonic} {p.scale_label}",
        "root_midi": p.root,
        "spelling": p.spelling,
        "bars": p.loop_bars,
        "loop_beats": p.loop_bars * 4,
        "grid": {4: "16th", 3: "8th triplet", 6: "16th triplet", 8: "32nd"}[p.grid],
        "swing": p.swing,
        "legato": p.legato,
        "groove": p.groove,
        "sound": p.sound,
        "drums": p.drums,
        "tags": p.tags,
        "file": p.filename,
        "note_count": len(notes),
        "notes_per_bar": round(len(notes) / p.loop_bars, 2),
        "syncopation": syncopation_index(p, notes),
        "range": f"{note_name(lo, p.spelling)}-{note_name(hi, p.spelling)} (MIDI {lo}-{hi})",
        "chromatic": [reason for _, reason in chrom],
    }


def write_outputs() -> dict:
    if OUT.exists():
        shutil.rmtree(OUT)
    midi_dir = OUT / "midi"
    midi_dir.mkdir(parents=True)

    ids = [p.pid for p in PATTERNS]
    if len(PATTERNS) != 50 or len(set(ids)) != 50:
        raise SystemExit(f"expected 50 unique patterns, found {len(PATTERNS)} / {len(set(ids))}")
    for p in PATTERNS:
        if p.family not in FAMILIES:
            raise SystemExit(f"{p.pid}: unknown family {p.family}")
        if p.loop_bars not in (1, 2, 4):
            raise SystemExit(f"{p.pid}: loop length must be 1, 2 or 4 bars")

    manifest = []
    index_rows = []
    event_rows = []
    for p in PATTERNS:
        notes = render(p)
        for n in notes:
            if not MIN_PITCH <= n.pitch <= MAX_PITCH:
                raise SystemExit(f"{p.pid}: pitch {n.pitch} outside bass range")
        data = build_smf(p, notes)
        (midi_dir / p.filename).write_bytes(data)
        entry = manifest_entry(p, notes)
        entry["sha256"] = hashlib.sha256(data).hexdigest()
        manifest.append(entry)
        index_rows.append({
            "pattern_id": p.pid,
            "pattern_name": p.name,
            "midi_filename": f"midi/{p.filename}",
            "bpm": p.bpm,
            "tonal_center_and_scale": f"{p.tonic} {p.scale_label}",
            "tonal_center": p.tonic,
            "scale": p.scale_label,
            "loop_bars": p.loop_bars,
            "loop_beats": p.loop_bars * 4,
            "groove_family": p.family,
            "groove_description": p.groove,
            "suggested_sound_character": p.sound,
            "intentional_legato_overlaps": "yes" if p.legato else "no",
            "grid": entry["grid"],
            "swing_percent": p.swing,
            "note_count": len(notes),
            "pitch_range": entry["range"],
            "chromatic_departures": "; ".join(entry["chromatic"]) or "none",
        })
        for i, n in enumerate(notes):
            nxt = notes[i + 1] if i + 1 < len(notes) else None
            overlap = max(0, n.end - nxt.start) if nxt else 0
            event_rows.append({
                "pattern_id": p.pid,
                "midi_note": n.pitch,
                "note_name": note_name(n.pitch, p.spelling),
                "start_beat": fmt_beats(n.start),
                "duration_beats": fmt_beats(n.dur),
                "velocity": n.vel,
                "start_tick": n.start,
                "duration_ticks": n.dur,
                "end_beat": fmt_beats(n.end),
                "in_scale": "no" if n.chromatic else "yes",
                "chromatic_note": n.chromatic,
                "legato_overlap_beats": fmt_beats(overlap) if overlap else "0",
            })

    index_path = OUT / f"pattern-index{SUFFIX}.csv"
    events_path = OUT / f"note-events{SUFFIX}.csv"
    for path, rows in ((index_path, index_rows), (events_path, event_rows)):
        with path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    readme = OUT / f"PACK-README{SUFFIX}.txt"
    readme.write_text(PACK_README, encoding="utf-8")

    meta_doc = {
        "collection": "Basement Protocol",
        "ppq": PPQ,
        "note_naming": "Scientific pitch notation: MIDI 60 = C4, A4 = MIDI 69 = 440 Hz.",
        "slide_overlap_ticks": SLIDE_OVERLAP_TICKS,
        "pitch_bounds": [MIN_PITCH, MAX_PITCH],
        "families": list(FAMILIES),
        "patterns": manifest,
    }
    (OUT / f"manifest{SUFFIX}.json").write_text(json.dumps(meta_doc, indent=2), encoding="utf-8")

    zip_path = OUT / f"{PACK_NAME}.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for p in PATTERNS:
            zf.write(midi_dir / p.filename, f"{PACK_NAME}/midi/{p.filename}")
        for path in (index_path, events_path, readme):
            zf.write(path, f"{PACK_NAME}/{path.name}")
    return meta_doc


PACK_README = """BASEMENT PROTOCOL: 50 underground bassline MIDI patterns
=========================================================

Contents
  midi/BPxx_<name>-Cursor.mid   50 Standard MIDI Files (format 0, 480 PPQ, MIDI channel 1)
  pattern-index-Cursor.csv      one row per pattern: tempo, key, loop length, groove, sound, legato flag
  note-events-Cursor.csv        every note event: MIDI note, name, start beat, duration, velocity, ticks

Conventions
  - Positions and durations are in quarter-note beats, zero-based (the first beat starts at 0).
  - Every file carries tempo and 4/4 time-signature meta events at tick 0 and ends its track
    exactly at the loop boundary (1 bar = 1920 ticks, 2 bars = 3840, 4 bars = 7680).
  - Note names use scientific pitch notation: MIDI 60 = C4. Some DAWs label MIDI 60 as C3
    (for example Ableton Live) or C5 (FL Studio). MIDI note numbers are authoritative.
  - Patterns are monophonic. Only patterns flagged intentional_legato_overlaps = yes contain
    overlaps (30 ticks, 1/16 beat). Overlaps do not create glide by themselves: enable
    legato/portamento on the receiving synth (for example 303-style slide or "legato" glide mode).
  - Chromatic notes outside the stated scale are deliberate and listed in both CSVs.
  - Velocity: accents 122 to 127, normal 92 to 100, ghosts 76 and shortened. The grooves still
    read on a velocity-insensitive patch because ghosts are also shorter than normal notes.

MIDI carries pitch, timing, and velocity only. Sub weight, distortion, and growl come from the
synth and processing you choose. The sound-character column is a starting suggestion.
"""


if __name__ == "__main__":
    doc = write_outputs()
    total = sum(p["note_count"] for p in doc["patterns"])
    print(f"wrote {len(doc['patterns'])} MIDI files, {total} note events -> {OUT}")
