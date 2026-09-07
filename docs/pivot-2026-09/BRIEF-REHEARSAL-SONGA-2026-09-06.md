# Execution brief — headless rehearsal of the Song A revision sequence

The single next task selected by [RECONCILIATION-2026-09-06 §7](RECONCILIATION-2026-09-06.md).

| Field | Value |
|---|---|
| Baseline | `origin/main` @ `914faf856c1004eced9e85024f1b1a54ac25b195` |
| Kind | Rehearsal and pre-flight. **Not** a round of `mix-2026-09-songA-first-pass`; produces no musical claim and uses no owner listening time |
| Allowed writes | a scratch directory outside the repo; at most **two** `.jsonl` fixtures under `docs/pivot-2026-09/repro/`; one dated directory under `docs/pivot-2026-09/evidence/` |
| **Forbidden** | any change under `src/`, `ui/`, `service/`, `scripts/`, `tests/`; any write to `~/Library/Mosh/references/songs/greg/`; any push, merge or deploy; any chargeable job, upload, install or terms acceptance |
| Owner input needed | none |

**Why this and not the experiment or the ledger repair.** Handoff §2 says that when the machinery
already works the next task is the experiment — and step 1 is merged, so it does. But the
revision arm runs entirely through the deterministic balance lane, that lane opens a transaction
per move, and the experiment's protocol deliberately relaunches the app ("save, close, reopen"),
which is exactly the trigger for the item A latch. The risk is not that the lane stops working;
it is that a latch gets **recorded as a musical or routing failure**. Repairing item A first
would instead spend the one bounded repair cycle before any musical fact exists. This rehearsal
costs no owner time, decides empirically rather than by argument, and must close the SA3 region
question either way.

---

## 1. Half 1 — routing, from pure functions

`matchExplicitBalanceUtteranceV1` (`ui/src/agent/skillFoundry/native/matchers.ts`) and
`resolveTargetV1` (`.../native/explicitBalance.ts`) are pure functions of the utterance and of
`snapshot.tracks` / `snapshot.buses`. Build a snapshot from `greg.mosh`'s real track list — Beat,
Lead, Double, Background, FX A-Reverb, FX B-Delay, REF-rough — with `buses: []`, and run the
frozen utterance list through both. No engine, no build.

Produce a table of **utterance → matched form (or null) → resolved target (or the refusal) →
command**. Include at minimum:

| # | Utterance | Prediction to confirm or refute |
|---|---|---|
| 1 | `The vocal gets lost in the hook. Bring it forward without making the beat feel smaller.` | no match — two sentences, no dB |
| 2 | `bring the vocal forward` | no match, or `no_match` on the target: no track is named "vocal" |
| 3 | `turn the lead up 2 dB` | matches; resolves to `Lead`; `set_track_volume` |
| 4 | `turn the vocal up 2 dB` | matches the form; **target unresolvable** → hands the turn back |
| 5 | `Better. A little less reverb, but keep the vocal balance we just got.` | no match — no hedge-word vocabulary |
| 6 | `a little less reverb` | no match |
| 7 | `less reverb on the lead` | matches `send_level`; **blocked — no bus matches reverb** |
| 8 | `turn the reverb down 2 dB` | matches; resolves to `FX A-Reverb`; `set_track_volume` |
| 9 | `turn the delay down 2 dB` | matches; resolves to `FX B-Delay`; unique |
| 10 | `another 2 dB` | repeat-last form |

Report every result verbatim, including the ones that contradict the prediction. **A predicted
miss is data; a surprise miss during a sitting is a lost round.** The confirmed table is then
copied into [MIX-PACKAGE-V0 §7.7](MIX-PACKAGE-V0.md) before the owner speaks.

## 2. Half 2 — engine, ledger, undo, reopen

A `--run-script` fixture in the shape of `repro/step1-fader-send-undo.jsonl`, on a **disposable
copy** of `greg.mosh` (never the canonical package), run as **two processes over one session
directory**:

~~~sh
MOSH_NO_AUDIO=1 MOSH_SELFTEST_SESSION=_harness/rehearsal-songa \
MOSH_RUNSCRIPT_KEEP_SESSION=1 \
MOSH_RUN_SCRIPT=<fixture> MOSH_RUN_SCRIPT_OUT=$OUT/out.jsonl <Mosh binary> --run-script
~~~

`MOSH_SELFTEST_SESSION` must stay a **relative** `_harness/<leaf>` path or it is silently
redirected. Pump once (`__wait`) after any track creation, per the deferred-sort finding recorded
in the existing fixture.

**Process 1** — open the copy; run the V1 → revision 1 → revision 2 command sequence including
**one deliberately failing transactional batch** and **one deliberately declined utterance**;
`save`; exit cleanly.
**Process 2** — relaunch on the same session directory; attempt one more transactional batch.

Read `<sessionDir>/agent-transactions.jsonl` and `__snapshot` after each step. Record:

1. every transaction id and the status of its **last** record, in both processes;
2. whether process 2's `batch_begin` is served or refused with `unresolved_after_restart`;
3. whether **a declined utterance wrote any ledger record at all**;
4. whether one `undo` restores the pre-edit values, and whether they survive `save` and reopen;
5. the plugin inventory of the saved `.mosh` — it must remain 7 `level` + 1 `volume`.

## 3. Half 3 — the SA3 region pre-flight

On the same disposable copy, one `create_render_layer` with an explicit `regionStart` /
`regionEnd` on the Beat clip, then one `render_layer`. Record:

- **whether the rendered result splices back into the clip or replaces the clip's source** —
  compare the clip's duration and offset before and after, and hash the Beat audio **outside**
  the declared region;
- wall time and peak memory;
- `SA3_SECONDS`, `SA3_MLX_DIR` and `MOSH_ENABLE_SA3` as actually resolved at runtime;
- the output's sample rate and bit depth at each stage.

## 4. Frozen decision rule

Written before the rehearsal runs, so the result cannot be reinterpreted afterwards.

**Go to the experiment** — run round 1 of `mix-2026-09-songA-first-pass` — if **all three** hold:

1. every transaction id's last record is terminal across the restart, **and** process 2's batch is
   served;
2. one `undo` restores the pre-edit values, and they survive save and reopen;
3. the region render splices back into the clip, leaving the audio outside the region unchanged.

Standing procedure in that case: **one fresh session directory per round**, and inspect the
ledger after every revision.

**Go to the repair** — items **1 and 2 only** of
[BRIEF-STEP2-A-UNRESOLVED-TRANSACTION-BLOCK.md](BRIEF-STEP2-A-UNRESOLVED-TRANSACTION-BLOCK.md)
(publish `session.unresolvedTransactions` and let the recovery notice show on it; treat `failed`
as resolved at startup) — if any of the three fails. Items 3 and 4 are real but are not on this
experiment's critical path.

**Special case, decided in advance:** if a merely *declined* utterance writes a non-terminal
ledger record, the repair becomes **mandatory** regardless of the other two results — this
experiment produces declines by design, and every one of them would poison the session.

**If half 2 cannot be written** — if `--run-script` cannot open an existing `.mosh` and drive
`batch_begin` against it — then the rehearsal has become a project. Stop, report that, and go to
the experiment with the fresh-session-directory discipline and the risk consciously accepted.
Do not build engine support to make the rehearsal possible.

## 5. Stop conditions

- Any canonical hash under `~/Library/Mosh/references/songs/greg/` changes → **stop**, restore,
  report.
- Any source file changes → **stop**; this brief authorizes none.
- The pass exceeds one bounded attempt → report what closed and what did not, rather than
  expanding.
- `MoshSkillIdentityGate` refuses a Release build on a dirty tree; commit first or build Debug.
  Never modify the gate.

## 6. Deliverable

One evidence directory `docs/pivot-2026-09/evidence/rehearsal-<date>/` containing the routing
table, both processes' output and ledger contents, the undo and reopen readings, the SA3
pre-flight numbers, and a one-line verdict naming which branch of §4 the result selects. Every
status uses the vocabulary **verified · reported-not-rerun · inferred · failed · absent ·
blocked**, with exact commands and exit codes. It authorises exactly one successor and nothing
else.

Independent review prompt: [AUDIT-PROMPT-REHEARSAL.md](AUDIT-PROMPT-REHEARSAL.md).
