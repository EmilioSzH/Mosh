<!--
VENDORED VERBATIM — do not edit. Corrections are appended, never made in place.
Source      : /Users/emiliosanchez-harris/Downloads/mosh-pivot-handoff-2026-09-05/RESEARCH_AND_VERIFICATION.md
Retrieved   : 2026-09-06
Bytes       : 27265
sha256(body): 4d05dfe5a799339551e77686ae335eb64cbcbe2749240b38da182e8659b12058
Why here    : license ledger of record, named by CONTRACT-AMENDMENT-2026-09-07 clause 8; the only prior copy lived in a volatile ~/Downloads bundle
Verify      : strip this comment block and the blank line after it, then
              `shasum -a 256` the remainder; it must equal sha256(body) above.
-->

# Research and verification — v2 reconciliation

**Access/recheck date:** September 4, 2026, America/Los_Angeles. The newly supplied source is titled September 5 and preserved verbatim. Current pages may change; pin exact revisions before implementation or redistribution.

## V2 findings that override conflicting summaries

| ID | Primary source; source date where established | Finding and bounded consequence |
|---|---|---|
| R01 | [Producer Pal LICENSE](https://github.com/adamjmurray/producer-pal/blob/main/LICENSE), current branch; no release date established | Explicit SPDX **GPL-3.0-or-later**. [H]’s MIT statement is wrong for this revision. Reuse of ideas is not copying source; no dependency clearance is implied. |
| R02 | [ST-ITO LICENSE](https://github.com/csteinmetz1/st-ito/blob/main/LICENSE), current branch; license-text edition January 2004 is not a project-release date | Source uses **Apache-2.0**. The dependency list includes separately licensed components. It does not authorize a score-selected candidate search under Mosh’s current contract. |
| R03 | [Sony FxNorm-Automix LICENSE.md](https://github.com/sony/FxNorm-automix/blob/main/LICENSE.md), copyright **2022** | Code is **MIT**. Weight/data/dependency clearances and M1 runtime remain separate questions. |
| R04 | [Producer Pal limitations](https://producer-pal.org/features/limitations), live documentation; no publication date established | Core device lacks audio analysis, but the same page describes companion coding-agent audio-analysis workflows. No universal “competitor cannot hear” or empty-market conclusion follows. |
| R05 | [Lechler et al., Crowdsourcing MUSHRA Tests](https://arxiv.org/html/2506.00950v1), **June 1, 2025** | Crowd speech-codec study; condition-level Pearson/Spearman comparisons, with around 15/25 responses in the studied platforms. Not a one-producer mix-preference minimum or model-training threshold. |
| R06 | [Ableton: Importing and exporting stems](https://help.ableton.com/hc/en-us/articles/360000843404-Importing-and-exporting-stems), live documentation; no stable date established | Group exports include group treatment; child exports omit it. Keep a deliberate source partition. A rendered group plus its children duplicates content. No universal children-only handoff or nonlinear null claim. |
| R07 | [FFmpeg Filters, ebur128](https://www.ffmpeg.org/ffmpeg-filters.html#ebur128), live documentation; no stable date established | Scanner analyzes audio; momentary and short-term windows differ. Existing UI display rates are not evidence that valid waveform-derived loudness/peak measurements already exist. This is a reference, not an instruction to add FFmpeg. |

These rechecks do **not** establish Mosh’s current runtime behavior, all plugin metadata, hardware performance, or package redistribution clearance. R01–R03 describe upstream source licenses, not the whole application. GPL software is not inherently unshippable; integrating or redistributing it requires an appropriate compliance decision. Hosting a separately installed user plugin is a different scenario from bundling its code/binary. Unverified samples/models remain excluded from a proposed release until their actual terms are checked.

**Evaluation correction:** preserve human preference, absolute usefulness and uncertainty. The prohibition on training in this quarter is a scope decision under the supplied evidence, not a claim that a personal dataset can never be useful. One hidden duplicate cannot justify a validated 80% exclusion rule. A technical diagnostic can test arithmetic/readback; an audio-model’s diagnosis and preference are not automatically code correctness.

**V2 scope:** this is a targeted reconciliation, not a new exhaustive research pass. Existing unresolved claims remain unresolved: M1 timing/singing suitability of untested tools, all code/weight/conversion/adapter/sample terms, actual plugin restore, complete recording recovery, and competitor retention. Do not import a source just because the table uses the word “permissive.”

---

# V1 verification ledger — retained with its original provenance

The following ledger was produced for the previously delivered packet. Its original access-date statement refers to that earlier work; it is not a claim that every W-source was reopened during v2. R-findings above and the v2 handoff govern conflicts. Supplied original research remains unchanged in `sources/`.

# Research synthesis and verification ledger

**Scope:** Claude's supplied research, the owner's clarified recording/mixing pivot, and targeted primary-source checks made September 4, 2026 (America/Los_Angeles). This is an implementation-decision ledger, not an exhaustive market survey or a fresh replication of the cited experiments.

Read with `MOSH_CODEX_PIVOT_HANDOFF.md`. Source originals remain unchanged in `sources/`. In this document **[C]** means the supplied Claude research; **[A]** means the engineering addendum; **[Wxx]** refers to the primary-source index below. An undated documentation page is marked by access date, not assigned an invented publication date. Pin repository commits and checkpoint revisions before using them; the web checks below did not freeze their code.

## A. Corrections that materially affect implementation

| Supplied claim or recommendation | Verified correction / limitation | What Codex should do instead |
|---|---|---|
| ST-ITO is research-only, or its code license remains unknown. | The current ST-ITO repository LICENSE is **Apache-2.0**. That does not license every dependency, effect, dataset or downloaded checkpoint. [W07] | It is a possible research dependency after a complete dependency audit, not automatically barred or automatically cleared. Its optimization procedure still conflicts with the current candidate-selection constraint. |
| FxNorm-Automix license is unknown. | Sony's repository has an **MIT** LICENSE.md. Its README also identifies unavailable original impulse responses and an older environment. [W09] | Do not label the code non-commercial. Do not infer that its entire original experiment can be reproduced or redistributed. |
| Producer Pal is MIT. | The current repository and website identify **GPL-3.0**. [W05] | Reference its architecture; do not copy it into a proprietary distribution under an assumed MIT grant. An older revision needs its own license check. |
| VST3 SDK is necessarily proprietary/GPL dual-licensed. | Steinberg released VST **3.8 under MIT in October 2025**. [W06] | Check Mosh's actual pinned SDK and JUCE/Tracktion licenses; a newer SDK announcement does not retroactively change every dependency. |
| Pedalboard cannot host instruments or accept MIDI. | Its current README documents MIDI-driven instrument rendering as well as effects. The repository is **GPL-3.0**. [W17] | It may be a useful external lab tool, but Mosh already has a host. Do not add another host or assume permissive embedding. |
| Twenty-five labels are approximately enough to trust one item; one listener's data can never train a taste model. | The cited speech-codec study reports aggregate test–retest correlations, not that single-producer claim. MusicRL's 300,000 preferences are a dataset size, not a lower bound for every learning task. [W14–W15] | Keep 25 as the existing process gate. Defer training for lack of a defined task, evidence and need—not an invented statistical impossibility. |
| Export every stem with Return/Main effects enabled. | Live provides that option, but it prints a treatment per exported track. Group and child exports are distinct signals. [W01–W02] | State the rendering boundary. Usually preserve integral source processing, keep remixable parts without Main effects, and retain the original full rough as reference. Validate shared processing rather than assuming it sums back. |
| All named local vocal models are rights-clean and run on M1 Max. | Source licenses do not establish checkpoint/conversion rights, singing suitability or measured M1 performance. The verified denoisers are primarily speech tools. [W18–W20] | Test only a required component, on this hardware and this material. Preserve raw recordings and reversible processing. |
| Build pitch correction/resynthesis in-house next. | [A] already lists pitch-shift and auto-tune built-ins; their quality and availability require audit. Pitch detectors do not themselves implement correction. | Audit existing functionality and lawful owner-hosted plugins before proposing a new engine. |
| CLAP/ST-ITO search is compatible with ear-only acceptance because the owner hears the final winner. | Selecting that winner by an embedding score would still filter candidates before the owner hears them. This conflicts with [B] §5/§9. | No score-driven candidate ranking/search in the initial plan. Any exception needs an explicit contract decision, not different terminology. |
| All Stable Audio components are cleared by one Community License label. | SA3 repository code, model weights, text-encoder terms, conversions and artist adapters are separate layers. The medium card also points to Gemma terms. [W21–W23] | Build an exact artifact/license inventory. Do not infer Emilio's revenue eligibility or adapter rights from the model's availability. |

GPL software is not universally forbidden to distribute or use commercially. It creates obligations that may conflict with the intended distribution. Likewise, non-commercial code, user-owned commercial plugins, paid APIs and permissive libraries are different categories. This ledger is a technical screening aid, not a complete legal clearance.

## B. Findings by the rewritten research asks

### 1. Commercial mixing and mastering assistants

[C] surveys Ozone/Neutron/Nectar, sonible, RoEx, LANDR, Logic and smaller entrants. Its useful common pattern is an assistant-created treatment that remains adjustable, rather than an opaque permanent render. Do not rely on its current version numbers, prices, universal “no free text” statements or claimed absence of competitors without checking the exact product.

Primary checks establish that RoEx publicly offers multitrack mixing and settings JSON, and advertises a commercial offline C++ SDK with macOS support. These are vendor claims; neither API nor SDK was executed here. The portal distinguishes advertised sub-minute mastering from longer mixing turnaround, so those numbers should not be conflated. A settings JSON does not guarantee an identical sound through a different DSP implementation. [W11]

Current iZotope documentation also associates Neutron 5 with Audiolens/reference-target workflows; [C]'s categorical “no reference” description is too broad. [W12–W13]

**Plan change:** use editable treatment + direct macro refinement as the interaction model; consider an external automix result only as a bounded comparison, not a required backend.

**Unverified:** independent producer-retention rates, a complete 2026 competitive census, every listed product's latest semantic controls, and RoEx output quality for Emilio's material. Testimonials, user counts and processed-track counts do not establish retained mixes.

### 2. Automatic mixing and instruction-following effects

**ST-ITO (October 28, 2024 preprint; ISMIR 2024)** uses a learned style representation and inference-time parameter optimization, including non-differentiable effects. Its code is Apache-2.0. This is narrower than an LLM understanding arbitrary mix notes or operating an entire recording session. [W07]

**Text2FX (September 2024 preprint; ICASSP 2025)** demonstrates text-guided EQ/reverb parameter optimization using audio-language embeddings and differentiable processing. A code license grant was not verified in the inspected repository. Paper licensing is not code licensing. [W08; W24]

**FxNorm-Automix (2022)** provides an MIT-licensed automatic-mixing codebase; **Diff-MST (2024)** provides reference-conditioned multitrack mixing research with CC-BY-NC-SA-4.0 code. Neither is a verified turnkey Mosh mixing agent. [W09–W10]

**InstructFX2FX (June 20, 2026; revised July 4)** studies iterative text-to-preset refinement. Its reported improvement on 9/10 descriptor pairs is a DSP-feature distribution metric, not nine human-approved mixes. [W25]

**Plan change:** test a small, audio-informed, reversible proposal against a no-observation baseline before buying into an optimizer architecture.

**Unverified:** M1 Max timings, exact transferable human-preference rates, complete dependency/weight clearances, and evidence that feeding measurements as text improves this agent's mix decisions. No paper here establishes Mosh's full product claim.

### 3. Third-party plugin control and Live handoff

JUCE exposes parameter names, labels, display text, normalized values and state interfaces. Normalized values are not the defect; unidentified parameters and guessed mappings are. Metadata quality varies by plugin. Readable metadata does not prove correct nonlinear units, safe parameter changes or complete restoration. [W03–W04]

Live's export documentation establishes aligned post-fader track exports, optional Return/Main treatment, and distinct group/child outputs. Those operations make a rendered-audio handoff plausible. They do not establish that every exported file should be active in the destination or that independently rendered parts reconstruct shared nonlinear processing. [W01–W02]

**Plan change:** inspect the existing host, expose supported metadata, verify one bounded parameter/state path, and test one explicit audio handoff. Do not build twelve `.als` mappers before this test.

**Unverified:** `.als` state-container compatibility with direct VST state loading; universal AU bypass behavior; complete state restoration in Mosh; shared-sidechain preservation on Emilio's chosen export. Do not promise a null test on nondeterministic plugins or use a mix-quality proxy as an import test.

### 4. Local vocal and recording tools

DeepFilterNet's source is MIT/Apache-2.0 dual-licensed and targets full-band speech enhancement. RNNoise provides a BSD-licensed noise-suppression implementation. Basic Pitch provides Apache-2.0 audio-to-note/pitch detection. These are candidate building blocks, not a complete vocal engineer. [W18–W20]

[C] additionally lists CREPE, RMVPE, Resemble Enhance, VoiceFixer, ARA and commercial tuning/alignment tools. Their exact pinned artifacts, dependencies and M1 behavior were not all re-verified in this synthesis. ARA is an integration interface, not permission to embed another vendor's correction engine. Claims that no vendor offers any developer arrangement were not established exhaustively.

[A] lists existing Mosh auto-tune and pitch-shift capabilities. Their practical quality is a repository/runtime question, not evidence that replacement development is necessary.

**Plan change:** capture/take safety first; audit existing processing second; add cleanup only when a real recording demonstrates a specific need. Avoid default speech enhancement on sung vocals without an audible non-destructive test.

**Unverified:** singing/rap preservation, every checkpoint's redistribution terms, MLX conversion provenance, complete comping/monitoring behavior, and numerical tracking latency on the owner's actual interface. No blanket M1 compatibility guarantee.

### 5. Preference data and listening reliability

The Lechler study (**June 1, 2025**) concerns crowdsourced **speech-codec** MUSHRA evaluation. Its results concern aggregate condition scores and repeat correlations, with 15 or 25 responses under particular recruitment conditions. It does not establish that 25 mix verdicts from Emilio equal a reliable item, nor the report's claimed single-listener ICC inference. [W15]

MusicRL (**February 6, 2024 submission**) used 300,000 pairwise music preferences. That is evidence of one training regime's scale, not proof that smaller personal datasets can never help any model. [W14]

MUSHRA, preference A/B and ABX are not interchangeable. The pivot needs level-controlled preference and absolute usefulness, with a few concealed repeats; it need not pretend to be a standards-compliant codec test. [W16; planning recommendation]

**Plan change:** retain the verdict-row census, real corrections and scoped preference memory. Defer learned taste until a specific task and evidence justify it. Twenty-five remains the contractual infrastructure gate only.

**Unverified:** Emilio's test–retest consistency, a universal minimum preference count for personal mixing, and a published result showing that audio-mix correction diffs outperform verdicts. Label count alone cannot answer these.

### 6. Licensing and distribution

The SA3 repository and model cards verify an available implementation/model family. Repository code carries MIT; the referenced model weights use Stability terms, with additional text-encoder conditions on the medium card. The checkpoint license contains revenue/registration, distribution and usage conditions; “under $1M” is not the entire compliance checklist. [W21–W23]

ACE-Step 1.5's inspected code LICENSE is MIT. The exact weight artifact Emilio would ship was not verified; do not infer its clearance from the repository badge. [W22]

Text2FX's code grant remains unresolved. Diff-MST is non-commercial share-alike; ST-ITO and FxNorm code have permissive grants, with dependency caveats. Producer Pal and pedalboard are GPL. [W05; W07–W10; W17]

**Plan change:** keep owner-installed paid plugins separate from redistribution, preserve existing local generation, and require a pinned code/weights/adapters/sample/license matrix before packaging. Do not commission God Particle replacement DSP or drum generation merely to make the first personal-use test possible.

**Unverified:** the educational kit's full license text and any additional written permissions, artist-album adapter rights, all converted checkpoints, and revenue eligibility. The supplied “educational only” restriction supplies no affirmative distribution clearance; public release must wait for a verified grant or a replacement with appropriate rights.

### 7. DAW-integrated editing agents

Current Producer Pal documentation supports a useful comparison: DAW-state/tool integration can perform genuine session edits, but core limitations include audio understanding and restricted plugin access. Newer companion coding-agent workflows can perform additional analysis outside the core device; therefore “it can never analyze any audio” is too absolute. Its known-issues documentation also qualifies undo grouping. Current license: GPL-3.0. [W05]

[C] lists Ableton-MCP/OSC variants and other DAW agents. Those descriptions are useful leads, not independently reproduced capabilities. Star counts and demos are not retention evidence.

**Plan change:** retain MoshOps and close routing, execution, observation and readback gaps. Benchmark a narrow operation rather than adopting another agent framework or assuming a competing demo proves mixing judgment.

**Unverified:** independent repeated-use statistics, end-to-end audio-aware mix quality, exact comparable command latency, and an exhaustive absence of similar products. No “greenfield” claim is needed for the first personal-use test.

### 8. Generative producer operations — explicitly secondary, not removed

The strongest product evidence is the owner's report of one SA3 result kept in a real beat, plus [A]'s existing local integration—not a broad market comparison. Current SA3 and ACE-Step sources establish relevant generation/editing tool families, but do not establish exact adherence or latency for Mosh's configured paths. [O; A; W21–W22]

Do not promote prompt enhancement into an independently proven quality improvement. InstructFX2FX's effect-parameter experiment is not a text-to-music prompt-enhancement trial. [W25]

**Plan change:** preserve selected-clip generation/re-imagine, prompt visibility, source layers and undo; remove bounded access friction after the recording/mixing path is usable. No composer benchmark or new model is required.

**Unverified:** numeric key/tempo adherence, general prompt-enhancement gains, every adapter's rights, and whether better access causes repeated use. Judge generated parts in their actual musical context.

## C. Primary-source index

**All pages checked September 4, 2026.** “Live documentation” means no stable publication/update date was established. Dates below are publication/version dates only where the source supplies them. URLs are included so this package works outside ChatGPT. No source code or third-party model weights are bundled.

| ID | Primary source and date | Supports / does not establish |
|---|---|---|
| W01 | [Ableton Live 12 manual: Managing Files and Sets](https://www.ableton.com/en/live-manual/12/managing-files-and-sets/) — live documentation, §5.1.3. | Post-fader individual export and Return/Main option; not universal reconstruction of nonlinear buses. |
| W02 | [Ableton: Importing and exporting stems](https://help.ableton.com/hc/en-us/articles/360000843404-Importing-and-exporting-stems) — live documentation. | Alignment/export practices and group/child distinctions. |
| W03 | [JUCE AudioProcessorParameter](https://docs.juce.com/master/classjuce_1_1AudioProcessorParameter.html) — live API documentation. | Names, labels, display text, steps and normalized control. |
| W04 | [JUCE AudioProcessor](https://docs.juce.com/master/classjuce_1_1AudioProcessor.html) — live API documentation. | State and bypass interfaces; not successful restoration in every plugin. |
| W05 | [Producer Pal LICENSE](https://github.com/adamjmurray/producer-pal/blob/main/LICENSE), [limitations](https://producer-pal.org/features/limitations), [known issues](https://producer-pal.org/support/known-issues) — current repository/live documentation. | GPL-3.0; current control, analysis and undo qualifications. |
| W06 | [Steinberg VST 3.8 announcement](https://www.steinberg.net/press/2025/vst-3-8/) — October 2025; [SDK release notice](https://forums.steinberg.net/t/vst-3-8-0-sdk-released/1011988) — October 21, 2025. | SDK move to MIT; not the license of Mosh's pinned dependencies. |
| W07 | [ST-ITO paper](https://arxiv.org/abs/2410.21233) — October 28, 2024; [repository](https://github.com/csteinmetz1/st-ito); [Apache-2.0 LICENSE](https://github.com/csteinmetz1/st-ito/blob/main/LICENSE). | Inference-time effect optimization and source license, not a whole-session product. |
| W08 | [Text2FX paper](https://arxiv.org/abs/2409.18847) — September 2024; [project](https://anniejchu.github.io/text2fx/); [code](https://github.com/anniejchu/text2fx). | Text-guided effects proof of concept; code-license grant not verified. |
| W09 | [Sony FxNorm-Automix](https://github.com/sony/fxnorm-automix), [LICENSE.md](https://github.com/sony/FxNorm-automix/blob/main/LICENSE.md) — ISMIR 2022 work, license copyright 2022. | MIT code; original environment/resource limitations remain. |
| W10 | [Diff-MST repository](https://github.com/sai-soum/Diff-MST) — 2024 work. | Reference-conditioned mixing research, CC-BY-NC-SA-4.0 code. |
| W11 | [RoEx Tonn portal](https://tonn-portal.roexaudio.com/), [SDK](https://tonn-portal.roexaudio.com/sdk), [integration guide](https://tonn-portal.roexaudio.com/sdk/docs/integration-guide) — live vendor documentation. | Advertised settings output, service and commercial offline SDK; not independent quality or adoption. |
| W12 | [iZotope Audiolens support notice](https://support.izotope.com/hc/en-us/articles/35053465905693-Support-Notice-for-Audiolens) — live support documentation. | Reference workflow/Neutron compatibility; also illustrates why old product summaries age. |
| W13 | [Neutron Mix Assistant](https://www.izotope.com/en/products/neutron/features/mix-assistant), [Neutron Elements comparison](https://www.izotope.com/products/neutron-elements) — live vendor documentation. | Assisted adjustment and distinctions in editable controls; not repeat-use evidence. |
| W14 | [MusicRL](https://arxiv.org/abs/2402.04229) — February 6, 2024 submission, ICML 2024. | Published 300,000-pair dataset; no universal minimum sample requirement. |
| W15 | [Lechler et al., Crowdsourcing MUSHRA Tests](https://arxiv.org/html/2506.00950v1) — June 1, 2025. | Speech-codec crowd study and aggregate reliability; not one producer's mix reliability. |
| W16 | [ITU-R BS.1534 recommendation index](https://www.itu.int/rec/R-REC-BS.1534/en) — official recommendation index. | Identity/scope of the MUSHRA standard. No new claim of implementing its full protocol here. |
| W17 | [Spotify pedalboard](https://github.com/spotify/pedalboard) — current repository. | GPL-3.0 and documented MIDI/instrument rendering. |
| W18 | [DeepFilterNet](https://github.com/Rikorose/DeepFilterNet) — current repository. | MIT/Apache-2.0 source and speech-enhancement purpose; no verified M1 singing benchmark. |
| W19 | [RNNoise](https://github.com/xiph/rnnoise) — current repository. | BSD-licensed noise-suppression implementation. |
| W20 | [Spotify Basic Pitch](https://github.com/spotify/basic-pitch) — current repository. | Apache-2.0 pitch/note detection, not correction/resynthesis. |
| W21 | [Stable Audio 3 code](https://github.com/Stability-AI/stable-audio-3), [medium model card](https://huggingface.co/stabilityai/stable-audio-3-medium) — current repository/card. | Current availability, distinct code/model terms and additional text-encoder terms. [C]'s exact launch date was not independently re-established. |
| W22 | [ACE-Step 1.5 code](https://github.com/ace-step/ACE-Step-1.5), [LICENSE](https://github.com/ace-step/ACE-Step-1.5/blob/main/LICENSE) — current repository. | MIT code; exact proposed weight artifact not cleared by this check. |
| W23 | [SA3 medium checkpoint LICENSE.md](https://huggingface.co/stabilityai/stable-audio-3-medium/blob/main/LICENSE.md) — Community License text dated July 5, 2024, referenced by the current checkpoint. | Revenue, registration, use and distribution conditions. License date is not model release date. |
| W24 | [GitHub: Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository) — live documentation. | Public code availability is not itself a reuse license. |
| W25 | [InstructFX2FX](https://arxiv.org/abs/2606.22005) — v1 June 20, 2026; v3 July 4, 2026. | Preliminary iterative text-to-preset result; feature metric is not a listening win rate. |

## D. What remains a repository or experiment question

No source above proves that Mosh can safely record a take, restore an external plugin, transfer Emilio's rough correctly, or make a mix he prefers. Those require the current-SHA audit and the bounded tests in the handoff.

Do not turn the research inventory into a dependency shopping list. First identify the missing capability on a real song. Then choose the smallest eligible change, record its license and actual hardware behavior, and judge the result through the existing correction loop.
