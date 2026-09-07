# SA3 pre-flight — 2026-09-06

Half 3 of [BRIEF-REHEARSAL-SONGA-2026-09-06](../../BRIEF-REHEARSAL-SONGA-2026-09-06.md), run
after the repair landed. Measured on an 8 s slice of Song A's beat (real audio, not a test tone),
cut with ffmpeg from `import/beat.wav` at 6.000–14.000 s.

## Closed: the whole-clip round-trip is reversible

The narrowed form of O-2 — *does `reset_render_layer` restore the Beat exactly?* — is **answered
yes**, and the answer is adapter-independent because it is the layer machinery, not the model:

| Stage | Clip's `sourceFile` |
|---|---|
| base | `<session>/imports/beat8.wav` |
| after `render_layer` | `<session>/audio/rl-<layerId>-<cacheKey>.wav` |
| after `reset_render_layer` | `<session>/imports/beat8.wav` |

And the decisive check — **the imported copy is byte-identical after the full round-trip**:

```
original slice        sha256 679772940998968cfc21…
imported copy, after render + reset   sha256 679772940998968cfc21…
```

A whole-clip render never mutates the source. It writes a **new** file and re-points the clip;
`reset_render_layer` re-points back. So the source-preservation promise in
[MIX-PACKAGE-V0 §7.8](../../MIX-PACKAGE-V0.md) can be made, and it is testable by hash rather
than by listening.

## Confirmed: the installed SA3 is real, official, and locally complete

- Weights are symlinks into the HuggingFace cache for **`stabilityai/stable-audio-3-optimized`,
  snapshot `2204d5086475bd5b7e6e2bd720772dd8e8160513`** — an *official Stability release*, not a
  third-party conversion. That is exactly the check [DEPENDENCY_BOM](../../../DEPENDENCY_BOM.md)
  §1 asks for on the SA3 row, and it is now performed.
- `mlx` imports, `numpy 2.4.6`, `scripts/sa3_mlx.py` present. **Nothing needed installing.**
- Started from this worktree, the service reports
  `build = sa3-1.0.0+mlx+colorsd5e96cfe+sec8.0+steps8-30+cfg7.0+lora2+contig1`.
  `sec8.0` is the initial latent grid and **`contig1` means contiguous rendering is enabled** —
  consistent with the source reading that `SA3_SECONDS` is not a hard cap and the real ceiling is
  `MOSH_SA3_MAX_CONTIGUOUS = 240 s`.

## BLOCKED: the app would not route a render to SA3 — and failed silently

**This is the important finding, and it nearly produced a false experiment result.**

Three runs of the identical fixture — the first with no SA3 environment, the second with the full
SA3 environment forwarded, the third pointed at a service I started myself on port 8815 and
verified to report the `sa3-1.0.0` build — produced **byte-identical audio every time**:

```
run 1 (no SA3 env)          sha256 a7e36c4b8fa66f69dcb64ece…
run 2 (full SA3 env)        sha256 a7e36c4b8fa66f69dcb64ece…
run 3 (MOSH_SERVICE_PORT=8815, service verified SA3)   sha256 a7e36c4b8fa66f69dcb64ece…
```

My service's log recorded **zero** job activity, so the app never contacted it. Every render was
served by a **FakeAdapter** instance — one the app spawned itself from *another worktree's*
`service/` directory (`~/Library/Mosh/work/live11-grid-parity-20260823/service`, launched with
plain `python3`), which `locateServiceScript()` found first.

The output is not a naive resample either (it differs from an ffmpeg 48k→44.1k/16-bit
conversion), so it is the fake adapter's own deterministic transform — plausible-sounding,
consistently produced, and **completely silent about being fake**. `render_layer` returned
`{"cache":"miss","status":"ready"}` on all three runs.

Had condition G been rendered without this check, the owner would have auditioned the fake
adapter's passthrough, believed he was hearing Stable Audio 3, and the experiment would have
recorded a musical verdict about a model that never ran.

### What this means for condition G

**Condition G cannot be built until a render is proven to reach SA3.** Add to
[MIX-PACKAGE-V0 §7.11](../../MIX-PACKAGE-V0.md) as a required guard: *every generative candidate
must be accompanied by the serving service's `build` string and evidence of job activity in that
service's own log; a `status: ready` result is not evidence that a model ran.*

The likely fix is narrow — force the app to spawn or address the intended service rather than
discovering a foreign one (`MOSH_SERVICE_SCRIPT` was set and still did not win) — but it is
engine/launcher behaviour, not experiment work, and it is filed rather than fixed here.

## Not established

| Item | State |
|---|---|
| O-4 — SA3 wall time and memory for a 92.7 s render | **not measured**; no render reached SA3 |
| Whether the Beat renders contiguously or falls back to `stitch` | **not measured**; `contig1` in the build string is capability, not an observation |
| Condition G's audio | **blocked** on the routing defect above |

Timing figures from these runs (4–10 s wall) describe the **fake** adapter and must not be quoted
as SA3 performance.
