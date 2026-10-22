BASEMENT PROTOCOL: 50 underground bassline MIDI patterns
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
  - Velocity: accents 122 to 127, normal 92 to 110, ghosts 76 and shortened. The grooves still
    read on a velocity-insensitive patch because ghosts are also shorter than normal notes.

MIDI carries pitch, timing, and velocity only. Sub weight, distortion, and growl come from the
synth and processing you choose. The sound-character column is a starting suggestion.

License
  Royalty-free for use in your own music productions, released or unreleased. Do not resell or
  redistribute the files as a standalone MIDI pack. Full terms: LICENSE-PATTERNS.md at
  https://github.com/mizcausevic-dev/basement-protocol
  Audition every pattern: https://mizcausevic-dev.github.io/basement-protocol/
