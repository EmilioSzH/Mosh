# Addendum to the 2026-09-04 brief: corrections, and answers to your open questions

Paste this after the reply that asked the questions. Everything here was
measured on 2026-09-04 (evening) from files, stems, and a live probe of the
running app; each number names its source. Where this contradicts the brief,
the brief is wrong.

## 1. Corrections to the brief

### 1.1 Authorship share (brief §3 "Correction-analysis fact", §4 last bullet, §9 last bullet)

The lab's `correction_analysis.json` paired the owner's fixes against the
02:48–02:56 **batch stubs** (`generations/001,002,004,006.mdsl`, 16/4/13/11
notes). The fixes are content-derived from the later **round files**:

| pair | actual seed (notes) | what the owner kept | key move |
|---|---|---|---|
| gen_002 | `gen002.mdsl`, 166 notes | kick 7–12 of 12 onsets and hats 10–32 of 32 verbatim (parser-dependent), and all 56 A-section melodic notes at a uniform **+1 st** | Db → D (clip transpose) |
| gen_004 | `gen004.mdsl`, 83 notes | kick 8–9 of 9, snare 8–11 of 11, hats 8–16 of 16 verbatim; lead 9/9 and pad 4/4 at uniform **+4 st** | D → Gb |
| gen_001 | ambiguous: stub (16) or `017.mdsl` (40; meta says `original_notes: 40`) | against 017: 24/40 incl. the 4-note pad at −11 | Cm → Dbm/Abm |
| gen_006 | `gen006.mdsl` (164) | owner file is PC-only; JSON stats equal the seed's kick and lead tiled ×8 | Cm → Dm |

Against the stubs, 7 of 44 AI notes survive (all kick downbeats). Against the
round files, the owner kept roughly **60–68%** of the seed's notes, then
rewrote the 808 line and added 1,000–1,900 notes. AI share by note count is
therefore **~7–14%** (83–166 of 1,150–2,002), not ~1%, and the seed's drum
grid and melodic contour survived. "Seed + hands" is the observed pattern.
Retract: "the AI generated only the kick", "~99% owner-authored", and §9's
last bullet. Keep: the key changed every time (uniform clip transpose) and
the 808 line was rewritten every time.

### 1.2 "Wrong notes" has two measured mechanical causes (brief §3 r4 diagnostics, §4 first bullet, §9 "no more rules")

**(a) The palette 808 sounds a whole tone sharp of what the prompt and the
checker assume.** The 808 picker is deterministic (loudest sub energy wins),
so every palette run — r4 ×3 and r3c-kitmatched — used
`808_p01_s11_kensa3.wav`. Its manifest root (34 = Bb) was measured over
50–550 ms, which is the sample's pitch glide; the sustained body (0.6–2.0 s)
sits at **C** (65.4 Hz = MIDI 36.0), two semitones above the label. In the
r4-opus-s1 808 stem every sustained note sounds exactly **+2.0 st** above
intended: written D → E (41.2 Hz), A → B (61.7 Hz), G → A (54.9 Hz).
`soundingRootTable` (producePrompt.ts:210) and `harmony_clash`
(produceCheck.ts:200) judge by the *written* pitch class, so r4's "0% clash"
was computed against a root that is not the one sounding; every chord in
every palette run was checked against a bass a whole tone off. The labkit
808 (root 24, stable) renders correctly (written 62 → MIDI 26.03), which is
consistent with the labkit twin passing and the palette twin never passing
clean. 10 of the 16 root-labelled palette 808s have a body pitch class that
differs from their label; 6 are stable.

**(b) 13 of the 60 Vital presets change pitch class** (an oscillator or voice
transpose that is not a multiple of 12, or tune beyond 50 cents); 7 more carry
a keytracked sample of unverified root; the host adds no transpose.
r4-opus-s1 drew three: counter `pluck-super-nice-pluck` (only osc2 on, at
−39 st: written C sounds A, plus a fixed-pitch Db-minor guitar lick), arp
`arp-seq-cold-storage` (−5 st voice), ambient `pad-pad-chords-hypersaw-ocean`
(+5/+7: a sus4 chord on every note). r4-sonnet-s3 drew two: drone
`pad-16334-dark-ambient` (−31 st: C sounds F), arp `arp-seq-careless-whisper`
(−18 st: F#). r4-opus-s2 drew none. The two runs the owner called "wrong
notes" are exactly the two with such presets; s2 was failed for rhythm/mix.
n = 3, so correlation, not proof.

Consequence: §4's "validated rules are exhausted; the remaining gap is
taste-shaped" is not established. Both defects are code-correctness fixes
(measured sounding pitch, not a taste proxy) and belong before any round 5:
label 808 roots on the sustained body or pick a stable sample; make the
sounding-root table and the harmony check use `keyNote` and the sample root;
draw synth presets only from the 40 pitch-class-preserving ones; then
re-render r4's three compositions as twins and blind them against the
originals. If the twins still fail, the taste claim stands; if they pass, r4
was a bug.

### 1.3 Octave convention: not a bug

Mosh's UI, the produce lane, and the flywheel all name notes with C4 = 60.
The catalog's 808 notes in raw MIDI: Q1 62, median 66, Q3 71; 54.6% inside
62–70, 8.8% inside 74–82. The owner's "Db4–Db5" matches his corrected gen001
808 (raw 61, 64, 68, 73). The 62–70 register entered in commit 40f36765 from
PROMPT-trap-v4's "OCTAVE 4 (D4, F4, G4, A4, Bb4)". Intended sounding range is
D1–Bb1, which is where the owner's reference render's low-band f0 sits (MIDI
26–34). One wording defect: producePrompt.ts:69 declares C4 = 60 and spells
62–70 as "D3–Bb3" (the Ableton spelling). Harmless to the model, worth fixing.

### 1.4 Timing

"~14 hours" (brief §3) has no recorded basis. First stub to last fix is
11 h 02 m by file times; first listen to final commit 14 h 20 m; another lab
document says ~7 h. No hands-on minutes are recorded anywhere; seed-to-fix
file gaps are 31 m to 1 h 45 m per round. The Mac r0 round records only a
date.

## 2. Answers to your questions

**Sounding pitch.** See 1.2 and 1.3. MIDI 60 sounds C on 40 of 60 Vital
presets; 13 do not; 7 unverified. The 808 is played through a sampler with
`keyNote = root + 36`, so written N sounds `sampleRoot + (N − root − 36)`;
that mapping is right for the labkit and wrong by +2 st for the palette
sample every palette run has used.

**JSONL actor / run id.** Partial. Each line carries only
`{ts, seq, command, args, ok, error?, undoable, txn}`. Agent turns are
recoverable because every agent emitter brackets its commands with
`batch_begin{name, turn_id, source, utterance}` … `batch_end` (a sequential
walk over 7,084 lines and 565 sessions finds 0 unmatched brackets). "Owner
GUI edit" is only derivable by absence, which conflates it with unbracketed
driver commands. No line or per-run artifact carries a run id or prompt
version; `run.json` has the runId, the batch marker does not. Notes have no
identity anywhere (snapshot: index/pitch/start/length/velocity; .mosh:
`<NOTE p b l v c/>`), so "kept" must be tuple-matched. The minimal tag is two
log fields (an `origin` set by `executeFromUi`, and `turn_id` stamped on every
line while a batch is open) plus `run_id`/`prompt_version` on the driver's
batch marker, which needs no C++. That is a log field, not label
infrastructure.

**Contract semantics.** Under the rule you propose (blind pairwise picks and
per-stem rows count; unblinded whole-candidate rows count 0; correction pairs
only with a per-role diff): 5 of 25 today. The four March pairs have per-role
diffs (that is what the analysis file is, wrong pairing aside); mac-r0-001 has
a per-clip edit surface; 0 blind pairwise picks and 0 per-stem rows exist. The
flywheel METHODOLOGY caps a loop at 6 rounds and says a non-converged round 6
means a non-negotiable is being skipped: diagnose, do not extend. It says
nothing about a correction round resetting the cap. The produce lane is at
round 4, so rounds 5 and 6 are permitted, 7 and 8 are not without a written
diagnosis.

**Survival of the 44 AI notes.** Literally 7 of 44 (all kick downbeats, every
velocity changed, 0 of 15 melodic notes). But see 1.1: the 44 are the wrong
seeds. Against the round files the owner kept 60–68%. How long a from-scratch
beat takes him is not recorded anywhere; only he can answer.

**Loop library.** Catalog (320 sessions, all PC-resident, none readable on
the Mac): 2,295 loop tracks, 986 distinct loop identities, 8,082 loop
track-by-section slots (the "8,082" in the brief), ~8 audio clips per loop
track. By name only (the MDSL stores a filename stem, no path): 0 of 986
contain "splice"; ~30% are Ableton recorded/resampled clips (own material);
28.5% are six anonymous template ids (1, 2, 3, 15, l, r); 11.7% are bare
"N Audio" tracks that may be empty; 5.9% carry kit or pack prefixes
(15drtt, sochi, Oliver, Splice-style pack codes); 5.2% are YouTube/game/TV
rips by title; 3.5% looperman; 5.4% unclassified. Chopped vs whole is not
recoverable from the catalog on this Mac. Proxy from the owner's 48 local
Live sessions (1,770 audio clips): 94.4% partial, 79.6% start-trimmed,
median played span 45% of the source, 96% warped; 83% of those clips come
from each project's own Samples/Recorded folder, 10% from Downloads (type-beat
rips, collaborator snippets), 3% from ~/Splice (4 files, one session). On
disk: ~/Music/MonsterSamples 23,740 audio files in 77 packs; ~/Splice 247
audio files. Mosh itself has loaded 4 Splice one-shots and 0 loops, ever.
Licence state per pack is on no file; owner-only.

**Can Moshi execute a bounded edit through the product surface today?** Tested
live with keystrokes into the composer on a copy of r4-opus-s1; details in
`MOSHI-EDIT-PROBE-2026-09-04.md`. Single-clause edits ("halve the hats in
bar 7", "turn the clap down 3 dB", "sustain the stabs", "make the B section
darker") are refused by the router before any model call; "add a counter
phrase" is hijacked by the plugin-loading skill and blocked. The same edit
phrased with a sequential marker ("sustain the stabs, then turn the clap down
3 dB") reached the loop: the shim's Opus chose `transform_notes legato` on the
stab clip and `set_drum_pad note 39 gainDb −3` (the clap pad, not the track
fader), landed in 8 s as one undo transaction, and "undo that" restored the
baseline snapshot exactly. Defects found: the router gate; the "add a …"
hijack (the plugin skill caps its catalog at 64 plugins and this machine has
more, so every "add a …" is blocked); each command was issued twice in one
step (harmless here, would double an `add_note`); the model cannot see pad
gain, so the −3 dB was right only because the pad sat at 0.

**Can the system preserve the starting sound and execute mixing changes?**
(Measured from code, the owner's 53 Live sets, and the selftest undo matrix
by three readers; a second agent re-checked the load-bearing claims of each:
20 confirmed, 2 refuted on details folded in below. Numbers are from files,
not recall.) Split the way you split it:

*Preserve the starting sound.* If the session starts in Mosh, yes by
construction: the .mosh edit file carries everything including VST3 state,
though reopen fidelity of plugin state is checked presence-only. If it starts
in Live, **no**. The .als importer is an offline CLI that replays into a
*mock* backend; nothing loads a Live set into a running Mosh. It carries
tempo, track names and order, fader/pan/mute, clip positions, MIDI notes and
audio file paths, and silently drops the rest. On the owner's 53 sets that
means: 1,269 devices (772 third-party with 770 VST3 state blobs, 403 native
effects, 47 samplers, 53 racks) → 0 survive; 133 active sends and 107 return
tracks → 0; group faders → flattened; master chains (StandardCLIP ×15, God
Particle ×1) → 0; 7,627 audio clips, 7,562 warped, 913 pitched → bare file
references at the right start with the wrong length; 312 of 400 looped MIDI
clips → one pass; time signature and key → dropped. MIDI tracks become audio
tracks with a default 4OSC. Roughly 0–10% of the audible sound survives; the
arrangement skeleton survives ~100%. Hosting is not the blocker: 754 of his
772 third-party instances exist in Mosh's plugin catalog (missing: ShaperBox
3, The Spirit, kHs Chorus/Flanger). The blocker is twelve missing mappers:
runtime replay into the real engine, native device → builtin, third-party by
name, a VST3 state-blob loader (none exists; `load_preset` takes only .vital
and 4OSC .json), sampler maps, sends/returns, groups (native-only command),
master, clip fidelity (no clip-pitch command exists at all), MIDI-loop
unrolling, automation targets, time signature/key. .flp is the same shape or
worse.

*Read the relevant state.* The edit-lane model sees a symbolic block: tempo,
key, master dB/pan and chain names, buses, sections, and per track its name,
instrument and effect names, volume, pan (only if nonzero), mute/solo, sends
as bus@dB, clip ids, one-shot pads as pitch:name, and the 808 root. It does
not see plugin parameter names, values or bypass state, clip gain,
automation, pad gain, notes, or section levels. Nothing audio-derived reaches
it: 30 Hz per-track meters and a 12-band master spectrum exist in the UI's
telemetry store but no agent code reads them; the loudness/clipping readout
runs only on generated renders; `detect_clip_bpm` exists but its result is
stripped before the model sees it; the snapshot carries a small live readout
for Mosh's own auto-tune and feedback effects, which the session block does
not print. The snapshot itself exposes only a plugin's first 16 parameters.

*Change audible parameters, routing, automation.* Commands exist and are in
the loop's catalog for fader/pan/mute/solo, clip gain/fades/trim/auto-tempo
warp, drum-pad gain/pan/choke, builtins (4-band EQ, compressor, reverb,
delay, chorus, phaser, low/high-pass, pitch shifter, auto-tune, OTT, feedback,
softclip), VST3/AU by exact catalog name with `set_plugin_param` (normalised
0–1 by index, no unit mapping), bypass, sends and buses, master volume and
chain, track output routing (submix or hardware), and automation on any
automatable parameter including fader, mute gate and send level (add/remove/
set point, write curve, clear). Gaps: no clip pitch; groups not
agent-callable; no sidechain anywhere; no master-bus automation (every
automation command is track-scoped); touch/latch modes accepted but inert; no
gate, limiter, auto-pan or 8-band EQ builtin; parameter moves are blind
(index, meaning and current value all guessed, and no Hz/dB-to-normalised
mapping exists anywhere in the codebase).

*Restore the previous result.* The selftest undo matrix proves one-undo
exactness and save/reload equality for fader, pan, mute, solo, active, clip
gain, builtin insert, bypass, `set_plugin_param` (first 16 params),
automation point, send add, and master volume/pan. Undo-correct by
construction but not matrix-proven: `set_drum_pad` (restored exactly in
today's live probe), 4OSC presets, automation-curve operations,
`remove_plugin` (hand-proven). Unverified or at risk: `.vital` preset load
(a raw state blob, result says "verify audibly", outside the snapshot so undo
exactness is blind to it), external plugin state on reopen (presence-only),
and `set_send_level`, on which two readers disagree from source (one traces
it to the parameter path the code's own G14 note says leaves the current
value stale after undo; the other to a CachedValue bound to the edit's undo
manager via engine patch 0007); it is not in the undo matrix and the selftest
only checks that it applies, so treat it as unverified. Also explicitly
non-undoable by design: `rename_bus`. Weakly covered: `bypass_layer` (zero
undo checks). "Restored exactly" is an MD5 over the canonical
snapshot minus volatile paths, so it cannot see VST3 state or parameters
beyond the sixteenth.

*Net.* On a Mosh-native session the mixer core (levels, pans, sends,
builtins, automation) can be read, changed and restored today; plugin
internals cannot be read, are changed blind, and are restored unverified.
On a Live session the starting sound is not preserved at all, so testing
mixing intelligence on the owner's real sessions needs the mapper work first,
exactly as you suspected. Testing it on sessions that already live in Mosh
(the produce-lane outputs, or sessions built in Mosh) does not.

## 3. What this changes in the proposed plan

Before round 5, and before any taste conclusion: fix the 808 root labelling
and make the harmony table use sounding pitch; restrict the preset draw to
the pitch-class-preserving 40; re-render r4's three compositions as twins and
blind them against the originals. Open the router to imperative edits and
print pad gain and note counts in the session block so the tweak-lane pilot
is not refused at the door. Add the two log fields and the driver's run/prompt
tags so authorship is a query. Re-state the flywheel evidence as "seed + hands"
with a 60–68% kept rate, and measure that rate in Mosh from the first
correction round onward.
