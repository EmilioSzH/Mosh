# Implementation brief — step 2, item B: a plugin parameter must say what it is

**The next task in the mixing lane**, ahead of any further mix work. Selected by round 1's
result: the conventional-treatment arm failed, and the reason it could not be diagnosed is this.

| | |
|---|---|
| Baseline | `origin/main` at the SHA current when the candidate branch starts |
| Repair policy | one bounded repair cycle after the independent audit, then a blocked verdict |
| Evidence | [evidence/rehearsal-2026-09-06/ROUND1-RESULT.md](evidence/rehearsal-2026-09-06/ROUND1-RESULT.md) |

## The defect

A plugin parameter in the snapshot carries exactly this:

```json
{"index": 0, "name": "Frequency", "value": 0.007730786688626, "automated": false}
```

`value` is normalised 0–1. There is **no unit, no display string, no minimum, no maximum**. The
plugin's own UI knows all of them; the snapshot exposes none.

## Why it blocks the lane

Round 1 established, by measurement, that neither the builtin compressor nor FabFilter Pro-C 2
produces any gain reduction through the command surface, at any setting tried. It could **not**
establish why, and that is the point:

- **You cannot aim.** Is threshold `0.35` −6 dB or −60 dB? Every value is a guess, so a musical
  instruction becomes a search.
- **You cannot tell a broken plugin from a wrong value.** Both look identical: a parameter that
  reads back correctly and audio that does not change.
- **You cannot state a recipe.** Condition C's settings had to be published as bare normalised
  numbers, which is not a mix anyone can reproduce, review or disagree with.

Every other gap found on 2026-09-06 was recoverable by measuring the audio. This one is not:
measurement shows *that* nothing happened, never *why*. **A mixing engineer that cannot read the
knob it just turned cannot mix.**

## What to build

1. **Carry the display value.** JUCE's `AudioProcessorParameter` already provides
   `getText(value, maxLen)` / `getCurrentValueAsText()` and `getLabel()`; Tracktion's
   `AutomatableParameter` has `valueToString` and its own range. Add to each parameter in the
   snapshot: `display` (e.g. `"180 Hz"`, `"-18.0 dB"`, `"4.0:1"`) and `unit` where the host
   offers one. Additive — existing consumers of `value` are untouched.
2. **Carry the range.** `min` and `max` in the parameter's own units, so a caller can convert a
   musical intent into a normalised value instead of guessing. Where a host cannot supply a
   range, omit the fields rather than inventing them.
3. **Make it round-trip.** A `set_plugin_param` that names a display value (`"-18 dB"`) is the
   natural follow-on, but it is **not** in this brief — publish the information first, prove it,
   then decide whether writing in units is worth its own change.

## Tests

- A selftest section over the builtins whose defaults are known from the engine's own code: the
  high-pass that `cmdLoadBuiltin` explicitly sets to 180 Hz must report `display` ≈ `"180 Hz"`,
  not `0.0077`. That is a real fixture, not a self-agreeing one, because the 180 comes from
  `MoshOps.Plugins.cpp` rather than from the test.
- A Catch2 case pinning that `display` is absent rather than fabricated when the host offers no
  text.
- The existing plugin-param undo and readback matrix must be unchanged: this adds fields, it does
  not alter `value` semantics.

## Acceptance

Reading a snapshot tells you what every plugin parameter is currently set to **in the units the
plugin itself would show**, and what its range is; `value` keeps its exact present meaning; and
the compressor question from round 1 becomes answerable — either the threshold reads a sensible
dB and the plugin is genuinely not compressing, or it reads something absurd and the setting was
wrong all along. **Either answer is progress; today neither is reachable.**

## Explicitly not in this brief

Writing parameters in musical units; any change to `set_plugin_param`'s signature; diagnosing the
compressors themselves. Those wait on this landing, because until a parameter says what it is,
diagnosing anything downstream of it is guesswork.
