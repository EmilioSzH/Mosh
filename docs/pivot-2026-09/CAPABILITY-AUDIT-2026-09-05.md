# Capability audit at commit 0da6c638 — recording + mixing pivot (2026-09-05)

Documentation-only pass executing handoff v4 §6. Every row is resolved at
`0da6c638eaa719296e3c97650a405f1afc9e8f53` (branch `claude/music-generation-workflow-19ca09`,
2026-09-04 04:56 −0700). Historical line numbers and test counts are not certified; where a
line is quoted it was read in this pass. Status vocabulary: **verified** (read in source or
observed by a run in this pass) · **reported-not-rerun** · **inferred** · **failed** ·
**absent** · **blocked**. Each claim separates *engine capability / snapshot state /
model-visible state / UI reachability / audible behaviour*.

Runs performed (all headless, disposable `_harness/*` sessions, outputs in the session
scratchpad; scripts kept under `repro/`; parsed result lines, txn stamps, hashes and the census output filed under `evidence/2026-09-05/`): routeAsk and balance-matcher one-liners;
`vitest run src/agent/loop/router.test.ts src/agent/loop/loop.test.ts` (46/46 pass at HEAD,
947 ms); `repro/step1-fader-send-undo.jsonl` plus five variants; `repro/mixpackage-fixture.jsonl`
twice (master default, master 0 dB); the label census script; the Song A package build and its
nine diagnostic variants (`evidence/2026-09-05/songA-build.txt`). Binary:
`build-macos-arm64-release/Mosh_artefacts/Release/Mosh.app/Contents/MacOS/Mosh` (mtime
2026-09-04 05:07, after HEAD's commit; no source change since — build provenance
reported-not-rerun). No GUI launch, no `--selftest` battery, no gate run in this pass.

## 1. P0 — workspace (verified)

| Item | Finding |
|---|---|
| Repository / worktree | `/Users/emiliosanchez-harris/Mosh/.claude/worktrees/affectionate-banach-08583b`; shared git dir `~/Library/Mosh/repo/ClaudeMosh.git` (listed by `git worktree list` as the `v3redesign` entry — never a target) |
| Branch / divergence | `claude/music-generation-workflow-19ca09` @ `0da6c638`; ahead 1 of its origin branch; 3 ahead / 0 behind `origin/main` (`eab9d7eb`, PR #694); last fetch 2026-09-04 21:35 |
| Pending changes at start | 4 untracked docs: the two Claude-web briefs, `MOSHI-EDIT-PROBE-2026-09-04.md`, `produce-r4-2026-09-04.meta.json`; no modified tracked files |
| Other worktrees | 9 detached scratch trees under `/private/tmp` (merge/review leftovers); untouched |
| Runbook | `AGENTS.md` (verify-before-merge: `scripts/auto-loop/gate.sh native <worktree> origin/main`; hard rules; archive safety) + `CLAUDE.md` (post-pivot paragraph, invariants) |
| July status-doc claims (origin/main is true HEAD; Documents checkout stale; CI billing-blocked) | reported-not-rerun; nothing reset or relocated |
| Bundle vs repo | handoff and brief match their manifest hashes; the bundle's addendum (`3e60fdff…`, 251 lines) predates the repo copy `docs/produce-corrections/CLAUDE-WEB-BRIEF-2026-09-04-ADDENDUM.md` (260 lines), which contains the second verification pass the handoff §1 calls "cut off": 20 claims confirmed, 2 refuted on details (`moshFx` readout exists in the snapshot; `open_project` scope), `set_send_level` recorded as disputed, no sidechain, no master-bus automation, no unit mapping |

## 2. P0 — one useful edit

### 2.1 Product surface (UI reachability)

| Lead | Status | Evidence |
|---|---|---|
| Single-clause imperatives refused before any model call | **verified** | `ui/src/agent/loop/router.ts` `routeAsk` returns `"loop"` only on sequential markers (`then`, `;`, `after that`, `next`, `finally`), creative verb+object, vague-taste words, tempo phrases, ≥2 `and`, or >90 chars. Run: `turn the clap down 3 dB`, `sustain the stabs`, `make the B section darker`, `halve the hats in bar 7`, `add a counter phrase`, `lower the vocal 3 dB`, `more reverb on the vocal`, `drop the drums 3 dB` → all `single`; `sustain the stabs, then turn the clap down 3 dB` → `loop`. `ui/src/ui/AgentComposer.tsx` run() order: issue report → skill continuation → section rework → fast path → studio-skill runtime → loop only if routed → "I can't do that reliably yet." (`studio_skill_unsupported`). Live GUI proof at the same SHA: `docs/produce-corrections/MOSHI-EDIT-PROBE-2026-09-04.md` seq 278–285 |
| Deterministic balance lane | **verified** | `native/matchers.ts` `matchExplicitBalanceUtteranceV1`: `set the vocal to -13 dB` → `{set_level, "the vocal", -13}`; relative wording (`lower … 3 dB`, `turn … down 3 dB`, `more reverb …`, `another 3 dB`) → `null` |
| "add a …" hijack | **verified** | `native/loadNamedPlugin.ts` regex `(load|add|insert|put) (the|a)? (plugin)? X`; `MAX_PLUGIN_CATALOG_V1 = 64`; this machine's catalog has 1,198 entries → "the plug-in catalog returned invalid or oversized data" (`studio_skill_blocked`, seq 286), no fall-through to the router. `cmdListPlugins` (`src/moshops/MoshOps.Plugins.cpp`) has no paging arguments |
| Double issuance | **inferred** (code + log) | probe seq 289–294: A, B, A, B in one txn, two batches ~20 ms apart, one shim reply. `ui/src/agent/loop/parse.ts` keeps both top-level `commands` and `plan[].commands`; `loop.ts` unshifts `first.commands` as a "start" step ahead of a plan that already carries them. No `loop.test.ts` case covers a reply with both fields (14 tests at HEAD) |
| Result ids invisible to the model | **verified** | `ui/src/agent/loop/taskExec.ts` maps step results to `{command, ok, error}` — `data` (trackId/clipId/padId/bus) dropped |
| Loop budgets | **verified** | `loop.ts` defaults maxSteps 8 / maxPlannerCalls 3 / maxStepCalls 8 / 180 s; produce lane 24 / 8 / 24 / 900 s (`producePrompt.ts`) |

### 2.2 Model-visible state vs snapshot vs engine

| Quantity | Engine | Snapshot | Model-visible (`ui/src/agent/sessionRender.ts`) |
|---|---|---|---|
| Track fader/pan/mute/solo | yes | `volumeDb`, `pan`, `mute`, `solo` | printed per track |
| Sends | yes | `sends[{bus, db, mute, pan, preFader, automation{…}}]` | `sends:[bus db]` only |
| Plugin params | yes | first **16** per plugin (`MoshOps.cpp`: `jmin (16, p.getNumAutomatableParameters())`), `name` + normalised `value` (+ automation points); no label/units/text | names only (`fx:[…]`) |
| Pad gain, clip gain, automation, note counts, section levels | yes | pad gain / clip gain present; automation on params | **not printed** |
| Audio-derived readouts | meters/spectrum (GUI timer) ; `moshFx` readout for auto-tune/feedback | `moshFx` yes; meters no | none |

### 2.3 Trace: one builtin gain edit and one vocal reverb send (headless, verified)

Script `repro/step1-fader-send-undo.jsonl`: `create_track "Vocal"` → `add_test_tone_clip` →
`create_bus "Reverb"` (returns `busNumber 0`, return track) → `load_builtin {type: reverb}`
on the return → `add_send −12` → `set_track_volume −10` → snapshot → `batch_begin … set_track_volume −13 … batch_end`
→ snapshot → `set_send_level −18` → snapshot → `undo` → snapshot (+300 ms) → `undo` → snapshot
→ `export_audio` → `save_as` → `open_project` → snapshot. Exit 0, 16 commands, 0 failures.

| Stage | Fader (`volumeDb`) | Send (`sends[0].db`) |
|---|---|---|
| base | −10.0 | −12.0 |
| after batch fader edit | −12.999998 | −12.0 |
| after `set_send_level` | −13 | −18.0 |
| after undo #1 (immediate and after 300 ms pump) | −13 | **−18.0 (stale)** |
| after undo #2 | **−13 (not restored)** | −18.0 |
| after `save_as` → `open_project` | −13 | −12.0 |

Isolation variants: plain fader edit → one undo restores −10 immediately (**verified**);
batched fader edit → same (**verified**); `set_send_level` alone → readback stays −18 after
undo for ≥1.8 s of pumping (**failed**); fader then send, three undos → undo #1 and #2 change
nothing visible, undo #3 restores the fader, send readback still −18, reopen shows send
−12 (**failed**: the send edit consumes two undo steps and its readback is stale until
reload); `set_send_mute`/`set_send_pan` → one undo each, readback stale, restored on reopen
(**failed** readback, tree restored). JSONL txn stamps in the harness log move
6→7(batch)→8(send)→7(undo)→9(undo) — the undo mirror registers a new id on the second undo.
Code path: `src/moshops/MoshOps.Mixer.cpp` `cmdSetSendLevel` → `beginTxn` → `te::AuxSendPlugin::setGainDb`
→ `gain->setParameter (…, sendNotification)` (pinned Tracktion, patches 0007/0008: gain is an
`AutomatableParameter` attached to CachedValue `gainLevel`); `cmdSetTrackVolume` instead performs
`SetFaderValueAction` through the UndoManager. The selftest only checks `set_send_level ok`
(`src/app/SelfTest.cpp` two call sites); it is **not** in the P6 undo matrix. This resolves
the addendum's dispute: **G14 class, verified by run**, and it is the first engine item of
the step-1 brief.

Audible behaviour: not established in this pass (offline renders exist: `base.wav`,
`undo.wav`, 32-bit float; the fader change is audible in principle; no listening claim).

### 2.4 Mixer mutate/restore allowlist (engine)

From the P6 table (`src/app/SelfTest.cpp`, "matrix: undo — every declared mutating command
restores on ONE undo", plus save/reload round-trip): `set_track_volume`, `set_track_pan`,
`set_track_mute`, `set_track_solo`, `set_track_active`, `set_clip_gain`, `set_clip_mute`,
`set_clip_fade`, `load_builtin`, `bypass_plugin`, `set_plugin_param`, `add_automation_point`,
`set_master_volume`, `set_master_pan`, `load_master_builtin`, `create_bus`, `add_send`,
`rename_track`, clip/note ops. **Not in the table:** `set_send_level/mute/pan` (failed above),
`set_drum_pad`, 4OSC presets, automation-curve ops, `remove_plugin`, `load_preset`.
`rename_bus` non-undoable by design; no sidechain command; automation is track-scoped
(no master-bus automation); no Hz/dB→normalised mapping anywhere.

## 3. P0 — store and weekly correction (verified)

**Writer** `scripts/produce/capture-correction.py` `build_meta()`: exactly `{id, created,
ask, prompt_version, run, reference, rating, user_verdict, notes[], promoted_to}`; `rating ∈
{pass, pass_with_notes, fail}`; `from_verdict_json` copies candidate→id/run, date, reference,
rating, user_verdict, notes and **drops every other key**; `rating: null` rows skipped;
`prompt_version` auto-stamped from `PRODUCE_VERSION`. **Readers:** `ui/src/agent/loop/producePrompt.test.ts`
lesson-tag test (needs `notes[]` for tagged ids only); `scripts/produce-lane/build-package.py`
writes verdict.json templates and never reads meta. The hand-written r1–r4 files add
`candidates[]`, `runs{}`, `analysis{}` — tolerated unknown keys. Correction path this week:
usable (`--run` or `--verdict-json` mode; promotion is manual by README).

### 3.1 Verdict-row census (definition: amendment §2; audio paths checked on disk)

| Row | Lane | Blind | Count | Reason |
|---|---|---|---|---|
| `gen001-808-register` | compose (flywheel) | n | 1 (flag) | fail, 10 notes; audio only via the external `~/AbletonMONSTER` set (not verified here) |
| `mac-r0-001` | compose (flywheel) | n | 1 (flag) | pass_with_notes, verdict + 7 notes; rated candidate external |
| `produce-r1` × 7 (`B-*-live3-sonnet`, `-live4-opus`, `-live5-sonnet`, `B-reference-notes-moshsounds`) | compose | n | **straddling ×7** | each named fail in `user_verdict`; 8 notes are round-level; `round1-failed/<run>/mix.wav` present for 6 (mosh/labkit pairs share one run dir), reference-notes render not found |
| `produce-r2` × 6 | compose | n | 6 | per-candidate rating + note; `round2-judged/<run>/mix.wav` present |
| `produce-r3` r3-opus-s3-kitmatched, -labkit | compose | n | 2 (flag) | pass_with_notes + note; `round3-flawed/` present; `analysis` says the render was not the intended candidate (replay id drift) |
| `produce-r3` r3c-kitmatched | compose | n | 1 | pass_with_notes "clap is too quiet"; audio present |
| `produce-r3` r3c-labkit | compose | n | **straddling** | `pass` with `notes: []`; audio present |
| `produce-r4` × 3 | compose | n | 3 | fail + verbatim note; symlinks resolve to `runs/r4-*/mix.wav`; file untracked at HEAD |
| `produce-ab/2026-09-04/verdict.json` × 3 | — | — | 0 | copies of r4 |
| `produce-ab/2026-09-02/verdict.json` × 2, `verdict-r2.json` × 6 | — | — | 0 | templates (rating null) / raw source of r2 |
| `partial-runs/*`, `round3-flawed/r3b-*`, smoke runs | — | — | 0 | rendered or aborted, never rated |

**Totals:** counted **14** (flywheel 2, r2 6, r3-flawed 2, r3c 1, r4 3); straddling **8**;
range **14–22**; strict (drop external-audio and mis-rendered rows) **10**. Mixing rows 0,
record rows 0, blind rows 0, real-song rows 0. All historical rows are composition evidence.

### 3.2 §5 fields the existing format supports without migration

| Field | Decision |
|---|---|
| `run_id` | supported — `run` (writer) and `runs{}` keys (hand convention) |
| `prompt_version` | supported but stamped with `PRODUCE_VERSION`; mix/loop rows hand-set `"not applicable (loop lane)"` |
| `turn_id`, `origin` | tolerated as unknown keys (no reader rejects them); the writer will not emit them → hand-add or `notes` line; structured emission deferred |
| song | `reference` (free text, copied by the writer) |
| section, lane, blind, level-match offset, accept/revert/adjust, experiment/round | `notes` lines (`lane: mix`, `blind: yes`, `level-match: …`, `experiment: … round n`); the `rating` enum is never renamed |

## 4. P0 — real-song handoff (verified by run)

`import_clip {file, trackId?, name?, startSeconds?}` (`src/moshops/MoshOps.Clips.cpp`): byte
copy into `<session>/imports/`, clip at `startSeconds`; no fade / pitch / normalize; without
`trackId` the first audio track. **Corrected 2026-09-05 (verified by run):** when the file name
carries a tempo token (Song A's beat, `…_145BPM_…wav`), the engine's loop-info parser marks the
clip **auto-tempo** and time-stretches it to the session tempo (clip length 92.69 s → 112.00 s,
`autoTempo: true` in the snapshot); a stretched clip needs a proxy render that never completes
headless, so `export_audio` fails with "export render stalled" after 20 s. The same bytes under a
plain name import unstretched and render in 2 s. `set_clip_warp {autoTempo:false}` unblocks the
render but leaves the stretched clip length. Model-visible: nothing (the session block does not
print `autoTempo` or clip length). Consequence: the Mix Package renames tempo-tagged files for
import and records the original name and hash; the import defect is filed for step 2. `export_audio {file,
format wav|aiff|flac, bitDepth (32 = no dither), sampleRate, range full|loop|custom,
start/end, tail cut|include}` (`MoshOps.ProjectIo.cpp`, `ExportRange.h`); `export_stems`
(post-fader, no master); `bounce_track`. `.mosh` = Tracktion edit XML; `save_as` consolidates
audio into `<project>/audio/`; `open_project` refuses newer `formatVersion` (PRJ-FMT). No
stems/package concept; no immutable/reference flag.

Fixture (`repro/mixpackage-fixture.jsonl`, master set to 0 dB): `imports/` copy and
`audio/` copy byte-identical to the source; pre-save and post-reopen renders byte-identical;
render vs source **sample-exact at a constant +2-sample lag** (diff RMS 0 at lag +2, 1.1e-2
at lag 0; peak ratio 0.000 dB). With the fresh session's default master (−3 dB) the render
differs by that gain — always set the master before level comparisons. Full spec and pass
rule: [MIX-PACKAGE-V0.md](MIX-PACKAGE-V0.md). Song A (`greg`): delivered by the owner 2026-09-05
(seven aligned 92.69 s Live exports, 48 kHz, 32-bit float), packaged under
`~/Library/Mosh/references/songs/greg/` and built into `mosh/greg.mosh` headless (see MIX-PACKAGE §6).

## 5. P0 — earliest judgment probe (designed; prerequisites steps 1–2, not recording)

**Facilities valid at HEAD:** offline renders (`export_audio` 32-bit, `export_stems`),
hand-computed whole-file peak / RMS (labelled RMS, not LUFS) / crest / stereo correlation /
centroid on those renders (numpy or the pure-Python readers used in this pass), per-stem
peak/RMS, `detect_clip_bpm {bpm, confidence}` (read-only), `set_master_volume` and
`normalize_clip` for level control. **Not valid as evidence:** `levels`/`spectrum` (GUI
timer, instantaneous, normalised, no time reference; aggregating them would be a new
collector), `service/quality_readout.py` `pq`/flags (a proxy; rule 3), CAP-001 peak
(record path only). **No audio route to any provider exists** (`service/brain_client.py`
and the `claude -p` shim are text-only); none is created.

**Experiment:** Song A stereo form; five predeclared bounded asks (vocal buried in the
chorus → fader; less low end under the vocal → highpass/EQ on the beat; vocal too dry → the
verified reverb send; harsh top → EQ shelf; vocal uneven → compressor); condition N = ask
as typed, condition M = ask + a pasted MEASUREMENTS block rendered from the baseline
render and its stems; one proposal per condition, no re-rolls; each applied to a fresh copy
and rendered; RMS level-match ≤ 0.2 dB via master gain on the listening copy (offset
recorded, never influencing the verdict); blind X/Y with a sealed key and one concealed
repeat (counts 0); verdict = preference + one sentence plus the existing rating per render,
filed via `capture-correction.py --verdict-json` with `notes` lines `lane: mix`, `blind:
yes`, `condition: …`, `experiment: mix-2026-09-stereo-vocal round 1`. Raw counts out of 5.
The probe never scores, ranks or selects. Allowed before 25 rows (amendment clause 5);
deferred: any in-loop measurement injection, a measure command, LUFS pipelines.

**Blockers:** Song A export + consent (owner, ≈30 min); step 1 (the five asks are refused
today; the reverb ask depends on the send-undo repair); step 2 stereo form accepted; no LUFS
(RMS match only); the shim exposes no temperature control (within-condition variance
bounded only by the concealed repeat). **Earliest calendar point:** rehearsal on a copy of
`~/Library/Mosh/produce-ab/2026-09-04/runs/r4-opus-s1/*.mosh` in week 2 (counts 0); owner
sitting end of week 3 – week 4 (Sep 26 – Oct 3).

## 6. P1 — capture, voice, remote

| Item | Status | Evidence |
|---|---|---|
| `arm_track` | verified | `src/moshops/MoshOps.Tracks.cpp` `cmdArmTrack`; undoable:false; result `{trackId, armed, applied, reason?}`; headless degrades to `applied:false` |
| `stop_recording` | verified | `cmdStopRecording`: takes land synchronously inside `transport.stop (discard, false)`; result `{applied, discarded, clips[]}`; CAP-001 peak of the landed file stored non-undoably; not undoable |
| `set_input_monitor`, `set_track_input`, `set_record_options` (punch in/out, quantise, merge/replace, retro-capture ≤60 s), `set_count_in`, `capture_midi` | verified | `MoshOps.Tracks.cpp`, `MoshOps.Record.cpp`, `MoshOps.TempoProject.cpp`; preferences undoable:false |
| `list_takes`, `set_current_take` (undoable), `keep_take` (undoable, optional `takeId`) | verified | `MoshOps.Tracks.cpp` |
| Take naming; explicit loop-record command | absent | none registered |
| Audio written to disk during the take | verified in the pinned engine source | `tracktion_WaveInputDevice.cpp`: `prepareToRecordTarget` opens an `AudioFileWriter` on the recording file; `WaveInputRecordingThread::addBlockToRecord` writes blocks on a dedicated thread; `flushAndStop` on stop; discard deletes. Mosh-side: not yet exercised by a crash test |
| Recovery contract (completed takes / committed frames / lost tail measured) | absent as a measured claim → **blocked** until step 3's crash test | only the A3 command-journal replay exists (below), which is not microphone audio |
| Behaviour on agent stall / cancellation / device loss | reported-not-rerun | the record path never depends on the agent (MoshOps is the only mutation path); device-loss handling not observed in this pass |
| Voice hold-to-talk STT → `voice_event` (`src/voice`) | **absent at HEAD; re-landable** | `src/voice` does not exist at HEAD; the only reference is a stale `runVoiceSmoke` declaration in `src/app/SelfTest.h`. History (verified in git): commit `1f133ce7` (2026-09-01, "defer microphone access until recording") deleted `src/voice/NativeSpeech.{h,mm}` (320 lines: SFSpeechRecognizer over AVAudioEngine, message-thread marshalling), `NativeSpeech_stub.cpp`, the `voice_*` bridge functions, `ui/src/agent/voiceInput.ts`, `handsFree.ts` and the composer mic button, together with the always-on mode, and made `NSSpeechRecognitionUsageDescription` **forbidden** by six build/release guards (`cmake/InjectInfoPlistKeys.cmake`, `cmake/MoshRemoteInfo.plist`, `scripts/release/check-plist-keys.sh`, `scripts/auto-loop/gate.sh`, `tests/privacy-manifest-test.sh`, `run-mosh.sh`). The engine opens the device with no input channels (`MoshEngine.cpp` `shouldOpenAudioInputByDefault() = false`), so a recognizer must own its own audio client. Re-land as press-and-hold only: [BRIEF-VOICE-HOLD-TO-TALK.md](BRIEF-VOICE-HOLD-TO-TALK.md) |
| iPhone companion phone takes | verified (source) | `src/remote/RemoteCompanionServer.cpp` POST `/take/start|chunk|cancel|finish` (PCM16 base64 chunks → `import_clip` on finish); `/command` is a pass-through; no utterance injection. Contradicts `ARCHITECTURE.md` "the iPhone is a controller, not an audio recorder". Not an iPhone workstream |

## 7. P1 — persistence / recovery

| Item | Status | Evidence |
|---|---|---|
| Autosave | verified | `src/Main.cpp` GUI-only `AutoSaveTimer` every 30 s (`saveIfDirty`) + save-on-quit; headless has neither |
| ARCHITECTURE.md contradiction | resolved: **absent at HEAD** | `ARCHITECTURE.md` at HEAD contains no autosave statement; the contradiction the handoff quotes is in the June doc |
| Crash recovery of arrangement commands | verified (source) | A3 `recovery-journal.jsonl` + `recover_session` / `discard_recovery`; snapshot `session.recoveryAvailable` / `recoverableCount` |
| Format / version policy | verified | snapshot `kSnapshotSchemaVersion`; project `formatVersion` (PRJ-FMT selftest: newer files refused); no migration framework — any new durable object needs the smallest compatible policy with old-file fixtures |
| Atomic save / backup | not determined in this pass | `save_as` observed working; write strategy not read |
| Plugin state on reopen | reported-not-rerun | presence-only per the addendum; not re-exercised |

## 8. P1 — plugin controls and licenses

| Item | Status | Evidence |
|---|---|---|
| Parameter names/labels/text | partial | snapshot exposes `name` + normalised `value` for ≤16 params; no `getLabel`/`getText` exposure; no listing command |
| Host vs plugin bypass | verified | `bypass_plugin` → `plugin->setEnabled (! bypassed)` (host-side) |
| `load_preset` | verified | `.vital` (Vital) and 4OSC `.json` only; custom undo action; async apply |
| Groups | verified | native only (group tracks broadcast fader/pan/mute/solo attributes); not agent-callable |
| Clip pitch command | absent | — |
| Pinned dependencies | verified | Tracktion `2877b621…`, JUCE **8.0.12** (`juce_StandardHeader.h` 8 / 0 / 12) via Tracktion's submodule; 9 local patches (`patches/0001–0009`); Catch2 3.7.1; anira 2.1.0 optional |
| VST3 SDK | verified | bundled in the JUCE pin at `juce_audio_processors_headless/format_types/VST3_SDK`: `kVstVersionString "VST 3.8.0"`, `LICENSE.txt` = **MIT (Steinberg, 2025)** |
| Engine/framework licenses | verified (docs) | `docs/DEPENDENCY_BOM.md` + `docs/licenses/`: Tracktion Personal tier (≤ $50K revenue-or-funding, "Powered by" notice), JUCE 8 Starter (≤ $20K) |
| `.vital` load undo; VST3 state on reopen | reported-not-rerun | addendum "at risk"; not re-exercised |

## 9. P1 — observation

| Payload | Status | Exact content |
|---|---|---|
| `levels` (30 Hz GUI timer, `MoshOps.cpp`) | verified | per track `{id, l, r}` = peak dB since the last read (`getAndClearAudioLevel`) from a `te::LevelMeterPlugin` **appended at the end of the chain (post-fader)** by `ensureTrackMeter` (`MoshOps.Mixer.cpp`); `sends[{trackId, bus, l, r}]`; `master {l, r}` from the playback context; −100 headless |
| `spectrum` (`MoshOps.Mixer.cpp` `emitSpectrum`) | verified | last 1024 samples from a master tap, 12 Goertzel bands 55–7000 Hz, `level`, `flux`; zeros when stopped |
| Agent readers of either | absent | consumers only in `ui/src/store.ts` |
| `detect_clip_bpm` | verified | `{clipId, bpm, confidence}`, read-only; stripped by `taskExec.ts` |
| LUFS / true peak / correlation / clipping detection | absent in MoshOps | `service/quality_readout.py` computes signal-hygiene metrics on files (proxy; rule 3); `scripts/verify-hardware/` has numpy helpers |
| Any audio reaching a provider | absent | text-only clients |

**A level meter is not LUFS; a magnitude spectrum is not stereo correlation** — both are
reported as unavailable, not relabeled.

## 10. P2 — dependent / optional (not resolved here by design)

Builtins present as load types: EQ (`4bandEq`), `compressor`, `reverb`, `delay`,
`lowpass`/`highpass` (mode flip), sampler, plus the Mosh auto-tune / feedback effects with a
`moshFx` readout; quality/latency/readback unmeasured. SA3 checkpoint/adapter inventory,
`15drtt` kit text, palette 808 roots and preset classification: only when a selected
workflow depends on them (amendment clause 3).

## 11. Unresolved and blockers

1. **Song A assets — resolved 2026-09-05** (owner-provided multitrack export; consent recorded
   in the sidecar). New defect from the build: `import_clip` silently time-stretches files whose
   names carry a BPM token (§4); worked around by importing a renamed copy; fix belongs to step 2.
2. **Voice item — resolved 2026-09-05**: the owner chose to build the hold-to-talk path and
   waived the removal rule for it (amendment clause 9).
3. **Send undo** (`set_send_level/mute/pan`): verified defect; first engine item of step 1.
4. **Double issuance**: inferred; pinned by the failing `loop.test.ts` case in step 1.
5. **Import render lag +2 samples**: recorded; cause (placement rounding vs graph latency)
   not determined.
6. **Recovery contract**: unmeasured until step 3's crash test.
7. **Plugin state on reopen, `.vital` undo, `remove_plugin` undo**: reported-not-rerun.
8. **Build provenance** of the audited binary: mtime after HEAD, assumed built from HEAD.
