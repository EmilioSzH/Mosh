// Skill Foundry Slice B, Task 4 — the native `explicit-balance` handler (canonical id
// "explicit-balance", handlerKey "explicitBalanceV1").
//
// Owns the EXPLICIT balance mutations — set_level, mute, unmute, solo, and (step-1 slice 5,
// "Deterministic balance") adjust_level, send_level, repeat_last — over a single track
// resolved either from the current selection or by name. Name resolution is layered: the
// exact resolver first (primitives.ts's `runResolverV1`/`track_by_unique_name`, the SAME
// resolver an owner-local manifest would use — this module does not re-derive it), then a
// SPOKEN-LANGUAGE layer on top of it for what people actually type at a composer: a leading
// article/possessive and a trailing "track" are dropped ("the vocal" → Vocal), a plural is
// singularized ("the vocals" → vocal), and a whole-word match over the track names is the
// last resort ("vocal" → Vocal AND "Vocal 2"). Anything that leaves more than one candidate
// is a QUESTION (a single-use continuation from the private, module-scoped
// `ContinuationStoreV1` — this journey's only continuation traffic), never a guess: the
// independent audit (F1) caught the loop silently picking "Vocal" over "Vocal 2".
//
// Every mutation runs through `atomicPlan.ts`'s `runAtomicSkillPlanV1` — never the legacy
// static-catalog `runSkill` — with a real `guard(phase, context)` that re-checks project
// epoch, target existence, and source status on BOTH the before_begin and before_commit
// checkpoints (spec 8.5's two-guard protocol).
//
// A send move NEVER creates a send: "more reverb on the drums" with no Drums→Reverb send is
// blocked with a sentence saying to add one (audit F3 caught the loop auto-creating a send
// plus a reverb plug-in). "another N dB" binds to the last COMPLETED relative move in this
// project epoch within ten minutes, else it asks which track (audit F2).
//
// Vague requests ("mix this", "make it sound professional") are UNSUPPORTED, not
// misinterpreted as an explicit level: this module only ever recognizes a REQUIRED,
// already-validated numeric `db` slot for a level or a delta, and boolean intent for
// mute/unmute/solo — there is no fuzzy taste inference here to weaken.

import type { Bus, Snapshot, Track } from "../../../types";
import { trackVolumeReachedV1 } from "../../skills";
import type { SkillCheck } from "../../skills";
import {
  runAtomicSkillPlanV1,
  type AtomicSkillGuardContextV1,
  type AtomicSkillGuardPhaseV1,
  type AtomicSkillPlanDepsV1,
  type AtomicSkillPlanV1,
} from "../atomicPlan";
import { createContinuationStoreV1 } from "../continuations";
import { runResolverV1 } from "../primitives";
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
  SlotValueV1,
  StudioSkillEnvironmentV1,
} from "../contracts";
import { matchExplicitBalanceUtteranceV1 } from "./matchers";

export type ExplicitBalanceActionV1 = "set_level" | "adjust_level" | "send_level" | "repeat_last" | "mute" | "unmute" | "solo";

const ACTIONS_V1: readonly string[] = ["set_level", "adjust_level", "send_level", "repeat_last", "mute", "unmute", "solo"];

/** One fully-described balance ask. `db` follows the matcher's convention (absolute level for
 *  set_level / absolute sends, the SIGNED delta for adjust_level / relative sends, the unsigned
 *  amount for repeat_last). `busNumber` is set only when the bus is already known by number
 *  (a repeat of a send move) and short-circuits the spoken-word bus resolution. */
type BalanceRequestV1 = {
  readonly action: ExplicitBalanceActionV1;
  readonly db?: number;
  readonly trackName?: string;
  readonly bus?: string;
  readonly busNumber?: number;
  readonly mode?: "absolute" | "relative";
  /** A relative send move whose amount the ask never named — the ±3 dB default is spoken. */
  readonly defaulted?: boolean;
};

const FADER_MIN_DB = -60;
const FADER_MAX_DB = 6;
const SEND_TOLERANCE_DB = 0.05;
const REPEAT_TTL_MS = 600_000;

function detail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function blocked(payload: NativeSkillPayloadV1, code: SkillReasonCodeV1, say: string): SkillOutcomeV1 {
  return { kind: "blocked", skill: payload.id, version: payload.version, code, say, unserved: true };
}

/** Two-decimal dB with a real minus sign, the way the say lines read: "−13", "0", "6". */
function roundDb(value: number): number {
  return Math.round(value * 100) / 100;
}
function fmtDb(value: number): string {
  const rounded = roundDb(value);
  if (Math.abs(rounded) < 0.005) return "0";
  return rounded < 0 ? `−${Math.abs(rounded)}` : String(rounded);
}
function fmtSigned(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : `+${value}`;
}
const clampFader = (value: number): number => Math.min(FADER_MAX_DB, Math.max(FADER_MIN_DB, value));
const inFaderRange = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= FADER_MIN_DB && value <= FADER_MAX_DB;

// ---------------------------------------------------------------------------------------
// Source-status snapshot (generation + digest), read once before planning and re-read by
// both guard checkpoints.
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
// Private continuation store — this handler's only user. A fresh store per module
// instance (matches Slice A's own doc comment: "a fresh store is created per skill
// runtime and cleared on project replacement or registry regeneration").
// ---------------------------------------------------------------------------------------

const explicitBalanceContinuations: ContinuationStoreV1 = createContinuationStoreV1();

/** Step-1 slice 5 — the last COMPLETED relative move ("another 3 dB" repeats it). Bound to
 *  the project epoch it was made in and to a ten-minute window; an absolute set never seeds
 *  it (there is no direction to repeat). */
type LastMoveV1 = {
  readonly trackId: string;
  readonly bus?: number;
  readonly direction: 1 | -1;
  readonly delta: number;
  readonly projectEpoch: number;
  readonly expiresAtMs: number;
};
let lastMove: LastMoveV1 | null = null;

/** Exposed for the runtime (Task 6/7) to clear alongside every other continuation store
 *  on project replacement — mirrors `clearStudioSkillContinuations()`'s own purpose. Also
 *  forgets the last relative move: "another 3 dB" must not cross a project replacement. */
export function clearExplicitBalanceContinuationsV1(): void {
  explicitBalanceContinuations.clear();
  pendingRequestByToken.clear();
  lastMove = null;
}

const nowMsOf = (environment: StudioSkillEnvironmentV1): number => environment.nowMs?.() ?? Date.now();

// ---------------------------------------------------------------------------------------
// Target resolution — the exact resolver, then the spoken-language layer described above.
// ---------------------------------------------------------------------------------------

type TargetResolutionV1 =
  | { readonly kind: "resolved"; readonly trackId: string }
  | { readonly kind: "needs_choice"; readonly candidates: readonly ContinuationChoiceValueV1[] }
  | { readonly kind: "missing_target" }
  | { readonly kind: "ambiguous_target"; readonly count: number }
  | { readonly kind: "observation_failed"; readonly reason: string };

const MAX_CHOICES_V1 = 5;

function normalizeSpokenV1(text: string): string {
  return text.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

/** "the vocal" → "vocal", "my drums track" → "drums": a leading article/possessive and a
 *  trailing "track" are spoken framing, not part of the name. */
function spokenNeedleV1(name: string): string {
  return normalizeSpokenV1(name).replace(/^(?:the|a|an|my|our)\s+/, "").replace(/\s+track$/, "").trim();
}

function nameWordsV1(name: string): string[] {
  return normalizeSpokenV1(name).split(/[^a-z0-9]+/).filter((word) => word.length > 0);
}

function hasWholeWordRunV1(words: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > words.length) return false;
  for (let start = 0; start + needle.length <= words.length; start += 1) {
    if (needle.every((word, offset) => words[start + offset] === word)) return true;
  }
  return false;
}

/** "vocals" → "vocal"; never "bass" → "bas". */
function singularizedV1(words: readonly string[]): readonly string[] | null {
  const last = words[words.length - 1];
  if (!last || last.length <= 3 || !last.endsWith("s") || last.endsWith("ss")) return null;
  return [...words.slice(0, -1), last.slice(0, -1)];
}

function bucketV1(candidates: readonly Track[]): TargetResolutionV1 {
  if (candidates.length === 0) return { kind: "missing_target" };
  if (candidates.length === 1) return { kind: "resolved", trackId: candidates[0]!.id };
  if (candidates.length > MAX_CHOICES_V1) return { kind: "ambiguous_target", count: candidates.length };
  return {
    kind: "needs_choice",
    candidates: candidates.map((track, index) => ({ id: String(index + 1), label: track.name, value: track.id })),
  };
}

function fromResolverOutcomeV1(outcome: Awaited<ReturnType<typeof runResolverV1>>): TargetResolutionV1 | null {
  if (outcome.kind === "resolved") return { kind: "resolved", trackId: outcome.entityId };
  if (outcome.kind === "none") return null;
  if (outcome.kind === "too_many") return { kind: "ambiguous_target", count: outcome.count };
  if (outcome.kind === "failed") return { kind: "observation_failed", reason: outcome.reason };
  // "choices" — bounded (<=5 by construction, runResolverV1's own cap) ambiguity.
  const candidates: ContinuationChoiceValueV1[] = outcome.candidates.map((candidate, index) => ({
    id: String(index + 1), label: candidate.label, value: candidate.entityId,
  }));
  return { kind: "needs_choice", candidates };
}

async function resolveTargetV1(
  before: Snapshot,
  environment: StudioSkillEnvironmentV1,
  trackName: string | undefined,
): Promise<TargetResolutionV1> {
  const context = environment.context();
  if (!trackName) {
    const selected = await runResolverV1("selected_track", {}, before, context, environment, MAX_CHOICES_V1);
    return fromResolverOutcomeV1(selected) ?? { kind: "missing_target" };
  }

  // 1. The exact resolver, on the name as spoken.
  const exact = fromResolverOutcomeV1(await runResolverV1("track_by_unique_name", { name: trackName }, before, context, environment, MAX_CHOICES_V1));
  if (exact) return exact;

  // 2. The exact resolver again, with the spoken framing dropped ("the vocal" → "vocal").
  const needle = spokenNeedleV1(trackName);
  if (needle.length === 0) return { kind: "missing_target" };
  if (needle !== normalizeSpokenV1(trackName)) {
    const stripped = fromResolverOutcomeV1(await runResolverV1("track_by_unique_name", { name: needle }, before, context, environment, MAX_CHOICES_V1));
    if (stripped) return stripped;
  }

  // 3. A whole-word run over the track names, then its singular ("vocals" → "vocal"). More
  //    than one hit is a question, never a pick.
  const needleWords = nameWordsV1(needle);
  const tracks = before.tracks.filter((track) => !track.isReturn);
  const byWords = (words: readonly string[]): Track[] => tracks.filter((track) => hasWholeWordRunV1(nameWordsV1(track.name), words));
  let candidates = byWords(needleWords);
  if (candidates.length === 0) {
    const singular = singularizedV1(needleWords);
    if (singular) candidates = byWords(singular);
  }
  if (candidates.length === 0) candidates = before.tracks.filter((track) => track.isReturn && hasWholeWordRunV1(nameWordsV1(track.name), needleWords));
  return bucketV1(candidates);
}

function reasonFromTargetResolution(
  payload: NativeSkillPayloadV1,
  resolution: Exclude<TargetResolutionV1, { kind: "resolved" } | { kind: "needs_choice" }>,
): SkillOutcomeV1 {
  switch (resolution.kind) {
    case "missing_target":
      return blocked(payload, "missing_target", "No selected or uniquely named track to adjust.");
    case "ambiguous_target":
      return blocked(payload, "ambiguous_target", `${resolution.count} tracks share that name — rename one or select it directly.`);
    case "observation_failed":
      return blocked(payload, "observation_failed", resolution.reason);
  }
}

// ---------------------------------------------------------------------------------------
// Bus resolution — a unique, case-insensitive whole-word match over `snapshot.buses`; the
// words people say for a return ("verb", "echo") alias the bus names they usually carry.
// ---------------------------------------------------------------------------------------

const BUS_WORD_ALIASES_V1: readonly (readonly string[])[] = [
  ["reverb", "verb", "rev"],
  ["delay", "echo"],
];

function busMatchesWordV1(bus: Bus, spoken: string): boolean {
  const word = normalizeSpokenV1(spoken);
  if (normalizeSpokenV1(bus.name) === word) return true;
  const group = BUS_WORD_ALIASES_V1.find((aliases) => aliases.includes(word)) ?? [word];
  return nameWordsV1(bus.name).some((busWord) => group.includes(busWord));
}

type BusResolutionV1 =
  | { readonly kind: "resolved"; readonly bus: Bus }
  | { readonly kind: "missing" }
  | { readonly kind: "ambiguous"; readonly count: number };

function resolveBusV1(before: Snapshot, request: BalanceRequestV1): BusResolutionV1 {
  const buses = before.buses ?? [];
  if (typeof request.busNumber === "number") {
    const bus = buses.find((candidate) => candidate.bus === request.busNumber);
    return bus ? { kind: "resolved", bus } : { kind: "missing" };
  }
  if (!request.bus) return { kind: "missing" };
  const matches = buses.filter((bus) => busMatchesWordV1(bus, request.bus!));
  if (matches.length === 1) return { kind: "resolved", bus: matches[0]! };
  if (matches.length === 0) return { kind: "missing" };
  return { kind: "ambiguous", count: matches.length };
}

// ---------------------------------------------------------------------------------------
// Action -> mutation command
// ---------------------------------------------------------------------------------------

type PlannedMutationV1 = {
  readonly command: "set_track_volume" | "set_track_mute" | "set_track_solo" | "set_send_level";
  readonly args: Readonly<Record<string, SlotValueV1>>;
  readonly verify: (after: Snapshot, trackId: string) => SkillCheck;
  /** What the completed outcome says; the payload's generic "Done." when absent. */
  readonly say?: string;
  /** Set only by a RELATIVE move — what "another N dB" repeats. */
  readonly remember?: Omit<LastMoveV1, "projectEpoch" | "expiresAtMs">;
};

function trackMuteEqualsV1(after: Snapshot, trackId: string, expected: boolean): SkillCheck {
  const track = after.tracks.find((candidate) => candidate.id === trackId);
  if (!track) return { ok: false, reason: `Track "${trackId}" was not preserved.` };
  const actual = track.mute ?? false;
  return actual === expected ? { ok: true } : { ok: false, reason: `Track "${trackId}" did not reach mute:${expected}.` };
}

function trackSoloEqualsV1(after: Snapshot, trackId: string, expected: boolean): SkillCheck {
  const track = after.tracks.find((candidate) => candidate.id === trackId);
  if (!track) return { ok: false, reason: `Track "${trackId}" was not preserved.` };
  const actual = track.solo ?? false;
  return actual === expected ? { ok: true } : { ok: false, reason: `Track "${trackId}" did not reach solo:${expected}.` };
}

/** The send's readback must sit within 0.05 dB of the target — the send gain is a plug-in
 *  parameter (AuxSendPlugin) whose dB round trip is coarser than the fader's. */
function sendLevelReachedV1(after: Snapshot, trackId: string, bus: number, targetDb: number): SkillCheck {
  const track = after.tracks.find((candidate) => candidate.id === trackId);
  if (!track) return { ok: false, reason: `Track "${trackId}" was not preserved.` };
  const send = track.sends?.find((candidate) => candidate.bus === bus);
  if (!send) return { ok: false, reason: `Track "${trackId}" lost its send to bus ${bus}.` };
  if (typeof send.db !== "number" || Math.abs(send.db - targetDb) > SEND_TOLERANCE_DB)
    return { ok: false, reason: `Track "${trackId}" send to bus ${bus} did not reach ${targetDb} dB.` };
  return { ok: true };
}

const direction = (delta: number): 1 | -1 => (delta < 0 ? -1 : 1);

/** Plans the one command for `request` on an already-resolved track, or the blocked outcome
 *  that explains why nothing will run. Reads every "before" value from `before` — the fresh
 *  snapshot the caller just took — never from a remembered value. */
function planMutationV1(
  payload: NativeSkillPayloadV1,
  before: Snapshot,
  track: Track,
  request: BalanceRequestV1,
): PlannedMutationV1 | SkillOutcomeV1 {
  const trackId = track.id;
  switch (request.action) {
    case "set_level": {
      const db = request.db;
      if (!inFaderRange(db)) return blocked(payload, "invalid_slot", "That level is out of range (-60..+6 dB).");
      return {
        command: "set_track_volume",
        args: { trackId, db },
        verify: (after) => trackVolumeReachedV1(after, trackId, db),
        say: `${track.name} → ${fmtDb(db)} dB`,
      };
    }
    case "adjust_level": {
      const delta = request.db;
      if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) return blocked(payload, "invalid_slot", "Say how many dB — e.g. \"lower the vocal 3 dB\".");
      const current = typeof track.volumeDb === "number" ? track.volumeDb : 0;
      const target = roundDb(clampFader(current + delta));
      return {
        command: "set_track_volume",
        args: { trackId, db: target },
        verify: (after) => trackVolumeReachedV1(after, trackId, target),
        say: `${track.name} ${fmtDb(current)} → ${fmtDb(target)} dB`,
        remember: { trackId, direction: direction(delta), delta: Math.abs(delta) },
      };
    }
    case "send_level": {
      const resolved = resolveBusV1(before, request);
      if (resolved.kind === "missing") {
        const named = request.bus ? `"${request.bus}"` : "that";
        return blocked(payload, "missing_target", `No return bus matches ${named} — name the bus (reverb, delay).`);
      }
      if (resolved.kind === "ambiguous") return blocked(payload, "ambiguous_target", `${resolved.count} buses match "${request.bus}" — say which.`);
      const bus = resolved.bus;
      const send = track.sends?.find((candidate) => candidate.bus === bus.bus);
      // F3 — never add_send: the ask was about a level, and a send that does not exist has
      // no level to move.
      if (!send) return blocked(payload, "missing_target", `${track.name} has no send to ${bus.name} — add one first`);
      if (request.mode === "absolute") {
        const db = request.db;
        if (!inFaderRange(db)) return blocked(payload, "invalid_slot", "That send level is out of range (-60..+6 dB).");
        return {
          command: "set_send_level",
          args: { trackId, bus: bus.bus, db },
          verify: (after) => sendLevelReachedV1(after, trackId, bus.bus, db),
          say: `${track.name} → ${bus.name} send ${fmtDb(db)} dB`,
        };
      }
      const delta = request.db;
      if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) return blocked(payload, "invalid_slot", "Say how many dB — e.g. \"less reverb on the vocal by 6 dB\".");
      const current = typeof send.db === "number" ? send.db : 0;
      const target = roundDb(clampFader(current + delta));
      const spokenDefault = request.defaulted ? ` (${fmtSigned(delta)} dB by default)` : "";
      return {
        command: "set_send_level",
        args: { trackId, bus: bus.bus, db: target },
        verify: (after) => sendLevelReachedV1(after, trackId, bus.bus, target),
        say: `${track.name} → ${bus.name} send ${fmtDb(current)} → ${fmtDb(target)} dB${spokenDefault}`,
        remember: { trackId, bus: bus.bus, direction: direction(delta), delta: Math.abs(delta) },
      };
    }
    case "mute":
      return { command: "set_track_mute", args: { trackId, mute: true }, verify: (after) => trackMuteEqualsV1(after, trackId, true) };
    case "unmute":
      return { command: "set_track_mute", args: { trackId, mute: false }, verify: (after) => trackMuteEqualsV1(after, trackId, false) };
    case "solo":
      return { command: "set_track_solo", args: { trackId, solo: true }, verify: (after) => trackSoloEqualsV1(after, trackId, true) };
    case "repeat_last":
      // Rewritten into adjust_level / send_level by `repeatLastV1` before planning.
      return blocked(payload, "missing_target", "another what? name the track");
  }
}

// ---------------------------------------------------------------------------------------
// Atomic execution
// ---------------------------------------------------------------------------------------

function defaultNewId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch { /* fall through */ }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function runAtomicallyV1(
  payload: NativeSkillPayloadV1,
  environment: StudioSkillEnvironmentV1,
  before: Snapshot,
  trackId: string,
  mutation: PlannedMutationV1,
  epochAtStart: number,
  sourceAtStart: SourceStatusSnapshotV1,
): Promise<SkillOutcomeV1> {
  const newId = environment.newId ?? defaultNewId;
  const transactionId = newId();
  const requestId = newId();
  const steps = [{ call: { command: mutation.command, args: mutation.args }, meta: { transactionId, requestId, index: 0 } }];
  const transaction = {
    transactionId,
    name: payload.id,
    manifest: [{ index: 0, requestId, command: mutation.command }],
    steps,
  };

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
    slots: mutation.args as Readonly<Record<string, string | number | boolean>>,
    before,
    transaction,
    verifyPostcondition: (_before, after) => mutation.verify(after, trackId),
    provenance: environment.provenance, // step-1 slice 6 — the turn's turn_id/source/utterance
  };

  const result = await runAtomicSkillPlanV1(plan, { snapshot: environment.snapshot, exec: environment.exec, guard });

  if (result.ok) {
    return { kind: "completed", skill: payload.id, version: payload.version, say: mutation.say ?? payload.responses.completed, changes: null };
  }

  const unserved = result.outcome === "no_edit";
  let code: SkillReasonCodeV1;
  if (reasonCode) code = reasonCode;
  else if (result.outcome === "needs_recovery") code = "rollback_failed";
  else if (result.stage === "postcondition") code = "postcondition_failed";
  else code = "command_failed";

  return { kind: "blocked", skill: payload.id, version: payload.version, code, say: payload.responses.blocked, unserved };
}

/** Plans and runs `request` against one already-resolved track; on completion a relative
 *  move becomes what "another N dB" repeats. */
async function executeForTrackV1(
  payload: NativeSkillPayloadV1,
  environment: StudioSkillEnvironmentV1,
  before: Snapshot,
  request: BalanceRequestV1,
  trackId: string,
  epochAtStart: number,
): Promise<SkillOutcomeV1> {
  const track = before.tracks.find((candidate) => candidate.id === trackId);
  if (!track) return blocked(payload, "stale_context", "That track no longer exists — ask again.");

  const planned = planMutationV1(payload, before, track, request);
  if ("kind" in planned) return planned;

  const sourceAtStart = await readSourceStatusSnapshotV1(environment);
  if (!sourceAtStart) return blocked(payload, "observation_failed", "Could not verify source status.");

  const outcome = await runAtomicallyV1(payload, environment, before, trackId, planned, epochAtStart, sourceAtStart);
  if (outcome.kind === "completed" && planned.remember) {
    lastMove = { ...planned.remember, projectEpoch: epochAtStart, expiresAtMs: nowMsOf(environment) + REPEAT_TTL_MS };
  }
  return outcome;
}

// ---------------------------------------------------------------------------------------
// Continuation issue/resume
// ---------------------------------------------------------------------------------------

function matchChoiceReply(reply: string, choices: readonly ContinuationChoiceValueV1[]): ContinuationChoiceValueV1 | null {
  const normalized = reply.trim().toLowerCase();
  return choices.find((choice) => choice.id.toLowerCase() === normalized || choice.label.toLowerCase() === normalized) ?? null;
}

function numberedChoicesV1(choices: readonly ContinuationChoiceValueV1[]): string {
  return choices.map((choice) => `${choice.id}. ${choice.label}`).join("; ");
}

async function issueChoiceV1(
  payload: NativeSkillPayloadV1,
  environment: StudioSkillEnvironmentV1,
  candidates: readonly ContinuationChoiceValueV1[],
  request: BalanceRequestV1,
): Promise<SkillOutcomeV1> {
  // Stamped with the continuation STORE's own clock (real wall-clock — `explicitBalanceContinuations`
  // is a module-level singleton created with no injected `now`), never `environment.nowMs()`: the
  // store's own `issue()` validates `expiresAtMs` against ITS clock, so stamping with a different
  // clock (e.g. a test's injected `environment.nowMs()`) would spuriously fail that validation.
  const nowMs = Date.now();
  const targetIdentities: readonly ResolvedTargetIdentityV1[] = [];
  const payloadRecord: ContinuationPayloadV1 = {
    skillId: payload.id,
    version: payload.version,
    artifactSha256: payload.compatibility.nativeSourceSha256,
    choices: candidates,
    targetIdentities,
    projectEpoch: environment.context().projectEpoch,
    registryGeneration: 0,
    sourceStatusGeneration: 0,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + 600_000,
    attempts: 0,
    pendingKind: "choice",
    pendingSlot: "trackName",
    choiceReason: "ambiguity",
  };
  // The pending request is not part of ContinuationPayloadBaseV1 (Slice A's frozen shape)
  // — stash it in an out-of-band side map keyed by token instead of widening that frozen
  // contract. See `pendingRequestByToken` below.
  const issued = explicitBalanceContinuations.issue(payloadRecord);
  if (!issued.ok) return blocked(payload, "provider_unavailable", payload.responses.blocked);
  pendingRequestByToken.set(issued.token, request);
  const options: readonly SkillChoiceV1[] = candidates.map((choice) => ({ id: choice.id, label: choice.label }));
  // The question names every candidate (audit F1: "needs-choice reply naming both").
  return {
    kind: "needs_choice", skill: payload.id, version: payload.version,
    say: `${payload.responses.needsChoice} choose 1–${candidates.length}: ${numberedChoicesV1(candidates)}`,
    options, continuationToken: issued.token,
  };
}

/** DESIGN DECISION: `ContinuationPayloadV1` (Slice A, frozen) has no field for "which
 *  request was pending" — it was designed for the declarative executor, where the manifest
 *  itself supplies that context on resume. A native handler has no manifest to re-read, so
 *  the pending request is kept in this small side table, keyed by the same single-use token
 *  the continuation store already enforces uniqueness/expiry for. */
const pendingRequestByToken = new Map<string, BalanceRequestV1>();

// ---------------------------------------------------------------------------------------
// Slots -> request. The runtime (runtime.ts, whose slot pass-through is frozen) forwards
// only `action`/`db`/`trackName`; the bus word, the absolute/relative mode and whether the
// amount was defaulted are recovered from the utterance itself — the same "parse your own
// utterance" discipline sessionControl.ts and loadNamedPlugin.ts already follow.
// ---------------------------------------------------------------------------------------

const readsLiveValueV1 = (action: ExplicitBalanceActionV1): boolean =>
  action === "adjust_level" || action === "send_level" || action === "repeat_last";

function requestFromSlotsV1(slots: Readonly<Record<string, SlotValueV1>>, utterance: string): BalanceRequestV1 | null {
  const action = slots.action;
  if (typeof action !== "string" || !ACTIONS_V1.includes(action)) return null;
  const parsed = matchExplicitBalanceUtteranceV1(utterance);
  const fromParse = parsed && parsed.action === action ? parsed : null;
  const db = typeof slots.db === "number" ? slots.db : fromParse?.db;
  const trackName = typeof slots.trackName === "string" ? slots.trackName : fromParse?.trackName;
  const bus = typeof slots.bus === "string" ? slots.bus : fromParse?.bus;
  const mode = slots.mode === "absolute" || slots.mode === "relative" ? slots.mode : fromParse?.mode;
  const defaulted = action === "send_level" && mode === "relative" && !/\d\s*db\b/i.test(utterance);
  return {
    action: action as ExplicitBalanceActionV1,
    ...(db !== undefined ? { db } : {}),
    ...(trackName !== undefined ? { trackName } : {}),
    ...(bus !== undefined ? { bus } : {}),
    ...(mode !== undefined ? { mode } : {}),
    ...(defaulted ? { defaulted } : {}),
  };
}

async function freshSnapshotV1(
  payload: NativeSkillPayloadV1,
  environment: StudioSkillEnvironmentV1,
  refresh: boolean,
): Promise<Snapshot | SkillOutcomeV1> {
  try {
    // A relative move computes its target from the value the engine holds NOW — the composer's
    // environment `snapshot()` is the store's cached read, so refresh first (the one existing
    // precedent: session-control's save).
    if (refresh) await environment.refresh();
    return await environment.snapshot();
  } catch (error) {
    return blocked(payload, "observation_failed", `Could not read session state: ${detail(error)}.`);
  }
}

async function repeatLastV1(
  payload: NativeSkillPayloadV1,
  environment: StudioSkillEnvironmentV1,
  request: BalanceRequestV1,
): Promise<SkillOutcomeV1> {
  const epoch = environment.context().projectEpoch;
  const ask = blocked(payload, "missing_target", "another what? name the track");
  if (!lastMove || lastMove.projectEpoch !== epoch || nowMsOf(environment) > lastMove.expiresAtMs) return ask;
  const amount = typeof request.db === "number" && Number.isFinite(request.db) && request.db > 0 ? request.db : lastMove.delta;
  const before = await freshSnapshotV1(payload, environment, true);
  if ("kind" in before) return before;
  if (!before.tracks.some((track) => track.id === lastMove!.trackId)) return blocked(payload, "stale_context", "That track no longer exists — name the track.");
  const derived: BalanceRequestV1 = lastMove.bus === undefined
    ? { action: "adjust_level", db: lastMove.direction * amount }
    : { action: "send_level", mode: "relative", db: lastMove.direction * amount, busNumber: lastMove.bus };
  return executeForTrackV1(payload, environment, before, derived, lastMove.trackId, epoch);
}

// ---------------------------------------------------------------------------------------
// Handler entry point
// ---------------------------------------------------------------------------------------

export const explicitBalanceV1: NativeSkillHandlerV1 = async ({ payload, environment, utterance, slots, continuationToken }) => {
  if (continuationToken) {
    // Same real-clock discipline as issueChoiceV1 — the store's own clock, not
    // environment.nowMs() (see that function's comment).
    const taken = explicitBalanceContinuations.take(continuationToken, Date.now());
    if (!taken.ok) return blocked(payload, "stale_context", "That choice has expired — ask again.");
    const pending = pendingRequestByToken.get(continuationToken);
    pendingRequestByToken.delete(continuationToken);
    if (!pending || taken.payload.skillId !== payload.id || taken.payload.artifactSha256 !== payload.compatibility.nativeSourceSha256) {
      return blocked(payload, "stale_context", "That choice is no longer valid — ask again.");
    }
    // The reply text is the resuming utterance itself unless a caller supplies a distinct
    // `slots.reply` — mirrors loadNamedPlugin.ts's own resume fallback, since the runtime
    // (runtime.ts) dispatches a resume as `handler({..., utterance: <reply text>, slots: {}, continuationToken})`.
    const replyText = typeof slots.reply === "string" ? slots.reply : utterance;
    const chosen = matchChoiceReply(replyText, taken.payload.choices);
    if (!chosen) return blocked(payload, "invalid_slot", "That wasn't one of the options — ask again.");

    const before = await freshSnapshotV1(payload, environment, readsLiveValueV1(pending.action));
    if ("kind" in before) return before;
    if (environment.context().projectEpoch !== taken.payload.projectEpoch) {
      return blocked(payload, "stale_context", "The project changed — ask again.");
    }
    const trackId = String(chosen.value);
    if (!before.tracks.some((track) => track.id === trackId)) {
      return blocked(payload, "stale_context", "That track no longer exists — ask again.");
    }
    return executeForTrackV1(payload, environment, before, pending, trackId, environment.context().projectEpoch);
  }

  const request = requestFromSlotsV1(slots, utterance);
  if (!request) {
    // Vague/unrecognized asks ("mix this", "make it sound professional") land here —
    // never a fuzzy guess at a level or target.
    return blocked(payload, "unsupported_intent", payload.responses.blocked);
  }
  if (request.action === "repeat_last") return repeatLastV1(payload, environment, request);

  const before = await freshSnapshotV1(payload, environment, readsLiveValueV1(request.action));
  if ("kind" in before) return before;
  const epochAtStart = environment.context().projectEpoch;

  const resolution = await resolveTargetV1(before, environment, request.trackName);
  if (resolution.kind === "needs_choice") return issueChoiceV1(payload, environment, resolution.candidates, request);
  if (resolution.kind !== "resolved") return reasonFromTargetResolution(payload, resolution);

  return executeForTrackV1(payload, environment, before, request, resolution.trackId, epochAtStart);
};
