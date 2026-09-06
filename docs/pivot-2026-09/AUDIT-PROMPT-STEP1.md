# Independent audit prompt — Step 1 "useful edits exactly once"

Paste the block below into a fresh session that has never seen the implementation
conversation. The author's "green" is not the verdict; this audit is.

----- BEGIN AUDIT PROMPT -----

Audit a Mosh implementation candidate against its baseline. Repository:
`/Users/emiliosanchez-harris/Mosh` (use the candidate's own worktree; do not reset,
relocate, merge or push anything). Code baseline `0da6c638eaa719296e3c97650a405f1afc9e8f53`; the candidate branch starts at the docs commit `e57c74d4` whose code tree is identical to it, so run scope diffs against `e57c74d4` and treat `docs/**` as allowed.
Candidate SHA and branch: `<fill in>`. The brief is
`docs/pivot-2026-09/BRIEF-STEP1-USEFUL-EDITS-EXACTLY-ONCE.md`; read it first, then this.

Report every status with the vocabulary **verified · reported-not-rerun · inferred · failed
· absent · blocked**, with the exact command, exit code and output excerpt. Report raw counts
with denominators. Unknowns stay unknown. Do not improve a count by changing its denominator.

1. **Scope.** `git diff --stat e57c74d4..<candidate>`. FAIL if any changed non-docs file is outside
   the brief's allowed-files table (including its 2026-09-05 additions), or if any protected file changed
   (`ui/src/agent/sessionRender.ts`, `ui/src/agent/loop/producePrompt.ts`,
   `ui/src/agent/loop/produceTemplate.ts`, `ui/src/agent/commands.ts`,
   `ui/src/agent/fastPath.ts`, the studio-skill match order in
   `ui/src/agent/skillFoundry/native/runtime.ts`, `sessionControl.ts`, `takeCycle.ts`).
   Confirm no provider/model change (`ui/src/agent/loop/runTask.ts` transport untouched).
2. **Reproducers at baseline, then at candidate.** In `ui/`:
   `./node_modules/.bin/tsx -e 'import {routeAsk} from "./src/agent/loop/router.ts"; for (const a of ["turn the clap down 3 dB","sustain the stabs","make the B section darker","halve the hats in bar 7","add a counter phrase","lower the vocal 3 dB","is the vocal too loud"]) console.log(a,"->",routeAsk(a))'`
   — baseline: all `single`; candidate: the first six `loop` (or served by a deterministic
   lane), the question `single`. Run `./node_modules/.bin/vitest run src/agent/loop src/agent/skillFoundry src/ui/AgentComposer.namedPlugin.test.ts`
   and `npm run typecheck`; record pass/fail counts and exit codes at both SHAs. The new
   `loop.test.ts` case "reply carries both `commands` and `plan[0].commands`" must FAIL at
   baseline and PASS at candidate.
3. **Headless engine check.** Build the candidate (`cmake --build build-macos-arm64-release --target Mosh`)
   and run `docs/pivot-2026-09/repro/step1-fader-send-undo.jsonl` with
   `MOSH_NO_AUDIO=1 MOSH_SELFTEST_SESSION=_harness/audit-<sha> MOSH_RUN_SCRIPT=<script> MOSH_RUN_SCRIPT_OUT=<out>`.
   Baseline behaviour (recorded 2026-09-05): after `set_send_level −18` + `undo`, the
   snapshot still reads −18 (stale until reopen). The script pumps once after the fixture
   (`__wait 300`) because track creation arms the engine's deferred track sort, which is
   written through the undo manager on the first pump; without the pump it forms a phantom
   transaction that the second undo consumes (fader edits alone reproduce it; every GUI turn
   pumps). Candidate must show: `undo_send_immediate` reads −12, `undo_fader` reads −10,
   `reopened` equals `undo_fader` on `volumeDb` and `sends`, and every JSONL line in
   `<session>/mosh-log.jsonl` carries `origin`, with `turn_id` present on the lines inside
   the batch. FAIL on any deviation. Run `Mosh --selftest-undo` once and `--selftest` once;
   record the check counts and rc (rc 139 is a known intermittent crash class — rerun once,
   report both). The candidate adds P6 rows and a STEP1-PROV section, so the total check count
   rises; a count is not a target.
4. **The 20 requests through the real composer.** Launch via
   `scripts/produce-lane/launch-app.sh` (refuses if any Mosh.app is running; never kill the
   owner's `/Applications/Mosh.app`). Open a **copy** of the fixture project produced by
   step 3 (never an owner session). Type each request from the brief's tables S1–S12 and
   F1–F8 into the composer (osascript keystrokes are acceptable). For each: capture the JSONL
   turn (`batch_begin`…`batch_end` or the single command), a `get_command_log`/snapshot
   before, after and after one `undo`, and count `undoable:true` lines in the turn.
   - Supported request PASS = executed exactly once, correct target and value, zero writes
     outside the target, one `undo` restores the pre-state, `save_as` → `open_project`
     reproduces the post-edit values. **A declined supported request is a FAILED capability
     test.**
   - Safety case PASS = no `undoable:true` line and canonical snapshot unchanged.
   - Report `x/12` and `y/8` separately. Include the −10 → −13 → (retry same envelope) −13 →
     ("another 3 dB") −16 sequence verbatim.
5. **Verdict.** PASS only if steps 1–4 all pass. Otherwise FAIL with the exact failing
   items. One bounded repair cycle is permitted after this report; a second failure is a
   blocked verdict and the scope is narrowed by the owner, not by the auditor.

Deliver: baseline and candidate IDs, changed files, every command with exit code,
before/after/undo/reopen evidence, the two denominators, known limitations, and a
stop/continue recommendation. No merge, no push.

----- END AUDIT PROMPT -----
