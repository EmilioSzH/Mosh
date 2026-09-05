# Brief for Claude web — Mosh produce lane strategy (2026-09-04)

You are being asked to reason about, push back on, and research a strategy for
a music-production project. You have no repository access; everything you need
is in this document. The owner explicitly invites pushback on his framing, his
goals and his audience assumptions. Every number below comes from project
files or from the engineer who ran the sessions and was re-verified against
those files on 2026-09-04; inference is labelled as inference. Sections 4, 6
and 7 were drafted with the help of an LLM strategy panel (three strategies,
three judges, two critics) run by the engineer, then fact-checked; treat their
conclusions as proposals, not evidence.

## 0. Vocabulary

- **Mosh**: the owner's native DAW (JUCE/Tracktion engine, React WebView UI).
  **Moshi**: its in-app agent. **MoshOps**: the single command seam every
  user-visible change goes through (validate, one undo transaction, mutate,
  JSONL log, typed events, structured result).
- **The produce lane**: Mosh's headless "make a beat from a prompt" pipeline
  (section 2). **Round**: one batch of candidates put in front of the owner's
  ear; the produce lane has run four.
- **The flywheel / AbletonMONSTER**: the earlier lab, outside Mosh, where an LLM
  wrote beats as text into Ableton Live and the owner corrected them. **MDSL**:
  the flywheel's text DSL for a beat (tracks, clips, notes). Its METHODOLOGY.md
  has a 6-round cap per loop; that is a flywheel-loop cap, distinct from the
  produce lane's round count.
- **Label**: any one of three things, and the brief asks you which should
  count: a **verdict row** (rating + one-line note on one rendered candidate),
  a **correction pair** (the model's output and the owner's hand-fixed version
  of it), or an **accept/reject** on a generated audio render layer.
- **Keeper**: a beat the owner would open again and finish.
- **Labkit** vs **palette**: the owner's own Live-set drum samples (the
  "15drtt" kit, licensed "for educational purposes only") versus a
  rights-clean bank of 127 ear-approved one-shots (root note measured for 16 of
  them).
- **Recipe A**: the only configuration that has ever passed clean (section 3).

## 1. Who is asking and what they want

The owner is a working producer (jerk/trap idiom, Ableton Live user, FL Studio
on a PC) building Mosh. His goal, near-verbatim: distill producer intelligence
into the agent so it can do everything from producing a beat from a user prompt
to making subtle tweaks to an existing project from a prompt, and everything in
between: an AI producer for an artist to work with, or for a producer to
co-produce with, to accelerate and improve their process.

His ideal: the agent works almost entirely in MIDI and the plug-ins he already
uses, so he can go in and change presets or notes himself. He is explicit that
if that does not make sense, or if generative audio is good enough that it
makes more sense to "get on the Suno wave", he is willing, with reservations.
The distinction he would then lean on: free and locally powered versus
online/subscription; train your own LoRAs and use your own models; and the
agentic angle, an agent that acts as your producer instead of you being your
own prompt engineer.

On audience: he thinks Mosh can be for everybody, producers who want AI in their
workflow and the next generation of producers/artists who are comfortable
giving up fine-grain control and the old tools. He worries that is too complex
alongside building a DAW, thinks one helps achieve the other, and wants you to
debate it. He is open to reconsidering the whole framing, and also fine with
"one genre, the easiest first". He has agreed to sit down once and label
everything rendered so far, blind.

Directions on his table: keep LLM-writes-MIDI but fix the feedback loop; a
symbolic music model trained on his catalog plus references; audio models for
parts (an SA3 lane exists); retrieval from real projects. He wants you to add
your own.

## 2. What Mosh is today

- Native macOS DAW on one machine: MacBook Pro M1 Max, 64 GB. A PC with an RTX
  4070 exists; rented 5090s (Vast.ai) were used for cloud LoRA training.
- One mutation path (MoshOps): ~268 command handlers, 246 exercised by tests,
  19 waived, 0 uncovered. Agent and UI drive the same seam. Tracktion's undo is
  the only undo.
- Parity against pro DAWs: T0 daily-driver capabilities 75% UI-reachable (21 of
  28); T1 pro 17% (19 of 112); T2 niche 13%. Enough to open a session, move
  notes, swap a preset, nudge a fader; not a full pro workflow.
- Plugins: VST3 (macOS/Windows), AU (macOS), built-in Vital synth, drum sampler
  with per-pad mixer/choke. Editors pop out natively; no UI-side parameter
  automation binding.
- Import: .als (Ableton), .flp (FL Studio), .rpp (Reaper). Third-party plugin
  parameters are opaque in both .als and .flp; FLP mixer levels are not yet in
  the import model. **Export: audio, stems, consolidated clips. No MIDI export.**
  A Mosh candidate cannot round-trip into Live as MIDI; a correction round has
  to happen inside Mosh (or be re-implemented in Live by hand).
- **Moshi**: 4 native skills, ~130 studio skills via a Skill Foundry.
  Historically a bounded editing assistant (8 steps / 180 s / 800-token
  completions, "4 to 8 notes" guidance). Brain is provider-configurable (cloud
  OpenAI-compatible endpoints; a local Qwen3-30B-A3B SFT adapter "r5" exists,
  off by default). r5 scored 0.9357 on a command-correctness benchmark (evalA):
  a proxy for "did it emit the right commands", not an ear rating; the 4-bit
  local serve regressed one suite to 0.767 from a bf16/4-bit mismatch.
- **The produce lane** (built 2026-09-01 onward): a deterministic preflight
  lays a template from the ask (tempo, key): 10 drum pads, a sustained 808
  track (register MIDI 62–70), 7 Vital synth tracks
  (lead/chords_pad/drone/counter/arp/ambient/stab) with **seeded preset draws
  from a 60-preset Vital bank (10 lead, 8 pluck, 8 pad, 8 keys, 8 fx, 6 bell,
  6 bass, 6 arp) that no ear has ever auditioned**, hardcoded per-role gains
  (drums 0, 808 +3, lead −10, counter −12, stab −10, chords −13, arp −16,
  drone −14, ambient −16 dB), a 180 Hz highpass on all 7 synth tracks, master
  softclip plus optionally the God Particle VST3 (paid) on the owner's Mac. An
  LLM then writes notes onto the template in up to 24 steps within 15 minutes,
  seeing only `{command, ok, error}` per call plus a refreshed snapshot; it
  never hears or analyzes audio. A post-loop checker validates five rules
  (harmony clash >15%, stops early, thin B section, <7 pads used, missing clip)
  and can trigger one additive repair pass. 5–16 minutes per candidate via a
  `claude -p` shim ($0 on subscription), "medium" effort, no temperature
  control. Exports mix plus stems; an audition page with keyboard rating/notes
  writes `docs/produce-corrections/*.meta.json`.
- **Generative audio that exists**: SA3 (Stable Audio 3) re-imagine, local MLX,
  audio-to-audio with a 0–100 keep/re-imagine dial, 40+ LoRA adapters as
  faders, clip-parented render layers with accept/reject/freeze and undo. This
  is the one audio lane the owner's ear has approved, as an effect (the dial's
  default was set by ear), not as a composer. Local LoRA training works (~21
  min / 1200 steps); a three-day local-vs-cloud quality gap was root-caused to
  training on the distilled checkpoint instead of the base one (fixed
  2026-08-13; local now ~0.85 vs cloud ~0.88 on a taste-similarity proxy).
  ACE-Step adapters trained and evaluated. RAVE real-time neural insert is
  build-gated and off. MiniMax-Music3 evaluated locally (re-imagine works,
  true continuation blocked, vocals rejected by ear), not integrated.
- **Generate Beat Recipe**: deterministic retrieval + recombination over a
  recipe library, bound to the 127-sample palette. Live.
- Taste-label infrastructure for render layers (accept/reject/reset spigots,
  census, probe) is built; that archive holds 1 organic label.
- Multiplayer, an iPhone recording companion and lyric completion exist and are
  irrelevant here. Paused: Finish My Song (mumble-to-vocal), First-Stranger,
  Session Foundry, an alternative UI shell.

## 3. What was tried and what happened

**The one time it worked (2026-03-19), and what actually happened.** In the
flywheel lab: a catalog of 320 of the owner's own beats as MDSL used as
few-shot ground truth; template-aware prompts with real track names; every
manual fix saved with a rated meta.json whose lessons were promoted to
numbered prompt rules (v1 to v3); the owner's corrected MDSL fed back as the
next round's reference (`retry_with_feedback`). An outside audio critic
existed too: Gemini listened to rendered audio and scored it, threshold 7.0;
after the v2+v3 rules, 5 of 5 beats in a batch cleared 7.0 with no human
edits. The owner's ear stayed the gate; Gemini's agreement with that ear on
material it had not seen was never measured. Six generation rounds and four
human corrections in ~14 hours produced one keeper (gen_006) and one near-miss
(gen_002fix). His #1 recurring lesson: 808s in octave 4, sustained to the next
note.

The flywheel's own correction analysis, re-read today, reframes that win.
Across the four corrected pairs the AI wrote **16, 4, 13 and 11 notes** against
**1,999, 1,150, 2,002 and 1,168 owner notes**. The AI generated the kick track
in all four (the owner then multiplied its density ~12×); every 808 (6
tracks), clap (3), hat (4), perc (3) and audio-loop (4) track was added by the
owner; synth parts were under-composed ~12×. The owner changed the key in 4 of
4 (the model wrote everything in C minor; gen_006, the keeper, ended in D
minor). The loved beats were the owner's production around a tiny AI seed.
Nobody measured authorship share at the time; the loop's success was
attributed to the prompt rules.

**Then seven re-platformings in five months** (DAWNMonster, AbletonMONSTER,
Python renderer, MonsterDAWW PC, MonsterDAWW Mac, Mosh v1, Mosh v2) with zero
quality gain. Four label systems were built and starved. A proxy scorer tested
against the owner's ratings in April reached Spearman +0.12; a student model
trained on an unrated 2/5 teacher corpus scored 1.92/5 with 0 of 24 "would
open". The correction loop did not run again until a written postmortem
(2026-09-01) and a binding contract (section 5). The flywheel lab was revived
on the Mac 2026-08-31, driving Live through the Producer Pal bridge; its one
round since (mac-r0-001, fix-in-Live) was rated pass_with_notes: "Honestly,
I'm really happy with this! (fixed two things by hand in Live)"; the two fixes
were a full rewrite of the stab/counter clip and two added clap hits. That
render is the A-reference Mosh is measured against.

**The four September rounds in Mosh's produce lane** (one ask throughout: a
dark jerk trap beat, 148 BPM, D minor):

- **r1** (2026-09-02, prompt v2): 7 candidates, verdict "these all sound bad",
  all FAIL. Verbatim notes: timing/wrong notes; a synth part identical through
  all runs, no variation in synth sounds across runs; things fall apart
  towards the end; parts of the drums sound exactly copied from our Ableton
  session; mix also isn't great but far from the main problem; 808/low end weak
  or wrong; drums groove/feel; "composition (melody/chords/arrangement) AND
  sounds are both bad, not just the mix". **One of the seven was the owner's
  own corrected reference notes rendered through Mosh's default sounds; it
  failed with the rest.** Causes found: preset seed fixed at 0; a 2-bar excerpt
  of the owner's corrected beat pasted as few-shot into every candidate (the
  "copied" complaint); no mix chain.
- **r2** (v3 prompt, seeds varied, few-shot replaced by a "feel to aim for,
  never transcribe" rule): Opus seed 3 on palette samples FAIL ("mix and
  sample selection/preset selection hold this one back"); the same Opus
  composition replayed on the labkit = pass_with_notes, the first pass ever,
  with no mix chain. The owner discounted it himself: "make sense that it
  passed because it just copied and swapped out the presets". Sonnet runs
  FAIL (arp overpowering, no highpass, no master glue).
- **r3** (notes frozen from r2-opus-s3; samples and mix changed: 0 ms sample
  onsets, kit-matched palette picks, 180 Hz highpass, gain map, softclip + God
  Particle): both pass_with_notes ("presets sound like naked sine waves"),
  but those renders were bugged: the replay reused stale track ids so five
  melodic parts played through a default sine synth, and the highpass was
  written to a cached value while the real parameter sat at 4 kHz.
- **r3c** (bugs fixed): labkit = clean PASS, no notes, first ever; kit-matched
  palette = pass_with_notes ("clap is too quiet").
- **r4** (2026-09-04, prompt v4, three fresh compositions, palette samples
  only, no labkit twin): opus-s1 FAIL "bad sound selection and I hear wrong
  notes"; opus-s2 FAIL "rhythm and mix/sound selection issues"; sonnet-s3 FAIL
  "there are forsure wrong notes in here". Not yet filed as meta.json.

**Recipe A, the only clean pass:** one Opus composition (r2, seed 3) + the
owner's labkit + 0 ms onsets + 180 Hz highpass + gain map + softclip + God
Particle. Every pass in this project is that one composition replayed; the
palette kit has never passed without notes; no fresh composition has passed
since.

**Round-4 diagnostics.** The v4 prompt added a "sounding 808 roots" table so
the model would not have to recall bass pitch timing. Result: harmony-clash
notes went from 22–48% to 0%, register violations 0, off-16th-grid notes 0,
one clip per track on the Opus runs, all 10 pads used, drum clip covers all 32
beats. The owner still heard wrong notes and rhythm problems. The two Opus
drum grids are near-identical to each other and bar 2 repeats bar 1 (the
prompt forbids static repetition; the model rendered the prescribed jerk core
as a literal template). Both 808 lines open 62→65 from the same pitch set.
Sonnet-s3 wrote 24 clips instead of 9: the arp had 5 overlapping clips (4
simultaneous notes on every 16th on a role meant to be monophonic); drums had
2 overlapping clips (432 hits, 304 duplicates). No validator enforces one clip
per track or monophony. Seed 3 drew the same seven Vital presets as the r3c
pass, so sonnet-s3 failed on notes alone with approved sounds; seeds 1/2 drew
different presets and got "bad sound selection". Round 4 also dropped the
labkit twin, a confound.

**Proxy failure, again.** harmony_clash was chased from 22–48% to 0% and the
ear did not move; the passing r2 composition was itself flagged by that
metric. The owner defines "wrong notes" as all three of: pitches clashing with
bass/key, wrong register/voicing, wrong placement/timing. Register and grid
checks read zero, so whatever he hears lives outside every rule currently
written: contour, voice-leading, phrase logic, feel, which beats are chosen.

**Cross-run sameness.** Note-set Jaccard between runs: r1 chords 0.60 / drums
0.57 / arp 0.45; after v3 (describe shape instead of few-shot) 0.00 / 0.27 /
0.12. But r4 drum grids are still near-identical across seeds because the drum
rules are prescriptive.

**The reference-project program (2026-09-02/03), and the answer to "what
happened to the free project files".** 54 .als and 24 .flp files were found on
disk, 25 usable; two real @15drtt jerk FL sessions sat inside the owner's own
kit folder. Four Ableton projects (two Adriatique melodic-house remakes, an
STMPD EDM deconstruction, a Gravitas demo) went through an extractor with
pre-registered kill criteria: role coverage 83/70/30/56% FAILS; drum-to-melodic
level offset +11.6/+8.0/−3.8/−1.8 dB spans 15.4 dB and flips sign FAILS;
low-cut incidence 11/44/25/38% survives weakly. Verdict: per-genre median mix
numbers do not transfer. Structural findings that hold and contradict the
preflight: low-cut on a minority of tracks (Mosh cuts all 7 melodic); shaping
cuts cluster 60–170 Hz (Mosh: flat 180); no universal master chain (2 of 4
have an empty master; Mosh is fixed softclip + God Particle); the @15drtt
sessions balance at the mixer with ~6.6 dB spread and a soft clipper on master
versus Mosh's synthetic 19 dB spread. **These projects were used only for
mix-statistic extraction. None was fed to generation as notes, samples,
presets or style. The @15drtt sessions were never used beyond their drum kit.
That is why nothing the owner heard sounded like anything but his own Ableton
file.** He expected the references to be style material the agent learns
from, to teach mix and sound-selection habits, and to supply new drum/sample
material; they did none of that.

**Paused generative programs and why.** Finish My Song (mumble-to-vocal): word
placement reached 89% recovery and was refuted by ear as never the binding
constraint; a retest with perfect words failed on naturalness after 1 of 12
phrases. MiniMax vocals rejected by ear. The vocal lanes are ear-refuted; SA3
re-imagine is ear-approved as an effect; no audio lane has been tried as a
composer of parts.

## 4. What we now believe

- **Validated rules are exhausted as a lever.** Every rule with a validator is
  obeyed; rules without validators (one clip per track, monophony, no repeated
  bars) are still violated; and driving validated metrics to zero did not move
  the ear. The remaining gap is taste-shaped (contour, voice-leading, phrase
  logic, hit choice) and was encoded in the flywheel not as rules but as the
  owner's corrected beats fed back as reference, and, per the correction
  analysis, mostly as the owner's own hands.
- **The agent has no ear and one shot.** It never hears its output, sees only
  ok/error envelopes, takes 5–16 minutes per candidate, has no temperature
  knob. The owner judges 3–7 singletons per round as if each were the agent's
  best effort.
- **Sound selection is seed luck.** No synth preset in the lane was ever chosen
  by an ear; palette one-shots were. Seed 3's draw is the whole difference
  between "pass" and "bad sound selection". The owner's own notes through
  Mosh's default sounds failed in r1: sounds alone can sink his composition.
- **The feedback channel is ~1 bit per candidate.** Verdicts are pass/fail
  plus a sentence. Stems have been exported since r3 and no verdict has named
  a track. Five correction pairs exist in the world (four flywheel, one
  mac-r0-001); zero came from Mosh. The owner's hands have not touched a Mosh
  candidate.
- **The corpus is unused, and it is not what we assumed.** The 320-beat
  catalog is all the owner's own finished work, so it is his taste by
  construction, but it carries no per-item ratings and no "why". Its stats:
  99.7% of beats carry audio loops (average 6.8 per beat); track types are
  loop 8,082 / synth 3,562 / 808 1,008 / perc 710 / hat 428 / snare 251 / kick
  195 / clap 107; keys C minor 155, D minor 12; tempos 150 BPM ×26, 148 ×6;
  the 808 pitch histogram peaks at D4, G4, F4, Eb4 (his "808s in octave 4"
  lesson is literally in the data). Inference: his sound is substantially
  chopped audio loops over 808 and drums, and a MIDI-only agent cannot
  reproduce the loop layer at all. The standing ask (Dm, 148) sits where his
  catalog is thin.
- **n=1, unblinded, test-retest unmeasured.** One composition has passed, one
  listener, one ask. Nobody knows whether the r3c pass passes on a second
  listen.
- **Authorship share is unmeasured in Mosh, and it decided the flywheel.**
  "Pass" conflates "the model composed something good" with "the owner fixed it
  into something good". The one measurement that exists says ~1%.

## 5. The binding constraints

The quality-loop contract (docs/POSTMORTEM-2026-09.md, owner-approved
2026-09-01):

1. ≥1 human correction round per week through the product surface. A fix
   without a written lesson (meta.json: rating + one-line notes) does not count.
2. No new label/telemetry infrastructure until the existing one holds ≥25 real
   labels.
3. Proxy metrics never gate musical decisions. Ear verdicts only. Automated
   gates remain for code correctness.
4. No re-platforming or greenfield rewrites without a written postmortem of the
   current platform, a 1-week cooling period, and explicit owner sign-off.
5. One genre at a time reaches "keeper" before the next starts.
6. The flywheel METHODOLOGY.md's seven non-negotiables govern every loop:
   (1) make the genre yourself first, no catalog no loop; (2) the structural
   prompt skeleton is preserved across genres; (3) mandatory meta.json per fix;
   (4) each correction lesson maps to a prompt rule with provenance; (5) the
   reference catalog feeds back via retry_with_feedback; (6) distinguish
   convergence signals; (7) the evaluator emits verdict rows, not scalar
   scores. Plus a cap: 6 rounds per loop; if round 6 has not converged, one of
   the seven is being skipped, diagnose that rather than extend the cap.

Label count today, by the three definitions in section 0: 19 verdict rows
filed (r1–r3 candidates, mac-r0-001, one flywheel gen) plus 3 unfiled r4 = 22;
5 correction pairs; 1 accept/reject. Rule 2 was written with the accept/reject
archive in mind. If verdict rows count, the owner's agreed one-sitting label
sprint passes 25 immediately; if only correction pairs count, 25 is ~20
correction rounds away. **Which definition should govern is a question for
you.**

Also binding: the approved direction keeps Mosh as the platform and runs the
flywheel lab weekly until Mosh passes a blind ear A/B against it on the same
ask; composition modes ship as a per-role source matrix (MIDI + real sound
versus SA3 audio, per role); frontier models now, distill later only on an
ear-rated corpus. Owner-machine constraints: everything runs on one M1 Max;
recipe A depends on a paid VST3, an educational-use-only kit and a frontier
model via subscription, so "free and local" is currently unearned; the LoRA
library is largely trained on commercial albums and cannot ship.

## 6. The strategic questions we want reasoned

1. **Moat.** Is the defensible asset (a) the editable session produced or
   edited by an agent through an undoable command seam, (b) the per-producer
   correction corpus that loop accumulates, (c) local/free/own-models, or (d)
   something else? Our ranking is b > a > c, with c unearned. Argue against it.
2. **Who it is for.** Pros who co-produce, next-gen artists who cede control,
   or both? Our view: the loop needs a producer's hands on the other end, so
   the wedge is producers (the owner first); the next-gen artist inherits the
   same artifact later. Is "everybody" a destination or a trap? Is the second
   group simply Suno's customer?
3. **MIDI-first vs generative vs per-role hybrid.** Given that the owner's
   sound is loop-heavy (section 4) and that r2→r3c moved the verdict with
   sound and mix rather than notes, is there a case for audio-rendered
   loop/texture/ambient roles with MIDI kept as the editable source (SA3
   re-imagine of a dry stem as a render layer), or for a sample-retrieval lane
   over his own loop library? Where does that stop being co-production?
4. **Symbolic model vs retrieval vs LLM.** Is a small symbolic model trained on
   320 unrated-per-item beats plus 25 projects premature (our view: yes, it is
   re-platforming number eight with no rated corpus)? Is retrieval-and-transform
   over the catalog (especially its 1,008 808 tracks and 195 kick / 428 hat /
   710 perc tracks) the cheaper, label-producing route? Does an LLM writing
   MIDI token by token have a ceiling here at all, and how would we know?
5. **How the owner's catalog and the reference sets should actually be used.**
   Full 8-bar beats rotated per candidate with transposition, versus fragments;
   catalog as reference versus retrieval source versus training corpus; whether
   the fixed ask (Dm, 148) should move toward where his catalog is dense (Cm,
   ~150). The keeper gen_006 ended in D minor; the catalog is 48% C minor.
6. **How to give the agent an ear** without it becoming a proxy gate. The
   flywheel already had one (Gemini on rendered audio, threshold 7.0) and never
   validated it against the owner on unseen material. Options: post-render
   structured critique fed as one repair turn; per-stem descriptors; CLAP/DSP
   features displayed only; never ordering candidates.
7. **How to get taste data faster than one verdict per day.** Correction rounds
   (owner fixes the pick in the DAW; the diff is the label) versus verdict
   rounds; candidate fan-out overnight with pick-one; per-stem verdict rows;
   note-level provenance (what the model wrote and the owner kept, per role) as
   the one non-proxy measurement. Which label definition (section 0) should
   rule 2 count?
8. **Whether "produce a beat from a prompt" is even the right first task.**
   Every loved output came from a continue/correct/extend loop seeded by the
   owner's material, and the authorship data says the owner did ~99% of the
   composing; the tweak/edit lane has never had an ear-rated round and its only
   evidence is a command-correctness benchmark.

## 7. A proposed 90-day plan for you to audit

Spine: keep MIDI + the owner's plugins + the MoshOps seam; stop treating this as
prompt engineering; restore the three inputs the flywheel had (his catalog as
reference, his hands fixing the pick each round, many candidates per
audition); measure authorship share from day one; pull the edit lane forward
because that is where the evidence points; pin everything else to recipe A.
Each step has a kill criterion. Assumed owner time: 2–3 hours per week (one
60–90-minute listen/fix sitting, one 30–60-minute blind audition).

1. **Week 1: file r4 and run the label sprint.** Write r4's meta.json. Then one
   blind sitting: every render so far (~20 produce-lane candidates, the r3c pass
   as an unlabeled control, one duplicate candidate, the flywheel keeper and
   near-miss), pairwise pick-one where candidates share an ask, and for each
   complaint name the offending stem. This alone passes 25 verdict rows.
   Kill/branch: if the control fails on relisten or the duplicate splits, every
   later round becomes paired pick-one only, and single verdicts are retired.
2. **Week 1: freeze recipe A and add the authorship meter.** Recipe A as a named
   config (labkit, r3c mix chain, seed-3 Vital presets by name). A per-role
   count of notes the model wrote versus notes kept after correction, recorded
   in every meta from now on. It is displayed and never gates.
3. **Week 2: first correction round in Mosh (contract rule 1).** Owner opens
   r4-opus-s1 or the r3c pass, fixes until fun (≤45 minutes), saves; meta
   records rating, notes, minutes, roles touched; a script diffs the run's note
   commands against the saved snapshot into the existing correction store,
   classifying changed notes by role and type (pitch/duration/placement/
   velocity/add/delete). Kill: if the editor blocks a ≤45-minute fix, those
   editor gaps are the only DAW work allowed this quarter. Falsifiers: the fix
   is mostly re-pitching within a clash class (rules not saturated after all);
   the fix is >80% sound/mix (notes are secondary).
4. **Weeks 2–3: tweak-lane pilot, pulled forward.** Five subtle asks on the
   owner's own sessions or the r3c pass ("make the B darker", "clap quieter
   with variation", "sustain the stabs", "add a counter phrase", "halve the hats
   in bar 7"), each one undoable transaction, judged by ear, each verdict a
   label in his vocabulary. No preset lottery, no mix confound, no authorship
   ambiguity. Kill: <3 of 5 accepted, the edit lane gets its own correction
   rounds before any further generation round. Why here: this is where the
   loop is cheapest and most honest, and every loved output was a
   correct/extend result.
5. **Weeks 2–3: reference bank v0** from the jerk/trap subset of the catalog
   (converted to the lane's note format, tagged bpm/key), retrieval by ask, one
   full beat per candidate rotated so no two candidates share one, transposed;
   plus import of 5 of the owner's recent Live projects. Kill: <15 usable
   on-genre beats convert, then the Live imports carry the bank.
6. **Week 3: round 5, the first real experiment.** 8 Opus candidates overnight
   on recipe A: 4 reference-anchored, 4 v4-prompt; r3c pass as control plus one
   duplicate; blind, stems visible, owner picks one and writes one line each.
   Falsifiers: reference-anchored does no better (catalog-first is not the
   lever); "copied from my beats" returns despite rotation (the channel needs
   distance and the product is continuation, not generation). Success: ≥2 of 4
   reference candidates reach pass_with_notes and the control holds.
7. **Week 4: correction on the pick**, stored as an owner-fixed reference ranked
   above catalog entries (METHODOLOGY #5 inside Mosh); re-run the same ask with
   it as reference and blind A/B against the original. Promote at most 2 rules,
   each tagged with its lesson. Kill: owner cannot give ~1 hour that week, stop
   and renegotiate rule 1 honestly. Kill: referenced candidate not preferred in
   2 of 3 asks, the reference channel does not transfer.
8. **Weeks 4–5: mechanical fixes** (code correctness, automated gates allowed):
   the loop returns trackId/clipId so add_note/set_note become usable;
   one-clip-per-track and monophony validators; a test that fails when a rule
   is promoted without a lesson tag or a threshold is tuned without an ear
   verdict that round. Re-test Sonnet for cost.
9. **Week 5: ear-approved sound bank.** Owner auditions all 60 Vital presets
   once (~40 minutes) and keeps; the template draws only from keeps; seeds 1/2
   re-rendered through the bank as twins of their r4 runs. Kill: still "bad
   sound selection" with owner-kept presets, then preset choice stays a human
   control and the lane asks for it.
10. **Weeks 6–8: the advisory ear**, blind, paired with/without. Post-render
    critique (per-stem RMS/flatness, bar repetition, contour range, simultaneous
    notes on mono roles, clip count) as text into one repair turn, following
    the flywheel's Gemini precedent but display-plus-one-repair only, never
    ordering candidates. Kill: no win over two rounds, remove the repair turn,
    keep the display.
11. **Weeks 8–9: loosen drums**: reference drums plus a no-identical-bar floor,
    or retrieval-transform of drum grids and 808 lines from the catalog. Kill:
    regress by ear, restore and record.
12. **Weeks 9–10: retirement A/B** against the flywheel lab, blind, varying key
    and tempo within genre. Kill: Mosh loses twice, write the postmortem and
    take the cooling week.
13. **Week 12: count labels and postmortem.** Only at ≥25 labels under the
    agreed definition unlock a single label store. Symbolic-model training,
    audience expansion and any re-platform stay closed until signed after
    cooling.

Side experiment, one afternoon, $0: r3c notes, seven dry Vital stems
re-imagined through SA3 at 0.35/0.5 with and without a LoRA, blind against the
r3c pass, for texture/ambient/fx roles only; yields stem-level labels either
way. Rights hygiene in parallel: tag commercial-album LoRAs lab-only, close the
SA3 license items, treat "free and local" as a phase-2 claim.

Known weaknesses of this plan, for you to weigh: it still spends weeks 3–9 on
prompt-to-beat rounds after concluding the product is co-production; it assumes
the owner's catalog converts to a MIDI reference bank when the catalog is
99.7% loop-based; it treats the LLM as the composer for melodic roles with no
evidence that it can be one; and every step depends on one listener.

## 8. Specific research asks

Use web search. For each, say what you found, with sources and dates, and what
it implies for the plan.

1. **State of AI co-producer products (2025–2026).** What do Suno, Udio, and
   any DAW-integrated agents (Ableton/Producer Pal-style MIDI agents, FL/Logic
   assistants, Google/Meta/Stability tooling) actually ship for editing
   existing material versus generating from nothing? Name which return
   editable MIDI/stems/sessions, how they handle "make the B darker"-style
   edits, and whether public evidence shows producers keeping their output.
2. **Symbolic music models that run locally on a 64 GB M1 Max.** Anticipation,
   MusicLang, Magenta/Anticipatory, NotaGen, any 2025–2026 MIDI transformers
   or diffusion models; whether any handle multitrack trap/hip-hop with 808
   lines; parameter counts, licenses, fine-tuning data requirements. Which
   could be LoRA-tuned on ~300 beats, and has anyone published results at that
   corpus size?
3. **Retrieval and adaptation for style**: retrieval-augmented symbolic
   generation, in-context exemplar prompting for MIDI LLMs, copy-vs-variation
   control, transposition/tempo normalisation practice. Cite evaluations where
   retrieval beat fine-tuning at small data, or the reverse.
4. **LLMs writing MIDI directly**: measured ceilings or human-preference studies
   for GPT/Claude-class models composing multi-track loops; token formats that
   worked (ABC, MIDI-text, REMI); whether critique-and-repair loops improved
   human ratings.
5. **How others obtained taste/preference data cheaply**: pairwise preference
   collection in music (MusicRL, Udio/Suno feedback loops, RLHF for audio),
   edit-distance or correction-based labels, blind test-retest reliability of
   single-listener judgments. Numbers on how many pairwise labels moved a
   model, and how noisy single listeners are.
6. **Per-role audio generation**: evidence that stem-level text-to-audio
   (Stable Audio, ACE-Step, MusicGen-stem variants) holds key and tempo over
   8–16 bars, and whether "MIDI-as-source, audio-as-render-layer" hybrids exist
   elsewhere. Also: sample/loop retrieval systems that pick from a producer's
   own library by key/tempo/timbre.
7. **Licensing**: Stable Audio community license commercial terms as of now;
   whether "educational use only" sample kits can ever underpin a shipped
   default.

## 9. What NOT to do

- Do not propose a re-platform, rewrite, new DAW or new "engine". Seven
  happened; the contract forbids it without postmortem, cooling and sign-off.
- Do not propose a proxy metric that orders, filters or gates candidates before
  the owner hears them. Spearman +0.12 and the harmony-clash episode are the
  record.
- Do not propose more prompt rules for "wrong notes". Every validated rule is
  obeyed.
- Do not propose new label or telemetry infrastructure before the existing
  store holds 25 labels under whichever definition you argue for.
- Do not propose training a symbolic or taste model on unrated output; that
  produced 1.92/5 before.
- Do not assume the 320-beat catalog is an on-genre, per-item-rated MIDI
  corpus; it is the owner's own work, loop-heavy, 48% C minor, unrated
  per item.
- Do not treat the r5 evalA 0.9357 or any conformance percentage as evidence
  of musical quality.
- Do not read the flywheel's March-19 result as "the loop produced keepers";
  the owner did ~99% of the composing in every corrected pair.

## 10. Output we want back

In this order:

1. **Pushback first.** Where the owner's framing (MIDI-first ideal,
   "everybody", the moat list, "produce from a prompt" as the headline task, a
   symbolic model on his catalog) is wrong or under-evidenced, say so bluntly,
   grounded in this brief and in what you find.
2. **Reframing.** Your own statement of what the product is, who it is for
   first, and what the defensible asset is, argued rather than asserted.
3. **An audited, revised 90-day plan** with a kill criterion per step,
   honoring section 5, stating explicitly what you re-ordered and why, which
   label definition you adopted, and the weekly owner hours it assumes.
4. **Research findings** for each ask in section 8, with sources and dates,
   and a one-line "what this changes" per finding. Flag anything you could not
   verify.
5. **Open questions** you would need answered by the owner or the repo before
   committing, ranked by how much they would change the plan.

Be concise and dense. Numbers over adjectives. If you disagree with this
brief's own conclusions, that is welcome.
