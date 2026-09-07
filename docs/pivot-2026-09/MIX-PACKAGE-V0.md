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
| Sample-rate mismatch with the session | **Unverified** — match the session rate at export time |
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

The three drum entries are spaced 39.700 s and 39.750 s. At 24 bars per block that is
**1.6552 s per bar ≈ 145.0 BPM, anchored at t₀ ≈ 5.20 s** — measured twice, independently,
agreeing to 50 ms. Recorded as corroboration only; nothing below depends on it.

**Frozen excerpts:**

- **E1 (primary) = 14.100 → 39.750 s** (25.65 s). Both boundaries sit in verified three-way
  silence: at 14.100 the lead is in its measured 13.950–14.400 gap and the double is at −inf
  from 13.250; at 39.750 the drums stop, the lead has been silent since 39.200 and the double
  since 29.750. E1 contains the full-band beat, lead + double, **the only three-layer vocal
  window in the song** (19.800–25.950), the double's exit at 26.900, and a lead-only stretch to
  39.200. That dense-passage-versus-sparse-passage contrast inside one excerpt is what makes it
  the right range for revision 1.
- **E2 (confirm) = 63.150 → 79.600 s** (16.45 s). Starts in a lead gap (63.000–63.300) while the
  double is silent (46.600–66.550); covers the second doubled passage from its 66.550 entry and
  the block-2 drum drop-out at 79.450; ends in three-way silence.
- **The whole song is always auditioned before final acceptance.** E1/E2 are for the A/B; the
  whole song is for the keep decision.

**Two rules that follow from the material:**

1. **Every time is in seconds. Never bars.** The session tempo is `120.0` BPM while the audio's
   own grid is ~145. The transport's bar ruler is not the song's bars — do not say "bar 12" to
   Moshi or to the owner on this project.
2. **The owner names the hook.** Which of E1 and E2 is "the hook" is his word, given in one
   sentence before V1 is selected and recorded verbatim. The background layer occurs exactly
   once in the song, which is not how a repeating chorus behaves, so the label is not inferable
   from the audio. Revision 1's wording must point at a range both parties named.

### 7.4 The two controls

| Control | Artifact | What it isolates |
|---|---|---|
| **CTRL-IMPORT** | a fresh full-song `export_audio` of an untouched copy of `mosh/greg.mosh` (48 kHz, `bitDepth 32`, `range full`) | Any Mosh-side change. Its published baseline is peak −0.98 / RMS −16.29 dBFS (§6); a re-render that disagrees **stops the run** |
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
| **G — explicit generative alternative** | **available, constrained.** `create_render_layer` on the **Beat clip only**, region-scoped, then `render_layer`. The vocal is structurally outside the operation |

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

G's region is chosen so its seams land where the arrangement already has a hole: start where the
beat is sparse, end at the block-1 drum drop-out. SA3's window is 8 s, so a longer region is
covered by `coverage: "stitch"` — independent renders crossfaded at 1 ms. **G is a
re-imagination, not a mix**; its seams are a property of the method, not a defect to litigate.

### 7.6 Reverb on Song A — what the control actually is

**Owner ruling D1** ([RECONCILIATION §1.1](RECONCILIATION-2026-09-06.md), chat 2026-09-06,
`reported` — a structural claim about his own Ableton session that no file here can corroborate):
the printed `FX A-Reverb` and `FX B-Delay` tracks *are the bounced output of the sends*. Their
faders are the reverb and delay amount. **Confirm this explicitly before revision 2 relies on
it**; if those tracks turn out to be something else, revision 2's target changes.

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
smaller."**

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
   `-af "atrim=start=14.1:end=39.75,asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=25.64:d=0.01"`.
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
  --note "song: greg" --note "section: E1 14.100-39.750 s" --note "condition: C" \
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
| **Does a sub-region `render_layer` splice back into the clip, or replace the clip's source?** | If it replaces, G's alignment and the whole region-preservation promise collapse. **The single most important pre-flight for G** | the rehearsal |
| Whether a merely *declined* utterance writes a ledger record | This experiment produces declines by design; if declines poison the session, the ledger repair becomes mandatory | the rehearsal |
| Whether `--run-script` can open an existing `.mosh` and drive `batch_begin` against it | Both existing fixtures build projects from scratch; decides whether the rehearsal is possible at all | the rehearsal |
| SA3 wall time and memory for a stitched multi-window region; `SA3_SECONDS` as actually installed | Sets whether G fits the unattended target and whether 4 outputs are affordable | the rehearsal |
| Provenance of the built binary | §7.2 | the freeze manifest |
| Which of E1 and E2 is "the hook" | Revision 1 must point at a range both parties named | one sentence from the owner |
| Whether the printed FX tracks really are the bounced send returns (ruling D1) | Revision 2's whole target rests on it, and nothing in this repository can corroborate a claim about his Ableton session | owner confirmation, before revision 2 |
| Whether this experiment or the existing step-4-early probe is named first, and whether they share one counter | Both draw on the same listening budget and cap | owner decision (conflict C3) |
