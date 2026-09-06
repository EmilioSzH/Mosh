# Step 1 — status after two independent audits (2026-09-06)

Candidate: branch `claude/step1-useful-edits`, frozen at `1453a647` (code tree `7b1d7423`),
base `e57c74d4` (the docs commit, code-identical to `0da6c638`). Nothing pushed or merged.

The brief's repair policy is one bounded repair cycle per candidate, then a blocked verdict and
an owner-narrowed scope. That cycle is spent. This file is the record the owner decides from.

## Verdicts

| | Audit 1 (`ccdaab85`) | Audit 2 (`7b1d7423`) |
|---|---|---|
| Verdict | FAIL | FAIL |
| Supported requests | 10 / 12 | **12 / 12** |
| Safety cases | 3 / 8 | **6 / 8** |
| Scope, tests, headless | pass | pass |

Reports: [audit-1-REPORT.md](evidence/step1-ccdaab85/audit-1-REPORT.md),
[audit-2-REPORT.md](evidence/step1-7b1d7423/audit-2-REPORT.md).

## What is earned

Every failure the first audit found is fixed and verified live through the real composer:

- **S5** "set the vocal to -13 dB" is served deterministically, commits without a rollback, and
  one undo restores. It was declined before, and rolled back on an over-tight postcondition.
- **S8** "set the vocal reverb send to -18 dB" executes once and undoes immediately. It was
  declined before.
- **F1** ambiguity between two vocal tracks now asks which one and mutates nothing. The loop
  silently picked one before.
- **F3** a send is never auto-created when the named bus has no send from that track. The loop
  created one before.
- **F5** the session-revision park was reproduced live for the first time: a fader move during
  planning made the loop park with nothing applied.
- Engine work holds: selftest 3538/3538, undo suite 18/18, the reproducer's readings correct,
  every log line carries an origin and in-batch lines carry a turn id.
- A rendered-audio check the first audit skipped: a 3 dB move measures −3.0000 dB on the export
  and 0.0000 dB after one undo.

## What is not earned

1. **Idempotent replay writes a second undo step.** Replaying a committed envelope leaves the
   value correct but opens a new transaction, so one undo no longer returns the pre-edit state.
   The brief requires no second undoable line. The engine replays deliberately, so changing it
   means changing the transaction ledger's replay path. This is the one acceptance criterion
   still unmet and the reason audit 2 is a FAIL.
2. **F6 could not be demonstrated either way.** A companion command and the composer both run on
   the message thread, so a command cannot be made to land inside an open skill transaction
   through that surface. Whether the in-progress refusal exists is unknown.
3. **F4 was only half exercised.** The abort landed before any command ran, so "an applied step
   stays one undo unit" was not tested.

## Two findings outside the matrix

- **A stale ledger entry disables every deterministic skill.** The audit saw this after a crash,
  and I first recorded it as a crash bug. **That framing was wrong** (root-caused 2026-09-06,
  reproduced 3/3 headlessly): the trigger is a non-terminal transaction record at startup, which a
  clean exit with an open transaction produces, and which a transaction that merely **failed and
  said so** also produces. It is not gated on a crash, it is not cleared by opening another
  project, and once the recovery banner is gone the Dismiss button goes with it while the block
  stays, with nothing in the snapshot naming it. The real guard is the unresolved-ledger check at
  `MoshOps.cpp` ~1218, not the open-transaction check at ~1245 that I first cited. Full account and
  the fix: [BRIEF-STEP2-A-UNRESOLVED-TRANSACTION-BLOCK.md](BRIEF-STEP2-A-UNRESOLVED-TRANSACTION-BLOCK.md).
- **One SIGSEGV** during an optional step, in JUCE main-menu teardown. Nothing in the diff touches
  menus. Attribution unknown, observed once, not reproduced.

## The decision

Options, in the order the auditor and I would rank them:

1. **Accept step 1 as delivered and take the two findings into step 2.** Supported is 12/12 and
   safety 6/8 with the two misses being an engine replay semantic and a case that cannot be
   induced through the available surface. The crash-banner defect is a separate, larger product
   bug that belongs with the recovery work, not with routing.
2. **Spend a second repair cycle on the replay semantics only**, leaving the crash-banner defect
   for step 2. This needs an owner exception to the one-cycle rule.
3. **Narrow the acceptance bar** so the idempotent-retry criterion reads "value-idempotent" rather
   than "no second undo step", and record why. This is a change to the brief, not to the code.

I recommend option 1 plus filing the crash-banner defect as the first item of step 2, because it
costs a user their whole session's agent capability after any crash and has a known mechanism.

## Owner decision (2026-09-06)

**Option 1.** Step 1 is accepted as delivered at `1453a647`, and the crash-banner defect becomes the
first item of step 2. Consequences, recorded so nothing is quietly lost:

- The candidate is accepted with **one acceptance criterion knowingly unmet**: an idempotent replay of
  a committed envelope opens a second undo transaction. It is not fixed, not waived silently, and not
  re-scored. It is carried as a step-2 item with its evidence in audit 2.
- F6 stays unknown (not inducible through the companion or GUI surface) and F4 stays half exercised.
  Neither is a pass; both are carried.
- The one SIGSEGV in menu teardown stays unattributed. If it recurs, attribute it before releasing.
- The step-2 item A brief was written from a root cause, not from the audit's symptom, and it
  corrects this document's original description of that finding.
- Merging to main is a separate decision and needs the native gate
  (`scripts/auto-loop/gate.sh native <worktree> origin/main`). Nothing has been pushed or merged.

