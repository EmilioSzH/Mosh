# Independent review prompt — Song A rehearsal and pre-flight

Paste the block below into a fresh session that has never seen the rehearsal conversation. The
author's summary is not the verdict; this review is. Derived from handoff Appendix B, narrowed to
this brief.

----- BEGIN REVIEW PROMPT -----

Review a Mosh rehearsal result. Repository `/Users/emiliosanchez-harris/Mosh` — use the
rehearsal's own worktree; do not reset, relocate, merge or push anything, and preserve unrelated
work. Baseline `origin/main` @ `914faf856c1004eced9e85024f1b1a54ac25b195`. The brief is
`docs/pivot-2026-09/BRIEF-REHEARSAL-SONGA-2026-09-06.md`; read it, then
`docs/pivot-2026-09/RECONCILIATION-2026-09-06.md` §7 and `docs/pivot-2026-09/MIX-PACKAGE-V0.md` §7.

**First, classify what you are reviewing.** This is a rehearsal review, not a code-candidate
review and not a musical review. No musical claim may be made from it, and no listening judgment
may be invented.

Report every status with the vocabulary **verified · reported-not-rerun · inferred · failed ·
absent · blocked**, giving the exact command, exit code and output excerpt. Report raw counts
with denominators. Unknowns stay unknown. Do not improve a count by changing its denominator.

1. **Scope and preservation.** `git status --porcelain` and `git diff --name-only` against the
   baseline. FAIL if anything under `src/`, `ui/`, `service/`, `scripts/` or `tests/` changed —
   the brief authorizes no source change. Confirm the canonical package
   `~/Library/Mosh/references/songs/greg/` is byte-unchanged by re-running `shasum -a 256` over
   its 19 files. FAIL on any difference.

2. **Routing half.** Re-run the pure-function checks yourself rather than reading the reported
   table. The snapshot must carry `greg.mosh`'s real seven track names and an **empty** `buses`
   array. Confirm each row's matched form, resolved target and command. A reported "no match" you
   cannot reproduce is a FAIL of the report, not of the code. Specifically check that
   `less reverb on the lead` is refused for the stated reason (no bus matches) and not for some
   other reason.

3. **Engine half.** Confirm the two processes shared **one** session directory and that
   `MOSH_SELFTEST_SESSION` was a relative `_harness/<leaf>` path. Read
   `<sessionDir>/agent-transactions.jsonl` yourself. For every transaction id, state the status of
   its **last** record. Answer, separately and explicitly:
   - was process 2's `batch_begin` served or refused?
   - **did a merely declined utterance write any ledger record?** This one answer can make the
     ledger repair mandatory on its own.
   - did one `undo` restore the pre-edit values, and did they survive `save` and reopen?
   - is the saved project's plugin inventory still 7 `level` + 1 `volume`?
   Note that `open_project` is UI-only, so any "reopen" claim must say whether a human did it.

4. **SA3 pre-flight.** The load-bearing question is whether a sub-region render **splices back
   into the clip or replaces the clip's source**. Do not accept a duration match as proof —
   require a hash of the Beat audio outside the declared region. If that evidence is absent, the
   region-preservation promise stays **unverified** and must not be written as made. Record the
   staging sample rate and bit depth at each stage; a resample and a truncation in the path are
   facts about the method, not defects.

5. **The decision.** The brief's §4 rule was frozen before the run. Check it was applied as
   written and not reinterpreted. Confirm the result selects **exactly one** successor — run
   round 1, or repair items 1–2 of the item A brief — and that no third option was invented. If
   any of the three go-conditions failed, or a declined utterance poisoned the session, the only
   correct selection is the repair.

6. **Verdict.** Report **technical integrity**, **dependency readiness** and **authorization**
   separately, each as PASS / FAIL / BLOCKED / NOT TESTED. Musical utility and workflow usability
   are **NOT TESTED** by construction here — say so rather than leaving them blank. Documentation
   or a rehearsal passing is not code or musical value passing.

Deliver: baseline and candidate ids, changed files, every command with its exit code, the ledger
contents, the routing table you reproduced, the splice-or-replace evidence, known limitations,
and the one next allowed action. Do not push, merge, deploy or silently repair. One bounded
repair cycle is permitted after this report; do not reset any existing repair counter.

----- END REVIEW PROMPT -----
