# `mix-2026-09-songA-first-pass` — round 1 is built and waiting on ears

Built 2026-09-06 against the frozen specification in
[MIX-PACKAGE-V0 §7](../../MIX-PACKAGE-V0.md). **Nothing here has been listened to.** No musical
claim is made, and none can be until the owner rates it.

## What to do

```bash
python3 -m http.server -d "$HOME/Library/Mosh/mix-2026-09-songA-first-pass/listening-r1/blind" 8099
```

Then open <http://127.0.0.1:8099>. Ten items: **E1-A…E** and **E2-A…E**.

**E1 = 6.000–39.750 s** contains hook 1 whole (the owner's measures 5–17), the only three-layer
vocal window in the song, and the sparse stretch after it. **E2 = 63.150–86.500 s** contains
hook 2 (measures 41–53) and the drum drop-out. E1 is the primary; E2 confirms.

For each excerpt, in this order, **before** anything is unblinded:

1. Did the requested change help?
2. Did the protected aspects remain acceptable — is the beat smaller, is the vocal still forward?
3. **Would you keep this and continue the song?**

"No meaningful difference", "neither acceptable" and "uncertain" are first-class answers.
**Uncertain files no row** and counts zero — coercing it would manufacture a label, which
amendment clause 4 forbids.

## What is in the set

Five items per excerpt: the four declared outputs plus CTRL-OWNER, which consumes no output slot
and is listening-only. **Condition A stays blocked and absent** — no account access, no
authorization to upload unreleased audio — and per handoff §7.2 a blocked condition is never
quietly backfilled.

| Condition | What it is |
|---|---|
| CTRL-IMPORT | the imported starting state, untouched — also the loudness reference |
| COND-C | one bounded conventional vocal treatment (below), operator work |
| COND-G | whole-clip SA3 re-imagination of the **Beat only**; the vocals are structurally outside the operation |
| G-STAGING-NULL | the Beat through SA3's staging format and back, **no model** — isolates the pipeline from the model |
| CTRL-OWNER | the owner's own bounce, with his master chain |

## Condition C's recipe — every choice, logged verbatim as operator work

Track inserts and faders only. **Nothing on the master**, so §7.8's linear-master preservation
claim survives. Verified by readback: every parameter reads back at the value asked for.

| Track | Insert | Setting |
|---|---|---|
| Lead, Double, Background | high-pass | left at the engine's own 180 Hz default (`cmdLoadBuiltin` sets it explicitly) |
| Lead | compressor | Ratio `0.35` (default 0.526 — gentler); Release `0.45` (default 0.310 — faster recovery) |
| Lead | 4-band EQ | High-shelf gain `0.58` (0.5 is unity — a small presence lift) |

**These are normalised 0–1 values because the engine exposes nothing else.** A plugin parameter
in the snapshot carries `index`, `name`, `value` and `automated` — no unit, no display string, no
range. So an operator, or an agent, can move a knob but **cannot read what the knob says**. That
is a real gap for the "Moshi as mixing engineer" thesis and is filed here rather than papered
over; the one anchor that exists is the high-pass, whose 180 Hz the engine sets itself.

## Provenance and integrity

| Check | Result |
|---|---|
| Binary | sha256 `8a3075f9…`, `git=d20fcede state=clean Release arm64` — the gate-certified SHA |
| G's backend | manifest `adapter: stable_audio3`, `coverage: single`, 92.69 s — one contiguous window, **no seams** |
| Canonical package | unchanged — `source/`: 7 ok, 0 changed, 0 missing |
| Master volume | `0.740818202495575` = 0 dB in every candidate copy |
| Clip lengths | 92.6896875 s, `autoTempo` false, in all four |
| Render rate | **44.1 kHz for every candidate** — headless renders cannot be 48 kHz (§7.4); uniform, so it cancels out of the comparison |

## Loudness match

Reference fixed in advance by rule: **CTRL-IMPORT**, never the loudest and never a candidate.
Every item matched to **+0.00 LU residual** against a 0.2 LU tolerance, then a common safety
offset brought every true peak to ≤ −1.00 dBTP without touching relative matching.

**Rule 3 firewall.** The loudness measurement computed a playback gain, that gain was applied to
every item including the ones that will lose, nothing was excluded, reordered or promoted on any
measurement, and the offsets live in the answer key. Blind labels were derived from
`sha256("mix-2026-09-songA-first-pass:1:<index>")` **before any file was measured**, so the order
is provably independent of any score. Verified: the page contains no condition name, no backend
name, and none of the render manifests' `pq`/axes quality scores.

`answer_key.json` sits one directory **above** the served root and cannot be reached over HTTP.

## One property worth knowing before you listen

**G-STAGING-NULL measures identically to CTRL-IMPORT** — peak, RMS and integrated loudness agree
to 0.01 dB. If you cannot tell them apart, that is the expected and informative result: it means
SA3's 44.1 kHz / 16-bit staging is inaudible on this material, and therefore **anything you hear
in COND-G is the model, not the pipeline**. It doubles as an attention check.

## Filing the rows afterwards

```bash
python3 scripts/produce/capture-correction.py \
  --run greg-r1-<condition> --rating pass|pass_with_notes|fail \
  --verdict "<your one sentence>" \
  --note "lane: mix" --note "experiment: mix-2026-09-songA-first-pass round 1" \
  --note "song: greg" --note "section: E1 6.000-39.750 s (hook 1, bars 5-17)" \
  --note "condition: <condition>" --note "blind label: <label>" \
  --note "q1 helped: / q2 protected: / q3 keep:"
```

Rows are filed **only after unblinding**, with the true condition in `--run`. These will be the
project's first non-zero mixing rows; the census stands at 14 counted, all composition, against a
gate of 25, and **nothing in this experiment depends on that gate opening**.
