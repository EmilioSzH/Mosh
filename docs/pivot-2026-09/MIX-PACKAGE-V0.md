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
