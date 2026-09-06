# Implementation brief — step 2, item A: a stale ledger entry disables every skill

**The first item of step 2** (owner decision 2026-09-06). Documentation only until a candidate
branch starts. Root-caused and reproduced 2026-09-06; the reproducer below ran 3/3 identically.

| | |
|---|---|
| Baseline | `claude/step1-useful-edits` @ `56b3ba63` (step 1 as accepted) |
| Candidate | one branch/worktree from that SHA; one commit per numbered item; candidate SHA frozen before audit |
| Repair policy | one bounded repair cycle after the independent audit, then a blocked verdict |
| Evidence | `build-macos-arm64-release/recovery-probe/` on the investigating worktree; findings restated below with file:line |

## 1. What actually happens

The step-1 audit reported this as a crash bug: with a recovery banner pending, every deterministic
skill answered "I couldn't do that." That framing was mine and it was **wrong in three ways**.

1. **It is not a crash bug.** The trigger is "the last ledger record for some transaction id is
   non-terminal at startup". A clean process exit with an open transaction does it. So does a
   transaction that simply **failed and said so** — the common path, not the exotic one.
2. **It is not tied to the banner.** `session.recoveryAvailable` is published only while the
   crashed run's `session.running` sentinel exists (`MoshOps.cpp` ~3267). The block has no such
   gate, so after one clean relaunch the banner is gone, its Dismiss button with it, and the block
   remains. Nothing in the snapshot mentions it. The skill lane is then dead for the life of that
   session directory with no route out through the UI.
3. **Its scope is the session directory, not the project.** Opening or creating an unrelated
   project does not clear it; the refusal still names a transaction id from the old project.

Mechanism, verified by reading and by running:

- `MoshOps::initTxnLedger()` (`MoshOps.cpp` ~1569) reads `<sessionDir>/agent-transactions.jsonl`
  and latches every id whose last record is non-terminal into `unresolvedTxnIds_`. It is called
  once from the constructor (~line 309) and, unlike `initRecoveryJournal()` one line above, is
  **not gated on any crash signal**.
- `isTerminalStatus` (`AgentTxn.h` ~29) counts only `committed` and `rolled_back`. So `failed` and
  `needs_recovery` latch the block.
- `cmdBatchBegin`'s **first** transactional check (`MoshOps.cpp` ~1218) then refuses:
  `unresolved_after_restart: transaction <id> from a previous run is unresolved; recover or
  discard the session before running a skill`. It fires before the manifest is even parsed.
- Only `resolveUnresolvedTxns` clears it (~1775), called only by `recover_session` (~4421) and
  `discard_recovery` (~4487).
- The legacy batch path is immune (the guard sits after the `txnId.isEmpty()` early return), which
  is exactly why the audit saw the fast path keep working while the skill lane died.
- The engine's explanation reaches `atomicPlan.ts` (~273) and is then **discarded** at
  `native/explicitBalance.ts` (~525) and again at `declarativeExecutor.ts` (~640), both replacing
  it with the payload's generic `blocked` string. The blocked outcome type has no field the reason
  could ride in, and `SkillReasonCodeV1` has no member for this state; the code emitted today is
  `command_failed`, which is false because no command ran.

## 2. Reproducer (headless, deterministic)

Two runs against one harness session, `MOSH_RUNSCRIPT_KEEP_SESSION=1`, no crash involved:

```bash
BIN=build-macos-arm64-release/Mosh_artefacts/Release/Mosh.app/Contents/MacOS/Mosh
S=_harness/txn-block
MOSH_NO_AUDIO=1 MOSH_SELFTEST_SESSION=$S MOSH_RUNSCRIPT_KEEP_SESSION=1 \
  MOSH_RUN_SCRIPT=r1.jsonl MOSH_RUN_SCRIPT_OUT=r1.out.jsonl $BIN --run-script
MOSH_NO_AUDIO=1 MOSH_SELFTEST_SESSION=$S MOSH_RUNSCRIPT_KEEP_SESSION=1 \
  MOSH_RUN_SCRIPT=r2.jsonl MOSH_RUN_SCRIPT_OUT=r2.out.jsonl $BIN --run-script
```

`r1.jsonl` opens a transactional batch (`transactionId` + `commands` manifest), applies one step,
and ends normally without `batch_end`. `r2.jsonl` then runs a plain command, a legacy batch, and a
transactional batch. Observed, 3/3: the plain command and the legacy batch succeed, the
transactional batch is refused with the string above, and `__snapshot` carries **no** recovery keys
at all. A variant where the transaction's first step merely **fails** produces the same block on
the next launch.

## 3. What to build

1. **Publish the state.** Add one snapshot field beside the existing recovery block in
   `MoshOps.cpp` (~3267), e.g. `session.unresolvedTransactions` (count, and the ids), and let
   `ui/src/ui/RecoveryNotice.tsx` (visibility is the pure predicate at ~12) show on it as well,
   with copy that names the real remedy. `discard_recovery` is an ordinary ungated command that
   clears the block in one call, so this alone turns a permanently dead session directory into one
   click. Nothing about transaction semantics changes.
2. **Narrow the predicate.** A `failed` transaction was already reported to its caller, with the
   true applied count and a real post-state fingerprint in its record. It is not ambiguous and
   must not block. Treat `failed` as resolved at startup (or auto-resolve it when its recorded
   post-fingerprint matches the loaded state). This removes the common trigger without weakening
   the genuinely ambiguous `open` case.
3. **Auto-resolve `open` orphans by fingerprint at startup.** The begin record persists
   `preFingerprint`, and the same fingerprint was measured across two processes on a saved project,
   so the comparison is sound. It is also strictly more honest than today: `discard_recovery`
   already stamps `rolled_back` with no proof, and was observed writing a fingerprint matching
   neither the pre nor the post state. **Guardrail:** never auto-resolve while the engine has a
   project load error or is in safe mode, because the fallback empty Edit can never match and a
   naive implementation would re-block exactly the user already in trouble.
4. **Carry the reason to the user.** Add a `SkillReasonCodeV1` member for this state and a reason
   field on the blocked outcome (`contracts.ts` ~72 and ~311), then use it at **both** drop sites:
   `native/explicitBalance.ts` (~525) and `declarativeExecutor.ts` (~640). The user must learn what
   was refused and what to do; "I couldn't do that." is not that.

Also in scope, one line each: the refusal names only `unresolvedTxnIds_[0]` even when several ids
block; and the adjacent `pendingRecovery_` hazard has the same startup-latched, unscoped shape (the
banner survives `new_project`, so Recover would replay one project's tail into another). Fix it in
this pass or say explicitly why not.

## 4. Tests

- **RED first, engine:** a `--selftest` section that plants a non-terminal ledger record (both the
  `open` and the `failed` shapes) in an isolated harness session and asserts a transactional
  `batch_begin` succeeds after item 2, and that a genuinely ambiguous `open` orphan whose
  fingerprint does not match still blocks and is reported.
- The two-run headless reproducer above, promoted into the repo as
  `docs/pivot-2026-09/repro/txn-unresolved-block.jsonl` plus its second-run script, must go from
  refused to served.
- **UI:** a test that a refused batch surfaces the engine's reason and the remedy rather than the
  generic string, at both drop sites; and that `RecoveryNotice` appears when the new snapshot field
  is set with no crash flag present.
- Protected: the FS-B2a discipline that a retry after commit replays rather than double-applies,
  the `needs_recovery` path, the ledger's audit value, the composer precedence, and every file in
  the step-1 protected list.

## 5. Acceptance

A session directory that has seen a failed or interrupted skill transaction serves the next skill
ask normally, on the next launch, without a human clearing anything; a genuinely ambiguous orphan
still stops the lane **and says so in words the user can act on**; the selftest and the two-run
reproducer both prove it; no change to what a committed or rolled-back transaction means.
