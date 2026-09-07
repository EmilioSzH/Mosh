# Mix Package v0 — audio handoff without project reconstruction

Documentation only (2026-09-05, commit `0da6c638`). This is a documented file set plus the
existing project manifest, not a new import subsystem (handoff §7.2). Verified facts are
marked with their evidence; everything else is a manual step.

## 1. What a package is

- The Mosh project: a `.mosh` file (Tracktion edit XML; `src/state/ProjectName.h`
  `kProjectExtension = "mosh"`), the session `imports/` folder written by `import_clip`, and
  after `save_as` the project's own `audio/` folder into which `MoshEngine::consolidateAudioInto`
  copies sources and re-points clips (verified: `src/moshops/MoshOps.ProjectIo.cpp` `cmdSaveAs`;
  fixture run below).
- One versioned sidecar next to the source files: `mixpackage.json` with `"v": 0`. Allowed by
  §7.2 ("version any new sidecar"); it is read by humans and scripts, never by the engine.

## 2. Sidecar fields (`mixpackage.json`, v0)

| Field | Content |
|---|---|
| `v` | `0` |
| `song`, `slug` | song name; folder slug under `~/Library/Mosh/references/songs/<slug>/` (never committed) |
| `exported_from` | `"Ableton Live 12.x"`, export date |
| `export_settings` | `{all_individual_tracks: true, include_return_main_effects: false, bit_depth: "32f", sample_rate: <Hz>, normalize: false, loop: false, start: "bar 1 = 0.0 s", length_s: <n>}` |
| `files[]` | `{name, role: vocal|beat|drums|808|melody|return|rough, sha256, frames, channels, sr, active: true|false, source_choice: "group"|"children", printed_processing: "post-fader track inserts; no returns; no master"}` |
| `reference_only[]` | the rough with the owner's master chain: `{name, sha256, immutable: true}` |
| `known_missing_controls[]` | e.g. Live sidechain kick→808, master clipper not on stems, group fader |
| `alignment_acceptance` | `"listening"` for a real song (the master-treated rough is not the same deterministic path, so no null test); `"fixture"` for the synthetic check |
| `consent` | owner, date, scope (`"local probe only"`) |

## 3. Live 12 export settings (manual; from the handoff's §2.3 and the Ableton help article)

- Export → **All Individual Tracks**; **Include Return and Main Effects: OFF** for remixable parts.
- Groups: choose **group OR children** by whether the group treatment is integral; never both
  (summing duplicates content). Record the choice per file in `source_choice`.
- 32-bit float; Normalize OFF; Loop OFF; same sample rate for every file; start at bar 1.
- Frozen tracks render frozen; cross-track sidechains may break — list them in
  `known_missing_controls`.
- Export the rough **with** the master chain as a separate reference-only file.
- Post-fader stems already contain level and pan: **do not re-apply imported mixer values**.

## 4. What Mosh honors today vs. manual steps

Verified at `0da6c638` (`src/moshops/MoshOps.Clips.cpp` `cmdImportClip`; fixture run):

| Need | Today |
|---|---|
| Byte-exact copy into the session | Yes — `import_clip` copies the file into `<session>/imports/` (fixture: copy sha256 equals source) |
| Consolidation on save | Yes — `save_as` copies into `<project>/audio/` (fixture: sha256 equals source) |
| Placement at a common start | Yes — `import_clip {file, trackId, startSeconds: 0}`; clip length = file length |
| Target track | Create the track first with `create_track`; without `trackId` the clip lands on the first audio track |
| No pitch / fade / normalize on import | Yes — none applied |
| No warp on import | **Only if the file name carries no tempo token.** Verified 2026-09-05: a file named `…_145BPM_…wav` is marked auto-tempo and stretched to the session tempo on import (92.69 s → 112.00 s) and then cannot be rendered headless ("export render stalled"). Rule: rename tempo-tagged exports before import (byte-identical copy; original name + hash in the sidecar). `set_clip_warp {autoTempo:false}` unblocks rendering but keeps the stretched length |
| Sample-rate mismatch with the session | **Verified 2026-09-06, and worse than "unverified": headless renders CANNOT match a 48 kHz package.** The session rate is the audio device's (`MoshOps.cpp:3171`), `--run-script` forces no-audio, and `export_audio` takes no rate argument — so every headless render of this 48 kHz package is resampled to 44.1 kHz with no way to ask otherwise. Uniform across candidates, so comparisons stay fair, but any headless render evidence about a 48 kHz project has been resampled. See §7.4 |
| Reference-only / immutable track | **Absent** — use `set_track_mute` plus a `REF-` name prefix and record it in the sidecar |
| Hashes, roles, consent | Manual (`shasum -a 256` into the sidecar) |
| Master fader | A fresh session's master sits at **−3 dB** (fixture snapshot `master: -3.0`); set `set_master_volume {db: 0}` before any level-comparison export |

## 5. Deterministic fixture (run 2026-09-05; script `repro/mixpackage-fixture.jsonl`)

Generate at the session rate, headless:

```
MOSH_NO_AUDIO=1 MOSH_SELFTEST_SESSION=_harness/pivot-fixture2 MOSH_RUN_SCRIPT=<script> \
  MOSH_RUN_SCRIPT_OUT=<out.jsonl> build-macos-arm64-release/Mosh_artefacts/Release/Mosh.app/Contents/MacOS/Mosh --run-script
```

Script: `set_master_volume 0` → `create_track` → `add_test_tone_clip {2 s, 220 Hz}` →
`export_audio {bitDepth 32, range full, tail cut}` = `fixture.wav` → `remove_track` →
`create_track "FIX"` → `import_clip fixture.wav` → `export_audio` = `out-before-save.wav` →
`save_as` → `open_project` → `export_audio` = `out.wav`.

Results (44.1 kHz, 32-bit float, 88 200 frames each):

| Check | Result |
|---|---|
| `imports/fixture.wav` sha256 vs source | identical |
| `<project>/audio/fixture.wav` sha256 vs source | identical |
| `out-before-save.wav` vs `out.wav` (data chunk) | identical — save/reopen changes nothing |
| `out.wav` vs `fixture.wav` (data chunk) | **not identical**: diff RMS 1.10e-2 at lag 0; **exactly 0 at lag +2 samples** — the imported clip renders 2 samples (≈45 µs) late; no gain change (peak ratio 0.000 dB) |
| With the master at its default −3 dB (first run) | render differs by the master gain — always set 0 dB first |

Reading: import → save → reopen → render is **sample-exact except for a constant 2-sample
delay** of the whole clip. For a multitrack package every stem takes the same path, so
relative alignment is preserved; the offset is recorded, not hidden. Whether the delay is
clip placement rounding or a render-graph latency is not determined by this pass.

Pass rule for v0: (a) the two copies are byte-identical to the source; (b) the pre-save and
post-reopen exports are byte-identical; (c) the render matches the source at a constant lag
of ≤ 2 samples with zero residual, and the lag is written into the sidecar. A real song adds
the owner's listening acceptance and the immutable rough as the reference.

## 6. Song A — `greg` (delivered 2026-09-05, packaged and built the same day)

Owner-provided Live export (`~/Desktop/fall26/songA/`, originals untouched): seven aligned files,
92.6896875 s (4,449,105 frames), 48 kHz, 32-bit float stereo. Roles confirmed by the owner:

| File | Role | Peak / RMS (dBFS) | Notes |
|---|---|---|---|
| `greg.wav` | Master render **with** the owner's master chain | −1.5 / −16.2 | reference-only, immutable (`REF-rough`, muted) |
| `greg 4-Sampling Gregorian chants_Millibro_145BPM_SNIPPET_FIXED.wav` | the whole beat (one sample-based track) | −4.0 / −17.9 | imported from the byte-identical copy `import/beat.wav` (name hazard, §4) |
| `greg lead.wav` / `greg double.wav` / `greg background.wav` | vocal tracks, Return/Main effects OFF | −7.7 / −21.9 · −8.7 / −34.1 · −14.3 / −44.1 | first sound at 5.3 s / 7.0 s / 19.8 s |
| `greg A-Reverb.wav` / `greg B-Delay.wav` | return tracks printed separately | −26.3 / −43.1 · −14.0 / −34.4 | printed FX |

Package: `~/Library/Mosh/references/songs/greg/` — `source/` (as delivered + `SHA256SUMS.txt`),
`import/beat.wav`, `mixpackage.json` (v0, consent: owner, local use only), `mosh/greg.mosh`
(+ `mosh/audio/` consolidated copies, hash-equal to the sources) and `mosh/greg-correction-copy.mosh`
for the weekly correction. Never committed.

Build (headless, `--run-script`, 4 s): `set_master_volume 0` → seven `create_track` + `import_clip`
at `startSeconds 0` → `REF-rough` muted → `export_audio {48 kHz, 32f, full, tail cut}` → `save_as`
→ `open_project` → export again. Result: all seven clips 92.6896875 s, `autoTempo false`, master
0 dB; the two baseline renders are byte-identical (save/reopen changes nothing). Baseline (stem
sum, no master chain) vs the rough: peak −0.98 vs −1.46 dBFS, RMS −16.29 vs −16.22 dBFS — the
owner's master chain reduces peaks by ~0.5 dB at equal RMS. Not a null test.

Forms available: **stereo-plus-vocal** (Beat + Lead, optionally Double/Background) and
**vocal-multitrack** (all six active tracks). **Instrumental component access is not available**:
the beat is one printed track, so a preferred intervention that requires adjusting the 808 or the
melody independently cannot happen on this package. Owner follow-up (not blocking): export the
beat's components (drums / 808 / chant / hats) as separate tracks, or provide a second song.

Defect found during the build (filed for step 2): the original beat file name stalls every
headless render because the import path time-stretches it (§4). Workaround in place; the
canonical fix is for `import_clip` to leave auto-tempo off unless asked and to report clip
length and `autoTempo` in the result.

## 7. Frozen experiment inputs (2026-09-06)

Executes handoff §7.1 for the validation-first amendment. Nothing here has been run; this
section freezes the inputs **before** any candidate exists, so nothing can be tuned afterwards.
Context and the conflict record are in [RECONCILIATION-2026-09-06.md](RECONCILIATION-2026-09-06.md).

### 7.1 Identity and budget

| Field | Value |
|---|---|
| Experiment name (frozen before round 1) | **`mix-2026-09-songA-first-pass`** |
| Lane | `mix` |
| Round cap | **6**, per amendment clause 4. A fresh counter — it neither inherits nor resets the produce lane's 4 |
| Round definition (frozen) | One round = one listening sitting in which the owner hears a candidate set and files verdicts. R1 = V1 audition · R2 = revision 1 · R3 = revision 2 · R4 = recovery check + whole-song confirm. R5–R6 held: one for a single concealed-repeat re-listen if a comparison is genuinely unresolved, one for at most one predeclared development iteration |
| **Not** a round | The headless rehearsal; any technical-integrity check; any re-render caused by operator error (logged as a void attempt, re-run inside the same round) |
| New-output cap | **4** (handoff §7.2), allocated in §7.5 |
| Owner time | ≤3 scheduled active hours + 1 contingency for the whole experiment |

Renaming a backend, a song or an experiment does not reset an exhausted hypothesis.

### 7.2 The frozen artifact set

All work happens on **copies**. `~/Library/Mosh/references/songs/greg/` is read-only by policy
and re-hashed after every round; any change to a canonical file is a **stop**, not a note.

The package holds **19 files**: `SHA256SUMS.txt`, `mixpackage.json`, `import/beat.wav`,
`source/*.wav` (7), `mosh/greg.mosh`, `mosh/greg-correction-copy.mosh`, and `mosh/audio/*.wav` (7).
`SHA256SUMS.txt` covers only the seven `source/` files, so the freeze needs an extended manifest.
Per amendment clause 5 this must not become a new store: record it as a fenced block inside the
experiment note, containing

- `shasum -a 256` over all 19 files (and the assertion that each `mosh/audio/` copy is
  hash-equal to its `source/` or `import/` counterpart — spot-verified for two of seven on
  2026-09-05; the freeze checks all seven);
- the repo SHA the run executed at, and its relation to `origin/main`;
- **the sha256 and source SHA of the built binary.** A candidate produced by an unidentified
  build is unattributable. If provenance cannot be established, rebuild from the frozen SHA
  before round 1;
- `MOSH_ENABLE_SA3`, `SA3_MLX_DIR` and `SA3_SECONDS` **as actually set**.

Each round copies `mosh/` to a scratch directory as `greg-mix2609-r<n>-<condition>/`.

### 7.3 Listening ranges — measured, not invented

Method: RMS envelopes at 50 ms (`asetnsamples=n=2400`) per track, measured 2026-09-06 on this
machine. Reproducible with

~~~sh
ffprobe -v error -f lavfi -i "amovie='<file>',asetnsamples=n=2400:p=0,astats=metadata=1:reset=1" \
  -show_entries frame_tags=lavfi.astats.Overall.RMS_level -of csv=p=0
~~~

**Measured events** (nothing below is inferred from a file name or a tempo tag):

| Event | Time | Reading |
|---|---|---|
| Beat: sparse → full (drums in) | **5.200 s** | −26.8 → −16.8 dBFS |
| Beat: drums out, block 1 | **39.750 s** | −18.1 → −27.4 |
| Beat: drums in, block 2 | **44.900 s** | −27.9 → −22.7 → −17.6 |
| Beat: drums out, block 2 | **79.450 s** | −17.5 → −27.6 |
| Beat: drums in, block 3 | **84.650 s** | −26.6 → −16.8 |
| Lead vocal | 5.300 → 86.300 s, with a **4.10 s** hole at 39.200–43.300 | below −45 dBFS |
| Double vocal | 6.950–26.900 · 29.200–29.750 · 40.100–46.600 · 66.550–86.250 | at or above −50 dBFS |
| **Background vocal** | **19.800–25.950 s only** | at or above −55 dBFS |

The three drum entries are spaced 39.700 s and 39.750 s; 24 bars at 145 BPM is 39.724 s. So the
beat runs in **24-bar blocks**, and the file name's `145BPM` token is corroborated by the audio
rather than trusted.

**The owner named the hook (2026-09-06): measures 5–17 and 41–53.** Counting bar 1 at t = 0 in
4/4 at 145 BPM (one bar = 1.655172 s), those downbeats fall at 6.621 / 26.483 / 66.207 / 86.069 s
— and every one lands within half a second of a **measured** double-vocal edge:

| His measure | Downbeat | Measured double-vocal edge | Offset |
|---|---|---|---|
| bar 5 (hook 1 in) | 6.621 s | 6.950 s | +0.329 s |
| bar 17 (hook 1 out) | 26.483 s | 26.900 s | +0.417 s |
| bar 41 (hook 2 in) | 66.207 s | 66.550 s | +0.343 s |
| bar 53 (hook 2 out) | 86.069 s | 86.250 s | +0.181 s |

All four offsets are small and positive — exactly what a vocal entering just after the bar line
looks like through a 50 ms envelope. **The hook is the two doubled-vocal passages**, confirmed
independently of anyone's say-so. This also fixes the bar-to-second mapping for the whole song,
so his measure numbers and these measurements are now the same coordinate system.

**Frozen excerpts** — both revised 2026-09-06 to contain a hook *whole*. (The earlier
E1 of 14.100–39.750 s began at bar ≈9.5, a third of the way inside hook 1, which would have made
"the vocal gets lost in the hook" untestable.)

- **E1 (primary) = 6.000 → 39.750 s** (33.750 s). Contains **hook 1 entire** (bars 5–17), the
  only three-layer vocal window in the song (19.800–25.950), the double's exit at 26.900, and the
  sparse lead-only stretch to 39.200 — so the dense hook and the thin passage after it are inside
  one excerpt, which is what makes "forward, without making the beat feel smaller" judgeable.
  Both boundaries are verified three-way silent: at 6.000 the lead is in its 5.850–6.150 gap, the
  double has not entered, the background never has; at 39.750 the drums stop, the lead has been
  silent since 39.200 and the double since 29.750.
- **E2 (confirm) = 63.150 → 86.500 s** (23.350 s). Contains **hook 2 entire** (bars 41–53), the
  block-2 drum drop-out at 79.450 and the re-entry at 84.650. Boundaries verified three-way
  silent: 63.150 sits in a lead gap while the double is silent from 46.600; by 86.500 every vocal
  has stopped.
- **The whole song is always auditioned before final acceptance.** E1/E2 are for the A/B; the
  whole song is for the keep decision.

**The rule about bars, restated precisely.** There are two grids and only one of them is real
music. The **owner's** measures are bar 1 at t = 0, 145 BPM — the mapping above — and those are
safe to speak in with him. The **Mosh session's** transport ruler reads `120.0` BPM and is
meaningless here. So: never quote a Mosh bar number, never ask Moshi to act on one, and convert
the owner's measures to seconds with the table above before anything touches the engine.

### 7.4 The two controls

| Control | Artifact | What it isolates |
|---|---|---|
| **CTRL-IMPORT** | a fresh full-song `export_audio` of an untouched copy of `mosh/greg.mosh` (`bitDepth 32`, `range full`) | Any Mosh-side change. Baseline restated for 44.1 kHz below; a re-render that disagrees **stops the run** |

**Every headless render is 44.1 kHz, and that is not optional — measured 2026-09-06.** The
session's rate is the audio *device's* rate (`MoshOps.cpp:3171`), `--run-script` forces no-audio
(so `audioReady` is false and the device manager reports its 44100 default even when audio is not
disabled by env), and `export_audio` has **no** sample-rate parameter. So a 48 kHz package is
silently resampled to 44.1 kHz on every headless render, and there is no way to ask for 48.

This is why a re-render of CTRL-IMPORT does **not** reproduce §6's published peak. Measured with
a method first validated against a known file — the rough measures −1.44 / −16.26 here against
§6's published −1.46 / −16.22, agreeing to 0.04 dB:

| | Peak | RMS | Integrated |
|---|---|---|---|
| §6 baseline (48 kHz, device-backed run) | −0.98 dBFS | −16.29 dBFS | — |
| 2026-09-06 headless re-render (44.1 kHz) | **+0.02 dBFS** | **−16.34 dBFS** | −13.50 LUFS |

**The content is the same; the resample moved the peak.** RMS agrees to 0.05 dB — the same
tolerance the validated method shows on the rough — while the peak rises 1.0 dB because
resampling turns intersample peaks into real ones. Nothing about the mix changed.

Consequences, all frozen before any candidate is heard:

1. **The round-1 integrity gate is the 44.1 kHz figures above**, not §6's. A re-render that
   disagrees with *these* stops the run.
2. **Every candidate renders at 44.1 kHz**, so the resample is common to all four and cancels out
   of the comparison.
3. **G-STAGING-NULL now isolates one variable, not two.** SA3 stages at 44.1 kHz / 16-bit; since
   everything is already 44.1 kHz, the null isolates exactly the 16-bit truncation. Cleaner than
   designed.
4. **CTRL-OWNER is 48 kHz** and is resampled to 44.1 with the same single ffmpeg invocation used
   for every other file, so no candidate gets a conversion the others did not.
| **CTRL-OWNER** | `source/greg.wav`, the owner's own master chain | End-to-end usefulness. This is the comparison amendment clause 2 names |

**CTRL-OWNER is a listening reference only and must never be a null-test partner.** It is a
package file, not a project render, so it carries the constant **+2-sample** import→render lag
(§5). 42 µs is inaudible as timing but it destroys any sample-difference measurement. Any
measurement against it compensates the 2 samples explicitly and says so.

Better export preparation is never credited to a mixer, and an import defect is never blamed on
an audio model.

### 7.5 Conditions and the 4-output cap

| Condition | Disposition |
|---|---|
| **C — bounded conventional control** | **available.** One recipe over `load_builtin` (compressor / eq / lowpass / highpass) plus `set_plugin_param` and faders. Every preset choice and manual step logged verbatim as **operator work** — C can establish that simple processing suffices, never that the system engineered anything |
| **A — specialized automated processing** | **blocked, and dropped from round 1** (owner decision 2026-09-06). Two narrow reasons: no vendor account access, and no authorization to upload unreleased audio to a third party. Per handoff §7.2 a blocked condition **stays blocked** — it is never filled in after C and G are heard, and no substitute mixer takes its place. Unblocking needs a new dated authorization naming both reasons |
| **G — explicit generative alternative** | **available, constrained.** `create_render_layer` on the **Beat clip only**, **whole-clip** (see below), then `render_layer`. The vocal is structurally outside the operation |

**Output allocation, declared before any listening:**

1. CTRL-IMPORT full-song render
2. C full-song render
3. G full-song render (one seed)
4. **G-STAGING-NULL** — the Beat track exported, put through 48 k → 44.1 k → 16-bit → 48 k/32f
   with ffmpeg, re-imported, rendered full-song.

CTRL-OWNER consumes no slot. The fourth slot goes to the staging null rather than a second G
seed because SA3 stages through `stageWavRegionAt44k` (44.1 kHz / 16-bit) while C never leaves
48 kHz / 32-bit float — without the null, a verdict of "G sounds duller" cannot be separated
from a resample and a truncation. The owner may overrule this allocation, but **the choice is
frozen before he hears anything**.

**G is a WHOLE-CLIP render — corrected 2026-09-06 from source, before anything ran.** The
earlier design said "region-scoped", which would not have re-imagined the beat at all:

- A **sub-region** render is rejected from in-place apply (`MoshOps.Generative.cpp:1183` for wave
  clips, `:1232` for MIDI) and instead lands as a **new clip on a separate "Neural Renders"
  track** via `accept_render` (`:2283-2371`). Useful, but it is an addition, not a re-imagination
  of the Beat.
- A **whole-clip** render auto-applies in place (`:1070-1078`), capturing the pristine path in
  `originalSourceRef` (`:1199-1200`) so `reset_render_layer` (`:1298`) restores it exactly.

So G renders the Beat clip whole. That also **changes what the region-preservation promise
means**: there is no declared sub-region to preserve outside of, and the honest promise becomes
source preservation via `originalSourceRef` plus a proven `reset_render_layer` round-trip.
§7.8's region row stays **unverified until the rehearsal demonstrates that round-trip**.

**The 8-second figure was wrong as a cap, and the seams do not exist. Measured 2026-09-06.**
`SA3_SECONDS` (default 8.0) is the *initial latent grid*; retargeting is RoPE-free and the real
ceiling is `MOSH_SA3_MAX_CONTIGUOUS = 240 s` (`service/sa3/engine.py:41-42`). A whole-clip render
of the real 92.6896875 s Beat returns `coverage: "single"` — **one contiguous window, no
stitching, no crossfades, no seams** — in **22 s wall**, including app startup
([evidence](evidence/rehearsal-2026-09-06/SA3-PREFLIGHT.md)).

So the earlier caveat that "G's seams are a property of the method" is **withdrawn for this
song**: there are none. The only pipeline artefact left is the 44.1 kHz / 16-bit staging, which
**G-STAGING-NULL** isolates. **G is still a re-imagination, not a mix** — that part stands.

### 7.6 Reverb on Song A — what the control actually is

**Owner ruling D1, confirmed 2026-09-06** ([RECONCILIATION §1.1](RECONCILIATION-2026-09-06.md)):
the printed `FX A-Reverb` and `FX B-Delay` tracks *are the bounced output of the sends*. Stated
once and then re-confirmed on request, so revision 2 may rely on it. Their faders are the reverb
and delay amount.

`greg.mosh` contains **zero** `AUXSEND` / `AUXRETURN` nodes — 7 `level` plugins and one master
`volume`. So on this project:

- **Global reverb amount is controllable** — `set_track_volume` on `FX A-Reverb` is the send
  return's output level, which is exactly what a reverb amount is.
- **Per-source reverb is not available.** The wet from every source is summed into one printed
  file, so "less reverb *on the lead*" cannot be honoured. This is handoff §5's "processed stems
  are checkpoints, not automatically editable treatments", made concrete on real material.
- **The send lane is therefore not exercised by this experiment.** `set_send_level`'s one-undo
  repair stays covered by the synthetic fixture `repro/step1-fader-send-undo.jsonl`. Do not
  rebuild a Mosh reverb bus to manufacture a send — that would replace the owner's reverb with a
  builtin and change the sound away from his reference.

### 7.7 Revision sequence, mapped to real commands

Track names in the frozen project: **Beat, Lead, Double, Background, FX A-Reverb, FX B-Delay,
REF-rough** (muted). Routing predictions below are read from source at `d20fcede` and are
**verified by the rehearsal before the owner speaks**, not assumed.

**V1 — "This is the version I want to work from."** Not a command: a human selection made after
the blind audition, then unblinded. Recorded: chosen condition, the project copy and its sha256,
the render and its sha256, the answer-key row proving the choice was blind, the level-match
offset applied. Preferring CTRL-IMPORT or CTRL-OWNER is a **legitimate, informative outcome**
(handoff §8, "no mixing path helps"), not a reason to add a condition. If a candidate is chosen
only as a rescue target, the sequence is labelled **directed recovery**, not first-pass success.

**Revision 1 — "The vocal gets lost in the hook. Bring it forward without making the beat feel
smaller."** "The hook" now denotes a range both parties have named: bars 5–17 inside E1, and
bars 41–53 inside E2 (§7.3). The judgment is made on E1.

- *Predicted:* no match. Two sentences, no dB figure; `matchExplicitBalanceUtteranceV1` returns
  null and the turn falls to the router and the loop. His natural word "the vocal" also matches
  no track name and returns `unsupported/no_match`. **Do not rename his tracks to make this
  pass** — record the resolution miss.
- *The judgment the system does not have:* "forward" is at least four different moves here (Lead
  up, Beat down, Double up, FX A-Reverb down), and "without making the beat feel smaller" can
  only be checked by ear.
- *Procedure:* speak the sentence as written and record what happens. Then the operator
  translates it into **one** single-clause imperative in the owner's own words — `turn the lead
  up 2 dB` — which does match (`turn|bring|push|… up|down N dB`; `lead` whole-word-matches
  `Lead`, unique) and lands on `set_track_volume`, inside one `batch_begin`/`batch_end` with
  `turn_id` and `origin`, followed by an immediate readback.
- **Both utterances are recorded. The delta between them — how much explicit language the owner
  had to supply — is the headline measurement**, not a defect to hide.
- *Failure:* more than one command mutates · readback disagrees with the request · the loop
  invents a target · a send is auto-created · the transaction records `failed`.

**Revision 2 — "Better. A little less reverb, but keep the vocal balance we just got."**

- *Predicted:* no match — there is no hedge-word vocabulary; the only relative-send form is
  `more|less <word> on <track>`. And even the matching phrasing `less reverb on the lead` routes
  to `send_level`, whose bus resolution reads `snapshot.buses`, finds it **empty**, and blocks
  with "No return bus matches reverb". Deterministic, every time, because the project has no
  buses.
- *Frozen mapping:* the served utterance is `turn the reverb down 2 dB` → `set_track_volume` on
  `FX A-Reverb` (word-split match on `reverb`; unique, since only `FX B-Delay` carries `delay`).
- *"Keep the vocal balance we just got" is not a command — it is a protection*, and on this
  project it is **checkable by hash**: the Lead / Double / Background `level` values in the saved
  `.mosh` must be byte-identical before and after. That check is the honest substitute for a
  promise the system cannot make.
- *Failure:* any other level moves · **the loop reaches for `load_builtin reverb` and adds a
  second reverb** (a real hazard — it has no way to know the existing reverb is printed) · the
  block is reported to the owner as a bare refusal with no explanation.

**Recovery check — "Go back to the version before the reverb change", then save, close, reopen.**

- `undo` is agent-callable; plain `save` is agent-callable; **`open_project` is UI-only, so the
  close-and-reopen is a human action.** Record that honestly — it is not agent-demonstrated.
- Recorded: FX A-Reverb dB before/after undo · Lead/Double/Background unchanged · the saved
  file's sha256 · the reopened project's readback of all seven levels · a full-song render from
  the reopened project compared to the pre-reverb render.
- *Known hazard:* step 1's one unmet criterion — an idempotent replay of a **committed** envelope
  opens a second undo transaction, so one undo no longer returns the pre-edit state. It fires
  only on a retry of an already-successful request. **Guard: never re-send a request that
  reported success; count ledger records per round and require exactly one per accepted
  revision.** A replay voids that round's recovery claim and the round is re-run.

### 7.8 Preservation classes on this song

Signal path: `clip source → track level (gain+pan) → master volume → render`. No inserts, no
buses, no master plugins.

| Class | Tap | Promise | Test |
|---|---|---|---|
| **Source** | files on disk | the 19 package files are unchanged | **hash**, total, no listening |
| **Treatment** | track output + project XML | unusually strong here: the whole vocal treatment is the processing already printed into the source files, plus ~15 numbers in the `.mosh` (seven `level` values, pans, one master volume) | **exact compare of the XML values** |
| **Region** | the Beat clip's source, plus the layer's declared `[start, end]` | G may change the Beat only inside its declared region; the 1 ms edge and stitch crossfades are **inside** that region | hash outside the region — **only once the splice-or-replace question is closed** (§7.12). Until then this promise is *unverified*, not *made* |
| **Perceptual** | master output | the vocal stays as clear and forward; the beat keeps impact | **listening only.** No hash |

**The shared-master warning, and why this song is the exception.** Handoff §5 warns that changing
the beat alters a shared nonlinear master processor, so an identical vocal file does not give an
identical audible vocal contribution. On this project that mechanism is **absent**:
`<MASTERPLUGINS/>` is empty and the master is a linear `volume`, so the output is `g · Σ(tracks)`
and the Lead's *contribution* is bit-identical no matter what happens to the Beat.

Three things that does **not** license:

1. It is a claim about the **signal**, not perception. Changing the beat changes masking; "the
   vocal is quieter now" can be true while its samples are identical.
2. **It becomes false the moment anything nonlinear touches the master.** Frozen: **condition C
   touches track inserts and faders only — nothing on the master.** If C needs a master
   processor, that is a different experiment.
3. It is already false for CTRL-OWNER, which carries the owner's master chain.

**Two-source authority.** The beat is one printed track: vocal-versus-instrumental work is fully
authorised; **bass-versus-drums inside the beat is not possible.** If a revision needs it, that
is a disclosed limitation and a request for the beat's own stems — not a reason to reach for
source separation.

### 7.9 Listening protocol

1. Every condition and CTRL-IMPORT renders **full song, once**. E1 and E2 are then cut from those
   renders with a **single identical ffmpeg command per excerpt** applied to every file, so
   alignment is bit-exact across conditions, with an identical 10 ms fade at both edges:
   `-af "atrim=start=6.0:end=39.75,asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=33.74:d=0.01"`
   for E1, and `atrim=start=63.15:end=86.5` with `afade=t=out:st=23.34` for E2.
   (`asetpts` matters — without it `atrim` leaves the original timestamps.)
2. **Loudness match.** Measure integrated loudness with
   `ffmpeg -i <clip> -af ebur128=peak=true:framelog=quiet -f null -`. **The reference is fixed in
   advance and by rule: CTRL-IMPORT** — not the loudest, not the median, not a candidate. Apply
   `gᵢ = I_ref − Iᵢ` rounded to 0.1 dB with `-af volume=<g>dB`, output float. Re-measure and
   assert `|Iᵢ − I_ref| ≤ 0.2 LU`; a candidate whose own limiter shifts its measurement is
   **recorded with its residual and used anyway**, never iterated to convergence in silence. If
   any true peak exceeds −1.0 dBTP, lower **all** copies by the same further offset.
3. **Blind labelling.** Labels assigned by `sha256("mix-2026-09-songA-first-pass:<round>:<index>")`,
   **computed before any file is measured**, so the order is provably independent of any score.
   Layout `<root>/A/A.wav`, `<root>/B/B.wav`, … Page via
   `python3 scripts/fms-killshot/make_listening_page.py <root>` — the generic one. **Not**
   `render_blind_gate_c.py`, which is hard-coded to generated beats. **`answer_key.json` lives one
   directory ABOVE the served root**, never inside it.
4. **Three questions per revision, asked separately, before unblinding:** *Did the requested
   change help? Did the protected aspects remain acceptable? Would you keep this and continue the
   song?* "No meaningful difference", "neither acceptable" and "uncertain" are first-class answers
   and are recorded without extracting a winner. A concealed repeat may be inserted **once**, only
   when a comparison is genuinely unresolved and the answer changes the decision; it counts **0**.

**Rule 3 firewall** — this sentence goes in the run record verbatim: *the loudness measurement is
used only to compute a playback gain; that gain is applied to every candidate including the ones
that will lose; no candidate is excluded, reordered, annotated or promoted on the basis of any
measurement; and the offsets live in the answer key, which the owner does not see until after he
has rated.* Equalising playback level is not ranking.

Technical checks establish file validity, target correctness, source retention and restore
behaviour. **They do not determine musical preference.** A hard-preservation failure blocks
promotion regardless of how good it sounds; a safely playable failed candidate stays visible in
the evidence record. No silent re-rolls, no unreported rescues.

### 7.10 Filing rows — existing path, existing format

~~~sh
python3 scripts/produce/capture-correction.py \
  --run greg-r1-C --rating pass_with_notes --verdict "<his one sentence>" \
  --note "lane: mix" --note "experiment: mix-2026-09-songA-first-pass round 1" \
  --note "song: greg" --note "section: E1 6.000-39.750 s (hook 1, bars 5-17)" --note "condition: C" \
  --note "blind label: B" --note "level-match: -1.3 dB (ref CTRL-IMPORT, residual 0.05 LU)" \
  --note "q1 helped: yes / q2 protected: yes / q3 keep: yes"
~~~

Rating vocabulary is exactly `pass | pass_with_notes | fail`; the correction id is
`slugify(--run)`, so run ids must be unique and must **not** encode the blind label. Mapping,
frozen: keep and continue → `pass` · keep with reservations → `pass_with_notes` · would not keep
→ `fail` · **"uncertain" files no row** and counts 0 — coercing it would manufacture a label,
which amendment clause 4 forbids.

Rows are filed **only after unblinding**, with the true condition in `--run`. These will be the
project's first non-zero mixing rows (census today: 14 counted, all composition). The 25-row gate
stays unmet and **nothing in this experiment may depend on it being met**. The same activity
satisfies Rule 1: one real mix action corrected, with a rating and a lesson.

### 7.11 Failure modes and their guards

| Failure mode | Guard |
|---|---|
| **Ledger latch** — a failed or interrupted skill transaction kills the deterministic lane at the next launch and the owner's bare refusal is recorded as a musical failure | One **fresh session directory per round**; inspect `agent-transactions.jsonl` after every revision and assert every id's last record is `committed` or `rolled_back`. A non-terminal record is a **stop** |
| **Naming miss burns a round** — "the vocal" resolves to nothing and the round measures name resolution instead of mixing judgment | Pre-flight the exact utterance list through the pure matcher and resolver, and **write the prediction into this section before he speaks**. A predicted miss is data; a surprise miss is a lost round |
| **Second reverb added** — the loop calls `load_builtin reverb`, not knowing the existing one is printed | Frozen: the revision arm and G may not call `load_builtin`. Detect by diffing the plugin inventory in the saved `.mosh` — 1 `volume` + 7 `level`, plus only C's declared inserts |
| **Loudness confound** | §7.9 step 2 |
| **G staging confound** | G-STAGING-NULL, §7.5 |
| **A candidate is attributed to the wrong backend.** `render_layer` returns `{"cache":"miss","status":"ready"}` and names no backend; `~/Library/Mosh/logs/service.log` is shared across worktrees, so its tail describes other people's services, not your job. Chasing those two during the 2026-09-06 pre-flight produced a confidently wrong "this is a fake render" conclusion that had to be retracted | **Every generative candidate carries its own `renders/<layerId>/output_manifest.json`**, whose `adapter` field is the only authoritative record of what produced it. Also record `coverage` (`single` = contiguous, `stitch` = seams) and the seed. To tell determinism from a passthrough, change **one** input — the seed — and confirm the audio changes. See [evidence/rehearsal-2026-09-06/SA3-PREFLIGHT.md](evidence/rehearsal-2026-09-06/SA3-PREFLIGHT.md) |
| **A render's quality score leaks into selection.** Every manifest carries `pq`, `pq_base`, axes `{CE, CU, PC, PQ}` and a `reasoning` string | Amendment clause 6: **no score may rank, filter, select or suppress a candidate before the owner has heard it.** Recording it in the manifest is fine; nothing in the experiment may read it, and the listening page must never surface it |
| **Master at −3 dB** — a fresh session default makes a whole condition arrive quiet and read as "smaller" | Before every render, assert the master `volume` literal in the copy (`0.740818202495575` = 0 dB) |
| **Auto-tempo stretch** — any file whose name carries a BPM token is stretched on import (§4) | No file this experiment creates carries a `<digits>BPM` token; after every round assert `autoTempo` false and every clip length 92.6896875 s |
| **Double undo from an idempotent replay** | §7.7, recovery check |
| **Order anchoring** | Deterministic permutation salted with the round number; key outside the served directory; at most one concealed repeat |
| **Condition A quietly backfilled** after C and G are heard | §7.5: blocked stays blocked; unblocking needs a new dated authorization |
| **Operator judgment credited to C** | Every preset and manual step logged verbatim; C's claim is bounded to "simple processing was or was not sufficient" |
| **Excerpt shopping** — the range is nudged to where a favoured condition wins | E1/E2 are frozen here, before any candidate is rendered, from measured envelopes only |
| **CTRL-OWNER used as a null-test partner** | §7.4: listening reference only; the +2-sample lag is compensated explicitly in any measurement |
| **Unidentified binary** | §7.2: hash it, or rebuild from the frozen SHA |

### 7.12 Open items — named, not assumed

| Item | Why it matters | Closed by |
|---|---|---|
| ~~Does a sub-region render splice or replace?~~ | — | **ANSWERED FROM SOURCE 2026-09-06**: neither. A sub-region render lands as a new clip on a separate track; only a whole-clip render applies in place. G was redesigned to whole-clip (§7.5). What remains open is narrower: **does the whole-clip `reset_render_layer` round-trip actually restore the Beat byte-for-byte** — the rehearsal demonstrates it |
| Whether a merely *declined* utterance writes a ledger record | This experiment produces declines by design; if declines poison the session, the ledger repair becomes mandatory | the rehearsal |
| ~~Whether `--run-script` can open an existing `.mosh` and drive `batch_begin`~~ | — | **CLOSED 2026-09-06**: it can. `open_project` and `save_as` are dispatched natively without the UI-only filter (`MoshOps.cpp:929,931`), and `tests/crash-residue-smoke.sh` already drives `open_project` across a restart |
| SA3 wall time and memory for a stitched multi-window region; `SA3_SECONDS` as actually installed | Sets whether G fits the unattended target and whether 4 outputs are affordable | the rehearsal |
| Provenance of the built binary | §7.2 | the freeze manifest |
| ~~Which range is "the hook"~~ | — | **CLOSED 2026-09-06**: bars 5–17 and 41–53, corroborated against the measured double-vocal edges (§7.3). Both are now contained whole, in E1 and E2 respectively |
| ~~Whether the printed FX tracks are the bounced send returns~~ | — | **CLOSED 2026-09-06**: confirmed by the owner on request (§7.6) |
| Whether this experiment or the existing step-4-early probe is named first, and whether they share one counter | Both draw on the same listening budget and cap | owner decision (conflict C3) |
