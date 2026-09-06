# Implementation brief — Step 1: useful edits exactly once

**The single first implementation task.** Documentation only at this point: nothing here is
implemented. Written 2026-09-05 from current-commit evidence
([CAPABILITY-AUDIT-2026-09-05.md](CAPABILITY-AUDIT-2026-09-05.md)); audited independently
with [AUDIT-PROMPT-STEP1.md](AUDIT-PROMPT-STEP1.md).

| | |
|---|---|
| Baseline SHA | code `0da6c638eaa719296e3c97650a405f1afc9e8f53`; the candidate branch `claude/step1-useful-edits` starts at the docs commit `e57c74d4` (code-identical) — scope diffs run against `e57c74d4` |
| Candidate | one branch/worktree from the baseline; one contiguous commit range; candidate SHA frozen before audit; no merge or push by the implementer |
| Repair policy | one bounded repair cycle after the independent audit, then a blocked verdict and narrowed scope |
| Do not | replace the model or provider to fix routing; touch the produce prompts; add commands to the catalog; add a label store, dashboard or schema |

## 1. Goal

Ordinary single-clause mix asks reach an executor; a builtin fader/mute edit and a
**verified** vocal reverb send execute exactly once with fresh ids and values, read back the
actual engine value, restore on one undo, and survive save/reopen. Duplicate issuance is
gone for absolute and additive edits. Log lines carry provenance. One direct control exists.

## 2. Reproducers (all at baseline)

**R1 — router refusal (verified 2026-09-05, pure function).** In `ui/`:
```
./node_modules/.bin/tsx -e 'import {routeAsk} from "./src/agent/loop/router.ts"; for (const a of ["turn the clap down 3 dB","sustain the stabs","make the B section darker","halve the hats in bar 7","add a counter phrase","lower the vocal 3 dB","more reverb on the vocal"]) console.log(a,"->",routeAsk(a))'
```
Every line prints `single`; only the compound form (`…, then …`) prints `loop`. The composer
(`ui/src/ui/AgentComposer.tsx` run()) then answers "I can't do that reliably yet." tagged
`studio_skill_unsupported` before any model call (live log seq 278–285,
`docs/produce-corrections/MOSHI-EDIT-PROBE-2026-09-04.md`, same SHA). The deterministic
balance matcher (`ui/src/agent/skillFoundry/native/matchers.ts`
`matchExplicitBalanceUtteranceV1`) returns `null` for "lower the vocal 3 dB" and "turn the
vocal down 3 dB", and `{set_level, "the vocal", -13}` only for "set the vocal to -13 dB".

**R2 — "add a …" hijack (verified).** `ui/src/agent/skillFoundry/native/loadNamedPlugin.ts`
matches `^(load|add|insert|put) (the|a)? (plugin)? X` and, with `MAX_PLUGIN_CATALOG_V1 = 64`,
rejects this machine's 1,198-entry `list_plugins` result as "the plug-in catalog returned
invalid or oversized data" (`studio_skill_blocked`, log seq 286); the composer never falls
through to the router. `cmdListPlugins` (`src/moshops/MoshOps.Plugins.cpp`) takes no
paging arguments.

**R3 — double issuance (inferred from code + log; to be pinned by a failing test).** Live log
seq 289–294: `transform_notes`, `set_drum_pad`, `transform_notes`, `set_drum_pad` in one
transaction, two batches ~20 ms apart, one model reply. `ui/src/agent/loop/parse.ts` keeps
both a top-level `commands` array and `plan[].commands`; `ui/src/agent/loop/loop.ts`
(plan build after the first model call) does `plan = [...first.plan]` and then unshifts
`first.commands` as a "start" step — the same commands run as the start step and again as
plan step 1. No `loop.test.ts` case covers a reply carrying both fields.

**R4 — send-level undo (verified headless 2026-09-05, script
`repro/step1-fader-send-undo.jsonl` and variants).** `set_send_level` applies (readback −18)
but: one `undo` leaves the readback at −18 until the project is reopened (stale
`AutomatableParameter` current value); the send edit consumes **two** undo steps, so the
next `undo` does not restore the fader (only a third does). `set_send_mute` and
`set_send_pan` restore in the file but read back stale after undo. Fader edits (`set_track_volume`,
plain and inside a batch) restore on one undo immediately. Code path:
`src/moshops/MoshOps.Mixer.cpp` `cmdSetSendLevel` → `te::AuxSendPlugin::setGainDb` →
`gain->setParameter (…, sendNotification)` (pinned Tracktion + patches 0007/0008), versus
`cmdSetTrackVolume` → `SetFaderValueAction` performed through the UndoManager.

## 3. Allowed files and symbols (nothing else changes)

| Slice | File : symbol | Change |
|---|---|---|
| 1 Router | `ui/src/agent/loop/router.ts` : `routeAsk` | add an imperative-edit class → `"loop"`: leading `turn/bring/push/pull/lower/raise/drop/boost/cut/dip/nudge/sustain/shorten/lengthen/tighten/loosen/darken/brighten/halve/double/widen/narrow` (with optional `can you / please / hey moshi`), any `N dB`, `more/less <reverb|delay|echo|space|room|air>`, `darker/brighter/louder/quieter/softer/longer/shorter/tighter/drier/wetter`. Questions stay `single` |
| 1 Router test | `ui/src/agent/loop/router.test.ts` : `CASES` | + the five probe asks → `loop`; `"drop the drums 3 dB"` flips to `loop` with a comment (no deterministic lane owns it today); `"is the vocal too loud"`, `"what is the tempo"` → `single` |
| 2 Hijack | `native/loadNamedPlugin.ts` : `MAX_PLUGIN_CATALOG_V1`, `loadNamedPluginV1`, the utterance parser (`LOAD_PLUGIN_UTTERANCE_V1` / `pluginQueryV1` / `parsePluginUtteranceV1`); `native/loadNamedPlugin.test.ts`; `ui/src/ui/AgentComposer.namedPlugin.test.ts` | cap 64 → 4096 (a UI constant; there is no engine paging — say so in the commit); `add/insert/put` + no catalog match → `{kind:"unsupported"}` so the composer proceeds to the router; `load X` keeps `missing_target` |
| 3 Exactly-once | `ui/src/agent/loop/loop.ts` plan build + step loop; `loop.test.ts` | dedupe ONLY the planner-copy overlap: drop from the top-level `commands` (the "start" step) every command that also appears in a plan step (exact or partial overlap, key-order independent); authored plan steps always execute, even when identical ("duplicate it twice"); a repair twin re-runs only the commands that failed; every dropped or skipped command is visible in the transcript and progress. (Revised 2026-09-05: the earlier "skip a step JSON-identical to the previous step" rule swallowed legitimate repeats.) Tests fail at baseline |
| 3 Revision binding | `src/moshops/MoshOps.cpp` snapshot `session` block (+`editRevision_` already exists — expose as `session.revision`); `loop.ts` | loop reads `session.revision` after each batch and parks `need_user` ("the session changed while I was working — ask again") when it moved between steps; undefined ⇒ guard inert |
| 4 Readback/ids | `ui/src/agent/loop/taskExec.ts` result mapping; `ui/src/agent/loopSeam.ts` `StepCommandResult`; `ui/src/agent/loop/loopPrompt.ts` `renderTaskContext` | keep `{trackId, clipId, bus, busNumber, index, padId}` from `r.data` as `ids` and print them in the task context; system prompt builders untouched |
| 5 Verified send | `src/moshops/MoshOps.Mixer.cpp` : `cmdSetSendLevel`, `cmdSetSendMute`, `cmdSetSendPan`; `src/moshops/MoshOpsInternal.h` (new action) ; `src/app/SelfTest.cpp` P6 matrix table | perform one `UndoableAction` per command that writes the CachedValue and refreshes the parameter's current value synchronously (mirror `SetFaderValueAction` / `SetPluginParamValueAction`); add matrix rows `set_send_level`, `set_send_mute`, `set_send_pan` (fixture already has `mbus`) |
| 5 Deterministic balance | `native/matchers.ts` : `matchExplicitBalanceUtteranceV1`; `native/explicitBalance.ts`; `native/payloads.ts` positive examples; their tests | `adjust_level` (relative: `lower/turn … down/raise … N dB` → `set_track_volume {db: before + delta}` clamped −60…+6, postcondition on the snapshot value); `send_level` (`set the <track> <bus> send to N dB`, `more/less <bus> on <track> [by N dB]`, default ±3 dB spoken in `say`; no send to that bus → `blocked(missing_target)`, never auto-creates); `repeat_last` ("another N dB", "same again") bound to the last completed adjust within the same project epoch and 10 min, else `blocked` |
| 6 Provenance | `src/moshops/MoshOps.h/.cpp` : `executeFromUi`, `execute`, `cmdBatchBegin/End`, `logLine`, the snapshot session block (`revision`); `src/app/SelfTest.cpp` STEP1-PROV section; `ui/src/store.ts` `exec`; `ui/src/agent/executor.ts`; `taskExec.ts`; `AgentComposer.tsx` skill env; `ui/src/agent/skillFoundry/atomicPlan.ts` `batch_begin` args and its callers (`native/explicitBalance.ts`, `native/loadNamedPlugin.ts`, `declarativeExecutor.ts`, `skillHarness.ts`, the skill runtime) for the provenance object; `ui/scripts/produceLiveRun.mts` + new `ui/src/agent/loop/produceBatchArgs.ts` (+ test); `ui/scripts/lib/companionClient.mts` (origin sibling); new tests `ui/src/store.execOrigin.test.ts`, `ui/src/agent/executor.origin.test.ts` | additive `origin` on every JSONL line (`"ui"` when the call came through `executeFromUi` with no envelope origin; else the envelope's origin: `agent_loop`, `studio_skill`, `macro`, `produce_driver`, `native`); `turn_id` on every line while `inBatch`; `run_id` + `prompt_version` on the driver's `batch_begin` only. Historical lines lack the fields ⇒ readers treat absence as `unknown`. No new collector or schema |
| 7 Macro | new `ui/src/protools/ProToolsReverbMacro.tsx` (+ test), the mount in `ui/src/protools/ProToolsMoshiDrawer.tsx`, and `ui/src/protools/css/panels.css` (style only) | "Lead-vocal reverb amount": binds to the unique non-return track named like `vocal/vox` and the unique bus named like `reverb` that it sends to; a reconciled range −60…+6 committing `set_send_level` with origin `macro` (one command = one undo step, no model call); shows the readback; Reset returns to the value captured when the binding first resolved in this project epoch; renders "no verified vocal→reverb send" and never executes when unresolvable |

Order of landing: 5 (engine undo) → 3 → 4 → 6 → 1 → 2 → 7 (as integrated 2026-09-05; 6 was
pulled before 1/2 because it completes the session-revision half of 3). Slices 1–5 are the
core; 6–7 are in scope but separable commits.

**Accepted additions beyond the letter of the slices (2026-09-05):** router rules `ADD_PART`
("add a … phrase/riff/fill/melody/hook/bassline/harmony/chords") and a leading-interrogative
guard (questions stay `single`); the P6 fixture gains a persistent send so the send rows have a
target after the `add_send` row is undone; a `set_send_level` non-finite guard with three P6
checks; same-value send sets now record one real undo step (consistent with the fader).

**Engine quirks found while landing, filed for step 2 (not fixed here):** (1) track creation arms
Tracktion's deferred `TrackList::sortTracksByType`, written through the UndoManager on the first
message pump — an undo before any pump lets it form a phantom transaction; the durable fix is to
sort inside the track-creating transaction (`cmdCreateTrack`, `cmdCreateBus`); the repro script
pumps once after its fixture instead. (2) A send created by `add_send` carries no `mute`
property and `set_send_level` clamps to −100 dB while `add_send` clamps to −60; a send at
≤ −90 dB saved and reopened flips to muted at 0 dB. (3) `set_track_volume` has the same missing
non-finite guard. (4) The agent-task Undo affordance issues `undo` with origin `ui`.

**Protected — must be byte/behaviour-identical:** every existing `loop` row and the named
`single` rows of the router golden table (`mute the vocal`, `pan the keys a bit right`,
`split the 808 clip at bar 3`); the studio-skill match order (`native/runtime.ts`),
`sessionControl.ts`, `takeCycle.ts`; `ui/src/agent/sessionRender.ts`;
`loopPrompt.ts` `buildLoopSystemPrompt`; `producePrompt.ts`, `produceTemplate.ts`,
`PRODUCE_BUDGETS`, `DEFAULT_LOOP_BUDGETS`; `ui/src/agent/commands.ts` (no new commands);
existing P6 undo-matrix rows and `canon()`; JSONL fields `{ts, seq, command, args, ok,
error?, undoable, txn}`; the transaction-envelope protocol (`txnPreDispatch`);
`fastPath.ts`; the composer precedence order; `runTask.ts` provider selection.

## 4. Test design — 20 named requests, two denominators

Fixture: the headless project from `repro/step1-fader-send-undo.jsonl` (tracks "Vocal" with
a 220 Hz tone at −10 dB, return "Reverb" with the reverb builtin, Vocal→Reverb send −12 dB)
plus a second track "Drums"; opened as a **copy**. Each request is typed into the composer.

**Supported (12) — must execute exactly once; a declined request is a failed capability test.**

| # | Typed ask | Expected command(s) | Readback |
|---|---|---|---|
| S1 | lower the vocal 3 dB | `set_track_volume {Vocal, db:-13}` | −13 |
| S2 | turn the drums down 2 dB | `set_track_volume {Drums, db: before−2}` | before−2 |
| S3 | another 3 dB (right after S1) | `set_track_volume {Vocal, db:-16}` | −16 |
| S4 | raise the drums 2 dB | `set_track_volume {Drums, db: before+2}` | before+2 |
| S5 | set the vocal to -13 dB | `set_track_volume {Vocal, db:-13}` | −13 |
| S6 | mute the vocal | `set_track_mute {Vocal, true}` | muted |
| S7 | unmute the vocal | `set_track_mute {Vocal, false}` | unmuted |
| S8 | set the vocal reverb send to -18 dB | `set_send_level {Vocal, bus:Reverb, db:-18}` | −18 |
| S9 | more reverb on the vocal | `set_send_level {…, db: before+3}` (default spoken) | before+3 |
| S10 | less reverb on the vocal by 6 dB | `set_send_level {…, db: before−6}` | before−6 |
| S11 | drop the drums 3 dB then bring the vocal up 1 dB | two `set_track_volume`, each once | both |
| S12 | the vocal is 3 dB too loud, fix it | `set_track_volume {Vocal, db: before−3}` once | before−3 |

Pass: 12/12 executed once (command count per turn equals expected), correct target and
value, zero writes outside the target (canonical snapshot diff outside the target empty),
one `undo` restores the pre-state, `save_as` → `open_project` reproduces the post-edit
values. **Idempotent retry (separate test):** re-send S5's exact command envelope
(same transaction id/request id) after it committed → the engine replays, the fader stays
−13, no second `undoable:true` line. **New repeated instruction (separate test):** the
−10 → "lower the vocal 3 dB" → −13 → retry → −13 → "another 3 dB" → −16 sequence.

**Safety (8) — must not mutate: no `undoable:true` line, canonical snapshot unchanged.**

| # | Case | Expected |
|---|---|---|
| F1 | "lower the vocals 3 dB" with tracks "Vocal" and "Vocal 2" present | needs-choice reply naming both; no command |
| F2 | "another 3 dB" as the first ask of a session | blocked, asks for the track; no command |
| F3 | "more reverb on the drums" (Drums has no Reverb send) | blocked, says to add a send; no `add_send` |
| F4 | Stop pressed during the loop-served S11 | task aborted; nothing after the abort point; already-applied step stays as one undo unit |
| F5 | GUI fader move between the loop's plan and its step (S12 variant) | loop parks `need_user` on revision mismatch; the GUI value stays; no agent command |
| F6 | GUI fader move while a skill transaction is open (during S8) | the GUI command is refused as in-progress; the skill completes once; the refusal is surfaced |
| F7 | idempotent retry of S8's envelope after commit | replayed; no second mutation |
| F8 | "is the vocal too loud" | answered or declined; no command |

Report `x/12` and `y/8` separately. Never merge the denominators.

## 5. Required tests (existing files gain cases)

- `router.test.ts`: five probe asks → `loop`; the flipped row; two question rows → `single`.
- `native/matchers.test.ts`, `native/explicitBalance.test.ts`: relative adjust from −10 →
  −13; clamp at −60/+6; exact and default-delta send; `repeat_last` epoch/expiry refusal;
  missing send blocks with zero mutation; ambiguity → needs-choice.
- `native/loadNamedPlugin.test.ts`: cap boundary; "add a counter phrase" against a
  1,198-entry fake catalog → `unsupported`; "load Nonexistent" → still `missing_target`.
- `ui/src/ui/AgentComposer.namedPlugin.test.ts`: composer falls through from `unsupported`
  to the router (precedence intact).
- `loop.test.ts`: reply with `plan[0].commands == commands` → one batch (fails at
  baseline); additive `add_note` twice in one reply → one batch; identical consecutive step
  skipped; revision change between steps → `need_user`, one batch.
- `taskExec.test.ts`: `ids` present for `create_track`; origin sibling on `batch_begin`.
- `loopPrompt.test.ts`: ids rendering; system prompt pins unchanged.
- `atomicPlan.test.ts`: `batch_begin` carries provenance when given, unchanged otherwise.
- New `ProToolsReverbMacro.test.ts` on the mock bridge (which already implements `set_send_level`).
- C++: P6 rows for `set_send_level` / `set_send_mute` / `set_send_pan`; a `--selftest`
  section asserting `origin` and `turn_id` on JSONL lines inside and outside a batch and
  `session.revision` monotonic across a mutation and an undo.
- Runs: `cd ui && ./node_modules/.bin/vitest run src/agent/loop src/agent/skillFoundry src/ui/AgentComposer.namedPlugin.test.ts src/protools`;
  `npm run typecheck`; `Mosh --selftest` and `--selftest-undo`; the repro script;
  `scripts/auto-loop/gate.sh native <worktree> origin/main` before any merge (AGENTS.md).

## 6. Acceptance artifacts (filed under `docs/pivot-2026-09/evidence/step1-<candidate-sha>/`)

Per request: the JSONL turn (`batch_begin` … `batch_end`, with `origin`, `turn_id`,
utterance); canonical snapshot before/after/undo; `export_audio` (32-bit) before/after/undo
with the target track's peak/RMS (a −3 dB fader move on the tone fixture ≈ −3 dB RMS; no
threshold on mixtures — report the value); `save_as` → `open_project` equality on
`volumeDb` and `sends`; vitest, typecheck and selftest exit codes with SHAs; one loop
transcript showing `ids`. Musical claims: none in this step.

## 7. Rollback

`git revert <first>^..<last>` over the contiguous candidate range. JSONL fields and
`session.revision` are additive (old readers ignore them); no data migration. The P6 rows
revert with the range.
