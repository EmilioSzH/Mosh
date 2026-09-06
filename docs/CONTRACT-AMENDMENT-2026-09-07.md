# Contract amendment 2026-09-07 — recording + mixing pivot

**Status:** SIGNED by the owner on 2026-09-05 (in chat: "I sign off"). Effective 2026-09-07.
**Amends:** the quality-loop contract in [docs/POSTMORTEM-2026-09.md](POSTMORTEM-2026-09.md)
(rules 1–6, owner-approved 2026-09-01) and the "approved direction" summary in the same
file. The seven non-negotiables live outside this repository in
`~/AbletonMONSTER/METHODOLOGY.md`; that file receives a pointer to this amendment, not an edit.
**Source of the decisions:** the owner's 2026-09-04 decisions as recorded in
`MOSH-PIVOT-HANDOFF-2026-09-05-v4.md` §0 (bundle
`~/Downloads/mosh-pivot-handoff-2026-09-05/`, sha256 `9102c302…`). Repository evidence
never reverses a decision or lifts a rule; the evidence for this pass is in
[docs/pivot-2026-09/CAPABILITY-AUDIT-2026-09-05.md](pivot-2026-09/CAPABILITY-AUDIT-2026-09-05.md).

This is a supersession record. Nothing below rewrites history: the postmortem, the produce
lane's four correction rounds, the flywheel lab's rounds and every filed verdict row stay as
they are and keep their counts.

## 0. Owner decision record (2026-09-04) — settled; do not re-interview

> Mosh stays the existing agentic DAW. Moshi is useful first as its recording and mixing
> engineer, while retaining the ability to operate existing generative tools on the
> artist's behalf: re-imagine a sung/played part, realize a spoken idea into a reversible
> layer, split stems, improve a prompt. It does not need to be a composer.

| Decision | Planning consequence |
|---|---|
| First success is repeated voluntary use on his real music, even if empty-prompt beat generation never improves | Composition benchmarks leave the critical path. Personal usefulness ≠ market demand |
| He composes in Live/FL, often through a master clipper, and usually records over a stereo beat bounce | The stereo-bounce workflow is the baseline and the bootstrap handoff form: a valid narrower fallback, **not** evidence of the multitrack benefit. Composing in Live is not a prohibition on composing in Mosh and not an instruction to remove MIDI |
| A separate Mosh session for recording/mixing is acceptable | Rendered-audio handoff before any `.als` reconstruction |
| A substantially better first pass plus a little finishing is valuable | Release-ready autonomy is not the acceptance bar |
| Hours unattended for a first pass is fine; "less reverb" resolves in minutes; a surfaced macro beats another sentence | Batch budgets separate from interaction latency; direct controls are first-class |
| Hands-free recording matters to him and potentially beginners | Recording reliability is product work this quarter; beginner demand unvalidated |
| Generating/re-imagining parts and improving prompts remain wanted; whole-beat composition is not required | SA3/ACE lanes preserved; no composer benchmark |
| SA3 contributed to one real kept beat; poor convenience limits use | One bounded convenience task later, ≤2 engineering days, only if core gates pass |
| Reuse/variation of his material and audio-only textures are acceptable | Note-count authorship is not a product metric |
| The composition flywheel is no longer a priority; pivot first | Written supersession of the weekly composition-lab obligation and the composition A/B prerequisite (§3 below); history preserved |
| The external playtest is off | No external pilot or recruitment this quarter; a later invitation needs a new owner decision |
| His brother's interest in generation/LoRAs is not validation of the mixing job | No pilot user is inferred from it |

First user: the owner. Genre: jerk/trap only for every quality gate. He is not a
professional mixing engineer; the product must not require him to supply the diagnosis and
settings. His preference determines personal usefulness; a "professional quality" claim
needs separate evidence.

## 1. Amendment clauses

1. **Active quality loop.** "Jerk/trap recording + mixing on the owner's own material."
   Rule 5 applies. "Keeper" gains a task-specific extension: *a recording/mix result he
   retains and continues using in the actual song.* Historical labels are not redefined.
2. **Superseded.** The obligation "run the flywheel lab weekly until Mosh passes a blind ear
   A/B on the same ask" is replaced by: the same real-song task vs. the owner's
   stereo-bounce shortcut. Old evidence and round counts are preserved. **Also paused:**
   the external playtest; a later invitation needs a new owner decision.
3. **Produce lane.** Parked at its verified current state (round 4 of its own count,
   prompt v4) with the addendum's corrected evidence and an **unresolved causal
   diagnosis** (non-negotiables #3/#4/#5 never ran inside Mosh; the +2 st palette-808 and
   pitch-class-changing preset defects are recorded; no final re-render required).
   "Generate Beat Recipe" stays live as a tool. The palette-808 root labeling is repaired
   only when a selected workflow depends on the palette 808 (≤1 h correctness fixture, no
   audition round).
4. **Rules 1–4 and 6 unchanged.** Rule 1 now reads: one real Moshi mix/recording action
   corrected in Mosh with rating + lesson, every week including audit weeks; a blocked
   surface is a declared miss and a repair priority, not grounds to manufacture a label.
   Six-round cap per **explicitly named** recording/mixing experiment; no reset on manual
   correction; at the cap: stop, audit compliance, write the diagnosis.
5. **Rule 2 interpretation.** Allowed before 25 rows: restoring existing command behavior,
   reading operational parameter state, bounded repair of the logger's existing provenance
   fields through the existing path, using existing render/export tools, manually
   attaching existing measurements to a test. **Deferred until 25:** new audio-analysis
   pipelines, event-collection services, label schemas, databases, dashboards. **Row
   metadata before 25:** the existing accepted meta.json format; optional fields only where
   the existing writer/readers already support them without a schema migration or new
   collection system; otherwise the information goes in the existing `notes` field or the
   audit document and the structured-field change is explicitly deferred. Straddling cases
   are flagged, not renamed.
6. **Rule 3 ruling.** No CLAP/critic/embedding score, LUFS target, spectral distance or
   learned reward may rank, filter, select a winner or suppress musical candidates before
   the owner hears them. Measurements inform one bounded proposal. Technical-integrity
   checks stay automated. Score-driven parameter search (inference-time search presenting
   the best-scoring of N settings) needs a written exception to this contract.
7. **Seven obligations mapped.** (1) his own songs/roughs are the "made-it-yourself"
   context; (2) the structural prompt skeleton is audited and retained; (3) meta.json per
   fix; (4) each lesson → a scoped instruction with provenance, "this song" vs "general";
   (5) prior corrected state/lesson feeds the existing retry path; (6) execution
   correctness, listening preference, remaining manual work and voluntary reuse are
   reported separately; (7) verdict rows, not scalar scores.
8. **Rights.** Shipping builds contain only user-supplied audio plus rights-clean builtins
   and models with a pinned code/weights/adapters/samples/license matrix; owner-installed
   paid plugins are hosted, not redistributed. License facts of record:
   `RESEARCH_AND_VERIFICATION.md` v2 in the bundle (R01–R07, W01–W25).

9. **Hold-to-talk voice path (owner decision 2026-09-05).** A minimal press-and-hold speech
   path (native SFSpeechRecognizer over its own audio client; final transcript into the Moshi
   composer; only exact session-control / take-cycle utterances auto-submit) is built this
   quarter as an **addition**. The owner **explicitly waived** the non-goals rule "any addition
   requires a removal" for this item and asked for compressed windows; no other scope changes.
   Always-listening remains a non-goal; a physical stop control is always present; the mode is
   hands-free of the mouse only (a held key), stated as such in every claim. Brief:
   [docs/pivot-2026-09/BRIEF-VOICE-HOLD-TO-TALK.md](pivot-2026-09/BRIEF-VOICE-HOLD-TO-TALK.md).

## 2. Label definition adopted for Rule 2

**Verdict row:** one human-auditioned rendered candidate — a beat candidate, or one bounded
agent mix/record result — with a rating and a one-line note in the existing meta.json
format. Count only when the audio is identifiable, the owner actually heard it, and the
note is meaningful. A failure is a real label. Historical composition rows qualify if
auditable (unblinded does not disqualify) and stay separate from mixing evidence in every
conclusion. Concealed repeats, unfiled opinions, model reviews, script events, slider
movements and copied rows count 0. Correction pairs and render-layer acceptances count only
via a separately qualifying row. Pairwise presentation is a method, not a label type.

Evidence categories stay distinct **in the existing store** (lane compose/mix/record; blind
yes/no; mix-move accept/revert/adjust; correction pairs; render-layer decisions; real-song
uses) using existing fields where they exist and `notes` lines where they do not.
Traceability values on new rows (`run_id`, `prompt_version`, `turn_id`, `origin`, song,
section, level-match offset) are recorded where applicable and where the format supports
them; otherwise "not applicable" or "unknown" — never invented precision. Historical rows
keep `unknown`. No dashboard, counter system or schema migration before the gate.

The census as of 2026-09-05 (audit §5): **14 counted rows, 8 straddling, all composition
lane; 0 mixing, 0 recording, 0 blind.** The 25-row gate is not met under any reading.

## 3. What this amendment pauses, supersedes, or leaves untouched

| Item | Disposition |
|---|---|
| Weekly Ableton flywheel lab rounds "until Mosh passes an ear A/B" (POSTMORTEM "approved direction") | **Superseded** by clause 2. The lab's rounds (gen001, mac-r0-001 and their prompt lineage) remain history |
| Composition ear A/B as the prerequisite for retiring the lab | **Superseded** (clause 2) |
| Produce lane (`ui/src/agent/loop/producePrompt.ts` v4, `docs/produce-corrections/` r1–r4) | **Parked** at round 4 with its recorded count; not reset, not relabeled (clause 3) |
| External playtest / recruitment | **Off** this quarter (§0) |
| First-Stranger, Finish My Song, Session Foundry, R8, legacy cockpit | Unchanged: paused/archived per `CLAUDE.md` |
| SA3 re-imagine, ACE-Step Cover/Repaint, Generate Beat Recipe | **Kept** as tools; no new model, no training |
| Rule 1 weekly correction | **Kept**, re-pointed at recording/mixing actions (clause 4) |
| Hold-to-talk voice path | **Built** this quarter as an addition; removal requirement waived by the owner (clause 9) |
| The 6-round cap | **Kept**, per explicitly named experiment; the produce lane's count stays at 4 and is not inherited by new loops |
| Non-goals (any addition requires a removal) | symbolic composition model; catalog → MIDI bank; `.als/.flp/.rpp` fidelity mappers; VST3 state-blob loader; autonomous comping/tuning/alignment; a Mosh vocal-DSP suite; blanket denoiser/tuner integration; learned taste/reward model; audio-reward RL (frozen); score-driven parameter search; God Particle clone; 60-preset ear audition; composition twin re-renders; new label store or dashboard; external pilot; multiplayer/arena/iPhone expansion; Windows verification; Voice-to-MIDI; additional genres; always-listening/full-duplex agent; global semantic maps for all plugins; any new engine or UI re-platform |

## 4. Named experiments and counters

Every recording/mixing experiment is named before its first round and carries its own
six-round counter, e.g. `mix-2026-09-stereo-vocal`, `record-2026-09-takes`. A diagnosis is
not permission for extra rounds; relabeling does not reset a counter. Rows filed for an
experiment carry a `notes` line `experiment: <name> round <n>` until the format supports a
field.

## 5. Signature

Owner: Emilio Sanchez-Harris — signed 2026-09-05 (chat, recorded by the audit session). Effective 2026-09-07.

Written by the audit pass of 2026-09-05 at commit `0da6c638`; committed on the owner's instruction the same day (no push).
