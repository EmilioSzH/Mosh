# Independent audit #2 - Step 1 "useful edits exactly once" (post-repair)

Auditor: independent session; did not do the implementation and did not see the repair
conversation. Date: 2026-09-05 (runs 23:20-23:55 local).
Vocabulary: verified / reported-not-rerun / inferred / failed / absent / blocked.
The author's green is not the verdict.

| | |
|---|---|
| Code baseline | 0da6c638 = docs commit e57c74d4 (code-identical); all scope diffs run against e57c74d4 |
| Candidate | branch claude/step1-useful-edits frozen at 1453a647 (code tree 7b1d7423) |
| Pre-repair candidate (for RED proofs) | 367d0d8e (code tree ccdaab85) - the tree audit #1 failed |
| Auditor worktree | /Users/emiliosanchez-harris/Library/Mosh/repo/ClaudeMosh.git/.claude/worktrees/wf_0d5642ef-25c-1 (detached at each SHA; no push, no merge, nothing written to the candidate worktree outside build-macos-arm64-release/audit2/) |
| Binary under test | .../step1-useful-edits/build-macos-arm64-release/Mosh_artefacts/Release/Mosh.app/Contents/MacOS/Mosh, mtime 2026-09-05 23:17:49 |
| Evidence dir | /Users/emiliosanchez-harris/Mosh/.claude/worktrees/step1-useful-edits/build-macos-arm64-release/audit2/ |

## VERDICT: FAIL (on the letter of step 4's safety criterion) - but the repair itself succeeded

- All four first-audit failures (S5, S8, F1, F3) are genuinely fixed - verified live through the
  real composer. Nothing that passed in audit #1 regressed.
- Supported requests: 12/12 executed exactly once, correct target and value, zero writes outside
  the target, one undo restores, save_as then open_project reproduces (audit #1: 10/12).
- Safety cases: 6/8 clean-pass (audit #1: 3/8). F7 failed (a replayed envelope is value-idempotent
  but writes a SECOND undoable:true transaction) and F6 is blocked (a true in-transaction GUI edit
  is not inducible through the available surface).
- F7's defect is the one audit #1 already recorded ("value-idempotent, not undo-stack-idempotent").
  It was never inside the repair's scope (the owner scoped the cycle to S5, S8, F1, F3), but the
  brief states it explicitly ("the engine replays, the fader stays -13, no second undoable:true
  line"), so step 4 does not fully pass and the audit prompt's rule ("PASS only if steps 1-4 all
  pass") forces a non-pass verdict.
- Per the brief's repair policy ("one bounded repair cycle ... then a blocked verdict and the scope
  is narrowed by the owner, not by the auditor") this is the point where the OWNER narrows scope.
  Recommendation in section 9: accept the deterministic-lane capability, narrow the remaining
  step-1 scope to the single idempotency requirement, do not run another open-ended repair cycle.

Two further findings outside the brief's matrix, recorded honestly and not counted in the
denominators: an app crash (JUCE main-menu teardown) during the optional audio-evidence step, and
a conditional block of the whole deterministic lane while a crash-recovery journal is pending
(section 5).

## 0. Preconditions verified before trusting the binary

    $ (worktree list --porcelain, filtered to step1-useful-edits)
    worktree /Users/emiliosanchez-harris/Mosh/.claude/worktrees/step1-useful-edits
    HEAD 1453a6478ec90ef6bc1e416a70587c065c416c07
    branch refs/heads/claude/step1-useful-edits

The candidate worktree's working tree matches commit 1453a647 exactly. (The harness refuses VCS
commands aimed at another checkout, so cleanliness was proved by exporting the commit to a tarball
and diffing the trees - which also catches untracked files.)

    $ (archive 1453a647 to cand.tar) ; tar -xf cand.tar -C cand-tree
    $ diff -r -q cand-tree/src        step1-useful-edits/src         -> rc=0
    $ diff -r -q cand-tree/ui/src     step1-useful-edits/ui/src      -> rc=0
    $ diff -r -q cand-tree/ui/scripts step1-useful-edits/ui/scripts  -> rc=0
    $ diff -r -q cand-tree/docs/pivot-2026-09  step1-useful-edits/docs/pivot-2026-09  -> rc=0

Binary freshness (verified):

    $ find step1-useful-edits/src step1-useful-edits/ui/src -newer <the Mosh binary> -type f
    (empty - the binary is newer than every source file)

The embedded UI bundle is the repaired one (verified). The app ships one file,
Mosh.app/Contents/Resources/ui/index.html (2,092,365 bytes, mtime 23:17, i.e. after the last
repair commit). It contains the repaired lane's own strings - this rules out the known "cmake
exits 0 when Vite fails => stale bundle" trap:

    $ grep -c adjust_level  index.html   -> 1
    $ grep -c repeat_last   index.html   -> 1
    $ grep -c send_level    index.html   -> 9
    $ grep -c "has no send to"          index.html  -> 1   (F3 message)
    $ grep -c "tracks share that name"  index.html  -> 1   (F1/ambiguity message)

## 1. Scope - PASS (verified), with one disclosure

    $ (diff --shortstat e57c74d4..1453a647)
     58 files changed, 4186 insertions(+), 182 deletions(-)
    $ (diff --name-only e57c74d4..1453a647 excluding docs) | wc -l
     44

Changed non-docs files (44) are all inside the brief's slice table or are the tests that accompany
them:

- C++: src/app/SelfTest.cpp, src/moshops/{AgentTxn.h, MoshOps.Mixer.cpp, MoshOps.cpp, MoshOps.h,
  MoshOpsInternal.h}
- TS production: ui/scripts/lib/companionClient.mts, ui/scripts/produceLiveRun.mts,
  ui/src/agent/executor.ts, ui/src/agent/loop/{loop.ts, loopPrompt.ts, produceBatchArgs.ts,
  router.ts, taskExec.ts}, ui/src/agent/loopSeam.ts, ui/src/agent/skillFoundry/{atomicPlan.ts,
  contracts.ts, declarativeExecutor.ts, native/explicitBalance.ts, native/loadNamedPlugin.ts,
  native/matchers.ts, native/payloads.ts}, ui/src/agent/skills.ts,
  ui/src/protools/{ProToolsMoshiDrawer.tsx, ProToolsReverbMacro.tsx, css/panels.css},
  ui/src/store.ts, ui/src/ui/AgentComposer.tsx
- plus their .test.ts siblings.

Protected files - byte-identical (verified). A --stat diff over the ten protected paths
(ui/src/agent/sessionRender.ts, loop/producePrompt.ts, loop/produceTemplate.ts, agent/commands.ts,
agent/fastPath.ts, skillFoundry/native/runtime.ts, skillFoundry/runtime.ts,
native/sessionControl.ts, native/takeCycle.ts, loop/runTask.ts) printed NO output at all: zero
changed lines in all ten.

No new commands in commands.ts; runTask.ts (provider/transport selection) untouched, so no
provider/model change. loopPrompt.ts's 11 added lines are confined to
renderResultIds/renderTaskContext; buildLoopSystemPrompt is untouched (verified by reading the
diff hunk).

Disclosure (not scored as a violation). The candidate's own commits edited two governing
documents: BRIEF-STEP1-USEFUL-EDITS-EXACTLY-ONCE.md (commit 7b1d7423 added
"ui/src/agent/skills.ts : trackVolumeReachedV1 tolerance" and
ui/src/ui/AgentComposer.skillFoundry.test.ts to the slice-5 allowed-files row, annotated "added
2026-09-05 by the audit's own repair recommendation") and AUDIT-PROMPT-STEP1.md (re-based scope
diffs onto e57c74d4, declared docs/** allowed, and replaced the R4 baseline sentence "...and the
next undo does not restore the fader" with the deferred-track-sort explanation for the added
__wait 300 pump). Both edits are docs/**, both are consistent with audit #1's own recommendations,
and this audit's task statement carries the same baseline instruction - so I treat them as
in-bounds. They are flagged because an implementer amending the document the auditor scores
against must never be invisible. The section-4 test tables (S1-S12, F1-F8) are UNCHANGED between
e57c74d4 and 1453a647 - I diffed them; that is the part that matters for step 4.

## 2. Reproducers at baseline, then at candidate - PASS (verified)

cd ui && npm ci --no-audit --no-fund -> rc 0 (same node_modules valid at both SHAs; no
package.json/lock change in the range).

routeAsk (pure function), via
./node_modules/.bin/tsx -e 'import {routeAsk} from "./src/agent/loop/router.ts"; ...'

| ask | baseline e57c74d4 | candidate 1453a647 |
|---|---|---|
| turn the clap down 3 dB | single | loop |
| sustain the stabs | single | loop |
| make the B section darker | single | loop |
| halve the hats in bar 7 | single | loop |
| add a counter phrase | single | loop |
| lower the vocal 3 dB | single | loop |
| drop the drums 3 dB | single | loop (the flipped row) |
| is the vocal too loud | single | single |
| what is the tempo | loop (pre-existing leak) | single (question guard) |
| mute the vocal | single | single (golden row held) |
| pan the keys a bit right | single | single (golden row held) |
| split the 808 clip at bar 3 | single | single (golden row held) |

Both runs rc 0. Matches the brief's expectation exactly.

Suites:

| run | baseline e57c74d4 | candidate 1453a647 |
|---|---|---|
| vitest run src/agent/loop src/agent/skillFoundry src/ui/AgentComposer.namedPlugin.test.ts | 42 files / 667 tests passed, rc 0 | 44 files / 780 tests passed, rc 0 |
| vitest run src/ui/AgentComposer.skillFoundry.test.ts src/protools src/store.execOrigin.test.ts src/agent/executor.origin.test.ts | n/a (files absent) | 67 files / 488 tests passed, rc 0 |
| vitest run (whole UI suite) | not run | 455 passed / 1 skipped (456 files); 4664 passed / 1 skipped (4665 tests), rc 0 |
| npm run typecheck | rc 0 | rc 0 |

(The candidate file count is 44, not the 45 audit #1 reported: find ui/src/agent/loop
ui/src/agent/skillFoundry -name '*.test.ts' | wc -l = 43, plus AgentComposer.namedPlugin.test.ts
= 44. My count is self-consistent; I did not reconcile audit #1's.)

RED proofs (the tests are not vacuous) - verified.

R3 pin at baseline: copied the candidate's loop.test.ts into the baseline tree as loopRED.test.ts
and ran it against baseline loop.ts:

    Test Files  1 failed (1)
         Tests  10 failed | 19 passed (29)
     FAIL ... > a reply carrying the same commands at top level AND on plan[0] executes ONE batch
     FAIL ... > an additive add_note issued twice in one reply ... lands each note once
     FAIL ... > a top-level copy that only PARTLY overlaps plan[0] ...
     FAIL ... > an ORDER-SWAPPED top-level copy ...
     FAIL ... > a repair twin of a PARTIALLY failed step ...
     FAIL ... > a two-round repair chain never re-runs a command that succeeded earlier ...
     FAIL ... > a repair that re-sends ONLY already-applied commands ...
     FAIL ... > a revision that moved between two steps parks need_user after exactly one batch
     FAIL ... > a revision moved between the plan and the FIRST step parks with zero batches (F5)
     FAIL ... > our own batches bump the revision without tripping the guard

The named pin fails at baseline and passes at candidate. (Copy removed afterwards; worktree clean.)

The repair's own tests, against the pre-repair tree 367d0d8e - the check that the repair is real
and not test-shaped-to-fit:

    (detach at 367d0d8e, copy in the candidate's three repair test files)
    $ vitest run src/agent/skillFoundry/native/explicitBalance.test.ts \
                 src/agent/skillFoundry/native/matchers.test.ts \
                 src/ui/AgentComposer.skillFoundry.test.ts
    Test Files  3 failed (3)
         Tests  46 failed | 46 passed (92)

    (the same three files at 1453a647)
    Test Files  3 passed (3)
         Tests  92 passed (92)

Among the 46 RED cases: "S5: 'set the vocal to -13 dB' is served by the studio skill - one
set_track_volume, the loop never consulted", "S8: ... one set_send_level {Vocal, Reverb, -18}",
"F1: 'lower the vocals 3 dB' with Vocal and Vocal 2 asks which - no command, no loop", and "F3:
'more reverb on the drums' with no Drums->Reverb send is blocked - no add_send, no mutation, no
loop". Each of the four audit-1 failures has a test that is RED before the repair and GREEN after.

## 3. Headless engine check - PASS (verified)

    $ MOSH_NO_AUDIO=1 MOSH_SELFTEST_SESSION=_harness/audit2-1453a647 \
      MOSH_RUN_SCRIPT=audit2/headless/repro-as-run.jsonl \
      MOSH_RUN_SCRIPT_OUT=audit2/headless/repro.out.jsonl <binary> --run-script
    repro rc=0        run-script: 16 command(s), 0 failure(s)

Readings (Vocal track):

    [base]                revision=6  vol=-10.0               sends=[(0, -12.0)]
    [after_fader]         revision=7  vol=-12.999998092651367 sends=[(0, -12.0)]
    [after_send]          revision=8  vol=-12.999998092651367 sends=[(0, -18.0)]
    [undo_send_immediate] revision=9  vol=-12.999998092651367 sends=[(0, -12.0)]   <- -12 IMMEDIATELY (not stale)
    [undo_send_pumped]    revision=9  vol=-12.999998092651367 sends=[(0, -12.0)]
    [undo_fader]          revision=10 vol=-10.0               sends=[(0, -12.0)]   <- one undo restores the fader
    [reopened]            revision=10 vol=-10.0               sends=[(0, -12.0)]   <- equals undo_fader on volumeDb and sends

All three required conditions met. JSONL provenance in
~/Library/Mosh/_harness/audit2-1453a647/mosh-log.jsonl:

    total 16 lines | missing origin: 0 | lines with turn_id: 3 | undoable:true: 8
     8 batch_begin      ... origin=native turn=probe-1
     9 set_track_volume ... origin=native turn=probe-1  undoable
    10 batch_end        ... origin=native turn=probe-1
    (all other 13 lines: origin=native, turn absent)

Every line carries origin; turn_id is present on exactly the three in-batch lines and absent
elsewhere - the "absent, not empty" contract.

    $ <binary> --selftest        rc=0   ===== 3538/3538 checks passed, 0 failed =====
    $ <binary> --selftest-undo   rc=0   ===== 18/18 focused undo checks passed, 0 failed =====

No rc 139 in this run, so no rerun was needed. (3538 vs the implementer's reported 3537 - one check
more; 0 failed either way, and the audit prompt states a count is not a target.) The STEP1-PROV
section (19 checks incl. "a line outside any batch carries NO turn_id (absent, not empty)" and
"origin rides beside args, never inside them") and the P6 send rows (set_send_level/mute/pan ONE
undo restores the canonical snapshot, plus the non-finite guard) are present and green.

Logs: audit2/logs/selftest-run1.log, audit2/logs/selftest-undo.log,
audit2/headless/{repro-as-run.jsonl, repro.out.jsonl, repro.stdout, repro.stderr}.

## 4. The 20 requests through the real composer

Setup (verified). scripts/produce-lane/launch-app.sh --bin <candidate binary> --model opus ->
pid=17793 port=47873; no other Mosh.app was running (the owner's /Applications/Mosh.app was not
running at any point and was never touched). Loop brain = the claude -p shim on 127.0.0.1:8788.
Fixture = a COPY of the green fixture:

    $ shasum -a 256 green-7b1d7423/step1.mosh             d97c8302...c206e7
    $ shasum -a 256 audit2/gui/fixture/step1-audit2.mosh  d97c8302...c206e7   (identical)

opened via companion open_project, then create_track {name:"Drums"} (id 1023) +
add_test_tone_clip {freq:110} + set_track_volume {0 dB}. Starting state for every row:

    Vocal (1010) -10.0 dB, send bus0 -12.0 dB | Reverb return (1015) | Drums (1023) 0.0 dB

Composer coordinates were re-derived for this launch from a screenshot of window 1 (position
36,33 size 1440,874; the "Ask Moshi..." field at screen (677, 857)); every ask was typed with
osascript ... keystroke + Return, exactly as a user types.

Per row: companion /snapshot before -> typed ask -> new ~/Library/Mosh/session/mosh-log.jsonl
lines -> /snapshot after -> undo via /command -> /snapshot again. "IDENTICAL" refers to a
canonical reduction (per-track volumeDb/mute/solo/pan/sends/clip gains/plugin list, buses, master,
track count) matching exactly.

Supported - 12/12 (x/12 = 12/12):

| # | ask | lane (origin) | commands in the turn | readback | undo | notes |
|---|---|---|---|---|---|---|
| S1 | lower the vocal 3 dB | studio_skill | set_track_volume {1010, -13} x1 | -13.0 | IDENTICAL | one batch, one undoable:true |
| S2 | turn the drums down 2 dB | studio_skill | set_track_volume {1023, -2} x1 | -2.0 | IDENTICAL | |
| S3 | another 3 dB (right after S1) | studio_skill | set_track_volume {1010, -16} x1 | -16.0 | IDENTICAL | repeat_last bound to the prior relative move |
| S4 | raise the drums 2 dB | studio_skill | set_track_volume {1023, +2} x1 | +2.0 | IDENTICAL | |
| S5 | set the vocal to -13 dB | studio_skill | set_track_volume {1010, -13} x1 | -13.0 (raw -12.999998) | IDENTICAL | FIXED - audit #1: declined, then rollback |
| S6 | mute the vocal | fastpath | set_track_mute {1010, true} x1 | muted | IDENTICAL | |
| S7 | unmute the vocal | fastpath | set_track_mute {1010, false} x1 | unmuted | IDENTICAL | |
| S8 | set the vocal reverb send to -18 dB | studio_skill | set_send_level {1010, bus 0, -18} x1 | -18.0 | IDENTICAL (immediate) | FIXED - audit #1: declined |
| S9 | more reverb on the vocal | studio_skill | set_send_level {1010, bus 0, -9} x1 | -9.0 (default +3) | IDENTICAL | |
| S10 | less reverb on the vocal by 6 dB | studio_skill | set_send_level {1010, bus 0, -18} x1 | -18.0 | IDENTICAL | |
| S11 | drop the drums 3 dB then bring the vocal up 1 dB | agent_loop | set_track_volume {1023,-3} + {1010,-9}, ONE batch, each once | -3.0 / -9.0 | IDENTICAL | exactly-once through the live loop |
| S12 | the vocal is 3 dB too loud, fix it | agent_loop | set_track_volume {1010, -13} x1 | -13.0 | IDENTICAL | this run matched the tabulated command (audit #1 saw set_clip_gain) |

Every executed request wrote nothing outside its target (the canonical diff named exactly one
field), ran exactly once, and was restored by one undo. Ten of the twelve never reached a model at
all (studio_skill/fastpath); only S11 and S12 consulted the loop.

Sample JSONL turn (S8), verbatim from ~/Library/Mosh/session/mosh-log.jsonl:

    seq=50 batch_begin     ok=True undoable=False txn=6ed1fa28:3  origin=studio_skill turn=483f5a35-...
            {"name":"explicit-balance","source":"studio_skill","utterance":"set the vocal reverb send to -18 dB","turn_id":"483f5a35-..."}
    seq=51 set_send_level  ok=True undoable=True  txn=6ed1fa28:15 origin=studio_skill turn=483f5a35-...  {"trackId":"1010","db":-18,"bus":0}
    seq=52 batch_end       ok=True undoable=False txn=6ed1fa28:15 origin=studio_skill turn=483f5a35-...

save_as then open_project (verified). With Vocal at -13 and the send at -18:

    post-edit  raw volumeDb -12.999998092651367   sends [(0, -18.0)]
    save_as audit2/gui/fixture/edited.mosh -> ok
    open_project edited.mosh               -> ok
    reopened   raw volumeDb -12.999998092651367   sends [(0, -18.0)]
    DIFF post-edit -> reopened: (IDENTICAL on volumeDb and sends and every tracked field)

Rendered-audio evidence (verified; brief section 6, not computed by audit #1). Drums muted to
isolate the Vocal path, export_audio 32-bit float before / after / undo of S1:

    before  rms -26.3083 dB  peak -22.6338 dB   (vol -10.0)
    after   rms -29.3083 dB  peak -25.6338 dB   (vol -12.999998)
    undo    rms -26.3083 dB  peak -22.6338 dB   (vol -10.0)
    RMS delta before->after = -3.0000 dB   (brief: "a -3 dB fader move on the tone fixture ~ -3 dB RMS")
    RMS delta before->undo  =  0.0000 dB

The edit is audible in the rendered file at exactly the requested size, and the undo restores the
rendered file's RMS and peak exactly.

The verbatim sequence and the idempotent retry - the retry FAILS:

    Vocal -10.0
      typed "lower the vocal 3 dB"  -> studio_skill, set_track_volume{1010,-13}, txn 6ed1fa28:10 -> -12.999998
      replay the SAME envelope via /command
            batch_begin{name:"explicit-balance", source:"studio_skill",
                        utterance:"lower the vocal 3 dB", turn_id:"5b959371-fcc3-4990-8619-e47a99759fce"}
            set_track_volume{trackId:"1010", db:-13}
            batch_end
        -> seq 33/34/35, origin=studio_skill, same turn_id, txn 6ed1fa28:11 (a NEW transaction)
        -> ADDITIONAL undoable:true lines = 1
        -> raw volumeDb still -12.999998092651367   (value-idempotent)
      typed "another 3 dB"          -> studio_skill, set_track_volume{1010,-16}                  -> -16.0
      undo -> -13 ; undo -> -13 (the replay's own step) ; undo -> -10

So the required sequence -10 -> -13 -> (retry) -13 -> -16 reproduces on the values, and the
required "no second undoable:true line" does NOT hold: a replay costs an extra undo step, and the
user must press undo twice to get back to -10. Identical behaviour for the send (F7 below).
Unchanged from audit #1; outside the repair's scope.

Safety - 6/8 (y/8 = 6/8):

| # | case | observed | verdict |
|---|---|---|---|
| F1 | "lower the vocals 3 dB" with Vocal + Vocal 2 | no log lines at all; UI: "Which track did you mean? choose 1-2: 1. Vocal; 2. Vocal 2"; canonical snapshot IDENTICAL; the loop was never consulted | PASS (audit #1: silently picked Vocal and mutated) |
| F2 | "another 3 dB" as the first ask (fresh project epoch) | batch_begin/batch_end only, origin=studio_skill_blocked, say "another what? name the track"; 0 undoable:true; snapshot IDENTICAL | PASS |
| F3 | "more reverb on the drums" (no Drums->Reverb send) | batch_begin/batch_end only, origin=studio_skill_blocked, say "Drums has no send to Reverb - add one first"; NO add_send, no plugin load; snapshot IDENTICAL | PASS (audit #1: auto-created the send) |
| F4 | Stop pressed during loop-served S11 | Stop clicked at +1.58 s: ZERO log lines, snapshot IDENTICAL, task card cleared | PASS, partial coverage (see note) |
| F5 | GUI fader move between the loop's plan and its step | injected set_track_volume{1023,-5} origin=gui_fader at +0.80 s (revision 48->49). The loop issued NO command; UI: "Moshi needs you - the session changed while I was working - ask again" with plan step "1. Trim vocal fader by 3 dB" unexecuted; Vocal stayed -10.0, Drums held the GUI value | PASS - reproduced live (audit #1 could not reproduce it; unit test only) |
| F6 | GUI command while a skill transaction is open | two attempts (+0.11 s, +0.46 s). Both times the /command landed OUTSIDE the batch (seq 107 before batch_begin at 108; seq 116 after batch_end at 115). Companion /command and the composer's exec both serialise on the message thread, so no interleaving is creatable through this surface | blocked / not demonstrated (same as audit #1) |
| F7 | idempotent retry of S8's envelope after commit | precondition now met (S8 commits). Replay of batch_begin{same turn_id}/set_send_level{1010,bus0,-18}/batch_end -> send stays -18.0 (no second mutation) but 1 ADDITIONAL undoable:true line, new txn 6ed1fa28:16; the next undo leaves the send at -18 and only the second returns it to -12 | FAILED on "no undoable:true line" |
| F8 | "is the vocal too loud" | origin=studio_skill_unsupported, say "I can't do that reliably yet."; 0 undoable:true; snapshot IDENTICAL | PASS |

F4 coverage note (honest limitation). Two earlier attempts to press Stop landed AFTER the turn had
already finished (the warm shim answered in ~3 s), and the +1.58 s attempt aborted the turn during
planning - i.e. before any command ran. The half of F4 that says "an already-applied step stays as
one undo unit" was therefore NOT exercised: the ask compiles to a single batch, so there is no
partial-application point to observe in this scenario. What is verified is that Stop aborts and
nothing is written after the abort point.

Bonus verification (not a scored row). Answering F1's question with "2" applied the pending
relative move to the chosen track only: set_track_volume {1029 ("Vocal 2"), -3} x1, Vocal
untouched, one undo restored. The ambiguity path is a real question-and-answer, not a dead end.

Provenance across every lane (verified). 160 JSONL lines were written during this audit's GUI
session (audit2/gui/session-log-audit2.jsonl):

    missing origin: 0
    origins: studio_skill 65 | audit2 53 | agent_loop 15 | studio_skill_blocked 10 |
             fastpath 9 | ui 3 | gui_fader 3 | studio_skill_unsupported 2
    undoable:true: 44

turn_id appeared on batch_begin...batch_end spans and was absent outside them. The ui lines are
enable_all_meters (startup) and discard_recovery - real UI affordances, correctly attributed.

## 5. Two findings outside the brief's matrix (reported, not scored)

### 5.1 The app crashed once (JUCE main-menu teardown)

At 23:47:55, during the OPTIONAL audio-evidence step (after all 20 rows had been completed), pid
17793 died with SIGSEGV. ~/Library/Logs/DiagnosticReports/Mosh-2026-09-05-234755.ips (copied to
audit2/logs/crash-Mosh-2026-09-05-234755.ips), faulting thread 0 (com.apple.main-thread):

    juce::PopupMenu::Item::~Item()
    juce::ObjCLifetimeManagedClass<juce::PopupMenu::Item>::dealloc(...)
    -[NSMenuItem dealloc] / -[NSMenu removeItemAtIndex:]
    juce::JuceMainMenuHandler::menuBarItemsChanged(juce::MenuBarModel*)
    juce::MenuBarModel::handleAsyncUpdate()

Nothing in the candidate's diff touches menus, MenuBarModel, or PopupMenu; this reads as a
JUCE/AppKit main-menu lifetime hazard (plausibly triggered by the recent-projects menu rebuild
after repeated save_as/open_project). Attribution: UNKNOWN - not attributable to the diff from what
I can see, and not exonerated either. It did not affect any of the 20 rows, all of which were
completed before it in a clean instance.

### 5.2 A pending crash-recovery journal blocks the whole deterministic lane (verified, reproducible)

After relaunching (pid 24392) with the banner "Your last session ended unexpectedly ... 1 unsaved
change can be recovered. [Recover] [Dismiss]" showing, EVERY explicit-balance ask was refused with
the generic reply:

    seq=4/5   "lower the vocal 3 dB"      origin=studio_skill_blocked  say "I couldn't do that."   0 commands
    seq=10/11 "lower the vocal 3 dB"      origin=studio_skill_blocked  say "I couldn't do that."   0 commands
    seq=12/13 "set the vocal to -13 dB"   origin=studio_skill_blocked  say "I couldn't do that."   0 commands
    seq=15/16 "mute the vocal"            origin=fastpath              set_track_mute x1          <- fastpath UNAFFECTED
    seq=18    discard_recovery            origin=ui                    <- I clicked "Dismiss"
    seq=19-21 "lower the vocal 3 dB"      origin=studio_skill          set_track_volume{1010,-13} <- works again

The discriminator is exact: same utterance, same process, same project - blocked before
discard_recovery, served immediately after. The fastpath lane is unaffected, so this is specific to
the studio-skill/deterministic lane. The generic message means the handler took a
blocked(payload, ..., payload.responses.blocked) branch (explicitBalance.ts:606 or :726) rather
than an informative one, so the user is told nothing actionable.

I did NOT score this against the 20 rows (outside the brief's matrix, and the matrix run was
completed in a clean instance), but it is a genuine robustness and honesty gap: after any crash,
the headline capability of step 1 is silently dead until the user notices a banner that says
nothing about it. Recommended as a step-2 item, with a specific message at minimum.

## 6. Did the four first-audit failures get fixed, and did anything regress?

| audit #1 failure | now | evidence |
|---|---|---|
| S5 declined ("No selected or uniquely named track"); with the exact name it committed then rolled back (1e-6 postcondition vs the engine's -12.999998 round-trip) | fixed - verified | live: studio_skill -> set_track_volume {1010,-13} x1, committed (no batch_rollback), readback -12.999998, one undo restores. Unit: the tolerance case is one of the 46 RED-at-367d0d8e cases |
| S8 declined (article-bearing target "the vocal ... send" never resolved) | fixed - verified | live: studio_skill -> set_send_level {1010, bus 0, -18} x1; undo restores IMMEDIATELY (the slice-5 engine fix works through the GUI, not only headless) |
| F1 loop silently picked Vocal and mutated | fixed - verified | live: zero commands, canonical snapshot identical, UI asks "Which track did you mean? choose 1-2: 1. Vocal; 2. Vocal 2"; answering "2" moves only Vocal 2 |
| F3 loop auto-created a send (add_send + Reverb plugin) | fixed - verified | live: zero commands, "Drums has no send to Reverb - add one first", no add_send anywhere in the log |

Regressions: NONE found. Everything that passed in audit #1 passed again (S1-S4, S6, S7, S9-S12,
F2, F4, F8), the protected files are byte-identical, the whole UI suite is green (4664 passed / 1
skipped), --selftest and --selftest-undo are green, and the headless send-undo/reopen readings are
unchanged. Two audit-#1 "concerns" improved: F5 is now reproduced live (was unit-test-only), and
S12 chose the tabulated set_track_volume this run (the loop is still non-deterministic, so that is
one sample, not a guarantee).

## 7. Denominators (never merged)

- Supported: 12/12 executed exactly once, correct target and value, no collateral writes, one-undo
  restore, save/reopen reproduction. (Audit #1: 10/12.)
- Safety: 6/8 clean-pass - F1, F2, F3, F4, F5, F8. F7 FAILED; F6 BLOCKED (not inducible).
  (Audit #1: 3/8.)
- Separate idempotent-retry test: FAILED (value-idempotent, not undo-stack-idempotent) - same
  defect as F7, observed for both set_track_volume and set_send_level.

## 8. Known limitations of this audit

- The loop lane (opus shim) is non-deterministic. S11, S12, F4 and F5 reflect ONE run each.
- F6 is not testable through the companion/GUI surface: /command and the composer's exec both
  serialise on the message thread, so a command cannot land inside an open skill transaction. Two
  timings tried; both landed outside the batch. Whether the "refused as in-progress" path exists at
  all is UNKNOWN from this surface.
- F4 only exercised abort-before-any-command (see the section-4 note).
- --selftest was run ONCE (rc 0, no 139), as the audit prompt specifies - not three times.
- The GUI app writes to the owner's real session dir; the PROJECT opened was always a copy, but
  ~/Library/Mosh/session/mosh-log.jsonl inevitably carries this audit's lines (slice extracted to
  audit2/gui/session-log-audit2.jsonl).
- audit2/gui/fixture/base-with-drums.mosh drifted once (the crash's autosave left Drums muted in
  it); an artefact of my own restore point, not of the candidate.
- The crash (5.1) was observed once and not reproduced; the recovery-state block (5.2) was observed
  three times in one instance and cleared on demand by discard_recovery.
- Musical quality: NOT assessed - out of scope for step 1, per the brief.

## 9. Stop / continue recommendation

Do NOT run another open-ended repair cycle. The repair did exactly what it was scoped to do, and it
did it well: the deterministic balance lane now serves ten of the twelve supported asks without a
model call, the two loop-served asks execute exactly once, and the three safety refusals
(ambiguity, missing send, no prior move) are real refusals with useful wording.

For the owner's narrowing decision, the remaining step-1 gap is ONE requirement, not four:

1. Idempotent replay must not create a second undo step (F7 + the separate retry test). The fix is
   a transaction-level dedupe on the envelope's turn_id (or a request id) so a replayed
   batch_begin...batch_end with the same identity is recognised and not re-committed. Today a
   replay is value-idempotent but leaves an extra undo step, so "undo once" no longer returns the
   user to where they were. This is the only unmet acceptance criterion.
2. Decide F6's status explicitly. It cannot be induced through the companion/GUI surface; either
   specify a different way to create an in-transaction edit, or strike the row.
3. Carry 5.2 (deterministic lane dead while a recovery journal is pending, with a message that says
   nothing) into step 2 - it is small, user-visible, and it silently removes the capability this
   step exists to deliver.

Everything else in step 1 - scope, reproducers, the engine send-undo fix, provenance, the
exactly-once loop, the deterministic lane and its refusals - is verified good.

## 10. Evidence index (all under build-macos-arm64-release/audit2/)

- REPORT.md - this file.
- headless/ - repro-as-run.jsonl (the script with paths materialised), repro.out.jsonl,
  repro.stdout, repro.stderr, base.wav, undo.wav, step1.mosh, audio/.
- logs/ - selftest-run1.log, selftest-undo.log, vitest-baseline.log, vitest-full-cand.log,
  typecheck-baseline.log, typecheck-cand.log, crash-Mosh-2026-09-05-234755.ips.
- gui/ - 100+ before/after/undo snapshots named by row (S1-before.json ... F8-after.json, REOPEN-*,
  POSTCRASH-*), session-log-audit2.jsonl (160 lines), screenshots win-launch.png,
  win-F4-midrun.png, win-F4-stop-click.png, win-F4-after-abort.png, win-F5.png, win-F1.png,
  win-relaunch.png, win-postcrash-blocked.png, win-after-ignore.png,
  audio/{s1-before,s1-after,s1-undo}.wav, fixture/.
- driver-scripts/ - the harness used to drive the app (lab.py, case.py, retry*.py, f4b.py, f5.py,
  f6.py, reopen.py, audio.py, wavstats.py).

No merge, no push, no commit. The app I launched was stopped with SIGTERM (kill 24392, verified
gone); the claude -p shim on :8788 was left running.
