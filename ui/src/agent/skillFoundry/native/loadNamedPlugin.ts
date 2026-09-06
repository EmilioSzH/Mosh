// Skill Foundry Slice B, Task 5 — the native `load-named-plugin` handler (canonical id
// "load-named-plugin", handlerKey "loadNamedPluginV1", legacy alias "load_named_plugin").
//
// Migrates the proven resolution logic out of the legacy `studioSkills.ts`
// (`LOAD_NAMED_PLUGIN_SKILL`) onto the SAME atomic-executor discipline
// `explicitBalance.ts` established: `runAtomicSkillPlanV1`, never a bare `exec`, with a
// two-checkpoint guard (project epoch, target track existence, source status) and an
// exact postcondition. The catalog parser, the utterance query regex, the choice
// labeling, and `resolvePluginMatch` (pluginBrowserUtil.ts) are UNCHANGED behavior,
// just relocated here; `studioSkills.ts` keeps its own copy until Slice B's Task 7
// retires it as a routing path (this module does not delete that file).
//
// Bounded catalog cap: 4096 (step-1 brief, slice 2, 2026-09-05). Slice B Task 5 had
// tightened it to 64, and the owner machine's `list_plugins` result has 1,198 entries —
// every "add a …" ask was blocked as "invalid or oversized data" before it could fall
// through to the router (MOSHI-EDIT-PROBE-2026-09-04 seq 286). There is no engine
// paging (`cmdListPlugins` takes no arguments), so this UI constant is the only bound;
// the per-field length cap (1024 UTF-16 code units) is unchanged. In the same slice,
// an add/insert/put ask with NO catalog match answers `unsupported` (the runtime's
// own no-match shape) so AgentComposer proceeds to the router; "load X" with no match
// keeps `missing_target` — a producer who says "load" means a plug-in.
//
// Repair after the slice-2 audit (2026-09-05): (1) for add/insert/put the catalog match
// is resolved BEFORE the selected-track guard — with nothing selected, "add a counter
// phrase" used to stop at "Select the track…" (studio_skill_blocked) and never reach the
// router; now no match ⇒ `unsupported` regardless of selection, and only a claimed match
// with no selection earns the select-a-track guidance. "load X" keeps its guard-first
// order. (2) Raising the cap made `resolvePluginMatch`'s rank-3 substring test live
// against 1,198 installed names, so a single common part word ("add a harmony" → Waves
// Harmony Mono) was claimed and a load transaction opened; under add/insert/put such a
// query only claims an exact or prefix match (`PART_WORD_QUERY_V1`). "load X" is
// unchanged either way.

import type { AvailablePlugin, Snapshot } from "../../../types";
import { addPluginRecent, installedEntry, resolvePluginMatch, type PluginEntry } from "../../../ui/pluginBrowserUtil";
import type { SkillCheck } from "../../skills";
import {
  runAtomicSkillPlanV1,
  type AtomicSkillGuardContextV1,
  type AtomicSkillGuardPhaseV1,
  type AtomicSkillPlanDepsV1,
  type AtomicSkillPlanV1,
} from "../atomicPlan";
import { createContinuationStoreV1 } from "../continuations";
import type {
  ContinuationChoiceValueV1,
  ContinuationPayloadV1,
  ContinuationStoreV1,
  NativeSkillHandlerV1,
  NativeSkillPayloadV1,
  ResolvedTargetIdentityV1,
  SkillChoiceV1,
  SkillOutcomeV1,
  SkillReasonCodeV1,
  StudioSkillEnvironmentV1,
} from "../contracts";

const MAX_PLUGIN_CATALOG_V1 = 4_096;
const MAX_PLUGIN_FIELD_LENGTH_V1 = 1_024;

type PluginVerbV1 = "load" | "add" | "insert" | "put";

// Common part words a producer says after add/insert/put when asking for MUSIC, not a
// plug-in. Matched against the normalized query (below), singular or plural. Under those
// verbs such a query never claims a plug-in through the substring rank — only an exact or
// prefix match counts — because with a real 1,198-entry catalog almost every one of these
// words sits inside some installed plug-in's name.
const PART_WORD_QUERY_V1 =
  /^(?:(?:counter )?(?:phrases?|melod(?:y|ies)|harmon(?:y|ies))|hooks?|riffs?|fills?|bass ?lines?|chords?|layers?|parts?)$/;

// Mirrors pluginBrowserUtil.ts's private `normalizePluginText` (NFKD, lower-case, runs of
// non-alphanumerics collapsed to one space) so the prefix test below sees the same text
// `resolvePluginMatch` ranks. Kept local: that module is outside this slice's file map.
const normalizePluginTextV1 = (value: string): string =>
  value.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

function isPartWordQueryV1(query: string): boolean {
  return PART_WORD_QUERY_V1.test(normalizePluginTextV1(query));
}

// The entries `resolvePluginMatch` would rank 0–2 (exact name, exact vendor+name, or a
// prefix of either ordering); everything it could only reach through its rank-3
// `includes` test is dropped. Ranking the filtered set is therefore identical to ranking
// the full set whenever an exact/prefix entry exists, and "none" when only substring
// entries did.
function exactOrPrefixEntriesV1(entries: readonly PluginEntry[], rawQuery: string): readonly PluginEntry[] {
  const query = normalizePluginTextV1(rawQuery);
  if (!query) return [];
  return entries.filter((entry) => {
    const name = normalizePluginTextV1(entry.name);
    const vendor = normalizePluginTextV1(entry.vendor);
    return name.startsWith(query)
      || `${vendor} ${name}`.trim().startsWith(query)
      || `${name} ${vendor}`.trim().startsWith(query);
  });
}

const LOAD_PLUGIN_UTTERANCE_V1 =
  /^(?:(?:can|could|would|will)\s+you\s+|please\s+|hey\s+moshi[, ]+)*(load|add|insert|put)\s+(?:(?:the|a)\s+)?(?:plugin\s+)?(.+?)(?:\s+(?:on|onto)\s+(?:the\s+)?(?:selected|current|this)\s+track)?[?!.]*$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function detail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parsePlugin(value: unknown): AvailablePlugin | null {
  if (!isRecord(value)) return null;
  const { id, name, format, manufacturer, isInstrument } = value;
  if (typeof id !== "string" || typeof name !== "string" || typeof format !== "string"
    || typeof manufacturer !== "string" || typeof isInstrument !== "boolean") return null;
  if (!id || !name || id.length > MAX_PLUGIN_FIELD_LENGTH_V1 || name.length > MAX_PLUGIN_FIELD_LENGTH_V1
    || format.length > MAX_PLUGIN_FIELD_LENGTH_V1 || manufacturer.length > MAX_PLUGIN_FIELD_LENGTH_V1) return null;
  return { id, name, format, manufacturer, isInstrument };
}

export function parsePluginCatalogV1(data: unknown): readonly PluginEntry[] | null {
  if (!isRecord(data) || !Array.isArray(data.plugins) || data.plugins.length > MAX_PLUGIN_CATALOG_V1) return null;
  const entries: PluginEntry[] = [];
  for (const raw of data.plugins) {
    const plugin = parsePlugin(raw);
    if (!plugin) return null;
    entries.push(installedEntry(plugin));
  }
  return entries;
}

function parsePluginUtteranceV1(utterance: string): { readonly verb: PluginVerbV1; readonly query: string } | null {
  const match = utterance.trim().match(LOAD_PLUGIN_UTTERANCE_V1);
  const verb = match?.[1]?.toLowerCase() as PluginVerbV1 | undefined;
  const query = match?.[2]?.trim();
  // "add" is shared producer language. Do not claim obvious timeline/MIDI
  // creation asks and then fail while reading the installed plug-in catalog.
  // Actual plug-in names containing these words remain available through the
  // explicit "load plugin <name>" form.
  if (query && /\b(?:test\s+tone|midi\s+clip|audio\s+clip|clip|notes?)\b/i.test(query)
    && !/\bplugin\b/i.test(utterance)) return null;
  return verb && query ? { verb, query } : null;
}

export function pluginQueryV1(utterance: string): string | null {
  return parsePluginUtteranceV1(utterance)?.query ?? null;
}

type PluginChoiceV1 = { readonly label: string; readonly entry: PluginEntry };

function pluginChoicesV1(entries: readonly PluginEntry[]): readonly PluginChoiceV1[] {
  const baseLabels = entries.map((entry) => `${entry.name} — ${entry.meta}`);
  const totals = new Map<string, number>();
  for (const label of baseLabels) totals.set(label, (totals.get(label) ?? 0) + 1);
  const seen = new Map<string, number>();
  return entries.map((entry, index) => {
    const base = baseLabels[index] ?? entry.name;
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    return { entry, label: (totals.get(base) ?? 0) > 1 ? `${base} (${occurrence})` : base };
  });
}

function numberedChoicesV1(choices: readonly PluginChoiceV1[]): string {
  return choices.map((choice, index) => `${index + 1}. ${choice.label}`).join("; ");
}

async function observePluginsV1(environment: StudioSkillEnvironmentV1): Promise<{ ok: true; value: readonly PluginEntry[] } | { ok: false; reason: string }> {
  let result;
  try {
    result = await environment.exec("list_plugins", {});
  } catch (error) {
    return { ok: false, reason: `list_plugins transport failed: ${detail(error)}` };
  }
  if (!result.ok) return { ok: false, reason: result.error ?? "the plug-in catalog could not be read" };
  const plugins = parsePluginCatalogV1(result.data);
  if (!plugins) return { ok: false, reason: "the plug-in catalog returned invalid or oversized data" };
  return { ok: true, value: plugins };
}

// ---------------------------------------------------------------------------------------
// Source-status snapshot — identical discipline to explicitBalance.ts.
// ---------------------------------------------------------------------------------------

type SourceStatusSnapshotV1 = { readonly generation: number; readonly digest: string };

async function readSourceStatusSnapshotV1(environment: StudioSkillEnvironmentV1): Promise<SourceStatusSnapshotV1 | null> {
  let read;
  try {
    read = await environment.readSourceStatus();
  } catch {
    return null;
  }
  if (!read.ok) return null;
  if (read.statusIndex === null) return { generation: 0, digest: "" };
  let generation = 0;
  try {
    const parsed: unknown = JSON.parse(read.statusIndex.utf8);
    if (isRecord(parsed) && typeof parsed.generation === "number") generation = parsed.generation;
  } catch {
    return null;
  }
  return { generation, digest: read.statusIndex.sha256 };
}

// ---------------------------------------------------------------------------------------
// Private continuation store — this handler's only user (mirrors explicitBalance.ts).
// ---------------------------------------------------------------------------------------

const loadNamedPluginContinuations: ContinuationStoreV1 = createContinuationStoreV1();

export function clearLoadNamedPluginContinuationsV1(): void {
  loadNamedPluginContinuations.clear();
}

// ---------------------------------------------------------------------------------------
// Postcondition: the target track's matching-catalogId count increases by exactly one;
// every OTHER track's matching count is unchanged.
// ---------------------------------------------------------------------------------------

function countMatchingPlugins(snapshot: Snapshot, trackId: string, catalogId: string): number {
  const track = snapshot.tracks.find((candidate) => candidate.id === trackId);
  if (!track) return 0;
  return (track.plugins ?? []).filter((plugin) => plugin.catalogId === catalogId).length;
}

function verifyPluginAddedOnceV1(before: Snapshot, after: Snapshot, trackId: string, catalogId: string): SkillCheck {
  for (const track of after.tracks) {
    const beforeCount = countMatchingPlugins(before, track.id, catalogId);
    const afterCount = countMatchingPlugins(after, track.id, catalogId);
    const expected = track.id === trackId ? beforeCount + 1 : beforeCount;
    if (afterCount !== expected) {
      return { ok: false, reason: `track ${track.id} matching-plugin count changed unexpectedly (${beforeCount} -> ${afterCount}, expected ${expected})` };
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------------------
// Blocked-outcome helper + instrument/audio mismatch guidance
// ---------------------------------------------------------------------------------------

function blocked(payload: NativeSkillPayloadV1, code: SkillReasonCodeV1, say: string): SkillOutcomeV1 {
  return { kind: "blocked", skill: payload.id, version: payload.version, code, say, unserved: true };
}

// The selected-track guard as a value, so the handler can decide WHEN to apply it (before
// the catalog read for "load", after the match for add/insert/put) without duplicating
// the guidance text.
type SelectedTrackV1 =
  | { readonly ok: true; readonly track: { readonly id: string; readonly name: string } }
  | { readonly ok: false; readonly outcome: SkillOutcomeV1 };

function selectedTrackV1(payload: NativeSkillPayloadV1, context: ReturnType<StudioSkillEnvironmentV1["context"]>): SelectedTrackV1 {
  if (!context.selectedTrackId) {
    return { ok: false, outcome: blocked(payload, "missing_target", "Select the track you want me to load it on.") };
  }
  const track = context.tracks.find((candidate) => candidate.id === context.selectedTrackId);
  if (!track) return { ok: false, outcome: blocked(payload, "stale_context", "That selected track is no longer available.") };
  return { ok: true, track };
}

function mismatchGuidance(error: string): string {
  return /instrument.*audio|audio.*instrument/i.test(error)
    ? "select or create an instrument track and try again"
    : error;
}

function defaultNewId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch { /* fall through */ }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------------------
// Atomic execution of one load_plugin(trackId, pluginId) command.
// ---------------------------------------------------------------------------------------

async function runAtomicLoadV1(
  payload: NativeSkillPayloadV1,
  environment: StudioSkillEnvironmentV1,
  before: Snapshot,
  trackId: string,
  entry: PluginEntry,
  epochAtStart: number,
  sourceAtStart: SourceStatusSnapshotV1,
): Promise<SkillOutcomeV1> {
  const newId = environment.newId ?? defaultNewId;
  const transactionId = newId();
  const requestId = newId();
  const catalogId = entry.loadKey;
  const steps = [{ call: { command: "load_plugin", args: { trackId, pluginId: catalogId } }, meta: { transactionId, requestId, index: 0 } }];
  const transaction = { transactionId, name: payload.id, manifest: [{ index: 0, requestId, command: "load_plugin" }], steps };

  let reasonCode: SkillReasonCodeV1 | null = null;

  const guard: AtomicSkillPlanDepsV1["guard"] = async (
    _phase: AtomicSkillGuardPhaseV1,
    context: AtomicSkillGuardContextV1,
  ) => {
    if (environment.context().projectEpoch !== epochAtStart) {
      reasonCode = "manifest_stale";
      return { ok: false, reason: "the project changed" };
    }
    const snap = context.after ?? context.before;
    if (!snap.tracks.some((track) => track.id === trackId)) {
      reasonCode = "stale_context";
      return { ok: false, reason: `track ${trackId} no longer exists` };
    }
    const source = await readSourceStatusSnapshotV1(environment);
    if (!source) {
      reasonCode = "observation_failed";
      return { ok: false, reason: "could not verify source status" };
    }
    if (source.generation !== sourceAtStart.generation || source.digest !== sourceAtStart.digest) {
      reasonCode = "manifest_stale";
      return { ok: false, reason: "source status changed" };
    }
    return { ok: true };
  };

  const plan: AtomicSkillPlanV1 = {
    skill: payload.id,
    version: payload.version,
    slots: { trackId, pluginId: catalogId },
    before,
    transaction,
    verifyPostcondition: (_before, after) => verifyPluginAddedOnceV1(before, after, trackId, catalogId),
  };

  const result = await runAtomicSkillPlanV1(plan, { snapshot: environment.snapshot, exec: environment.exec, guard });

  if (result.ok) {
    addPluginRecent(entry.uid);
    return { kind: "completed", skill: payload.id, version: payload.version, say: payload.responses.completed, changes: null };
  }

  const unserved = result.outcome === "no_edit";
  let code: SkillReasonCodeV1;
  if (reasonCode) code = reasonCode;
  else if (result.outcome === "needs_recovery") code = "rollback_failed";
  else if (result.stage === "postcondition") code = "postcondition_failed";
  else code = "command_failed";

  // A command_failed (the load_plugin call itself was refused, e.g. an instrument
  // plug-in on a plain audio track) gets producer-facing guidance derived from the
  // engine's own refusal text — every other reason keeps the payload's generic blocked
  // response.
  const say = code === "command_failed" ? mismatchGuidance(result.reason) : payload.responses.blocked;
  return { kind: "blocked", skill: payload.id, version: payload.version, code, say, unserved };
}

// ---------------------------------------------------------------------------------------
// Continuation issue/resume (mirrors explicitBalance.ts's real-clock discipline)
// ---------------------------------------------------------------------------------------

function matchChoiceReply(reply: string, choices: readonly ContinuationChoiceValueV1[], entries: readonly PluginEntry[]): string | null {
  const normalized = reply.trim().toLowerCase();
  const numbered = normalized.match(/^(?:option\s+)?([1-5])$/)?.[1];
  if (numbered) return choices[Number(numbered) - 1]?.value as string ?? null;
  const exact = choices.find((choice) => choice.id.toLowerCase() === normalized || choice.label.toLowerCase() === normalized);
  if (exact) return exact.value as string;
  const fuzzy = resolvePluginMatch(entries, reply);
  return fuzzy.kind === "unique" ? fuzzy.entry.loadKey : null;
}

async function issueChoiceV1(
  payload: NativeSkillPayloadV1,
  environment: StudioSkillEnvironmentV1,
  choices: readonly PluginChoiceV1[],
  trackId: string,
): Promise<SkillOutcomeV1> {
  const nowMs = Date.now();
  const candidates: ContinuationChoiceValueV1[] = choices.map((choice, index) => ({
    id: String(index + 1), label: choice.label, value: choice.entry.loadKey,
  }));
  const targetIdentities: readonly ResolvedTargetIdentityV1[] = [{ role: "trackId", entityKind: "track", entityId: trackId }];
  const payloadRecord: ContinuationPayloadV1 = {
    skillId: payload.id, version: payload.version, artifactSha256: payload.compatibility.nativeSourceSha256,
    choices: candidates, targetIdentities, projectEpoch: environment.context().projectEpoch,
    registryGeneration: 0, sourceStatusGeneration: 0, createdAtMs: nowMs, expiresAtMs: nowMs + 600_000,
    attempts: 0, pendingKind: "choice", pendingSlot: "pluginName", choiceReason: "ambiguity",
  };
  const issued = loadNamedPluginContinuations.issue(payloadRecord);
  if (!issued.ok) return blocked(payload, "provider_unavailable", payload.responses.blocked);
  const options: readonly SkillChoiceV1[] = candidates.map((choice) => ({ id: choice.id, label: choice.label }));
  return {
    kind: "needs_choice", skill: payload.id, version: payload.version,
    say: `choose 1–${choices.length}: ${numberedChoicesV1(choices)}`,
    options, continuationToken: issued.token,
  };
}

// ---------------------------------------------------------------------------------------
// Handler entry point
// ---------------------------------------------------------------------------------------

export const loadNamedPluginV1: NativeSkillHandlerV1 = async ({ payload, environment, utterance, slots, continuationToken }) => {
  if (continuationToken) {
    const taken = loadNamedPluginContinuations.take(continuationToken, Date.now());
    if (!taken.ok) return blocked(payload, "stale_context", "That choice has expired — ask again.");
    if (taken.payload.skillId !== payload.id || taken.payload.artifactSha256 !== payload.compatibility.nativeSourceSha256) {
      return blocked(payload, "stale_context", "That choice is no longer valid — ask again.");
    }
    if (environment.context().projectEpoch !== taken.payload.projectEpoch) {
      return blocked(payload, "stale_context", "The project changed — ask again.");
    }
    const trackId = taken.payload.targetIdentities[0]?.entityId;
    if (!trackId || environment.context().selectedTrackId !== trackId) {
      return blocked(payload, "stale_context", "The selected track changed — ask again.");
    }

    // Re-read list_plugins on resume — the chosen catalog id must remain loadable.
    const observed = await observePluginsV1(environment);
    if (!observed.ok) return blocked(payload, "observation_failed", observed.reason);
    const replyText = typeof slots.reply === "string" ? slots.reply : utterance;
    const catalogId = matchChoiceReply(replyText, taken.payload.choices, observed.value);
    if (!catalogId) {
      return blocked(payload, "invalid_slot", `choose 1–${taken.payload.choices.length}`);
    }
    const entry = observed.value.find((candidate) => candidate.loadKey === catalogId);
    if (!entry) return blocked(payload, "stale_context", "That plug-in is no longer available — rescan and try again.");

    let before: Snapshot;
    try {
      before = await environment.snapshot();
    } catch (error) {
      return blocked(payload, "observation_failed", `Could not read session state: ${detail(error)}.`);
    }
    const sourceAtStart = await readSourceStatusSnapshotV1(environment);
    if (!sourceAtStart) return blocked(payload, "observation_failed", "Could not verify source status.");
    return runAtomicLoadV1(payload, environment, before, trackId, entry, taken.payload.projectEpoch, sourceAtStart);
  }

  // Certified matchers may prefill a broad `pluginName` slot for any leading
  // "add" request. Revalidate the original utterance before trusting that slot,
  // otherwise clip/note creation is stolen before the producer brain can see it.
  const parsed = parsePluginUtteranceV1(utterance);
  if (!parsed) return blocked(payload, "unsupported_intent", payload.responses.blocked);
  const query = typeof slots.pluginName === "string" && slots.pluginName.length > 0
    ? slots.pluginName
    : parsed.query;

  const initial = environment.context();
  const epochAtStart = initial.projectEpoch;
  const selected = selectedTrackV1(payload, initial);
  // "load X" is unambiguous producer language for a plug-in, so its selection guard runs
  // first, before any catalog read (unchanged). For add/insert/put the CATALOG decides
  // whether this is a plug-in ask at all, so the match is resolved before the guard:
  // "add a counter phrase" with nothing selected must still fall through to the router,
  // and only a claimed match with no selection earns the select-a-track guidance.
  if (parsed.verb === "load" && !selected.ok) return selected.outcome;

  const observed = await observePluginsV1(environment);
  if (!observed.ok) return blocked(payload, "observation_failed", observed.reason);
  if (environment.context().projectEpoch !== epochAtStart) {
    return blocked(payload, "stale_context", "The project changed while I was finding that plug-in — try again.");
  }

  // Under add/insert/put a common part word ("harmony", "hook", "fill", …) may only claim
  // an exact or prefix match — never the substring rank, which with a real catalog would
  // hand "add a harmony" to Waves Harmony Mono. "load X" keeps the full ranking.
  const candidates = parsed.verb !== "load" && isPartWordQueryV1(query)
    ? exactOrPrefixEntriesV1(observed.value, query)
    : observed.value;
  const match = resolvePluginMatch(candidates, query);
  if (match.kind === "none") {
    // Step-1 brief, slice 2: "add/insert/put <X>" with nothing in the catalog called X
    // is most likely not a plug-in ask at all ("add a counter phrase"). Answer with the
    // runtime's own no-match shape — the ONE outcome AgentComposer's finishSkillOutcome
    // declines to handle — so the turn proceeds to the router instead of ending as
    // studio_skill_blocked. Nothing was mutated (reads only, no transaction opened).
    if (parsed.verb !== "load") return { kind: "unsupported", code: "no_match", say: "I can't do that reliably yet." };
    return blocked(payload, "missing_target", `I couldn't find ${query} — open Plug-in Manager or rescan, then try again.`);
  }
  // The catalog claimed the ask: from here a target is required, and a choice is never
  // issued without one (its continuation binds to the track).
  if (!selected.ok) return selected.outcome;
  if (match.kind === "ambiguous") {
    const choices = pluginChoicesV1(match.entries);
    return issueChoiceV1(payload, environment, choices, selected.track.id);
  }

  // `before` is read once the load is actually going ahead — the same point the
  // continuation-resume path above takes it (after the catalog read).
  let before: Snapshot;
  try {
    before = await environment.snapshot();
  } catch (error) {
    return blocked(payload, "observation_failed", `Could not read session state: ${detail(error)}.`);
  }
  const sourceAtStart = await readSourceStatusSnapshotV1(environment);
  if (!sourceAtStart) return blocked(payload, "observation_failed", "Could not verify source status.");
  return runAtomicLoadV1(payload, environment, before, selected.track.id, match.entry, epochAtStart, sourceAtStart);
};
