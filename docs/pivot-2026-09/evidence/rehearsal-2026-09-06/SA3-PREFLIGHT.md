# SA3 pre-flight — 2026-09-06

Half 3 of [BRIEF-REHEARSAL-SONGA-2026-09-06](../../BRIEF-REHEARSAL-SONGA-2026-09-06.md), run
after the repair landed. Measured on an 8 s slice of Song A's beat (real audio, not a test tone),
cut with ffmpeg from `import/beat.wav` at 6.000–14.000 s.

> **Correction, same day.** An earlier revision of this file concluded that condition G was
> **blocked** because renders were being served by a FakeAdapter. **That conclusion was wrong**
> and is retracted in full. See §4 for what misled me and how it was settled. Every render in
> this pre-flight reached Stable Audio 3.

## 1. Closed: the whole-clip round-trip is reversible

The narrowed form of O-2 — *does `reset_render_layer` restore the Beat exactly?* — is **yes**,
and it is adapter-independent because it is the layer machinery, not the model:

| Stage | Clip's `sourceFile` |
|---|---|
| base | `<session>/imports/beat8.wav` |
| after `render_layer` | `<session>/audio/rl-<layerId>-<cacheKey>.wav` |
| after `reset_render_layer` | `<session>/imports/beat8.wav` |

The decisive check — **the imported copy is byte-identical after the full round-trip**:

```
original slice                        sha256 679772940998968cfc21…
imported copy, after render + reset   sha256 679772940998968cfc21…
```

A whole-clip render never mutates the source: it writes a **new** file and re-points the clip.
So the source-preservation promise in [MIX-PACKAGE-V0 §7.8](../../MIX-PACKAGE-V0.md) can be made,
and it is testable **by hash rather than by listening**.

## 2. Closed: SA3 renders reach the model, contiguously

Every render's `renders/<layerId>/output_manifest.json` — the authoritative backend record —
says:

```json
{"ok": true, "adapter": "stable_audio3", "mode": "audio_to_audio",
 "duration_s": 8.0, "sample_rate": 44100, "channels": 2,
 "seconds_pinned": 8.0, "coverage": "single"}
```

| Run | Env | Manifest | Audio sha256 | cacheKey |
|---|---|---|---|---|
| 1 | no SA3 env | `stable_audio3` · single | `a7e36c4b8fa6…` | `0f3aba14fb75` |
| 2 | full SA3 env | `stable_audio3` · single | `a7e36c4b8fa6…` | `0f3aba14fb75` |
| 3 | `MOSH_SERVICE_PORT=8815` | `stable_audio3` · single | `a7e36c4b8fa6…` | `0f3aba14fb75` |
| 4 | as 3, **seed 12345 → 98765** | `stable_audio3` · single | `e9666b5665e0…` | `ec4615ec8cfd` |

- **`coverage: "single"`** — one contiguous window, no stitching, no seams. Consistent with the
  service build string `sa3-1.0.0+mlx+colorsd5e96cfe+sec8.0+steps8-30+cfg7.0+lora2+contig1`.
- **Runs 1–3 are byte-identical because SA3 is deterministic** for a fixed (input, prompt, seed,
  params) — not because anything was faked. Run 4 changes only the seed and produces different
  audio with a different cache key, which is the control that proves it.
- Wall time **~5 s** for an 8 s render against a warm service, including app startup. The 92.7 s
  beat has not been timed yet.
- `run.sh` selects the MLX venv python on its own (`MOSH_ENABLE_SA3` defaults to `1` there when
  the model port is present), which is why run 1 reached SA3 with no SA3 environment set.

## 3. Confirmed: the installed SA3 is official and locally complete

- Weights are symlinks into the HuggingFace cache for **`stabilityai/stable-audio-3-optimized`,
  snapshot `2204d5086475bd5b7e6e2bd720772dd8e8160513`** — an *official Stability release*, not a
  third-party conversion. That is exactly the check [DEPENDENCY_BOM](../../../DEPENDENCY_BOM.md)
  §1 asks for on the SA3 row, and it had never been performed until now.
- `mlx` imports, `numpy 2.4.6`, `scripts/sa3_mlx.py` present. **Nothing needed installing** — SA3
  was already usable; it only ever needed selecting.

## 4. What misled me, recorded so it does not mislead the next person

Three things pointed the same wrong way, and none of them is authoritative:

1. **`~/Library/Mosh/logs/service.log` is shared across worktrees.** Its tail showed
   `(FakeAdapter)` spawns — from *other* worktrees' services
   (`~/Library/Mosh/work/live11-grid-parity-20260823/service`), not from these runs. A shared log
   tail says nothing about which service served *your* job.
2. **A service I started myself on port 8815 logged zero job activity**, which I read as "the app
   never reached SA3". The truth is narrower and duller: the app spawned **its own** service and
   correctly ignored mine. My service being idle proved only that my service was idle.
3. **Byte-identical audio across three runs** looked like a deterministic passthrough. It is
   deterministic *rendering*. Changing one input — the seed — separates the two hypotheses in a
   single run, and should have been my first move rather than my last.

**The lesson, and the guard now in [MIX-PACKAGE-V0 §7.11](../../MIX-PACKAGE-V0.md):** the only
authoritative record of which backend produced a candidate is that render's own
`renders/<layerId>/output_manifest.json` `adapter` field. A `status: ready` result does not name a
backend, and a shared service log is not evidence about a particular job. **Every generative
candidate must carry its manifest.**

## 5. Flagged for Rule 3

Each manifest also carries a quality score block — `pq: 8.009`, `pq_base: 7.17`, axes
`{CE, CU, PC, PQ}`, and a `reasoning` string ("Strong production quality (8.0/10); good
complexity"). Under amendment clause 6 **no such score may rank, filter, select a winner, or
suppress a candidate before the owner has heard it.** Its presence in the manifest is fine —
recording a measurement is not ranking — but nothing in the experiment may read it, and the blind
listening protocol must not surface it. Recorded here so a later reader does not discover the
field and assume it is available for selection.

## 6. Closed: the full beat renders contiguously in 22 seconds

The measurement that decides whether condition G is affordable. Whole-clip render of the **real
92.6896875 s beat**, seed 4242, `coverage: "auto"`:

```json
{"adapter": "stable_audio3", "coverage": "single", "duration_s": 92.69,
 "seconds_pinned": 92.68968253968254, "sample_rate": 44100, "channels": 2}
```

| | |
|---|---|
| Wall time | **22 s**, including app startup and import — for 92.69 s of audio |
| Coverage | **`single`** — ONE contiguous window. No stitching, no crossfades, **no seams** |
| Output | 16,350,504 bytes = 92.69 s at 44.1 kHz / 16-bit stereo · `cache: miss`, a real render |

**This falsifies a caveat the frozen spec carried.** §7.5 warned that G's seams were "a property
of the method"; on this song there are none — `MOSH_SA3_MAX_CONTIGUOUS = 240 s` comfortably
covers 92.69 s and the model renders it in one pass. G is a cleaner condition than assumed, and
the only remaining pipeline artefact is the 44.1 kHz / 16-bit staging, which **G-STAGING-NULL**
already isolates.

Against the inherited "first pass ≤2 h unattended" target, a 22 s render is not a constraint
worth planning around.

**O-2 and O-4 are both closed. Condition G is unblocked and cheap.**
