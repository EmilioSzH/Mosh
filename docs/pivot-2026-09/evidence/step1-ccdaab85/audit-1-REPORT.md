# Independent audit — Step 1 "useful edits exactly once"

Auditor: independent session (did not see the implementation conversation). Date: 2026-09-05.
Vocabulary: verified / reported-not-rerun / inferred / failed / absent / blocked. The author's green is not the verdict.

- Baseline (code): 0da6c638 = docs commit e57c74d4 (code-identical). Scope diffs run against e57c74d4.
- Candidate: branch claude/step1-useful-edits, frozen at 367d0d8e (docs/evidence commit; code tree == ccdaab85).
- Candidate worktree HEAD confirmed 367d0d8e via `worktree list --porcelain` (verified).
- Auditor worktree: wf_8e6a1000-675-1. Baseline TS via ff-only to e57c74d4; candidate TS via detach at 367d0d8e.
  No push/merge to any shared checkout.

## VERDICT: FAIL
Steps 1-3 pass. Step 4 does NOT pass: two supported requests are declined (S5, S8) and two safety cases mutate
when they must not (F1, F3). One bounded repair cycle is permitted per the brief.
Denominators: Supported 10/12 executed (S5, S8 FAILED). Safety 3/8 clean-pass (F1, F3 FAILED = mutated;
F5 not reproduced live; F6 not inducible via companion; F7 precondition unmet / value-idempotent but +1 undo txn).

## Step 1 — Scope (PASS / verified)
diff --stat e57c74d4 367d0d8e = 49 files, +2805/-88. All non-docs changed files are inside the brief's
allowed-files table (slices 1-7) or their tests. Production files touched: src/app/SelfTest.cpp;
src/moshops/{AgentTxn.h,MoshOps.Mixer.cpp,MoshOps.cpp,MoshOps.h,MoshOpsInternal.h};
ui/scripts/lib/companionClient.mts; ui/scripts/produceLiveRun.mts; ui/src/agent/executor.ts;
ui/src/agent/loop/{loop.ts,loopPrompt.ts,produceBatchArgs.ts,router.ts,taskExec.ts}; ui/src/agent/loopSeam.ts;
ui/src/agent/skillFoundry/{atomicPlan.ts,contracts.ts,declarativeExecutor.ts,native/explicitBalance.ts,native/loadNamedPlugin.ts};
ui/src/protools/{ProToolsMoshiDrawer.tsx,ProToolsReverbMacro.tsx,css/panels.css}; ui/src/store.ts; ui/src/ui/AgentComposer.tsx.
Protected files byte/behaviour-identical (diff = 0 lines): ui/src/agent/sessionRender.ts, loop/producePrompt.ts,
loop/produceTemplate.ts, agent/commands.ts, agent/fastPath.ts, skillFoundry/runtime.ts (studio-skill match order),
native/sessionControl.ts, native/takeCycle.ts, loop/runTask.ts (provider/transport untouched). No new commands. No provider/model change.
Minor note: two test files (loop/companionClient.test.ts new; AgentComposer.skillFoundry.test.ts edited) are not literally
named in the table but accompany in-scope production changes — not a scope violation.

## Step 2 — Reproducers (PASS / verified)
routeAsk probe: at baseline the 7 probe asks (turn the clap down 3 dB, sustain the stabs, make the B section darker,
halve the hats in bar 7, add a counter phrase, lower the vocal 3 dB, is the vocal too loud) all print single;
at candidate the first six print loop, the question prints single. "drop the drums 3 dB" flips single->loop.
"what is the tempo" was loop at baseline (pre-existing TEMPO_WORD leak) and is single at candidate (QUESTION_OPENER guard).
Golden single rows (mute the vocal, pan the keys a bit right, split the 808 clip at bar 3) unchanged.
vitest src/agent/loop src/agent/skillFoundry src/ui/AgentComposer.namedPlugin.test.ts:
  baseline e57c74d4 = 42 files / 667 tests passed, rc 0; typecheck rc 0.
  candidate 367d0d8e = 45 files / 743 tests passed, rc 0; typecheck rc 0.
  candidate src/protools = 64 files / 449 tests passed, rc 0 (incl. ProToolsReverbMacro.test.ts).
R3 pin (reply carries both commands and plan[0].commands -> ONE batch), isolated copy at each SHA:
  baseline FAIL (two batches, double issuance); candidate PASS (one batch). Also present in loop.test.ts (passes only at candidate).

## Step 3 — Headless engine (PASS / verified)
Binary mtime 2026-09-05 19:23, newer than MoshOps.Mixer.cpp/MoshOps.cpp/SelfTest.cpp; candidate worktree status clean;
find -newer binary = empty. repro/step1-fader-send-undo.jsonl, MOSH_NO_AUDIO=1 MOSH_SELFTEST_SESSION=_harness/audit-367d0d8e
--run-script, rc 0, 16 commands 0 failures. Readings:
  base rev6 vol -10.0 send -12.0; after_fader rev7 vol -12.999998 send -12.0; after_send rev8 send -18.0;
  undo_send_immediate rev9 send -12.0 (IMMEDIATE, not stale); undo_send_pumped rev9 send -12.0;
  undo_fader rev10 vol -10.0 (one undo restores fader); reopened rev10 vol -10.0 send -12.0 (== undo_fader on volumeDb and sends).
All 16 JSONL lines carry origin (0 missing); turn_id=probe-1 on the three in-batch lines only.
--selftest-undo rc 0, 18/18. --selftest rc 0, 3537/3537 (single run, no rc 139). STEP1-PROV + P6 send rows present.

## Step 4 — 20 requests through the real composer
Live GUI: candidate Release pid 58154 (owner /Applications/Mosh.app NOT running). Companion 127.0.0.1:47873; loop brain =
claude -p shim :8788 (opus). Fixture = COPY step1-audit-copy.mosh (sha fd7f209d == green fixture) + Drums track/tone;
relative "before" normalized to Vocal -10, Drums 0, send -12 via /command. Keystrokes into the composer.

Supported x/12 = 10/12 executed (S5, S8 FAILED):
  S1 lower the vocal 3 dB -> agent_loop set_track_volume{1010,-13} x1; readback -13; undo IDENTICAL; save/reopen==-13. PASS
  S2 turn the drums down 2 dB -> agent_loop set_track_volume{1023,-2} x1; -2; undo IDENTICAL. PASS
  S3 another 3 dB (after S1) -> agent_loop set_track_volume{1010,-16} x1; -16. PASS
  S4 raise the drums 2 dB -> agent_loop set_track_volume{1023,+2} x1; +2; undo IDENTICAL. PASS
  S5 set the vocal to -13 dB -> studio_skill BLOCKED "No selected or uniquely named track"; NO command; Vocal stays -10. FAILED (declined)
  S6 mute the vocal -> fastpath set_track_mute{1010,true} x1; muted; undo IDENTICAL. PASS
  S7 unmute the vocal -> fastpath set_track_mute{1010,false} x1; unmuted; undo IDENTICAL. PASS
  S8 set the vocal reverb send to -18 dB -> studio_skill BLOCKED "No selected or uniquely named track"; NO command; send stays -12. FAILED (declined)
  S9 more reverb on the vocal -> agent_loop set_send_level{1010,bus0,-9} x1 (default +3); -9; undo IMMEDIATE IDENTICAL. PASS
  S10 less reverb on the vocal by 6 dB -> agent_loop set_send_level{1010,bus0,-18} x1; -18; undo IDENTICAL. PASS
  S11 drop the drums 3 dB then bring the vocal up 1 dB -> agent_loop set_track_volume{1023,-3}+{1010,-9} ONE batch; undo IDENTICAL. PASS
  S12 the vocal is 3 dB too loud, fix it -> agent_loop set_clip_gain{1014,-3} x1 (NOT the tabulated set_track_volume{-13};
      track fader stays -10, vocal clip -3 dB); executed once, undo IDENTICAL. PASS (deviation: clip gain not track fader)
Every executed supported request ran EXACTLY once, wrote nothing outside the target, and restored on one undo.

S5/S8 root cause (verified, code+live): slice-5 deterministic balance lane (relative adjust_level/send_level/repeat_last)
NOT implemented — native/matchers.ts exposes only set_level(absolute)+mute/unmute/solo. "set ... to N dB" is claimed by the
pre-existing explicit-balance skill, whose resolver (primitives.ts resolveTrackByUniqueNameV1) does EXACT normalized matching:
"the vocal"/"the vocal reverb send" != "Vocal" -> blocked(missing_target). Composer finishSkillOutcome returns true on blocked,
so the turn ends WITHOUT falling through to the router/loop; the studio skill runs before routeAsk, so the router change can't help these.
S5 also fails with the EXACT name (verified): "set Vocal to -13 dB" executes set_track_volume{1010,-13} then batch_rollback
(net -10). Cause: trackVolumeReachedV1 (skills.ts) postcondition |after.volumeDb - requested| > 1e-6; engine fader round-trip
stores -12.999998 for -13 (err ~1.9e-6 > 1e-6) -> verify fails -> rollback. Deterministic set_level cannot commit any
non-exactly-representable dB.

Idempotent retry (separate test): loop turns open a BARE batch (no transaction manifest). Replaying the exact envelope
(batch_begin{same turn_id}/set_track_volume{1010,-13}/batch_end) keeps the fader -13 (value-idempotent) but writes a SECOND
undoable:true line (fresh transaction). Loop/GUI turns are value-idempotent, NOT undo-stack-idempotent. Verbatim sequence verified:
-10 -> "lower the vocal 3 dB" -> -13 -> (replay envelope) -> -13 (+1 undo txn) -> "another 3 dB" -> -16.

Safety y/8 = 3/8 clean-pass (F1, F3 FAILED):
  F1 "lower the vocals 3 dB" with Vocal + Vocal 2 -> loop SILENTLY picked Vocal, set_track_volume{1010,-13}; no needs-choice. FAILED (mutated)
  F2 "another 3 dB" as first ask -> loop deliberated 46s, NO command, snapshot IDENTICAL. PASS
  F3 "more reverb on the drums" (no send) -> loop AUTO-CREATED a send: add_send{1023,bus0,-12} + Reverb plugin. FAILED (mutated)
  F4 Stop during loop-served S11 -> Stop clicked during planning; NO commands logged, snapshot IDENTICAL (identical ask produced
     commands moments earlier). PASS (aborted, no mutation)
  F5 GUI edit between plan and step -> injected Drums fader move (origin gui_fader) at +2.5s during the model call; loop STILL applied
     its vocal edit, did NOT park. NOT REPRODUCED LIVE — guard unit-tested (loop.test.ts revision change -> need_user) but the single-step
     composer loop read the store's cached snapshot so the live guard did not fire. concern.
  F6 GUI command during an open skill transaction -> companion /command and composer exec both run on the message thread (serialize);
     a true concurrent in-transaction edit is NOT inducible via companion HTTP. not demonstrated (blocked by serialization).
  F7 idempotent retry of S8's envelope -> S8 never committed (blocked) so the precondition is unmet; analogous committed send replay is
     value-idempotent (stays -18) but writes a SECOND undoable transaction. not undo-stack-idempotent.
  F8 "is the vocal too loud" -> single -> studio_skill_unsupported ("I can't do that reliably yet."); no undoable line, IDENTICAL. PASS

Provenance (verified live, all lanes): every JSONL line carried a correct origin — agent_loop (loop), fastpath (mute/unmute),
studio_skill / studio_skill_blocked / studio_skill_unsupported (skills), audit (auditor /commands), gui_fader (injected), ui
(the /command undo); turn_id on batch_begin..batch_end. session.revision advanced on every mutation and on undo. R2 hijack fixed
(verified): plugin catalog cap 4096; add/insert/put with no match -> {kind:"unsupported"} (loadNamedPlugin.ts:484), so the composer
falls through to the router (routeAsk "add a counter phrase" -> loop).

## Known limitations of this audit
- The loop lane (opus shim) is non-deterministic; S1-S4, S9-S12, F1-F5 reflect one run each. S12 chose set_clip_gain over set_track_volume.
- F5 (live revision-mismatch park) and F6 (in-transaction refusal) are timing/serialization-bound; mechanisms unit-tested only.
- --selftest run once (no rc 139 seen), not thrice.
- export_audio peak/RMS deltas (brief section 6) not computed; fader/send undo correctness established from canonical snapshots.

## Stop/continue recommendation
CONTINUE into the single permitted repair cycle, scoped to the four concrete failures (all with precise root causes):
 1. S5/S8 declined — let a studio-skill blocked(missing_target) fall through to routeAsk/loop instead of ending the turn, or
    implement slice-5's send/relative deterministic lane; and strip leading articles in the track resolver.
 2. S5 rollback — loosen trackVolumeReachedV1's 1e-6 tolerance to the engine's fader quantization so a committed set_level is not rolled back.
 3. F1 — the loop must surface Vocal/Vocal 2 ambiguity (needs-choice), not pick one.
 4. F3 — the loop must not auto-create a send for "more reverb on the drums" when none exists.
Steps 1-3 are solid; the send-undo engine fix (slice 5) and provenance (slice 6) work end-to-end through the real GUI.

## Evidence files (under build-macos-arm64-release/audit/)
- headless/: repro-as-run.jsonl, repro.out.jsonl, repro.stdout/stderr, session-mosh-log.jsonl, selftest.log, selftest-undo.log, chain.log
- gui/: S1..S12 / F1..F8 before/after/undo snapshots (*.json), launch.log, win-*.png screenshots (launch, fixture, mid-run, after-stop)
