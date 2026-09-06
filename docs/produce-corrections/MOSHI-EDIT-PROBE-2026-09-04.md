# Moshi bounded-edit probe — 2026-09-04

Question (from the Claude-web strategy review): *can Moshi already execute a
bounded edit correctly, end to end, through the actual product surface?*

Method: real keystrokes into the Moshi composer of the running Mosh app
(this worktree's Release build, pid 30708, Pro Tools shell), on a **copy** of
the r4-opus-s1 session. Every claim below is read back from
`~/Library/Mosh/session/mosh-log.jsonl` (seq numbers) and from companion
`/snapshot` diffs against a baseline taken before the first ask. Brain for the
loop lane: BrainProxy resolved to the `claude -p` shim (model opus) — proven by
exactly one new row in `~/Library/Mosh/logs/brain-shim.jsonl` during the turn.
Local AI was **not** involved (see "Local AI" below).

## Results

| Ask typed | Lane that answered | Commands | Result |
|---|---|---|---|
| `mute the 808` (control) | fastpath | set_track_mute 1015 | one undo txn (seq 275–277) |
| `halve the hats in bar 7` | studio_skill_unsupported | none | "I can't do that reliably yet." (seq 278) |
| `turn the clap down 3 dB` | studio_skill_unsupported | none | same (seq 280) |
| `sustain the stabs` | studio_skill_unsupported | none | same (seq 282) |
| `make the B section darker` | studio_skill_unsupported | none | same (seq 284) |
| `add a counter phrase` | **studio_skill_blocked** | none | "the plug-in catalog returned invalid or oversized data" (seq 286) |
| `undo that` | fastpath | undo | snapshot == baseline |
| `sustain the stabs, then turn the clap down 3 dB` | **agent_loop** (shim/opus) | transform_notes{1071, legato} ×2, set_drum_pad{1010, note 39, gainDb −3} ×2 | stab lengths {1.5,2,2.5,3}→{2,2.5,3,3.5,4}, clap pad 0→−3 dB; **8 s wall**, one txn a44206b9:49 (seq 289–294) |
| `undo that` | fastpath | undo | snapshot == baseline on every tracked field |

## What this establishes

1. **Single-clause bounded edits never reach a model.** The composer's router
   (`ui/src/agent/loop/router.ts`) sends all five to "single", which now ends
   the turn as HUH before any brain call. This is routing, not capability.
2. **When the loop is reached, the edit lands correctly and undoes as one
   step.** Same phrasing plus a sequential marker ("then") routed to the loop;
   the model picked the right clip (stabs 1071) and the right *pad* (clap =
   note 39 on the Drums sampler, not the track fader), and one `undo that`
   restored the baseline exactly.
3. **Both commands were issued twice** inside one step (40 ms apart). Harmless
   here (legato is idempotent; `gainDb` is absolute) but `add_note` would have
   doubled. Mechanism not yet traced (reply carried both a plan step and bare
   commands?).
4. **"turn the clap down 3 dB" only worked because the pad was at 0 dB.** The
   session block the model sees prints pads as `pitch:name` without gainDb, so
   a relative move is a guess; `set_drum_pad` is absolute.
5. **"add a …" is hijacked by the load-named-plugin skill**
   (`skillFoundry/native/loadNamedPlugin.ts`), which then failed on the plugin
   catalog. Two defects: the matcher is too greedy, and the catalog probe
   errored in this instance.
6. **Local AI could not be switched on in this instance, by design:**
   `scripts/produce-lane/launch-app.sh:97` exports
   `MOSH_OWNER_RUNTIME_CONFIG=/nonexistent`, so `OwnerRuntimeConfig::load()`
   returns an empty (disabled) config, the manager publishes "unavailable",
   and `LocalAiToggle` disables itself. The owner's real config
   (`~/.config/mosh/owner-runtime.json`, mode 600, model + venv present) is
   valid; a normally launched Mosh would show the toggle enabled.

## Implication for the tweak-lane pilot (brief §7 step 4)

The pilot is runnable today with two mechanical changes that are code
correctness, not label infrastructure: let the router admit imperative
single-clause edits (or add a deterministic "edit" lane), and print pad gain /
note counts in the session block. Without them, four of the five pilot asks are
refused at the door and the fifth is misrouted.

Artifacts: baseline/after snapshots and the driver scripts in the session
scratchpad (`edit-test/`), not committed.
