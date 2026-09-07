# `mix-2026-09-songA-first-pass` round 1 — the owner's verdict, and why the mix arm failed

Owner listened 2026-09-06. **This is a real result, not a technical failure**, and the two halves
point in opposite directions.

## Verdict

| Condition | Owner's words | Outcome |
|---|---|---|
| **C — conventional treatment** | *"It didn't sound like you did anything at all to my vocals"* | **rejected** |
| **G — SA3 re-imagination of the beat** | *"that reimagining you did of the beat sounds so cool"* | **kept** |

He then chose **`beat-ken-rage`** — the `ken-sa3` adapter ("rage trap instrumental, heavy
distorted 808") at strength 0.75 over a `kxc`-triggered prompt — from six variants.

**The generative arm earned its place on the first sitting. The conventional-mix arm did not.**
That is the outcome handoff §8 anticipated in its "G gives valuable alternatives" row, and it
should steer the next investment.

## Why condition C was inaudible — and it was not only my timidity

My first reading was that I had simply chosen settings too conservative to hear. That was
**half** the story. Measured afterwards:

**The builtin compressor does not compress.** Threshold swept 0.10 / 0.25 / 0.50 / 0.75 with
ratio 0.80, on the lead vocal alone:

| threshold | peak | RMS | crest |
|---|---|---|---|
| no compressor | −6.20 | −21.94 | **15.74** |
| 0.10 | −6.20 | −21.96 | **15.76** |
| 0.25 | −6.20 | −21.94 | **15.74** |
| 0.50 | −6.20 | −21.94 | **15.74** |
| 0.75 | −6.20 | −21.94 | **15.74** |

Identical. And it is not bypassed: setting its Output gain `0.294 → 0.90` moved the level
**+20.6 dB**. So the plugin is in the signal path, its gain stage works, and **its dynamics stage
produces no measurable gain reduction at any setting.**

**FabFilter Pro-C 2 behaves the same way.** `load_plugin` hosts it cleanly and exposes 16
correctly-named parameters (Threshold, Ratio, Knee, Attack, Release, Lookahead, Wet Gain). Wet
Gain moves the level. But across threshold 0.20/0.35/0.50/0.70/0.90, ratio up, attack at fastest
and lookahead on, **crest never left ≈15.7** — the uncompressed value. One sweep moved crest
*upward* to 24.2 (expansion, the wrong direction) while everything got quieter.

So two independent compressors, one builtin and one professional VST3, both host and pass audio
while producing no compression through the command surface.

**What did work:** the 4-band EQ. High-frequency tilt moved **+6.18 dB** on the bold setting and
**+3.16 dB** on the shipped one. And "less room" worked exactly as owner ruling D1 predicted —
`set_track_volume −9 dB` on the printed `FX A-Reverb` return.

## The root cause, and the thing to fix next

**Plugin parameters are unitless.** A parameter in the snapshot carries `index`, `name`, `value`
(normalised 0–1) and `automated`. **No unit, no display string, no range.**

So there is no way to know whether threshold `0.35` is −6 dB or −60 dB, and therefore:

- an operator cannot **aim** — every value is a guess;
- an operator cannot distinguish **"this plugin is broken"** from **"you set it to a value where
  nothing happens"**, which is exactly the ambiguity this session could not resolve;
- a musical instruction ("more compressed") cannot be verified to have produced a musical result,
  only that *some* number changed.

Every other gap found today was recoverable by measurement. This one is not: measurement can show
that nothing happened, never why. **A mixing engineer that cannot read the knob it just turned
cannot mix.** Surfacing each parameter's display value and range in the snapshot — what the
plugin's own UI already shows — is the next implementation brief for this lane, ahead of any
further mix work.

## Three operational gotchas, each of which silently produced a wrong result first

1. **LoRA strength is a 0–100 scale, not 0–1.** Passing `value: 0.75` yielded
   `strength: 0.0075` — a hundredth of the intent, adapters loaded at effectively zero influence.
   `service/loras/registry.py:263`: `strength = value / 100.0`. Caught only because the manifest
   reports the resolved strength.
2. **`MOSH_LORA_DIR` is the parent of `sa3`.** `lora_dir()` appends `sa3` itself
   (`registry.py:59-61`), so pointing it at `…/loras/sa3` searches `…/loras/sa3/sa3`. Worse, a
   **running service caches its environment**: correcting the variable changed nothing until a
   fresh service was forced onto a new port, because the app reuses whatever is already listening.
3. **A render layer is not persisted without a `save`.** The variant projects still referenced the
   original beat after `render_layer`, so a "final" build silently used the wrong audio. Caught by
   hashing the clip's source file against the intended render — the readback habit earning its
   keep for the second time today.

## What the owner has

In `~/Library/Mosh/mix-2026-09-songA-first-pass/keepers/` (audio never enters the repository):
six beat variants, the original beat, and
`greg-FINAL-kenrage-beat-brighter-vocals.wav` — his chosen beat with brighter, less-room vocals
and **no compression**, because none could be delivered.

**Rows are not yet filed.** The census stands at 14 counted, all composition; these would be the
first mixing rows.
