"""Render the Basement Protocol commercial soundtrack from the pack's own MIDI files.

Offline and deterministic: numpy synth voices, no samples, seeded noise. Reads the .mid
files in pack/midi, re-times them to one tempo, and writes:

  media/build/soundtrack.wav   48 kHz stereo, peak-normalized (loudness is set at mux time)
  media/build/timeline.json    every scheduled note and drum hit in seconds, for visual sync
"""

from __future__ import annotations

import json
import math
import wave
from pathlib import Path

import mido
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / "pack"
BUILD = ROOT / "media" / "build"

SR = 48_000
BPM = 128.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 16
DURATION = BARS * BAR  # 30.0 s at 128 BPM
GLIDE_S = 0.055
RNG_SEED = 20261022

# Every section is an A-centered pattern, so the cuts never change key.
ARRANGEMENT = [
    {"section": "intro", "pattern": "BP01", "start_bar": 0, "bars": 4, "patch": "sub"},
    {"section": "groove", "pattern": "BP11", "start_bar": 4, "bars": 4, "patch": "reese"},
    {"section": "acid", "pattern": "BP44", "start_bar": 8, "bars": 4, "patch": "acid"},
    {"section": "build", "pattern": "BP50", "start_bar": 12, "bars": 3, "patch": "acid"},
    # The closing hit is the first note of BP01, so the spot ends where it began.
    {"section": "outro", "pattern": "BP01", "start_bar": 15, "bars": 1, "patch": "sub", "first_note_only": True},
]

PATCHES = {
    #          saw   saw2  sine  cutoff  env_hz  res   decay  drive
    "sub":   (0.18, 0.00, 1.00, 260.0, 380.0, 0.10, 0.30, 1.4),
    "reese": (0.55, 0.55, 0.55, 520.0, 900.0, 0.25, 0.22, 1.8),
    "acid":  (1.00, 0.00, 0.25, 240.0, 2600.0, 0.86, 0.17, 2.6),
}


def manifest() -> dict:
    return json.loads((PACK / "manifest-Cursor.json").read_text(encoding="utf-8"))


def read_notes(path: Path) -> list[tuple[float, float, int, int]]:
    """Return (start_beat, end_beat, pitch, velocity) from a format-0 SMF."""
    mid = mido.MidiFile(path)
    ppq = mid.ticks_per_beat
    tick, open_notes, out = 0, {}, []
    for msg in mido.merge_tracks(mid.tracks):
        tick += msg.time
        if msg.type == "note_on" and msg.velocity > 0:
            open_notes.setdefault(msg.note, []).append((tick, msg.velocity))
        elif msg.type in ("note_off", "note_on"):
            start, vel = open_notes[msg.note].pop(0)
            out.append((start / ppq, tick / ppq, msg.note, vel))
    return sorted(out)


def schedule(meta_by_id: dict) -> list[dict]:
    notes = []
    for sec in ARRANGEMENT:
        meta = meta_by_id[sec["pattern"]]
        src = read_notes(PACK / "midi" / meta["file"])
        if sec.get("first_note_only"):
            src = src[:1]
        span = sec["bars"] * 4
        loop = meta["loop_beats"]
        reps = 1 if sec.get("first_note_only") else math.ceil(span / loop)
        base = sec["start_bar"] * 4
        for r in range(reps):
            for s, e, pitch, vel in src:
                s0 = r * loop + s
                if s0 >= span:
                    continue
                e0 = min(r * loop + e, span)
                notes.append({
                    "t0": round((base + s0) * BEAT, 6),
                    "t1": round((base + e0) * BEAT, 6),
                    "pitch": pitch, "vel": vel, "pattern": sec["pattern"], "section": sec["section"],
                })
    notes.sort(key=lambda n: n["t0"])
    for a, b in zip(notes, notes[1:]):
        a["slide"] = b["t0"] < a["t1"] and a["section"] == b["section"]
    if notes:
        notes[-1]["slide"] = False
    return notes


def drum_grid() -> dict[str, list[float]]:
    kick, clap, hat, ohat = [], [], [], []
    for bar in range(BARS):
        b0 = bar * 4
        if 2 <= bar <= 13:
            kick += [b0 + i for i in range(4)]
        if bar == 15:
            kick.append(b0)
        if 4 <= bar <= 13:
            ohat += [b0 + i + 0.5 for i in range(4)]
        if 6 <= bar <= 13:
            clap += [b0 + 1, b0 + 3]
            hat += [b0 + i * 0.25 for i in range(16) if i % 2]
        if bar == 14:
            clap += [b0 + i * 0.5 for i in range(4)] + [b0 + 2 + i * 0.25 for i in range(8)]
            hat += [b0 + i * 0.25 for i in range(16)]
    sec = lambda beats: [round(b * BEAT, 6) for b in beats]
    return {"kick": sec(kick), "clap": sec(clap), "hat": sec(hat), "ohat": sec(ohat)}


def polyblep_saw(freq: np.ndarray) -> np.ndarray:
    dt = freq / SR
    ph = np.cumsum(dt) % 1.0
    y = 2.0 * ph - 1.0
    lo = ph < dt
    t = ph[lo] / dt[lo]
    y[lo] -= t + t - t * t - 1.0
    hi = ph > 1.0 - dt
    t = (ph[hi] - 1.0) / dt[hi]
    y[hi] -= t * t + t + t + 1.0
    return y


def svf_lowpass(x: np.ndarray, cutoff: np.ndarray, res: np.ndarray) -> np.ndarray:
    """Two cascaded TPT state-variable low-passes (about 24 dB/oct) with per-sample cutoff."""
    g = np.tan(np.pi * np.clip(cutoff, 20.0, SR * 0.45) / SR)
    k1 = 2.0 - 1.95 * np.clip(res, 0.0, 0.98)
    out = x
    for k in (k1, np.full_like(k1, 1.4)):
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        ic1 = ic2 = 0.0
        y = [0.0] * len(out)
        for i, (xi, b1, b2, b3) in enumerate(zip(out.tolist(), a1.tolist(), a2.tolist(), a3.tolist())):
            v3 = xi - ic2
            v1 = b1 * ic1 + b2 * v3
            v2 = ic2 + b2 * ic1 + b3 * v3
            ic1 = 2.0 * v1 - ic1
            ic2 = 2.0 * v2 - ic2
            y[i] = v2
        out = np.asarray(y)
    return out


def render_bass(notes: list[dict]) -> np.ndarray:
    n = int(DURATION * SR)
    t = np.arange(n) / SR
    freq = np.full(n, 55.0)
    amp = np.zeros(n)
    fenv = np.zeros(n)
    accent = np.zeros(n)
    patch_idx = np.zeros(n, dtype=int)
    order = list(PATCHES)

    for sec in ARRANGEMENT:
        a = int(sec["start_bar"] * BAR * SR)
        b = int((sec["start_bar"] + sec["bars"]) * BAR * SR)
        patch_idx[a:b] = order.index(sec["patch"])

    prev = None
    trig_t, trig_vel = 0.0, 100
    for i, note in enumerate(notes):
        s0 = int(note["t0"] * SR)
        nxt = notes[i + 1] if i + 1 < len(notes) else None
        legato_in = prev is not None and prev.get("slide")
        end_t = nxt["t0"] if note.get("slide") and nxt else note["t1"]
        s1 = min(int(end_t * SR), n)
        f = 440.0 * 2 ** ((note["pitch"] - 69) / 12)
        seg = slice(s0, s1)
        if legato_in:
            f_prev = 440.0 * 2 ** ((prev["pitch"] - 69) / 12)
            ramp = np.clip((t[seg] - note["t0"]) / GLIDE_S, 0.0, 1.0)
            freq[seg] = f_prev * (f / f_prev) ** ramp
        else:
            freq[seg] = f
            trig_t, trig_vel = note["t0"], note["vel"]
        since = t[seg] - trig_t
        vel_gain = 0.55 + 0.45 * (trig_vel / 127.0)
        decay = PATCHES[order[patch_idx[s0]]][6] * (0.7 if trig_vel >= 120 else 1.0)
        amp[seg] = vel_gain * np.minimum(since / 0.003, 1.0) * (0.72 + 0.28 * np.exp(-since / 0.12))
        fenv[seg] = np.exp(-since / decay)
        accent[seg] = 1.0 if trig_vel >= 120 else 0.0
        # Release tail into the gap before the next note.
        gap_end = min(int(nxt["t0"] * SR), n) if nxt else n
        if not note.get("slide") and gap_end > s1:
            rel = slice(s1, gap_end)
            last = amp[s1 - 1] if s1 > s0 else 0.0
            amp[rel] = last * np.exp(-(t[rel] - t[s1]) / 0.03)
            fenv[rel] = fenv[s1 - 1] * np.exp(-(t[rel] - t[s1]) / 0.05) if s1 > s0 else 0.0
        prev = note

    p = np.array([PATCHES[k] for k in order])[patch_idx]
    saw = polyblep_saw(freq)
    saw2 = polyblep_saw(freq * 2 ** (11 / 1200))
    sine = np.sin(2 * np.pi * np.cumsum(freq / SR))
    x = p[:, 0] * saw + p[:, 1] * saw2 + p[:, 2] * sine

    cutoff = p[:, 3].copy()
    acid_open = np.clip((t - 8 * BAR) / (7 * BAR), 0.0, 1.0)
    cutoff += np.where(p[:, 5] > 0.5, 1100.0 * acid_open ** 1.6, 0.0)
    cutoff += p[:, 4] * fenv * (1.0 + 0.7 * accent)
    outro = np.clip((t - 15 * BAR) / BAR, 0.0, 1.0)
    cutoff *= 1.0 - 0.6 * outro
    y = svf_lowpass(x, cutoff, p[:, 5])
    y = np.tanh(p[:, 7] * y) / np.tanh(p[:, 7])
    # Keep the fundamental present even when the filter is near closed.
    y = 0.8 * y + 0.35 * p[:, 2] * sine
    return y * amp


def one_pole_lp(x: np.ndarray, hz: float) -> np.ndarray:
    a = math.exp(-2 * math.pi * hz / SR)
    y, s = [0.0] * len(x), 0.0
    for i, v in enumerate(x.tolist()):
        s = (1 - a) * v + a * s
        y[i] = s
    return np.asarray(y)


def make_kick() -> np.ndarray:
    t = np.arange(int(0.5 * SR)) / SR
    f = 46.0 + 120.0 * np.exp(-t / 0.04)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.3) * np.minimum(t / 0.001, 1)
    click = np.random.default_rng(RNG_SEED).standard_normal(len(t)) * np.exp(-t / 0.003) * 0.25
    return np.tanh(1.7 * (body + click))


def make_noise_hit(length: float, hp_hz: float, decay: float, seed: int, bursts: int = 1) -> np.ndarray:
    t = np.arange(int(length * SR)) / SR
    noise = np.random.default_rng(seed).standard_normal(len(t))
    hp = noise - one_pole_lp(noise, hp_hz)
    env = np.zeros_like(t)
    for k in range(bursts):
        tk = np.clip(t - k * 0.011, 0, None)
        env += np.where(t >= k * 0.011, np.exp(-tk / (0.004 if k < bursts - 1 else decay)), 0.0)
    return hp * env


def place(buf: np.ndarray, sample: np.ndarray, times: list[float], gain: float, pan: float = 0.0) -> None:
    left, right = gain * math.sqrt(0.5 * (1 - pan)), gain * math.sqrt(0.5 * (1 + pan))
    for tt in times:
        s = int(tt * SR)
        e = min(s + len(sample), buf.shape[0])
        buf[s:e, 0] += sample[: e - s] * left
        buf[s:e, 1] += sample[: e - s] * right


def reverb_ir(seconds: float, seed: int) -> np.ndarray:
    t = np.arange(int(seconds * SR)) / SR
    rng = np.random.default_rng(seed)
    ir = rng.standard_normal((len(t), 2)) * np.exp(-t / (seconds / 6.5))[:, None]
    ir[:, 0] = one_pole_lp(ir[:, 0], 5000)
    ir[:, 1] = one_pole_lp(ir[:, 1], 5000)
    return ir / np.sqrt((ir ** 2).sum(axis=0))


def fft_convolve(x: np.ndarray, h: np.ndarray) -> np.ndarray:
    size = 1 << int(math.ceil(math.log2(len(x) + len(h))))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)
    return y[: len(x)]


def main() -> None:
    meta_by_id = {p["id"]: p for p in manifest()["patterns"]}
    notes = schedule(meta_by_id)
    drums = drum_grid()
    n = int(DURATION * SR)
    t = np.arange(n) / SR

    bass = render_bass(notes)
    duck = np.ones(n)
    for tk in drums["kick"]:
        s = int(tk * SR)
        e = min(s + int(0.35 * SR), n)
        tt = t[s:e] - tk
        duck[s:e] = np.minimum(duck[s:e], 1 - 0.55 * np.exp(-tt / 0.11) * np.minimum(tt / 0.004, 1))
    bass *= duck

    mix = np.zeros((n, 2))
    send = np.zeros((n, 2))
    mix[:, 0] += 0.62 * bass
    mix[:, 1] += 0.62 * bass

    # Ping-pong dotted-eighth echo on the acid bars, high-passed so the sub stays mono.
    acid_mask = ((t >= 8 * BAR) & (t < 15 * BAR)).astype(float)
    spec = np.fft.rfft(bass * acid_mask)
    spec[np.fft.rfftfreq(n, 1 / SR) < 350] = 0
    echo_src = np.fft.irfft(spec, n)
    d = int(0.75 * BEAT * SR)
    for k, g in enumerate((0.32, 0.2, 0.12), start=1):
        ch = k % 2
        mix[k * d:, ch] += g * echo_src[: n - k * d]

    kick, clap = make_kick(), make_noise_hit(0.35, 900, 0.09, RNG_SEED + 1, bursts=3)
    hat, ohat = make_noise_hit(0.06, 7000, 0.018, RNG_SEED + 2), make_noise_hit(0.25, 6500, 0.075, RNG_SEED + 3)
    place(mix, kick, drums["kick"], 0.85)
    place(mix, clap, drums["clap"], 0.33)
    place(send, clap, drums["clap"], 0.22)
    place(mix, hat, drums["hat"], 0.13, pan=0.25)
    place(mix, ohat, drums["ohat"], 0.13, pan=-0.2)
    place(send, ohat, drums["ohat"], 0.05)

    # Riser across the break bar, then a crash on the final downbeat.
    r0, r1 = int(14 * BAR * SR), int(15 * BAR * SR)
    rt = (t[r0:r1] - 14 * BAR) / BAR
    noise = np.random.default_rng(RNG_SEED + 4).standard_normal(r1 - r0)
    riser = one_pole_lp(noise - one_pole_lp(noise, 1200), 5500) * rt ** 2.2 * 0.2
    sweep = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (rt * 2.2)) / SR) * rt ** 2 * 0.05
    mix[r0:r1] += (riser + sweep)[:, None]
    send[r0:r1] += (riser * 0.6)[:, None]
    crash = make_noise_hit(2.2, 4500, 0.7, RNG_SEED + 5)
    place(mix, crash, [15 * BAR], 0.2)
    place(send, crash, [15 * BAR], 0.18)
    outro_bass = bass * (t >= 15 * BAR)
    send[:, 0] += 0.25 * outro_bass
    send[:, 1] += 0.25 * outro_bass

    ir = reverb_ir(2.2, RNG_SEED + 6)
    mix[:, 0] += 0.9 * fft_convolve(send[:, 0], ir[:, 0])
    mix[:, 1] += 0.9 * fft_convolve(send[:, 1], ir[:, 1])

    fade = np.clip((DURATION - t) / 0.35, 0.0, 1.0)
    mix *= fade[:, None]
    mix /= np.max(np.abs(mix)) + 1e-9
    mix = np.tanh(1.15 * mix) / np.tanh(1.15)
    mix *= 10 ** (-1.0 / 20) / (np.max(np.abs(mix)) + 1e-9)

    BUILD.mkdir(parents=True, exist_ok=True)
    pcm = (mix * 32767).astype("<i2")
    with wave.open(str(BUILD / "soundtrack.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())

    timeline = {
        "bpm": BPM, "bars": BARS, "beat_s": BEAT, "duration_s": DURATION,
        "sections": [
            {**sec, "t0": sec["start_bar"] * BAR, "t1": (sec["start_bar"] + sec["bars"]) * BAR,
             "name": meta_by_id[sec["pattern"]]["name"], "key": meta_by_id[sec["pattern"]]["key"],
             "file_bpm": meta_by_id[sec["pattern"]]["bpm"], "sha256": meta_by_id[sec["pattern"]]["sha256"]}
            for sec in ARRANGEMENT
        ],
        "notes": notes,
        "drums": drums,
    }
    (BUILD / "timeline.json").write_text(json.dumps(timeline, indent=1), encoding="utf-8")
    print(f"soundtrack: {DURATION:.2f} s, {len(notes)} bass notes from "
          f"{len({s['pattern'] for s in ARRANGEMENT})} pack files, {len(drums['kick'])} kicks -> {BUILD}")


if __name__ == "__main__":
    main()
