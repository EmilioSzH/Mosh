# Rehearsal result — Song A, 2026-09-06

Executes [BRIEF-REHEARSAL-SONGA-2026-09-06.md](../../BRIEF-REHEARSAL-SONGA-2026-09-06.md).
No owner time used. **Not a round** of `mix-2026-09-songA-first-pass`. No musical claim.

## Verdict: the frozen rule selects the REPAIR branch

The brief's §4 required all three go-conditions to hold. **The first one fails**, so the next
task is items 1–2 of [BRIEF-STEP2-A](../../BRIEF-STEP2-A-UNRESOLVED-TRANSACTION-BLOCK.md), not
round 1 of the experiment.

| Go-condition | Result |
|---|---|
| Ledger stays terminal across a restart **and** process 2's batch is served | **FAILED** — refused |
| One `undo` restores, and values survive save and reopen | passed |
| The whole-clip render round-trips | not reached — moot for this decision |

## Binary provenance (closes O-1)

| | |
|---|---|
| Path | `build-macos-arm64-release/Mosh_artefacts/Release/Mosh.app/Contents/MacOS/Mosh` |
| sha256 | `8a3075f93c82ffe87bfc395bc5ed5a98334cdf0549a422b534152bb8537710aa` |
| Stamped identity | `git=d20fcede24178f4eea1e7dfcb6dafb843d9c3e03 · state=clean · Release · arm64` |

`d20fcede` is the SHA the native gate certified (205 rows / 154 pass / 0 FAIL). The three
commits since are documentation only and change no compiled input, so a rebuild produced no
relink — the binary legitimately carries the certified SHA rather than a docs SHA.

## Half 1 — routing (10/10 predictions confirmed)

The frozen utterance list through the real exported `matchExplicitBalanceUtteranceV1`. **Every
prediction written into the spec before the run was confirmed**; nothing surprised.

| Utterance | Matched form |
|---|---|
| "The vocal gets lost in the hook. Bring it forward without making the beat feel smaller." | **no match** |
| "bring the vocal forward" | **no match** |
| "turn the lead up 2 dB" | `adjust_level +2` target `"the lead"` |
| "turn the vocal up 2 dB" | `adjust_level +2` target `"the vocal"` (unresolvable against this project's names) |
| "Better. A little less reverb, but keep the vocal balance we just got." | **no match** |
| "a little less reverb" | **no match** |
| "less reverb on the lead" | `send_level -3 bus=reverb (relative)` — blocked later, this project has no buses |
| "turn the reverb down 2 dB" | `adjust_level -2` target `"the reverb"` |
| "turn the delay down 2 dB" | `adjust_level -2` target `"the delay"` |
| "another 2 dB" | `repeat_last +2` on the selection |

**6 of 10 reach a deterministic form; 4 fall through to the router and the loop.** All four
misses are the owner's own natural phrasings. That gap — how much explicit language he has to
supply — is the experiment's headline measurement, and it is now recorded before he speaks.

## Half 2 — the ledger latch, reproduced

Two `--run-script` processes over one kept session directory
(`MOSH_RUNSCRIPT_KEEP_SESSION=1`, `MOSH_SELFTEST_SESSION=_harness/rehearsal-songa`), driving a
disposable copy of `greg.mosh`. Fixtures: [p1](p1-fixture.jsonl), [p2](p2-fixture.jsonl).
Assertions: [assertions.txt](assertions.txt) — **13/13 passed**, script [analyze.py](analyze.py).

The ledger ([agent-transactions.jsonl](agent-transactions.jsonl)) after process 1:

```
T-good  open → committed                                  (terminal)
T-fail  open → failed(command_failed) → failed(transaction_incomplete)   (NON-terminal)
```

Process 2, after a **clean** relaunch:

```
unresolved_after_restart: transaction T-fail from a previous run is unresolved;
recover or discard the session before running a skill
```

**No crash was involved.** Process 1 exited cleanly. The only unfinished business was a
transaction that failed and reported it — the ordinary path when a command is refused. This is
exactly the framing correction the step-2 brief made, now demonstrated rather than argued.

Three findings sharpen the repair:

1. **The blocking state is unambiguous.** `T-fail` applied 0 of 1 commands and its post-state
   fingerprint equals its pre-state fingerprint (`5e318629`). Nothing happened, the engine knows
   nothing happened, and it blocks anyway. This is the whole case for item 2.
2. **There is no UI route out.** The snapshot carries **no** field naming the unresolved
   transaction, and **no recovery key at all** — so `RecoveryNotice` cannot render and the
   Dismiss button never appears. This is the whole case for item 1.
3. **Declines write nothing.** The ledger holds exactly the two transaction ids the fixture
   created. A declined utterance never reaches `batch_begin` — `explicitBalance.ts` returns
   `blocked` from `requestFromSlotsV1` or from target resolution, both before
   `executeForTrackV1`, the only path to a batch. **O-5 closed, and favourably**: the
   experiment's many by-design declines cannot poison a session.

Undo behaved correctly throughout: the committed edit moved the Lead fader 0.0 → −2.0 dB and one
`undo` restored 0.0 dB.

## Integrity

Canonical package unchanged — `source/`: 7 ok, 0 changed, 0 missing. All work ran on a scratch
copy. Seven tracks, every clip 92.6896875 s, `autoTempo` false on all, mixer plugin inventory
unchanged.

## Open items after this run

| Item | State |
|---|---|
| O-1 binary provenance | **closed** — recorded above |
| O-3 can run-script open a project | **closed** — it can; `open_project` result `ok:true` |
| O-5 do declines write ledger records | **closed** — they do not |
| O-2 whole-clip render round-trip | **not run** — moot for this decision; required before condition G |
| O-4 SA3 wall time / contiguity | **not run** — required before condition G |

Half 3 was not run because the decision was already settled by half 2, and the repair is now on
the critical path. It is a prerequisite for condition G, not for the repair, and runs before the
candidates are built.
