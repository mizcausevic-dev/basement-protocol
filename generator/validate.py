#!/usr/bin/env python3
"""Independent validation of the Basement Protocol pack.

Parses every MIDI file with mido (a third-party parser, not the generator's writer)
and checks the files against both CSVs and the ZIP. Writes
pack/validation-report-Cursor.json and exits non-zero on any failure.
"""

from __future__ import annotations

import csv
import hashlib
import itertools
import json
import platform
import sys
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import mido
from importlib.metadata import version as pkg_version

MIDO_VERSION = pkg_version("mido")

PACK = Path(__file__).resolve().parent.parent / "pack"
PPQ = 480
PITCH_MIN, PITCH_MAX = 24, 64
MAX_LEGATO_OVERLAP = 60
NEAR_DUPLICATE_THRESHOLD = 0.85

SCALES = {
    "Aeolian (natural minor)": {0, 2, 3, 5, 7, 8, 10},
    "Phrygian": {0, 1, 3, 5, 7, 8, 10},
    "Dorian": {0, 2, 3, 5, 7, 9, 10},
    "Locrian": {0, 1, 3, 5, 6, 8, 10},
    "Minor pentatonic": {0, 3, 5, 7, 10},
}
PC = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
      "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
FAMILIES = {"sparse", "rolling", "offbeat", "syncopated", "staccato", "sustained", "acid"}


def name_to_midi(name: str) -> int:
    letter = name[:-1] if not name[-2].isdigit() and name[-2] != "-" else name[:-2]
    octave = int(name[len(letter):])
    return PC[letter] + (octave + 1) * 12


class Report:
    def __init__(self) -> None:
        self.checks: list[dict] = []

    def add(self, cid: str, name: str, problems: list[str], detail: str) -> None:
        self.checks.append({
            "id": cid,
            "name": name,
            "status": "fail" if problems else "pass",
            "detail": detail,
            "problems": problems[:25],
            "problem_count": len(problems),
        })

    @property
    def failed(self) -> list[dict]:
        return [c for c in self.checks if c["status"] == "fail"]


def parse_midi(path: Path) -> dict:
    mf = mido.MidiFile(str(path))  # raises on malformed chunks or data bytes
    out = {"type": mf.type, "ticks_per_beat": mf.ticks_per_beat, "tracks": len(mf.tracks),
           "notes": [], "tempo": [], "timesig": [], "track_name": None, "eot": None,
           "events_after_eot": 0, "max_event_tick": 0, "errors": []}
    for track in mf.tracks:
        now = 0
        open_notes: dict[int, list[tuple[int, int]]] = defaultdict(list)
        for msg in track:
            now += msg.time
            out["max_event_tick"] = max(out["max_event_tick"], now)
            if out["eot"] is not None:
                out["events_after_eot"] += 1
            if msg.type == "note_on" and msg.velocity > 0:
                if open_notes[msg.note]:
                    out["errors"].append(f"same-pitch overlap: note {msg.note} retriggered at tick {now}")
                open_notes[msg.note].append((now, msg.velocity))
            elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                if not open_notes[msg.note]:
                    out["errors"].append(f"orphan note-off: note {msg.note} at tick {now}")
                    continue
                start, vel = open_notes[msg.note].pop(0)
                out["notes"].append({"pitch": msg.note, "start": start, "dur": now - start, "vel": vel})
            elif msg.type == "set_tempo":
                out["tempo"].append((now, msg.tempo))
            elif msg.type == "time_signature":
                out["timesig"].append((now, msg.numerator, msg.denominator))
            elif msg.type == "track_name":
                out["track_name"] = msg.name
            elif msg.type == "end_of_track":
                out["eot"] = now
        for pitch, starts in open_notes.items():
            for start, _ in starts:
                out["errors"].append(f"hanging note {pitch} from tick {start}")
    out["notes"].sort(key=lambda n: (n["start"], n["pitch"]))
    return out


def minimal_period(notes: list[dict], loop: int) -> int:
    bar = 4 * PPQ
    for period in (bar, 2 * bar, 4 * bar):
        if period > loop or loop % period:
            continue
        segments = defaultdict(list)
        for n in notes:
            segments[n["start"] // period].append((n["start"] % period, n["dur"], n["pitch"], n["vel"]))
        reps = loop // period
        if len(segments) == reps and all(segments[i] == segments[0] for i in range(reps)):
            return period
    return loop


def fingerprints(notes: list[dict], loop: int) -> tuple[tuple, tuple, tuple]:
    period = minimal_period(notes, loop)
    cell = [n for n in notes if n["start"] < period]
    low = min(n["pitch"] for n in cell)
    musical = tuple((n["start"], n["dur"], n["pitch"] - low) for n in cell)  # transposition/velocity/tempo invariant
    rhythm = tuple((n["start"], n["dur"]) for n in cell)
    onsets = tuple(n["start"] for n in cell)
    return (period,) + musical, (period,) + rhythm, (period,) + onsets


def tiled_tokens(notes: list[dict], loop: int) -> tuple[set, set]:
    span = 16 * PPQ
    low = min(n["pitch"] for n in notes)
    onset_set, token_set = set(), set()
    for rep in range(span // loop):
        for n in notes:
            t = n["start"] + rep * loop
            onset_set.add(t // 60)
            token_set.add((t // 60, (n["pitch"] - low) % 12))
    return onset_set, token_set


def jaccard(a: set, b: set) -> float:
    return len(a & b) / len(a | b) if a | b else 1.0


def main() -> int:
    rep = Report()
    midi_dir = PACK / "midi"
    files = sorted(midi_dir.glob("*.mid"))

    with (PACK / "pattern-index-Cursor.csv").open(encoding="utf-8") as fh:
        index = list(csv.DictReader(fh))
    with (PACK / "note-events-Cursor.csv").open(encoding="utf-8") as fh:
        events = list(csv.DictReader(fh))
    events_by_id: dict[str, list[dict]] = defaultdict(list)
    for e in events:
        events_by_id[e["pattern_id"]].append(e)

    # 1. Count and identity
    problems = []
    if len(files) != 50:
        problems.append(f"{len(files)} MIDI files found, expected 50")
    if len(index) != 50:
        problems.append(f"{len(index)} index rows, expected 50")
    ids = [r["pattern_id"] for r in index]
    if len(set(ids)) != len(ids):
        problems.append("duplicate pattern IDs in index")
    expected_ids = [f"BP{i:02d}" for i in range(1, 51)]
    if ids != expected_ids:
        problems.append("pattern IDs are not BP01..BP50 in order")
    disk_names = {f.name for f in files}
    for r in index:
        fname = Path(r["midi_filename"]).name
        if fname not in disk_names:
            problems.append(f"{r['pattern_id']}: index file {fname} not on disk")
        if not fname.startswith(r["pattern_id"] + "_"):
            problems.append(f"{r['pattern_id']}: filename {fname} does not start with its ID")
    if set(events_by_id) != set(ids):
        problems.append("note-event CSV pattern IDs do not match the index")
    rep.add("count", "Exactly 50 MIDI files with matching IDs across files and both CSVs", problems,
            f"{len(files)} files, {len(index)} index rows, {len(events)} note-event rows")

    # 2. Parse every file
    parsed: dict[str, dict] = {}
    problems = []
    for r in index:
        path = midi_dir / Path(r["midi_filename"]).name
        try:
            parsed[r["pattern_id"]] = parse_midi(path)
        except Exception as exc:  # noqa: BLE001 - any parser failure is a validation failure
            problems.append(f"{path.name}: {exc}")
    rep.add("parse", "Every MIDI file parses with mido", problems,
            f"{len(parsed)}/{len(index)} parsed with mido {MIDO_VERSION}")

    # 3. Header / meta
    problems = []
    for r in index:
        m = parsed.get(r["pattern_id"])
        if not m:
            continue
        pid, bpm, bars = r["pattern_id"], float(r["bpm"]), int(r["loop_bars"])
        if m["type"] != 0 or m["tracks"] != 1:
            problems.append(f"{pid}: SMF type {m['type']} with {m['tracks']} tracks")
        if m["ticks_per_beat"] != PPQ:
            problems.append(f"{pid}: PPQ {m['ticks_per_beat']}")
        if not m["tempo"] or m["tempo"][0][0] != 0:
            problems.append(f"{pid}: no tempo meta at tick 0")
        elif abs(mido.tempo2bpm(m["tempo"][0][1]) - bpm) > 0.01:
            problems.append(f"{pid}: tempo {mido.tempo2bpm(m['tempo'][0][1]):.4f} != {bpm}")
        if m["timesig"] != [(0, 4, 4)]:
            problems.append(f"{pid}: time signature {m['timesig']}")
        if not m["track_name"] or not m["track_name"].startswith(pid):
            problems.append(f"{pid}: track name {m['track_name']!r}")
        if bars not in (1, 2, 4):
            problems.append(f"{pid}: loop length {bars} bars")
    rep.add("meta", "Tempo and 4/4 time-signature meta at tick 0, 480 PPQ, 1/2/4-bar loops", problems,
            "tempo compared within 0.01 BPM after microsecond rounding")

    # 4. End of track exactly at loop boundary; no hanging notes
    problems = []
    for r in index:
        m = parsed.get(r["pattern_id"])
        if not m:
            continue
        loop = int(r["loop_bars"]) * 4 * PPQ
        if m["eot"] != loop:
            problems.append(f"{r['pattern_id']}: end-of-track at {m['eot']}, loop is {loop}")
        if m["events_after_eot"]:
            problems.append(f"{r['pattern_id']}: {m['events_after_eot']} events after end-of-track")
        if m["max_event_tick"] > loop:
            problems.append(f"{r['pattern_id']}: event at tick {m['max_event_tick']} past loop")
        problems += [f"{r['pattern_id']}: {e}" for e in m["errors"]]
    rep.add("boundary", "End-of-track at the loop boundary; every note-on has a note-off; no same-pitch collisions",
            problems, "note-on/off pairing done independently from the generator")

    # 5. Value ranges
    problems = []
    total = 0
    for r in index:
        m = parsed.get(r["pattern_id"])
        if not m:
            continue
        loop = int(r["loop_bars"]) * 4 * PPQ
        if not m["notes"]:
            problems.append(f"{r['pattern_id']}: no notes")
        for n in m["notes"]:
            total += 1
            if not PITCH_MIN <= n["pitch"] <= PITCH_MAX:
                problems.append(f"{r['pattern_id']}: pitch {n['pitch']} outside {PITCH_MIN}-{PITCH_MAX}")
            if not 1 <= n["vel"] <= 127:
                problems.append(f"{r['pattern_id']}: velocity {n['vel']}")
            if n["start"] < 0 or n["dur"] <= 0 or n["start"] + n["dur"] > loop:
                problems.append(f"{r['pattern_id']}: note {n} violates loop bounds")
    rep.add("ranges", f"Pitches {PITCH_MIN}-{PITCH_MAX} (C1-E4), velocities 1-127, positive durations, notes inside the loop",
            problems, f"{total} notes checked")

    # 6. Monophony and legato honesty
    problems = []
    legato_overlaps = 0
    for r in index:
        m = parsed.get(r["pattern_id"])
        if not m:
            continue
        flagged = r["intentional_legato_overlaps"] == "yes"
        notes = m["notes"]
        found = 0
        for a, b in itertools.combinations(notes, 2):
            ov = min(a["start"] + a["dur"], b["start"] + b["dur"]) - max(a["start"], b["start"])
            if ov <= 0:
                continue
            found += 1
            if not flagged:
                problems.append(f"{r['pattern_id']}: unflagged overlap {ov} ticks at {max(a['start'], b['start'])}")
            elif ov > MAX_LEGATO_OVERLAP:
                problems.append(f"{r['pattern_id']}: legato overlap {ov} ticks exceeds {MAX_LEGATO_OVERLAP}")
            if a["pitch"] == b["pitch"]:
                problems.append(f"{r['pattern_id']}: same-pitch overlap at {b['start']}")
        for t in {n["start"] for n in notes}:
            sounding = [n for n in notes if n["start"] <= t < n["start"] + n["dur"]]
            if len(sounding) > 2:
                problems.append(f"{r['pattern_id']}: {len(sounding)} notes sounding at tick {t}")
        if flagged and not found:
            problems.append(f"{r['pattern_id']}: flagged legato but contains no overlaps")
        legato_overlaps += found
    n_legato = sum(r["intentional_legato_overlaps"] == "yes" for r in index)
    rep.add("monophony", "Monophonic; overlaps only in legato-labeled patterns, each at most 1/8 beat, never same pitch",
            problems, f"{n_legato} legato patterns, {legato_overlaps} intentional overlaps total")

    # 7. CSV <-> MIDI agreement
    problems = []
    for r in index:
        pid = r["pattern_id"]
        m = parsed.get(pid)
        if not m:
            continue
        rows = sorted(events_by_id[pid], key=lambda e: (int(e["start_tick"]), int(e["midi_note"])))
        if len(rows) != len(m["notes"]) or int(r["note_count"]) != len(m["notes"]):
            problems.append(f"{pid}: CSV rows {len(rows)}, index count {r['note_count']}, MIDI {len(m['notes'])}")
            continue
        for e, n in zip(rows, m["notes"]):
            got = (int(e["midi_note"]), int(e["start_tick"]), int(e["duration_ticks"]), int(e["velocity"]))
            if got != (n["pitch"], n["start"], n["dur"], n["vel"]):
                problems.append(f"{pid}: CSV {got} != MIDI {n}")
            if abs(float(e["start_beat"]) * PPQ - n["start"]) > 0.01 or abs(float(e["duration_beats"]) * PPQ - n["dur"]) > 0.01:
                problems.append(f"{pid}: beat columns disagree with ticks at {e['start_tick']}")
            if name_to_midi(e["note_name"]) != n["pitch"]:
                problems.append(f"{pid}: note name {e['note_name']} != MIDI {n['pitch']}")
        has_overlap = any(float(e["legato_overlap_beats"]) > 0 for e in rows)
        if has_overlap != (r["intentional_legato_overlaps"] == "yes"):
            problems.append(f"{pid}: legato column disagrees with overlap data")
    rep.add("csv_match", "Note-event CSV and index CSV match the parsed MIDI exactly (pitch, tick, duration, velocity, names)",
            problems, "beats cross-checked against ticks; note names converted back to MIDI numbers (MIDI 60 = C4)")

    # 8. Scale labels
    problems = []
    chromatic_notes = 0
    for r in index:
        pid = r["pattern_id"]
        tonic = PC[r["tonal_center"]]
        scale = SCALES.get(r["scale"])
        if scale is None:
            problems.append(f"{pid}: unknown scale {r['scale']}")
            continue
        for e in events_by_id[pid]:
            in_scale = (int(e["midi_note"]) - tonic) % 12 in scale
            if in_scale != (e["in_scale"] == "yes"):
                problems.append(f"{pid}: {e['note_name']} in_scale flag wrong")
            if not in_scale:
                chromatic_notes += 1
                if not e["chromatic_note"]:
                    problems.append(f"{pid}: {e['note_name']} out of scale without a label")
        declared = r["chromatic_departures"] != "none"
        used = any(e["in_scale"] == "no" for e in events_by_id[pid])
        if declared != used:
            problems.append(f"{pid}: chromatic_departures column disagrees with note data")
    rep.add("scale", "Every out-of-scale note is labeled as an intentional chromatic departure (recomputed from key + scale)",
            problems, f"{chromatic_notes} chromatic notes, all labeled")

    # 9. Distinctness
    problems = []
    exact, musical, rhythm, onset = {}, {}, {}, {}
    rhythm_twins, onset_twins = [], []
    for r in index:
        pid = r["pattern_id"]
        m = parsed.get(pid)
        if not m:
            continue
        loop = int(r["loop_bars"]) * 4 * PPQ
        ex = tuple((n["start"], n["dur"], n["pitch"], n["vel"]) for n in m["notes"])
        mu, rh, on = fingerprints(m["notes"], loop)
        if ex in exact:
            problems.append(f"{pid} is an exact duplicate of {exact[ex]}")
        if mu in musical:
            problems.append(f"{pid} duplicates {musical[mu]} ignoring transposition, velocity, and tempo")
        if rh in rhythm:
            rhythm_twins.append(f"{pid}~{rhythm[rh]}")
        if on in onset:
            onset_twins.append(f"{pid}~{onset[on]}")
        exact.setdefault(ex, pid)
        musical.setdefault(mu, pid)
        rhythm.setdefault(rh, pid)
        onset.setdefault(on, pid)
    tokens = {}
    for r in index:
        m = parsed.get(r["pattern_id"])
        if m:
            tokens[r["pattern_id"]] = tiled_tokens(m["notes"], int(r["loop_bars"]) * 4 * PPQ)
    best_onset = max(((jaccard(tokens[a][0], tokens[b][0]), a, b) for a, b in itertools.combinations(tokens, 2)))
    best_token = max(((jaccard(tokens[a][1], tokens[b][1]), a, b) for a, b in itertools.combinations(tokens, 2)))
    if best_token[0] >= NEAR_DUPLICATE_THRESHOLD:
        problems.append(f"near-duplicate: {best_token[1]} vs {best_token[2]} similarity {best_token[0]:.2f}")
    rep.add("distinct", "No exact, transposed, re-velocitied, re-tempoed, or near-duplicate patterns", problems,
            f"rhythm+duration twins: {len(rhythm_twins)}; identical onset grids: {len(onset_twins)} "
            f"({', '.join(onset_twins) or 'none'}); closest onset grids {best_onset[1]}/{best_onset[2]} "
            f"Jaccard {best_onset[0]:.2f}; closest onset+pitch-class tokens {best_token[1]}/{best_token[2]} "
            f"Jaccard {best_token[0]:.2f} (fail threshold {NEAR_DUPLICATE_THRESHOLD})")

    # 10. Coverage
    problems = []
    fams = defaultdict(int)
    for r in index:
        fams[r["groove_family"]] += 1
    missing = FAMILIES - set(fams)
    if missing:
        problems.append(f"missing families: {sorted(missing)}")
    bars = defaultdict(int)
    for r in index:
        bars[r["loop_bars"]] += 1
    rep.add("coverage", "All seven groove families present; loop lengths span 1, 2, and 4 bars", problems,
            "families " + ", ".join(f"{k} {v}" for k, v in sorted(fams.items()))
            + "; bars " + ", ".join(f"{k}-bar {v}" for k, v in sorted(bars.items())))

    # 11. Ghost-note proxy for velocity-insensitive playback
    problems = []
    ghosts = 0
    for r in index:
        pid = r["pattern_id"]
        m = parsed.get(pid)
        if not m:
            continue
        normal = sorted(n["dur"] for n in m["notes"] if n["vel"] >= 90)
        for n in m["notes"]:
            if n["vel"] < 90:
                ghosts += 1
                if normal and n["dur"] > normal[len(normal) // 2]:
                    problems.append(f"{pid}: ghost at tick {n['start']} is longer than the median normal note")
    rep.add("ghost_proxy", "Proxy: every ghost note (velocity < 90) is no longer than the pattern's median normal note",
            problems, f"{ghosts} ghost notes checked; this is a proxy, not a listening test")

    # 12. ZIP integrity
    problems = []
    zips = sorted(PACK.glob("*.zip"))
    if len(zips) != 1:
        problems.append(f"{len(zips)} ZIP files found")
    else:
        with zipfile.ZipFile(zips[0]) as zf:
            bad = zf.testzip()
            if bad:
                problems.append(f"corrupt member {bad}")
            names = zf.namelist()
            mids = [n for n in names if n.endswith(".mid")]
            csvs = [n for n in names if n.endswith(".csv")]
            if len(mids) != 50 or len(csvs) != 2:
                problems.append(f"ZIP holds {len(mids)} MIDI and {len(csvs)} CSV files")
            for name in names:
                disk = PACK / Path(name).relative_to(Path(name).parts[0])
                if not disk.exists() or hashlib.sha256(zf.read(name)).digest() != hashlib.sha256(disk.read_bytes()).digest():
                    problems.append(f"{name} differs from the file on disk")
    rep.add("zip", "ZIP passes CRC test and every member is byte-identical to the validated files", problems,
            f"{zips[0].name if zips else 'missing'}")

    report = {
        "collection": "Basement Protocol",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "validator": f"generator/validate.py with mido {MIDO_VERSION} on Python {platform.python_version()}",
        "summary": {
            "checks": len(rep.checks),
            "passed": len(rep.checks) - len(rep.failed),
            "failed": len(rep.failed),
            "midi_files": len(files),
            "note_events": len(events),
        },
        "checks": rep.checks,
        "limitations": [
            "Musical quality, groove feel, and velocity-insensitive playability are judgments; only the ghost-note proxy is automated.",
            "Glide behavior on legato overlaps depends on the receiving instrument and cannot be verified from MIDI.",
            "DAW import was not tested inside commercial DAWs in this environment; files were parsed with mido and @tonejs/midi.",
            "Near-duplicate detection uses onset and pitch-class set similarity; it cannot judge perceived similarity.",
        ],
    }
    out = PACK / "validation-report-Cursor.json"
    existing = json.loads(out.read_text()) if out.exists() else {}
    if "second_parser" in existing:
        report["second_parser"] = existing["second_parser"]
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")

    for c in rep.checks:
        mark = "PASS" if c["status"] == "pass" else "FAIL"
        print(f"[{mark}] {c['name']}\n       {c['detail']}")
        for p in c["problems"]:
            print(f"       - {p}")
    print(f"\n{report['summary']['passed']}/{report['summary']['checks']} checks passed -> {out}")
    return 1 if rep.failed else 0


if __name__ == "__main__":
    sys.exit(main())
