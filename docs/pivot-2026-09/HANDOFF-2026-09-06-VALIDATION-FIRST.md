<!--
VENDORED VERBATIM — do not edit. Corrections are appended, never made in place.
Source      : /Users/emiliosanchez-harris/Downloads/MOSH-HANDOFF-2026-09-06-v4-VALIDATION-FIRST.md
Retrieved   : 2026-09-06
Bytes       : 57072
sha256(body): 4c174a135d1f215e70fde12c07ce5d367c97abc72e5aa91466d3c7e8ece015fe
Why here    : the validation-first amendment this pass executes; RECONCILIATION-2026-09-06 cites it densely and is unreadable without it
Verify      : strip this comment block and the blank line after it, then
              `shasum -a 256` the remainder; it must equal sha256(body) above.
-->

# Mosh — Handoff v4: Validate the Recording-and-Revision Workflow

**Date:** September 6, 2026  
**Audience:** the current Mosh implementation session and its independent reviewer.  
**Relationship to v3:** an amendment to `MOSH-PIVOT-HANDOFF-2026-09-05-v3.md`, not a repository restart, platform pivot, or wholesale replacement of its contract.  
**Execution status:** this document supplies the requested next plan. It does not itself authorize new runtime changes, expenditure, audio uploads, model-term acceptance, training, deployment, or merges. Existing expressly authorized work retains its existing scope.  
**Repository status:** the owner reports that implementation of the previous handoff is underway. The current local SHA, working diff, completed repairs, and test outcomes were not inspected when preparing this document. Reconcile them at the next safe milestone boundary; do not present September 4 findings as today's unfixed defects.

> **Next product proof:** Starting from the owner's real beat bounce and vocal, produce a version he would keep, accept ordinary revisions, retain the earlier decisions he approved, and reliably recover the selected result. Integrate only the capabilities that prove useful.

## Reading map

Sections 0–3 define the change, retained constraints, and contract. Sections 4–7 define the operating boundaries and next experiment. Sections 8–10 cover conditional integration, recording interaction, and capacity. Sections 11–12 provide deliverables and audit requirements. Appendix A is the paste-ready kickoff; Appendix B is the independent review prompt. Section 13 identifies the sources.

## 0. Decision and authority

### 0.1 Product direction retained

Mosh remains the **existing agentic DAW**. Moshi is its recording and mixing engineer, with explicit access to existing generative production tools. A distraction-free recording booth is a view/template inside Mosh, not a replacement product. The first user is the owner; quality gates remain scoped to his jerk/trap music. [H3 §§0, 3]

The default handoff remains **stereo instrumental bounce + recorded vocal**, with an immutable rough/reference. A separate Mosh session is acceptable. Full stems are an escalation only when a concrete task needs them; faithful Live/FL project reconstruction is not a prerequisite. Composition inside Mosh is not prohibited and existing MIDI features are not removed. [H3 §0.1]

A substantially better starting treatment plus limited finishing is valuable. Release-ready autonomy is not required. Ordinary direction and contextual direct controls remain first-class; the owner should not have to prescribe compressor settings to make the system useful. [H3 §§0.1, 7.4]

### 0.2 New planning direction

**Stop making a general plugin-operating agent the prerequisite for musical value.** Keep reliable bounded plugin/DSP control, but compare specialized automated processing, a simple conventional treatment, and explicitly authorized generative re-imagination before expanding autonomous mix judgment.

The leading hypothesis is:

> **Moshi interprets the requested outcome. The host authorizes and executes a bounded operation. A processor or generator does the sonic work. The artist auditions, keeps, or revises the result.**

This is a hypothesis and proposed implementation strategy, not an established result. The reports support testing it; none establishes that it already works on the owner's music. [R1: Executive summary; R2: Recommended next experiments; R3: System architecture and intent contract]

**The hybrid is a possible outcome, not a mandatory architecture.** A simple vocal treatment, a specialized first-pass mixer, a directed edit assistant, a generative variation workflow, or recording alone may earn a place. Do not require all of them to succeed.

### 0.3 Authority and evidence

Owner decisions and the actual signed repository contract control scope and permissions. Current-SHA evidence controls implementation facts. The engineering addendum remains the correction to older historical claims. H3 remains the baseline except where this document explicitly proposes a changed sequence or scope; record adoption rather than silently overwriting it.

The three new reports are **research inputs, not execution instructions**. Vendor capabilities, interface access, licensing, performance, and model availability described in them are reported claims requiring exact-interface verification before reliance. No new vendor verification or musical listening test was performed in drafting this handoff.

Use H3's implementation statuses: **verified · reported-not-rerun · inferred · failed · absent · blocked**. Separately label a vendor feature **reported**, **documented for the exact interface**, or **demonstrated locally**. Never turn an advertised feature into a tested capability by changing its label.

## 1. Amendment map: what changes and what does not

| Existing obligation or proposal | v4 disposition |
|---|---|
| Useful edits exactly once; authoritative IDs/state; readback; undo; save/reopen | **Keep.** Finish an already-authorized bounded task unless a concrete integrity problem blocks it. Do not restart accepted repairs. |
| Aligned audio handoff, pristine recordings, durable takes, recovery, rights review | **Keep.** These remain requirements regardless of audio backend. |
| H3's custom observation → LLM mix-decision experiment as the next sonic investment | **Defer as a prerequisite.** First test accessible specialized processing and existing generation. Reopen custom perception only for a specific remaining failure. Preserve work already completed. |
| Mapping a few controls on one or two installed effects | **Keep when a tested revision requires it.** Expanding the map is not a milestone by itself. |
| SA3 convenience postponed until later | **Split evaluation from integration.** Test existing SA3 capability earlier without a backend rewrite. New convenience implementation remains conditional and bounded. |
| Repeated whole-mix regeneration as ordinary correction | **Do not adopt.** Mixing and re-imagination have different authority. No hidden regeneration. |
| R2's immutable layered retention architecture | **Adopt its boundary requirements; do not prebuild its full infrastructure.** Use existing project copies, audio files, take handling, snapshots, and manifests first. |
| R3's seven-component compiler, new take database, six-week roadmap, 288-output pilot | **Not adopted as a build program.** Start with operation/scope checks and a small optional prompt comparison. |
| R1's personalized detector plus duplex system and full data pipeline | **Not adopted wholesale.** Preserve the small natural-interaction prototype direction; evaluate interpretation in shadow mode before live authority. |
| Learned taste/reward models, critic-ranked candidates, composition flywheel expansion, external pilot, replatform | **Remain out of scope.** |

H3 already narrowed plugin semantics and prohibited hidden regeneration. This amendment changes **what earns the next investment**, rather than treating the prior plan as an unrestricted VST-control project. [H3 §§2.8, 7.1, 8; R1–R3]

**Market language:** do not carry forward H3 §2.1's categorical absence claim about conversational, editable production. R2 describes overlapping integrated workflows. No refreshed competitive claim is needed to conduct this experiment, and neither report establishes a Mosh moat. [R2: What Suno already covers—and what remains]

## 2. Preserve the implementation in progress

At the next safe checkpoint, read the current task authorization, latest implementation report, review verdict, and actual working diff before following an old task list.

Produce a **delta reconciliation**, not another open-ended audit:

| Record | Required content |
|---|---|
| Workspace | Actual repository, worktree, branch, HEAD, relevant dirty/untracked paths, applicable agent instructions and runbook. |
| Current milestone | Its authorized scope; completed, in-progress, blocked, and independently accepted items. |
| Relevant regression evidence | Existing commands and exact outcomes for import, useful edits, recording, restoration, and generative-job handling. Rerun only affected or genuinely unverified paths. |
| Dependencies | Installed usable tools, backend/runtime/checkpoint identities, available assets, current permission boundaries. |
| Contract | Signed amendments, named-loop counters, genuine verdict-row census, working weekly correction surface. |
| Next action | Finish current bounded repair, run the already-supported experiment, or propose one necessary blocker repair. |

Do not assume `origin/main` is the authorized base, reset a dirty tree, relocate a checkout, discard an untracked file, or replace local authorization with a generic kickoff. Previous locations, SHAs, test totals, and September 4 defects are leads unless verified on the relevant current code. [H3 §§1, 6, 12]

An already-authorized recording-integrity repair is not stopped because the mixing experiment can use prerecorded vocals. Conversely, a prerecorded mixing experiment need not wait for production-ready duplex interaction. Separate these dependencies without pretending one person can integrate multiple workstreams simultaneously.

**Default next implementation task, only when still necessary:** the existing router/exactly-once/readback/undo task for one useful builtin edit and the vocal reverb send. An earlier import or source-integrity blocker may take precedence. If the required machinery already works, the next task is the experiment—not inventing another implementation milestone. [H3 §12]

## 3. Contract and permission boundaries

### 3.1 Carry the quality-loop contract forward

Check whether H3's proposed contract amendment was actually signed and adopted. A recommendation to amend a contract is not evidence that it happened. Where adoption is absent, record the conflict before proceeding under a changed rule. [H3 §4]

The intended carry-forward is:

**Weekly correction:** one real Moshi recording/mixing action corrected in Mosh, with a rating and meaningful lesson through the existing correction path, including planning weeks. A blocked surface is a declared miss and repair priority. An external-tool demo or an invented opinion does not substitute. [H3 §4]

**Rule 2:** census actual qualifying verdict rows; do not assume the project has 25. A row requires identifiable auditioned audio, the owner's actual rating, and a meaningful note in the existing format. Auditable historical composition rows may count toward the infrastructure gate but are not mixing evidence. Repeats, tool events, slider moves, copied rows, and inferred opinions count zero. [H3 §5]

Before the verified 25-row gate, keep the existing allowances for command restoration, operational state reads, bounded provenance repair, existing render/export tools, and manually attached existing measurements. Do not introduce new analysis pipelines, collection services, label schemas, databases, or dashboards. An external SDK integration or cue-analysis wrapper that straddles this boundary is **flagged**, not renamed a convenience feature. Passing 25 does not automatically authorize new infrastructure. [H3 §§4–5]

**Rule 3:** no critic, CLAP/embedding score, loudness target, spectral distance, or learned reward ranks, selects, hides, or suppresses musical candidates before human audition. Integrity checks are separate from musical judgment. R2's suggested pre-listening lock rejection is narrowed here to **blocking promotion**, not concealing a safely playable failed result. R3's future critic-ranking proposal is not adopted. Unsafe or undecodable output is quarantined and recorded as a failed operation, never quietly omitted. [H3 §§4, 9; R2: Measurement sequence; R3: Implementation blueprint]

**Iteration limits:** retain existing named-loop identities and consumed rounds. Plan no more than two development iterations before stopping or narrowing, and respect the six-round contract cap. Musical revision requests, generated candidates, and experiment-development rounds are different counts: freeze their mapping to the existing methodology before running. Every attempt is recorded. Changing a backend, song, or experiment name does not reset an exhausted hypothesis. [H3 §§1, 4, 8]

**History and lessons:** preserve historical evidence and unknown provenance; do not fabricate missing fields. Corrections produce scoped lessons through the existing path, and the relevant corrected state/lesson feeds the existing retry path. A new memory service or learned model is not required. [H3 §§1, 4]

### 3.2 Permissions are specific to the task

This handoff does not grant purchases, subscription changes, API spending, audio uploads, new model downloads or terms, training, dependency installation, remote pushes, deployment, or merges. Existing explicit permissions remain valid only for their recorded scope.

The planning pass may inspect local records, update designated documentation, and run safe existing local tests on disposable fixtures under the current runbook. External smoke tests, proprietary tools, and real-song generation need the applicable access, rights, and budget authorization. A blocked provider is reported; no substitute service receives the audio by default.

Maintain the existing license ledger. Record exact code, weights, text encoders, adapters, samples, hosted-service terms, and redistribution constraints for anything selected. Owner-installed plugins may be hosted without being bundled into a release. Do not infer shipping rights from research access or source-code availability. [H3 §§4, 7.5, 13]

## 4. Operating contract: one interaction, bounded authority

These are requirements for whichever path earns integration—not instructions to create separate agents, services, or a new universal framework.

### 4.1 Route by operation, not by a preferred technology

| Request | Intended route | Boundary |
|---|---|---|
| “Turn me up in my headphones.” | Verified cue/monitor level control. | Do not change final mix or hardware input gain. |
| “Less reverb on this vocal.” | Known send/processor control, or reproducible targeted treatment. | Do not resynthesize the performance or silently rerun the entire mix. |
| “Give me a better first mix.” | Bounded conventional recipe or demonstrated automated-mixing interface. | Preserve source performance and arrangement; create an auditionable candidate. |
| “Re-imagine the instrumental; keep my vocal.” | Source-scoped generative operation, explicitly authorized. | Retain the vocal outside generation; disclose collateral freedom inside the instrumental. |
| “Keep B, but make the hook less wet.” | Resolve B, selection, treatment, and revision against host truth. | Do not reconstruct the parent from conversational memory. |
| “Go back to before that.” | Existing undo or named checkpoint restore. | Recover the actual previous result; do not ask a generator to recreate it. |

R3's strongest transferable idea is separating interpreted intent from source identity, explicit backend controls, and enforcement. Gain, sends, placement, fades, and known effect parameters stay non-generative when those are the requested changes. [R3: Operation routing and Stable Audio prompt compilation]

### 4.2 Minimum operation record

Capture the following in the **existing** project/job/evidence mechanisms; initially a manually documented run record is sufficient. This is not authorization for a schema migration.

| Information | Purpose |
|---|---|
| Original request; selected parent/result; authoritative session revision | Preserve intent and prevent stale-parent actions. |
| Explicit source IDs/files, hashes, placements, and actual editable time range | Establish what may be read or changed. |
| Requested change; hard protections; soft perceptual goals; assumptions | Separate enforceable promises from wishes. |
| Backend/interface/runtime/checkpoint identity; actual supported controls | Prevent invented parameters or cross-runtime assumptions. |
| Settings/prompt, seed when supported, routing/automation or treatment snapshot | Retain the recipe where available. |
| Actual output files and their identities; outcome; human decision | Restore what was heard rather than regenerate it. |

Do not create the same information in a competing database. Reuse the current identifiers and project version policy. Where the existing schema cannot hold necessary evidence, use a versioned experiment note within the allowed documentation path until an eligible, bounded change is approved.

### 4.3 Jobs must not overwrite later decisions

Bind each job to its source identities and session revision. A completed job produces a **candidate**, not automatic authority to replace the active result. At promotion, revalidate the target and revision; on conflict, retain the candidate without applying it, explain the conflict, or rerun only with authorization.

Preserve manual edits made while a job runs. Cancellation must prevent later promotion; a canceled remote job may still consume provider resources, so do not promise otherwise. Retries must not duplicate host mutations or silently issue another chargeable generation.

One bounded committed operation uses one native undo transaction where supported. Audition, promotion, and undo must respect the existing session history. A historical checkpoint restore is an explicit user operation, **not** a blanket project reset that erases unrelated later edits. [H3 §7.1; R1: Controller actions; R2: Retention]

## 5. Preservation must state its exact meaning

The following distinctions refine R2's hard/soft protection model. They are engineering requirements proposed by this handoff, not vendor guarantees.

| Preservation class | What can be promised and tested |
|---|---|
| **Source preservation** | Original performance files remain unchanged and available. Hashes verify file identity, not the final listening result. |
| **Treatment preservation** | The approved vocal render or complete reproducible processing state is retained at a named signal-path boundary, including relevant timing, gain, automation, and effect returns. |
| **Region preservation** | The host retains original samples outside an explicitly authorized edit interval at a defined representation/tap. Crossfades and changed effect tails are inside the declared editable region. |
| **Perceptual preservation** | The vocal remains as clear, close, or prominent; the drums retain impact. These require listening in context, not hashes. |

Changing a beat can alter masking or the response of a shared nonlinear master processor while the vocal file and all master settings remain unchanged. Therefore **“same vocal asset” is not “identical audible vocal contribution at the final master.”** Declare the tap and shared-bus dependencies. Retaining a frozen approved stem can support an exact pre-bus checkpoint; it does not automatically make the final mix perceptually invariant.

For region edits, account for crossfades, processing lookahead/state, latency compensation, and reverb/delay tails. If a downstream stateful processor can change output outside the selection, promise only the verified upstream boundary or use a final-render splice within an authorized range. Do not enlarge the range silently. Exact sample comparison belongs at a defined rate, alignment, channel format, and representation; file-container equality and decoded PCM equality are different checks.

**Processed stems are checkpoints, not automatically editable treatments.** A wet render does not inherently expose its reverb amount. Preserve dry sources plus sufficient settings/returns or prove the backend can rerender that treatment without recomputing unrelated decisions. Preserve actual approved audio even when a recipe exists; a nondeterministic rerender is not exact historical playback. [R2: Integration mode comparison]

**Two true sources give two-source authority.** A stereo beat and a vocal permit independent vocal-versus-instrumental work. They do not give guaranteed independent bass-versus-drums control within the beat. If a request needs finer separation, disclose the limitation and request the relevant stems or authorize an approximate creative alternative. Existing source separation may be tested as an approximation; it is not ground-truth stems and is not added by default. [R2: Revision, retention, and protected intent]

**Keep means checkpoint; lock is explicit.** Accepting a result retains a recoverable parent. It does not infer unlimited permanent locks on every property the artist might have liked. Carry forward explicit protections and approved aspects relevant to the next request; ask a short clarification only when a material conflict cannot be resolved from authoritative state.

## 6. Next feasibility check: verify the usable interface

**Purpose:** select an accessible experimental route, not a permanent backend. Update the existing research/dependency ledger rather than commissioning a new landscape report.

Start with already-installed processing and the existing SA3 path. R2 nominates RoEx as a specialized mixing candidate; verify that candidate before broadening the shortlist. Its consumer product, API, desktop product, and SDK are **separate integration surfaces**. A feature in one does not establish the same feature in another. [R2: Tools, integration modes, and practical surfaces]

| Verification question | Required evidence |
|---|---|
| What can actually be used? | Exact product/interface/version, access status, target-platform compatibility, approved account and budget. |
| Does it accept our input? | Stereo instrumental plus vocal; alignment, channel/rate/duration expectations; treatment of printed processing. |
| What does it return? | Stereo render, processed stems, source-relative timing, settings, wet/dry separation, editable state—verified separately. |
| What revision is executable? | Demonstrate changing vocal level and reverb/depth where claimed; establish whether unrelated settings/audio are recomputed. Read-only returned settings are not writable controls. |
| Can approved decisions be retained? | Retain/reuse individual outputs; target a treatment; restore a parent without another generative inference. |
| What happens operationally? | Observed wall time, peak memory where measurable, cancellation/failure behavior, network requirements and file lifetime. |
| What may Mosh ship? | Exact artifact and commercial/redistribution terms; no implied clearance from a research report. |

For SA3, record the actual installed runtime/checkpoint and supported source-conditioning/edit controls. R3 reports that similarly named controls have different semantics across runtime/checkpoint combinations. Verify the installed combination instead of copying a generic capability table or choosing a different model merely because the report names it. [R3: Runtime integration and backend capability mapping]

End each route with **available for a bounded experiment**, **constrained**, or **blocked**, plus the narrow reason. Availability, musical utility, and embeddability receive separate verdicts. A consumer tool may validate sonic value without validating product integration. An inaccessible SDK is not an audio-quality failure.

**Proposed stopping rule:** one bounded verification pass, initially budgeted at up to four focused engineering hours; return unresolved items rather than expanding into a catalog. This is a planning allowance, not a claim about completion time. New spending, installation, or uploads remain subject to Section 3.

## 7. Real-song experiment: value before infrastructure

### 7.1 Objective and setup

**Objective:** determine whether a small existing-tool workflow creates a retained benefit and supports revisions worth integrating into Mosh.

Use **Song A** as the development song. Freeze its source files, instrumental bounce, vocal performance/treatment, rough, alignment, and starting project. Name a verse/hook or other representative listening range from the actual song; do not invent section timing. Retain the master-treated rough as a reference and avoid applying its printed processing twice. [H3 §§7.2, 9]

Keep two controls: **the preserved imported starting state**, to isolate a Mosh change, and **the owner's normal stereo-bounce shortcut**, to test end-to-end usefulness. Do not credit better export preparation to a mixer or blame an import defect on an audio model.

Use existing renders, project copies, controls, and judgment records. The experiment may include manual setup in an existing tool, clearly logged as operator work. It does not demonstrate natural-language automation unless Moshi actually performs the instruction. Do not require an integrated audition UI or new manifest system before listening.

### 7.2 Small candidate set

| Condition | Initial treatment | What it can establish |
|---|---|---|
| **C — bounded conventional control** | One existing vocal-chain/processing recipe or already-owned assistant. Record all manual setup and preset choices. | Whether simple processing is sufficient; not autonomous engineering if an operator supplied the judgment. |
| **A — specialized automated processing** | One available automated-mixing route selected by Section 6, using the frozen input. | Whether useful first-pass judgment and a workable revision surface are available. |
| **G — explicit generative alternative** | The existing SA3 workflow on the instrumental branch, keeping the vocal out of generation. | Creative value and scoped retention; not faithful-mixing superiority. |

Default: one initial output per available condition. A second G seed may be included only if declared before hearing results; initial new outputs are capped at four. Do not add a mastering suite, several model sizes, Suno, or additional mixers as mandatory conditions. A stereo-polish baseline can **replace** C when that is the simpler real hypothesis, not automatically expand the matrix.

All conditions start from the same frozen material, but G has greater creative authority. Report fixed-source treatment preference and creative-rendition preference separately. Do not force the artist to accept generative changes as the price of a better mix. A blocked condition stays blocked; it is not silently replaced after hearing competitors.

### 7.3 Revision sequence

Audition first-pass results before corrections. Select a promising retained treatment through human judgment, not a technical score. When a first pass is not preferred but is worth attempting to rescue, label the sequence **directed recovery**, not first-pass success.

Use ordinary language adapted only to an actual need in the song. A default sequence is:

> **V1:** “This is the version I want to work from.”  
> **Revision 1:** “The vocal gets lost in the hook. Bring it forward without making the beat feel smaller.”  
> **Revision 2:** “Better. A little less reverb, but keep the vocal balance we just got.”  
> **Recovery check:** “Go back to the version before the reverb change.” Then restore the chosen version, save, close, and reopen.

For every revision, record the actual operation, authorized scope, parent/result identities, intended change, protected aspects, latency, corrective work, and artist decision. “More forward” and “beat not smaller” remain listening judgments. The owner need not diagnose the processor or identify the offending track when he cannot tell.

**Optional creative boundary check:** from an approved parent, ask for a different hook instrumental while preserving the approved vocal treatment and verse. The host must retain the protected audio at the stated boundary, not ask SA3 to remember it. Run this only within the remaining predeclared candidate/round budget and permissions; it is not a loophole for additional retries. Unsupported temporal editing is an explicit limitation, not a mandate for an inpainting integration project.

A useful hybrid sequence to test is **generate → choose → freeze that audio → make ordinary DSP revisions**. There is no requirement to regenerate the chosen beat when revising vocal reverb. Conversely, use conventional treatment alone if it already solves the job.

### 7.4 Listening and evidence

Use lossless outputs, the same time-aligned excerpts, blinded route labels, and randomized order independent of scores. Retain untouched files. Where an existing valid loudness-matching path is available, use static playback-gain matching; H3's proposed tolerance is 0.2 LU. Do not call an RMS/peak estimate LUFS or introduce a new measurement pipeline to bypass Rule 2. A missing valid comparison setup is a limitation or narrow blocker, not fabricated precision. [H3 §§7.4, 9]

For each revision ask, separately: **Did the requested change help? Did the protected aspects remain acceptable? Would you keep this and continue the song?** Record “no meaningful difference,” “neither acceptable,” and “uncertain” without coercing a winner. Listen in the relevant excerpt and whole-song context before final acceptance. A few concealed repeats count zero toward Rule 2; repeat once only when an unresolved comparison changes the decision, not until it passes. [H3 §9; R2: Listening protocol]

Technical checks establish file validity, target/scope correctness, source retention, restore behavior, and absence of unauthorized changes. They do not determine musical preference. A failed hard lock blocks promotion regardless of aesthetic appeal; a safely playable failure remains visible for diagnosis. No silent rerolls or unreported rescues.

In the existing experiment note, distinguish **backend access**, **execution correctness**, **requested-change success**, **hard preservation**, **perceptual preservation**, **absolute usefulness**, **active labor**, and **voluntary reuse**. These are report headings, not a new telemetry/schema project. An external processor's successful operation is not automatically a qualifying Moshi verdict or weekly correction.

### 7.5 Pilot decision, stopping, and generalization

Song A is sufficient to justify a **small integration brief**, not a private-beta or general-quality claim. The pilot earns that brief when the owner retains a useful result, both applicable ordinary revisions are accepted without losing explicit protections, and the selected result can be restored and reopened. A merely less-bad output is not necessarily useful.

A first-pass failure can still yield a directed-assistant outcome if bounded correction helps. If no route provides useful improvement, inspect one concrete failure class and make at most one additional predeclared development iteration within the existing cap. Do not respond by building a larger orchestrator.

Before tuning on Song A, reserve Songs B and C for later confirmation. Repeat only the selected workflow on them. If B prompts a design change, label it development and preserve C as held out; do not call three tuned songs unseen. The small sample supports an owner-specific decision, not statistical generality.

H3's later targets remain separate proposed product gates, not newly achieved results: first-pass preference and final utility each assessed on three songs; at least 10 of 12 applicable ordinary revisions intended and accepted; no hard-protection failures; real reuse and final integrity review. A two-revision pilot does not replace that wider evidence. [H3 §8 steps 5, 7]

## 8. Conditional integration: build only what the result requires

| Evidence | Next bounded scope |
|---|---|
| C is sufficient and ordinary revisions work | Surface that treatment and the useful direct/reversible controls. Do not build a general multitrack mixer. |
| A produces useful starts and exposes dependable revisions | Integrate that exact interface behind existing job/command boundaries. Keep the demonstrated input and revision scope. |
| A sounds useful but is an opaque render | Use it as a starting-render source only where subsequent edits remain honest. Do not expose unavailable “less reverb” control or claim structured revision. |
| A works in a consumer product, but embedding is blocked | Keep sonic and integration verdicts separate. No unofficial API, GUI automation workaround, or large exporter/importer build is authorized here. |
| G gives valuable alternatives but further generation drifts | Integrate explicit branching/selection convenience; refine chosen audio conventionally. Market neither faithful mixing nor guaranteed within-region semantics. |
| Only directed corrections help | Preserve the directed engineer; autonomous first-pass judgment remains unearned. |
| No mixing path helps; recording is useful | Continue the recording assistant and existing production tools. No new mixing-intelligence claim. |
| No path earns use | Freeze expansion, write the causal postmortem, and retain the existing rules for a new architecture. |

For an integrated path, the minimal scope is the **proven operation**, one recoverable candidate/result path, exact parent binding, safe promotion/undo, and one useful immediate control when supported. Reuse existing native controls and history. Do not start with a universal plugin ontology, generalized backend marketplace, new session format, new database, or multi-agent planner/critic.

Retain both approved audio and the available treatment recipe. A snapshot that covers only some parameters does not prove restoration of a full plugin or backend state. Release only controls with adequate readback and restoration evidence. [H3 §§1, 7.1]

## 9. Recording interaction and prompt enhancement: bounded, separate decisions

### 9.1 Recording interaction

The owner wants more than canonical “keep”/“redo” commands: a session-aware interaction that can respond to ordinary speech and small personal vocal cues, clarify briefly, and avoid disrupting flow. The reported REAPER keep/redo system is the baseline, not evidence that natural-cue interpretation already works. [D1; R1: Executive summary]

Preserve that direction without bundling comprehensive micro-movement understanding, continuous learning, performance judgment, or a full autonomous engineer into the first prototype.

**First proposed experiment:** compare transcript-plus-state interpretation against audio-plus-state interpretation on consented real session excerpts, with **no transport authority**. Use a small action set: `RETAKE`, `AUDITION_LAST`, `KEEP_AND_CONTINUE`, `PAUSE`, `NO_ACTION`, and `UNCERTAIN`. Include context before the cue. Hold out entire sessions, and do not leak the later corrective action into the input being classified. Add personal exemplars only if the initial comparison exposes a relevant deficit. [R1: Ground truth, hard negatives, prioritized experiments]

Shadow mode is not exempt from Rule 2, privacy, dependency, or spending gates. Use existing recordings and manual annotations where permitted. A new live collector, encoder pipeline, or provider stream requires explicit eligibility and authorization. Do not claim H3's production duplex exclusion has been lifted by the research report.

Before live testing, preserve these boundaries:

| Boundary | Required behavior |
|---|---|
| Pristine recording | Model receives an analysis copy, never becomes the recorder's required media path. No inference, network work, or blocking serialization on the audio callback. |
| Session engagement | Explicit visible activation/deactivation; not an always-on room listener. Audio retention and cloud transmission are separately authorized. |
| During recording | Subtle inferred cues observe only. Physical/UI stop remains available; any explicit voice-stop path needs its own positive and negative tests. |
| After a take | Reversible proposals only; controller resolves the take ID and current state. No permanent source deletion. |
| Talkback and correction | Brief, interruptible response. Cancel pending action as well as speech; no stale action commits after correction. |
| Playback/self-echo | Lyrics, prior takes, beat samples, and Moshi's own speech must not be mistaken for authorized transport requests. |

Measure wrong-action proposals, false performance interruptions, required explicit language, clarification burden, cue-to-confirmed-state latency, and the owner's need to supervise. Zero errors in a small fixture is not a population reliability claim. Choose an audio/duplex provider only after access and actual interaction behavior are demonstrated; no custom duplex training is commissioned. [R1: Evaluation, safety, and privacy]

Capture release evidence remains H3's: completed takes and committed frames preserved; crash tail measured and disclosed; device loss, process crash, and power failure distinguished. A command log cannot recover microphone samples that were never written. [H3 §7.3]

### 9.2 Prompt enhancement

Keep source/parent resolution and operation validation even if direct prompting wins. Prompt embellishment must prove its incremental value independently.

After the existing G workflow shows value, an optional small comparison may use **three real requests × two conditions × two matched seeds**, at most twelve new outputs: direct text versus restrained enhancement. This is a proposed exploratory cap, replacing—not initiating—R3's 288-output pilot. It remains subject to the shared listening budget and round rules.

Keep runtime, checkpoint, source, duration, mask, and other controls matched. Include a terse request, a precise request, and a revision. Match seeds only within a compatible runtime; do not claim they produce equivalent randomness across implementations. Record unintended additions and correction burden, not prompt length. Retain original requests and compiled text.

Run no-audio routing checks such as “turn it down,” wrong parent, unknown key, unsupported control, and contradictory protection without generating music. If enhancement adds no useful benefit or damages precise requests, keep direct prompting. No retrieval database, custom training, or critic-ranking rescue. [R3: Intent-preservation rules; Existing baselines; Evaluation methodology]

**Capacity rule:** after core gates, choose at most one additional implementation experiment: natural interaction, prompt enhancement, or the existing optional memory/convenience work. They do not become simultaneous new programs. Pure source review can inform each without authorizing its implementation.

## 10. Sequence, capacity, and numerical targets

Replace H3's prescriptive observation-first sonic sequence with this dependency order. It is not a promise that all steps fit the previous calendar.

| Phase | Work | Exit |
|---|---|---|
| **A — reconcile** | Carry forward the active task, existing audits, contract and census; establish actual baseline and permissions. | One current-state delta and one next authorized action. No duplicated discovery program. |
| **B — verify** | Exact-interface feasibility for installed processing, one automated candidate, existing SA3. | Available/constrained/blocked routes and a frozen Song A experiment specification. |
| **C — test value** | Small existing-tool comparison; ordinary revisions; preservation/restore checks; existing weekly correction. | Narrow integration candidate, directed-only outcome, or documented negative. |
| **D — integrate one path** | One bounded implementation brief and independent review, then Songs B/C confirmation. | Demonstrated useful workflow on the tested setup; no unearned general claim. |
| **E — harden and use** | Recording/state safety, rights, regression, observed voluntary reuse; at most one optional experiment. | Bounded private release or an explicit narrower/blocked outcome. |

Retain H3's capacity: **20 focused engineering hours/week including review and repair**, approximately 16 planned plus 4 reserve. **Owner: 3 scheduled active hours plus 1 contingency, ceiling 4.** The owner's scheduled allocation remains 90 minutes real recording/mixing including the weekly correction, 45 minutes listening, 15 minutes rating/lesson, and 30 minutes preparation/decisions. If the owner is also the engineer, combine actual time without counting the same activity twice. Multiple coding agents do not multiply review capacity. [H3 §8]

Use the prior September 7–December 5, 2026 horizon only as planning context; implementation is already reported underway. Re-estimate remaining work from the actual milestone position, not an assumed fresh Monday start. No external playtest or recruitment is added.

**Inherited proposed targets—not measured performance or blanket promises:**

| Target | Application |
|---|---|
| First pass ≤2 hours unattended | Selected workflow on the selected setup; report active work separately. |
| Ordinary supported revision ≤3 minutes | Measure the complete time to an auditionable result; known local controls should not wait for a model. |
| One direct macro/control ≤250 ms | Only where an actual editable target exists; no decorative knob over an opaque render. |
| Active finishing ≤20 minutes per song | Direction, audition, and manual correction; preparation and rescue reported separately, not hidden. |
| Initial handoff ≤30 minutes active | Proposed ceiling from H3; reduce source granularity before commissioning a fidelity mapper. |
| Application-crash uncommitted tail ≤1 second | Proposed selected-setup target; completed/committed audio loss is not allowed, and power loss is a separate test class. |

Freeze applicable criteria before results; do not substitute older v1/v2 thresholds or move gates afterward. The later H3 evaluation remains: at least five genuine sessions across three songs, at least one held-out song, target at least three retained/reopened benefits, and voluntary relevant use in each of the final two weeks. Obligatory testing is not voluntary reuse. [H3 §8]

**Cut order:** optional new memory/prompt/personalization work; additional backend comparisons and macros; broad plugin mapping; unsupported first-pass autonomy. Never cut source/capture integrity, revision conflict protection, restoration evidence, weekly correction, rights review, or final real-use evidence to save a calendar.

## 11. Required handoff outputs from the repository session

Update existing documents wherever they already fulfill these roles. This list is not permission for another documentation framework.

**1. Adoption and current-state delta.** Exact v3 obligations retained/replaced/deferred; active task and actual SHA; accepted versus merely reported changes; signed contract status; real census and counters. Record any permission/scope conflict explicitly.

**2. Feasibility and experiment record.** Exact interface capability/access matrix; Song A sources and boundaries; candidate/run/round budget; protected aspects; tests; comparisons; remaining owner decisions limited to actual unavailable assets/access/consent.

**3. Re-estimated dependency plan.** Selected next phase, remaining budget, blocker and fallback per step, capture work preserved, optional work cut. Beyond the first proven workflow, keep conditional branches rather than inventing a full architecture.

**4. Exactly one next execution brief plus independent review prompt.** If a repair is required: fill actual allowed paths/symbols, baseline SHA, reproducer, acceptance checks, rollback, protected behaviors and required evidence. If existing tools suffice: make this an experiment-execution brief with source/output boundaries and authorization, not artificial code work.

All unperformed listening, provider tests, or local checks remain **not run**. Required fields to resolve locally include repository/branch/SHA, current task, census, signed amendment, Song A paths, backend identities, permissions, output location, and exact existing verification commands. Do not fabricate them to make a brief appear executable.

**Ready for execution means:** prerequisites and permissions are resolved for the selected task, its stop conditions are explicit, and its allowed changes are bounded. Passing a document review does not mean code or musical value passed.

## 12. Acceptance and independent review

Follow the current repository runbook. Keep the milestone's allowed paths and baseline explicit; freeze its candidate SHA before independent code review. Preserve unrelated work. No automatic push or merge follows from this document. [H3 §12]

For an implementation affecting these behaviors, require relevant evidence for:

| Test family | What must be demonstrated |
|---|---|
| Execution | Fresh source/target resolution; additive and absolute operations applied once; safe retries; ambiguity/unsupported requests do not mutate. |
| Job conflicts | Manual edit while rendering; changed parent; cancellation; late completion; no overwrite or automatic stale promotion. |
| Restoration | One native undo for the bounded edit; prior audio/result recovery; save/reopen; effective processor state and audible output where claimed, not a truncated snapshot alone. |
| Source/scope | Original file identity retained; protected region/tap unchanged as specified; transition/tail boundaries accounted for; hard failures block promotion. |
| Recording | Agent/provider failure does not stop capture; completed/committed frames survive tested failures; recovery tail disclosed; talkback not intentionally routed into the recorded track. |
| Regression | Existing controls and project loading remain usable; missing dependencies/assets fail visibly; any persistent change has appropriate compatibility fixtures. |

For music claims, require identifiable actual audio plus the owner's real judgments, full attempt accounting, comparison controls, and work/latency records. For interaction claims, require recorded proposal/action outcomes and real-session negatives. A simulated tool result or developer assertion is not the missing evidence.

Report **technical integrity**, **musical utility**, **workflow usability**, **dependency readiness**, and **authorization** separately. Allowed dispositions include pass, failed, blocked, and not tested; a test failure is not necessarily a failed sonic hypothesis. A useful recording-only or directed-mixing-only outcome is legitimate.

Resolve H3's differing repair wording through the current milestone authorization. Default for a new brief: one bounded independent-review repair cycle, then a blocked disposition/revised scope. Do not interpret a broader experiment allowance as unlimited engineering repairs or restart an existing repair counter. [H3 §12 and §8]

## 13. Source register and provenance

References in this document distinguish inherited requirements from proposed synthesis. Embedded citations in the supplied research reports remain their citations; this handoff does not promote them into independent verification.

**H3 — Baseline handoff:** `MOSH-PIVOT-HANDOFF-2026-09-05-v3.md`, September 5, 2026. Relevant sections: §0 owner decisions; §§4–5 contract and verdict definition; §6 audit leads; §7 operating boundaries; §8 capacity and conditional evaluation; §9 listening; §§11–12 non-goals and review. Retrieved from the project File Library. Obtain/read the full local copy in the implementing repository; no local source-file hash was established for H3 here.

**R1 — Recording research:** `deep-research-report-2.md`, “Mosh: A Hands-Free, Human-Like Recording-Engineer Agent.” Basis for protected recording, audio/state inference, no-action/uncertain outcomes, shadow evaluation, and guarded authority. Its complete multi-loop/model/data roadmap is not adopted.

**R2 — Mixing research:** `deep-research-report-3.md`, “Can Current AI Mixing and Generative Re-Imagining Support Iterative, Retentive Music Production?” Basis for separating first-pass preference, revision success, and retention; specialized-mixing shortlist; creative re-imagination distinction; source granularity. Its complete backend matrix and infrastructure roadmap are not required.

**R3 — Producer research:** `deep-research-report-4.md`, “Building an Intent-Preserving Prompt-Enhancement and Producer Agent for Stable Audio 3.” Basis for intent/operation separation, provenance, runtime-specific controls, restrained prompt rendering, and selected-parent revisions. Its new database, full compiler program, 288-output pilot, and future critic-ranking proposal are not adopted.

**D1 — Owner discussion:** this project's recording-agent conversation and the present September 5–6, 2026 planning discussion: human-like low-friction recording is wanted; direct VST operation is being reconsidered; the user requested this validation-first handoff while implementing the prior one. Specific implementation choices and numeric experimental caps introduced here are proposals, not retroactively recorded owner decisions.

**Repository documents to consult, not re-certified by this handoff:** the current agent instructions/runbook; `RESEARCH_AND_VERIFICATION.md` v2 and later approved additions; `CLAUDEWEBBRIEF20260904ADDENDUM.md`; `CLAUDE-WEB-BRIEF-2026-09-04.md`; the actual signed contract amendment and `METHODOLOGY.md`; latest implementation and independent audit reports. Do not substitute the old browser-audio catalogs or onboarding scope for H3's product direction.

Exact SHA-256 identities of the three attachments used:

```text
R1  d25efb474d1e125a94aac53bad8b7a8213bc37d3d2182d7df5437b4f2433b501
R2  3bce7d4f6bfddfb2fc2dafb5d8398efce032992dc6fd9f4378f168722efccb1f
R3  55746f7b74f840e76f49b56366cd1acafab9b64d093cb326cf9effdc59318158
```

---

## Appendix A — Paste-ready kickoff for the current implementation session

```text
Work in the current Mosh repository and preserve the implementation already in progress.

Read MOSH-HANDOFF-2026-09-06-v4-VALIDATION-FIRST.md and MOSH-PIVOT-HANDOFF-2026-09-05-v3.md. Read the current task authorization, latest implementation/review evidence, repository agent instructions/runbook, actual signed contract and methodology, and existing research/license ledger. Consult the three referenced research reports as evidence, not as independent work orders.

This is an amendment and bounded replanning pass, not permission to restart, replatform, or implement a universal audio orchestration system. Keep Mosh as the existing agentic DAW. Preserve recording safety, existing plugin hosting, exactly-once edits, readback, undo, persistence, direct controls, and explicit generative operations.

At the next safe milestone checkpoint, reconcile the actual SHA and working diff with the current task. Do not redo accepted work or assume September 4 findings remain unfixed. Do not reset/relocate the workspace, discard unrelated changes, or presume origin/main is the authorized base.

Change the next sonic investment: before expanding custom audio perception, autonomous mixing judgment, or plugin mappings, prepare a small real-song test of existing conventional processing, one accessible specialized automated route, and the existing SA3 instrumental-reimagination path. The input is the owner's stereo beat bounce plus vocal. Full stems are optional only when a concrete operation requires them. The test is a useful retained result, two ordinary revisions, and honest preservation/restore/save/reopen evidence—not an impressive first render alone.

Perform only the bounded documentation/reconciliation work permitted by this pass. Reuse existing exact-interface evidence and verify only the dependencies needed for the test. RoEx is a candidate from the reports, not a selected backend; consumer features do not prove API/SDK features. Existing SA3 runtime/checkpoint behavior must be identified, not guessed. Do not run chargeable jobs, upload audio, install dependencies, accept terms, train, migrate a store, push, merge, or deploy without the specific existing authorization.

Carry forward the real verdict census, weekly in-Mosh correction, existing named-loop counts, six-round cap, and ban on proxy-based candidate selection. A new collector/schema/analysis pipeline remains gated. Preserve source files and approved results; distinguish source, treatment, region, and perceptual preservation. A hard-lock failure blocks promotion, not transparent safe audition. Natural-cue recording remains a separate shadow experiment before live authority; do not bundle it with the mixing integration.

Update existing documents to deliver:
1. Adoption/current-state delta, contract status, census/counters, and unresolved blockers.
2. Exact-interface feasibility matrix and frozen Song A experiment specification.
3. Re-estimated dependency plan within the existing combined owner/engineering capacity.
4. Exactly one next execution brief and separate independent review prompt, with actual paths/SHA/commands or asset/output boundaries and explicit permissions.

If the active bounded task is still required, preserve its scope and finish only under its existing authorization. If the needed functionality already works, the next brief should execute the experiment rather than invent new code. Ask only for a genuinely unavailable asset, access, or consent blocking that specific next task. End with what changed, what remains not run or blocked, the single next task, and precisely what it is authorized to do. Stop before new runtime implementation in this replanning pass.
```

## Appendix B — Independent review prompt

```text
Independently review the Mosh v4 amendment and the selected next brief. Do not implement fixes or treat the author's green summary as acceptance.

First identify whether this is a planning review, an experiment review, or a code-candidate review. Confirm the actual baseline/candidate SHA and allowed paths when code is involved; confirm exact audio/result identities and permissions when an experiment is involved. Follow repository instructions and preserve unrelated work.

Check that the document is an amendment to v3, not a silent platform rewrite or reset of current work. Confirm the actual owner decisions and signed contract remain authoritative. Verify preservation of weekly correction, the genuine verdict census, named-loop counts/caps, human listening without proxy selection, permission boundaries, and the owner/engineering budget.

Check that the next brief is only one bounded task. Confirm backend access, sonic value, and embeddability are separate claims. No consumer-to-API feature inference, unverified runtime controls, fabricated repository facts, missing permissions, or unsupported licensing claim may be treated as resolved.

For an implementation, exercise the relevant actual path: request -> target/state resolution -> one mutation or candidate -> readback -> audition/promotion -> undo -> save/reopen. Check additive retries, stale result completion, manual interleaving, cancellation, wrong parent, unknown controls, missing assets, and source integrity. Distinguish snapshot equality from effective processor restoration and retained audio.

For audio preservation, identify the exact tap/representation, source and treatment state, edit boundaries including crossfades/tails, and shared-bus effects. Do not accept source hashes as proof of perceptual invariance or processed stems as proof of editable reverb. Hard-lock failures block promotion. Safely playable failed candidates must not disappear from the evidence record.

For musical value, inspect the frozen comparison and all attempts. Require real owner judgments on identifiable audio, ordinary revision outcomes, retained earlier decisions, active labor, and actual restore/reopen behavior. Do not invent listening judgments. A manual external-tool demonstration is not automatic Moshi operation. A generative creative win is not faithful mixing superiority.

For recording claims, require independent raw capture, tested failure/recovery behavior with disclosed tail, restricted during-take authority, no permanent deletion by inferred cues, and cancelable pending actions. Shadow inference is not proof of live-session safety.

Report technical integrity, musical utility, workflow usability, dependency readiness, and authorization separately. State PASS / FAIL / BLOCKED / NOT TESTED, findings with severity and evidence, and the one next allowed action. Documentation can pass while implementation or listening remains not tested. Do not push, merge, deploy, or silently repair. Follow the selected brief's bounded repair allowance; do not reset its counter.
```

---

**Completion condition for this amendment:** the next bounded task tests or enables a real retained musical/recording benefit, without discarding working machinery or committing to an unproven general agent architecture.
