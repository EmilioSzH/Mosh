// Skill Foundry Slice B, Task 4 — explicit balance through the atomic executor.
//
// Reuses the same "faithful enough" batch-transaction FakeEngine pattern
// declarativeExecutor.test.ts already established for atomicPlan.ts, scoped down to just
// the three mutation commands this handler ever compiles.

import { beforeEach, describe, expect, it } from "vitest";
import type { Bus, Snapshot, Track } from "../../../types";
import type { NativeSkillPayloadV1, StudioSkillEnvironmentV1, StudioSkillProvenanceV1 } from "../contracts";
import { clearExplicitBalanceContinuationsV1, explicitBalanceV1 } from "./explicitBalance";

type FakeBridgeResult = { readonly ok: boolean; readonly error?: string; readonly data?: unknown };

type FakeTxn = {
  status: "open" | "committed" | "rolled_back" | "needs_recovery";
  manifestCount: number;
  applied: number;
  entries: { index: number; requestId: string; command: string; state: "pending" | "applied" | "failed"; result?: FakeBridgeResult }[];
  preFingerprint: string;
  fingerprint?: string;
  canCommit: boolean;
  canRollback: boolean;
  preTracks: Track[];
};

class FakeEngine {
  tracks: Track[];
  selectedTrackId: string | null;
  projectEpoch = 1;
  stateVersion = 0;
  sourceStatusGeneration = 1;
  /** Returns a NEW value on the 2nd+ call (simulating a mid-run change), or a fixed
   *  sequence when set explicitly. */
  sourceStatusSequence: readonly number[] | null = null;
  private sourceStatusCallIndex = 0;
  private readonly txns = new Map<string, FakeTxn>();
  failCommandOnce: string | null = null;
  readonly batchBeginCalls: { transactionId: string; commands: readonly { command: string }[]; args: Record<string, unknown> }[] = [];
  /** Step-1 slice 5 — the return buses (`snapshot.buses`) the send lane resolves against. */
  buses: Bus[] = [];
  /** The real engine's fader stores a POSITION, not the dB value: `set_track_volume -13`
   *  reads back -12.999998 (audit S5, error ~1.9e-6 dB). Non-zero here reproduces that
   *  round trip on every fader write. */
  faderRoundTripError = 0;
  /** Every in-transaction mutation the handler issued, with its args, in order. */
  readonly mutationCalls: { command: string; args: Record<string, unknown> }[] = [];
  rollbackCalls = 0;

  constructor(tracks: Track[], selectedTrackId: string | null) {
    this.tracks = tracks;
    this.selectedTrackId = selectedTrackId;
  }

  private fingerprint(): string { return `v${this.stateVersion}`; }

  private cloneTracks(): Track[] {
    return this.tracks.map((t) => ({ ...t, ...(t.sends ? { sends: t.sends.map((s) => ({ ...s })) } : {}) }));
  }

  snapshot(): Snapshot {
    return {
      schemaVersion: 1,
      session: { sampleRate: 48000, tempo: 120, key: { root: "C", scale: "major" }, editFile: "x" },
      transport: { playing: false, recording: false, position: 0, looping: false, loopStart: 0, loopEnd: 0 },
      tracks: this.cloneTracks(),
      ...(this.buses.length ? { buses: this.buses.map((b) => ({ ...b })) } : {}),
    } as unknown as Snapshot;
  }

  context() {
    return { projectEpoch: this.projectEpoch, selectedTrackId: this.selectedTrackId, tracks: this.tracks.map((t) => ({ id: t.id, name: t.name })) };
  }

  async readSourceStatus() {
    const generation = this.sourceStatusSequence
      ? this.sourceStatusSequence[Math.min(this.sourceStatusCallIndex, this.sourceStatusSequence.length - 1)]!
      : this.sourceStatusGeneration;
    this.sourceStatusCallIndex += 1;
    const utf8 = JSON.stringify({ schemaVersion: 1, generation, updatedAt: "2026-01-01T00:00:00.000Z", entries: [] });
    return {
      schemaVersion: 1 as const, ok: true as const,
      statusIndex: { name: "source-status.json", bytes: utf8.length, sha256: `sha-${generation}`, utf8 },
      diagnostics: [],
    };
  }

  private applyMutation(command: string, args: Record<string, unknown>): FakeBridgeResult {
    this.mutationCalls.push({ command, args });
    const track = this.tracks.find((t) => t.id === args.trackId);
    if (!track) return { ok: false, error: "no such track" };
    if (command === "set_track_volume") { track.volumeDb = (args.db as number) + this.faderRoundTripError; return { ok: true }; }
    if (command === "set_track_mute") { track.mute = args.mute as boolean; return { ok: true }; }
    if (command === "set_track_solo") { track.solo = args.solo as boolean; return { ok: true }; }
    if (command === "set_send_level") {
      const send = track.sends?.find((s) => s.bus === args.bus);
      if (!send) return { ok: false, error: "no such send" };
      send.db = args.db as number;
      return { ok: true };
    }
    // F3 — this skill must never create a send; a real engine would happily do so.
    if (command === "add_send") return { ok: false, error: "add_send must never be issued by explicit-balance" };
    return { ok: false, error: `unknown command ${command}` };
  }

  async exec(command: string, args: Record<string, unknown>, transaction?: { transactionId: string; requestId: string; index: number }): Promise<FakeBridgeResult> {
    if (command === "batch_begin") {
      const transactionId = args.transactionId as string;
      const commands = args.commands as { index: number; requestId: string; command: string }[];
      this.batchBeginCalls.push({ transactionId, commands, args });
      const preFingerprint = this.fingerprint();
      const txn: FakeTxn = {
        status: "open", manifestCount: commands.length, applied: 0,
        entries: commands.map((c) => ({ index: c.index, requestId: c.requestId, command: c.command, state: "pending" as const })),
        preFingerprint, canCommit: false, canRollback: true,
        preTracks: this.cloneTracks(),
      };
      this.txns.set(transactionId, txn);
      return { ok: true, data: { found: true, transactionId, status: "open", manifestCount: commands.length, applied: 0, canCommit: false, canRollback: true, preFingerprint } };
    }
    if (command === "batch_status") {
      const txn = this.txns.get(args.transactionId as string);
      if (!txn) return { ok: true, data: { found: false } };
      return {
        ok: true,
        data: {
          found: true, transactionId: args.transactionId, status: txn.status, manifestCount: txn.manifestCount,
          applied: txn.applied, canCommit: txn.canCommit, canRollback: txn.canRollback,
          preFingerprint: txn.preFingerprint, fingerprint: txn.fingerprint,
          entries: txn.entries.map((e) => ({ index: e.index, requestId: e.requestId, command: e.command, state: e.state, result: e.result })),
        },
      };
    }
    if (command === "batch_rollback") {
      const txn = this.txns.get(args.transactionId as string);
      if (!txn) return { ok: false, error: "unknown transaction" };
      this.rollbackCalls += 1;
      this.tracks = txn.preTracks.map((t) => ({ ...t, ...(t.sends ? { sends: t.sends.map((s) => ({ ...s })) } : {}) }));
      txn.status = "rolled_back"; txn.fingerprint = txn.preFingerprint; txn.canRollback = false;
      return { ok: true };
    }
    if (command === "batch_end") {
      const txn = this.txns.get(args.transactionId as string);
      if (!txn) return { ok: false, error: "unknown transaction" };
      if (txn.applied !== txn.manifestCount || !txn.canCommit) return { ok: false, error: "not ready to commit" };
      txn.status = "committed"; txn.fingerprint = this.fingerprint();
      return { ok: true, data: { found: true, status: "committed" } };
    }
    if (!transaction) return { ok: false, error: "mutation without a transaction" };
    const txn = this.txns.get(transaction.transactionId);
    if (!txn) return { ok: false, error: "unknown transaction" };
    const entry = txn.entries.find((e) => e.requestId === transaction.requestId);
    if (this.failCommandOnce === command) {
      this.failCommandOnce = null;
      const result: FakeBridgeResult = { ok: false, error: `${command} refused` };
      if (entry) { entry.state = "failed"; entry.result = result; }
      return result;
    }
    const result = this.applyMutation(command, args);
    if (result.ok) this.stateVersion += 1;
    if (entry) { entry.state = result.ok ? "applied" : "failed"; entry.result = result; }
    if (result.ok) { txn.applied += 1; if (txn.applied === txn.manifestCount) txn.canCommit = true; }
    return result;
  }
}

function track(overrides: Partial<Track> = {}): Track {
  return { id: "track-1", index: 0, name: "Bass", type: "audio", clips: [], ...overrides };
}

function environmentFor(
  engine: FakeEngine,
  provenance?: StudioSkillProvenanceV1,
  clock: () => number = () => 1_000_000,
): StudioSkillEnvironmentV1 {
  let counter = 0;
  return {
    ...(provenance ? { provenance } : {}),
    context: () => engine.context(),
    snapshot: async () => engine.snapshot(),
    exec: (command, args, transaction) => engine.exec(command, args as Record<string, unknown>, transaction),
    readSourceStatus: () => engine.readSourceStatus(),
    runBatch: async () => ({ label: "", entries: [], applied: 0 }),
    refresh: async () => {},
    newId: () => `id-${(counter += 1)}`,
    nowMs: clock,
    recording: {
      start: async () => ({ ok: true, state: "recording", say: "", changes: null }),
      stop: async () => ({ ok: true, state: "idle", say: "", changes: null }),
      audition: async () => ({ ok: true, state: "idle", say: "", changes: null }),
      keep: async () => ({ ok: true, state: "idle", say: "", changes: null }),
    },
  };
}

const PAYLOAD: NativeSkillPayloadV1 = {
  schemaVersion: 1, id: "explicit-balance", version: "1.0.0", implementation: "native",
  handlerKey: "explicitBalanceV1", title: "Explicit balance",
  description: "Mute, unmute, solo, or set an explicit level on a track.",
  intents: { positiveExamples: ["set drums to -6 db"], negativeExamples: ["mix this"], tags: ["mixing"] },
  slots: [], execution: { mode: "atomic", confirmation: "never" },
  responses: { completed: "Done.", needsChoice: "Which one?", blocked: "Can't do that." },
  provenance: [], legacyAliases: [],
  compatibility: {
    minMoshVersion: "0.1.0", commandCatalogSha256: "x", predicateCatalogVersion: 1,
    resolverCatalogVersion: 1, nativeSourceSha256: "explicit-balance-src",
  },
};

describe("explicitBalanceV1 — set_level", () => {
  let engine: FakeEngine;
  beforeEach(() => { engine = new FakeEngine([track({ id: "track-1", name: "Drums", volumeDb: 0 })], "track-1"); });

  it("sets the selected track's level and commits atomically", async () => {
    const outcome = await explicitBalanceV1({
      payload: PAYLOAD, environment: environmentFor(engine), utterance: "set it to -8 dB",
      slots: { action: "set_level", db: -8 },
    });
    expect(outcome).toMatchObject({ kind: "completed" });
    expect(engine.tracks[0]!.volumeDb).toBe(-8);
    expect(engine.batchBeginCalls[0]!.commands.map((c) => c.command)).toEqual(["set_track_volume"]);
  });

  it("resolves an exact unique track name", async () => {
    engine.selectedTrackId = null;
    const outcome = await explicitBalanceV1({
      payload: PAYLOAD, environment: environmentFor(engine), utterance: "set Drums to -8 dB",
      slots: { action: "set_level", db: -8, trackName: "Drums" },
    });
    expect(outcome).toMatchObject({ kind: "completed" });
    expect(engine.tracks[0]!.volumeDb).toBe(-8);
  });

  it("rejects an out-of-range level with no mutation", async () => {
    const outcome = await explicitBalanceV1({
      payload: PAYLOAD, environment: environmentFor(engine), utterance: "set it to -80 dB",
      slots: { action: "set_level", db: -80 },
    });
    expect(outcome).toMatchObject({ kind: "blocked", code: "invalid_slot" });
    expect(engine.tracks[0]!.volumeDb).toBe(0);
    expect(engine.batchBeginCalls).toHaveLength(0);
  });

  it("accepts the exact -60/+6 boundary values", async () => {
    const low = await explicitBalanceV1({
      payload: PAYLOAD, environment: environmentFor(engine), utterance: "x", slots: { action: "set_level", db: -60 },
    });
    expect(low).toMatchObject({ kind: "completed" });
    expect(engine.tracks[0]!.volumeDb).toBe(-60);
    const high = await explicitBalanceV1({
      payload: PAYLOAD, environment: environmentFor(engine), utterance: "x", slots: { action: "set_level", db: 6 },
    });
    expect(high).toMatchObject({ kind: "completed" });
    expect(engine.tracks[0]!.volumeDb).toBe(6);
  });

  it("one Undo restores the changed track (delegated to the caller's own undo command — proven here via rollback on command failure)", async () => {
    engine.failCommandOnce = "set_track_volume";
    const outcome = await explicitBalanceV1({
      payload: PAYLOAD, environment: environmentFor(engine), utterance: "x", slots: { action: "set_level", db: -8 },
    });
    expect(outcome).toMatchObject({ kind: "blocked" });
    expect(engine.tracks[0]!.volumeDb).toBe(0); // exact rollback — the failed attempt left no trace
  });
});

describe("explicitBalanceV1 — mute/unmute/solo", () => {
  let engine: FakeEngine;
  beforeEach(() => { engine = new FakeEngine([track({ id: "track-1", name: "Drums" })], "track-1"); });

  it("mute reaches the exact requested state", async () => {
    const outcome = await explicitBalanceV1({ payload: PAYLOAD, environment: environmentFor(engine), utterance: "mute it", slots: { action: "mute" } });
    expect(outcome).toMatchObject({ kind: "completed" });
    expect(engine.tracks[0]!.mute).toBe(true);
  });

  it("unmute reaches the exact requested state", async () => {
    engine.tracks[0]!.mute = true;
    const outcome = await explicitBalanceV1({ payload: PAYLOAD, environment: environmentFor(engine), utterance: "unmute it", slots: { action: "unmute" } });
    expect(outcome).toMatchObject({ kind: "completed" });
    expect(engine.tracks[0]!.mute).toBe(false);
  });

  it("solo reaches the exact requested state", async () => {
    const outcome = await explicitBalanceV1({ payload: PAYLOAD, environment: environmentFor(engine), utterance: "solo it", slots: { action: "solo" } });
    expect(outcome).toMatchObject({ kind: "completed" });
    expect(engine.tracks[0]!.solo).toBe(true);
  });
});

describe("explicitBalanceV1 — target resolution", () => {
  it("missing target blocks with zero mutation", async () => {
    const engine = new FakeEngine([track({ id: "track-1", name: "Drums" })], null);
    const outcome = await explicitBalanceV1({ payload: PAYLOAD, environment: environmentFor(engine), utterance: "mute it", slots: { action: "mute" } });
    expect(outcome).toMatchObject({ kind: "blocked", code: "missing_target" });
    expect(engine.batchBeginCalls).toHaveLength(0);
  });

  it("duplicate-name ambiguity (up to 5) issues needs_choice with zero mutation", async () => {
    const engine = new FakeEngine([
      track({ id: "t1", name: "Vox" }), track({ id: "t2", name: "Vox" }),
    ], null);
    const outcome = await explicitBalanceV1({
      payload: PAYLOAD, environment: environmentFor(engine), utterance: "mute Vox",
      slots: { action: "mute", trackName: "Vox" },
    });
    expect(outcome).toMatchObject({ kind: "needs_choice" });
    expect(outcome.kind === "needs_choice" && outcome.options).toHaveLength(2);
    expect(engine.batchBeginCalls).toHaveLength(0);
  });

  it("more than 5 duplicate names is ambiguous_target, not a truncated choice list", async () => {
    const engine = new FakeEngine(
      Array.from({ length: 6 }, (_, i) => track({ id: `t${i}`, name: "Vox" })), null,
    );
    const outcome = await explicitBalanceV1({
      payload: PAYLOAD, environment: environmentFor(engine), utterance: "mute Vox",
      slots: { action: "mute", trackName: "Vox" },
    });
    expect(outcome).toMatchObject({ kind: "blocked", code: "ambiguous_target" });
    expect(engine.batchBeginCalls).toHaveLength(0);
  });
});

describe("explicitBalanceV1 — vague taste refusal", () => {
  it("an unrecognized action is unsupported_intent with zero mutation", async () => {
    const engine = new FakeEngine([track({ id: "track-1", name: "Drums" })], "track-1");
    const outcome = await explicitBalanceV1({
      payload: PAYLOAD, environment: environmentFor(engine), utterance: "mix this professionally",
      slots: {},
    });
    expect(outcome).toMatchObject({ kind: "blocked", code: "unsupported_intent" });
    expect(engine.batchBeginCalls).toHaveLength(0);
  });
});

describe("explicitBalanceV1 — atomic executor discipline", () => {
  it("uses runAtomicSkillPlanV1 (batch_begin/status/end), never a bare exec of the mutation", async () => {
    const engine = new FakeEngine([track({ id: "track-1", name: "Drums" })], "track-1");
    await explicitBalanceV1({ payload: PAYLOAD, environment: environmentFor(engine), utterance: "mute it", slots: { action: "mute" } });
    expect(engine.batchBeginCalls).toHaveLength(1);
  });

  it("source status changing between plan and commit rolls back exactly", async () => {
    const engine = new FakeEngine([track({ id: "track-1", name: "Drums" })], "track-1");
    engine.sourceStatusSequence = [1, 1, 2, 2]; // changes between the before_begin and before_commit reads
    const outcome = await explicitBalanceV1({ payload: PAYLOAD, environment: environmentFor(engine), utterance: "mute it", slots: { action: "mute" } });
    expect(outcome).toMatchObject({ kind: "blocked", code: "manifest_stale" });
    expect(engine.tracks[0]!.mute).toBeFalsy();
  });

  it("project epoch changing before commit rolls back exactly", async () => {
    const engine = new FakeEngine([track({ id: "track-1", name: "Drums" })], "track-1");
    const environment = environmentFor(engine);
    const originalExec = environment.exec;
    (environment as { exec: typeof originalExec }).exec = async (command, args, transaction) => {
      if (command === "set_track_mute") engine.projectEpoch += 1; // the project changes mid-flight
      return originalExec(command, args, transaction);
    };
    const outcome = await explicitBalanceV1({ payload: PAYLOAD, environment, utterance: "mute it", slots: { action: "mute" } });
    expect(outcome).toMatchObject({ kind: "blocked", code: "manifest_stale" });
    expect(engine.tracks[0]!.mute).toBeFalsy();
  });
});

// Step-1 slice 6 — a studio-skill transaction is a TURN. The environment MAY carry the
// composer's turn provenance; the handler forwards it verbatim into batch_begin's args so
// the engine stamps `turn_id` on every in-batch JSONL line. Absent ⇒ the args are
// byte-identical to before (the atomic-plan keys alone, in their existing order).
describe("explicitBalanceV1 — batch_begin provenance (step-1 slice 6)", () => {
  it("forwards the environment's turn_id / source / utterance into batch_begin args", async () => {
    const engine = new FakeEngine([track({ id: "track-1", name: "Drums" })], "track-1");
    const provenance = { turn_id: "turn-7", source: "studio_skill", utterance: "mute it" };
    const outcome = await explicitBalanceV1({ payload: PAYLOAD, environment: environmentFor(engine, provenance), utterance: "mute it", slots: { action: "mute" } });
    expect(outcome).toMatchObject({ kind: "completed" });
    expect(engine.batchBeginCalls).toHaveLength(1);
    const args = engine.batchBeginCalls[0]!.args;
    expect(args).toMatchObject({ name: PAYLOAD.id, turn_id: "turn-7", source: "studio_skill", utterance: "mute it" });
    expect(Object.keys(args)).toEqual(["transactionId", "name", "commands", "turn_id", "source", "utterance"]);
  });

  it("batch_begin args are unchanged when the environment carries no provenance", async () => {
    const engine = new FakeEngine([track({ id: "track-1", name: "Drums" })], "track-1");
    await explicitBalanceV1({ payload: PAYLOAD, environment: environmentFor(engine), utterance: "mute it", slots: { action: "mute" } });
    expect(engine.batchBeginCalls).toHaveLength(1);
    expect(Object.keys(engine.batchBeginCalls[0]!.args)).toEqual(["transactionId", "name", "commands"]);
  });
});

// ---------------------------------------------------------------------------------------
// Step-1 repair — slice 5 "Deterministic balance" (BRIEF-STEP1-USEFUL-EDITS-EXACTLY-ONCE
// section 3) after the independent audit's S5/S8/F1/F3 failures. The fixture is the
// audit's: Vocal at -10 dB with a -12 dB send to the "Reverb" return, Drums at 0 dB with NO
// send, and the Reverb return track itself. Nothing is selected — every ask names its track.
// ---------------------------------------------------------------------------------------

function auditFixture(extra: Track[] = []): FakeEngine {
  const engine = new FakeEngine([
    track({ id: "v", index: 0, name: "Vocal", volumeDb: -10, sends: [{ bus: 0, db: -12, mute: false }] }),
    track({ id: "d", index: 1, name: "Drums", volumeDb: 0 }),
    track({ id: "r", index: 2, name: "Reverb", type: "return", isReturn: true, returnBus: 0 }),
    ...extra,
  ], null);
  engine.buses = [{ bus: 0, name: "Reverb", trackId: "r" }];
  return engine;
}
const trackNamed = (engine: FakeEngine, name: string): Track => {
  const found = engine.tracks.find((t) => t.name === name);
  if (!found) throw new Error(`fixture has no track ${name}`);
  return found;
};
const vocalSendDb = (engine: FakeEngine): number | undefined => trackNamed(engine, "Vocal").sends?.[0]?.db;
const run = (engine: FakeEngine, utterance: string, slots: Record<string, string | number | boolean>, environment = environmentFor(engine)) =>
  explicitBalanceV1({ payload: PAYLOAD, environment, utterance, slots });

describe("explicitBalanceV1 — deterministic balance lane (step-1 slice 5)", () => {
  beforeEach(() => { clearExplicitBalanceContinuationsV1(); });

  describe("article-tolerant track resolution (S5)", () => {
    it("'set the vocal to -13 dB' resolves 'the vocal' to the track named Vocal and sets exactly -13", async () => {
      const engine = auditFixture();
      const outcome = await run(engine, "set the vocal to -13 dB", { action: "set_level", db: -13, trackName: "the vocal" });
      expect(outcome).toMatchObject({ kind: "completed" });
      expect(engine.mutationCalls).toEqual([{ command: "set_track_volume", args: { trackId: "v", db: -13 } }]);
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-13);
      expect(trackNamed(engine, "Drums").volumeDb).toBe(0);
    });

    it("a trailing 'track' and other articles resolve too ('my drums track' -> Drums); a NAMED target that matches nothing hands the turn back", async () => {
      const engine = auditFixture();
      expect(await run(engine, "set my drums track to -6 dB", { action: "set_level", db: -6, trackName: "my drums track" })).toMatchObject({ kind: "completed" });
      expect(trackNamed(engine, "Drums").volumeDb).toBe(-6);
      // "the keys" is not a track here. Ending the turn `blocked` would dead-end an ask the
      // router sends to the loop ("boost the highs 3 dB"); `unsupported` is the one outcome
      // the composer declines to finish, so the turn proceeds to the router. Zero mutation.
      const missing = await run(engine, "set the keys to -6 dB", { action: "set_level", db: -6, trackName: "the keys" });
      expect(missing).toMatchObject({ kind: "unsupported", code: "no_match" });
      expect(engine.mutationCalls).toHaveLength(1);
    });

    it("an ask with NO spoken name and no selection keeps its select-a-track guidance (not a fall-through)", async () => {
      const engine = auditFixture();
      const outcome = await run(engine, "set it to -6 dB", { action: "set_level", db: -6 });
      expect(outcome).toMatchObject({ kind: "blocked", code: "missing_target" });
      expect(engine.mutationCalls).toHaveLength(0);
    });

    it("the engine's fader position round trip (~2e-6 dB) no longer rolls a committed level back (S5, exact name)", async () => {
      const engine = auditFixture();
      engine.faderRoundTripError = 1.9e-6;                          // -13 reads back as -12.9999981
      const outcome = await run(engine, "set Vocal to -13 dB", { action: "set_level", db: -13, trackName: "Vocal" });
      expect(outcome).toMatchObject({ kind: "completed" });
      expect(engine.rollbackCalls).toBe(0);
      expect(trackNamed(engine, "Vocal").volumeDb).toBeCloseTo(-13, 5);
    });

    it("a readback a real 0.01 dB off the target still fails the postcondition and rolls back exactly", async () => {
      const engine = auditFixture();
      engine.faderRoundTripError = 0.01;
      const outcome = await run(engine, "set Vocal to -13 dB", { action: "set_level", db: -13, trackName: "Vocal" });
      expect(outcome).toMatchObject({ kind: "blocked", code: "postcondition_failed" });
      expect(engine.rollbackCalls).toBe(1);
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-10);
    });
  });

  describe("ambiguity is a question, never a guess (F1)", () => {
    it("'lower the vocals 3 dB' with Vocal and Vocal 2 present issues needs_choice naming both and runs ZERO commands", async () => {
      const engine = auditFixture([track({ id: "v2", index: 3, name: "Vocal 2", volumeDb: -8 })]);
      const outcome = await run(engine, "lower the vocals 3 dB", { action: "adjust_level", db: -3, trackName: "the vocals" });
      expect(outcome).toMatchObject({ kind: "needs_choice" });
      if (outcome.kind !== "needs_choice") throw new Error("expected needs_choice");
      expect(outcome.options.map((o) => o.label)).toEqual(["Vocal", "Vocal 2"]);
      expect(outcome.say).toContain("Vocal 2");
      expect(engine.batchBeginCalls).toHaveLength(0);
      expect(engine.mutationCalls).toEqual([]);
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-10);
      expect(trackNamed(engine, "Vocal 2").volumeDb).toBe(-8);
    });

    it("answering the question ('2') applies the pending RELATIVE move to the chosen track only", async () => {
      const engine = auditFixture([track({ id: "v2", index: 3, name: "Vocal 2", volumeDb: -8 })]);
      const environment = environmentFor(engine);
      const asked = await run(engine, "lower the vocals 3 dB", { action: "adjust_level", db: -3, trackName: "the vocals" }, environment);
      if (asked.kind !== "needs_choice") throw new Error("expected needs_choice");
      const resumed = await explicitBalanceV1({ payload: PAYLOAD, environment, utterance: "2", slots: {}, continuationToken: asked.continuationToken });
      expect(resumed).toMatchObject({ kind: "completed" });
      expect(engine.mutationCalls).toEqual([{ command: "set_track_volume", args: { trackId: "v2", db: -11 } }]);
      expect(trackNamed(engine, "Vocal 2").volumeDb).toBe(-11);
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-10);
    });
  });

  describe("relative fader moves (S1–S4)", () => {
    it("'lower the vocal 3 dB' takes Vocal -10 -> -13 from the snapshot value and says so", async () => {
      const engine = auditFixture();
      const outcome = await run(engine, "lower the vocal 3 dB", { action: "adjust_level", db: -3, trackName: "the vocal" });
      expect(outcome).toMatchObject({ kind: "completed", say: "Vocal −10 → −13 dB" });
      expect(engine.mutationCalls).toEqual([{ command: "set_track_volume", args: { trackId: "v", db: -13 } }]);
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-13);
    });

    it("'turn the drums down 2 dB' then 'raise the drums 2 dB' round-trips Drums 0 -> -2 -> 0", async () => {
      const engine = auditFixture();
      expect(await run(engine, "turn the drums down 2 dB", { action: "adjust_level", db: -2, trackName: "the drums" })).toMatchObject({ kind: "completed", say: "Drums 0 → −2 dB" });
      expect(trackNamed(engine, "Drums").volumeDb).toBe(-2);
      expect(await run(engine, "raise the drums 2 dB", { action: "adjust_level", db: 2, trackName: "the drums" })).toMatchObject({ kind: "completed", say: "Drums −2 → 0 dB" });
      expect(trackNamed(engine, "Drums").volumeDb).toBe(0);
      expect(engine.mutationCalls.map((c) => c.args.db)).toEqual([-2, 0]);
    });

    it("a pronoun target ('turn it down 2 dB') keeps the selected-track fallback", async () => {
      const engine = auditFixture();
      engine.selectedTrackId = "v";
      expect(await run(engine, "turn it down 2 dB", { action: "adjust_level", db: -2 })).toMatchObject({ kind: "completed" });
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-12);
    });

    it("the target is clamped to -60…+6 and the clamped value is what is sent", async () => {
      const engine = auditFixture();
      expect(await run(engine, "lower the vocal 80 dB", { action: "adjust_level", db: -80, trackName: "the vocal" })).toMatchObject({ kind: "completed", say: "Vocal −10 → −60 dB" });
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-60);
      expect(await run(engine, "raise the drums 20 dB", { action: "adjust_level", db: 20, trackName: "the drums" })).toMatchObject({ kind: "completed", say: "Drums 0 → 6 dB" });
      expect(trackNamed(engine, "Drums").volumeDb).toBe(6);
      expect(engine.mutationCalls.map((c) => c.args.db)).toEqual([-60, 6]);
    });

    it("computes from the engine's rounded readback, never from a stale remembered value", async () => {
      const engine = auditFixture();
      engine.faderRoundTripError = 1.9e-6;
      expect(await run(engine, "lower the vocal 3 dB", { action: "adjust_level", db: -3, trackName: "the vocal" })).toMatchObject({ kind: "completed", say: "Vocal −10 → −13 dB" });
      // The next move reads -12.9999981 back; its target is spoken and sent as -16, not -15.9999981.
      expect(await run(engine, "lower the vocal 3 dB", { action: "adjust_level", db: -3, trackName: "the vocal" })).toMatchObject({ kind: "completed", say: "Vocal −13 → −16 dB" });
      expect(engine.mutationCalls.map((c) => c.args.db)).toEqual([-13, -16]);
    });
  });

  describe("verified sends (S8–S10, F3)", () => {
    it("'set the vocal reverb send to -18 dB' -> set_send_level {Vocal, bus Reverb, -18}", async () => {
      const engine = auditFixture();
      const outcome = await run(engine, "set the vocal reverb send to -18 dB", { action: "send_level", db: -18, trackName: "the vocal", bus: "reverb", mode: "absolute" });
      expect(outcome).toMatchObject({ kind: "completed" });
      expect(engine.mutationCalls).toEqual([{ command: "set_send_level", args: { trackId: "v", bus: 0, db: -18 } }]);
      expect(vocalSendDb(engine)).toBe(-18);
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-10);
    });

    it("the runtime only forwards action/db/trackName — the handler recovers the bus and mode from the utterance itself", async () => {
      const engine = auditFixture();
      const outcome = await run(engine, "set the vocal reverb send to -18 dB", { action: "send_level", db: -18, trackName: "the vocal" });
      expect(outcome).toMatchObject({ kind: "completed" });
      expect(engine.mutationCalls).toEqual([{ command: "set_send_level", args: { trackId: "v", bus: 0, db: -18 } }]);
    });

    it("'more reverb on the vocal' moves the send by the spoken default +3 dB (-12 -> -9)", async () => {
      const engine = auditFixture();
      const outcome = await run(engine, "more reverb on the vocal", { action: "send_level", db: 3, trackName: "the vocal", bus: "reverb", mode: "relative" });
      expect(outcome).toMatchObject({ kind: "completed" });
      if (outcome.kind !== "completed") throw new Error("expected completed");
      expect(outcome.say).toContain("Vocal → Reverb send −12 → −9 dB");
      expect(outcome.say).toContain("+3 dB");
      expect(outcome.say).toMatch(/default/);
      expect(engine.mutationCalls).toEqual([{ command: "set_send_level", args: { trackId: "v", bus: 0, db: -9 } }]);
      expect(vocalSendDb(engine)).toBe(-9);
    });

    it("'less reverb on the vocal by 6 dB' moves the send -12 -> -18 with no 'default' wording", async () => {
      const engine = auditFixture();
      const outcome = await run(engine, "less reverb on the vocal by 6 dB", { action: "send_level", db: -6, trackName: "the vocal", bus: "reverb", mode: "relative" });
      expect(outcome).toMatchObject({ kind: "completed", say: "Vocal → Reverb send −12 → −18 dB" });
      expect(vocalSendDb(engine)).toBe(-18);
    });

    it("F3: 'more reverb on the drums' with no Drums->Reverb send blocks, says to add one, and never issues add_send", async () => {
      const engine = auditFixture();
      const outcome = await run(engine, "more reverb on the drums", { action: "send_level", db: 3, trackName: "the drums", bus: "reverb", mode: "relative" });
      expect(outcome).toMatchObject({ kind: "blocked", code: "missing_target", say: "Drums has no send to Reverb — add one first" });
      expect(engine.batchBeginCalls).toHaveLength(0);
      expect(engine.mutationCalls).toEqual([]);
      expect(trackNamed(engine, "Drums").sends).toBeUndefined();
    });

    it("a bus word that matches no bus blocks with missing_target; 'verb' and 'echo' alias Reverb and Delay", async () => {
      const engine = auditFixture();
      engine.buses.push({ bus: 1, name: "Delay", trackId: "dl" });
      trackNamed(engine, "Vocal").sends!.push({ bus: 1, db: -20, mute: false });
      expect(await run(engine, "more space on the vocal", { action: "send_level", db: 3, trackName: "the vocal", bus: "space", mode: "relative" })).toMatchObject({ kind: "blocked", code: "missing_target" });
      expect(await run(engine, "less verb on the vocal", { action: "send_level", db: -3, trackName: "the vocal", bus: "verb", mode: "relative" })).toMatchObject({ kind: "completed" });
      expect(await run(engine, "more echo on the vocal", { action: "send_level", db: 3, trackName: "the vocal", bus: "echo", mode: "relative" })).toMatchObject({ kind: "completed" });
      expect(engine.mutationCalls).toEqual([
        { command: "set_send_level", args: { trackId: "v", bus: 0, db: -15 } },
        { command: "set_send_level", args: { trackId: "v", bus: 1, db: -17 } },
      ]);
    });

    it("an out-of-range absolute send level is refused with no mutation", async () => {
      const engine = auditFixture();
      expect(await run(engine, "set the vocal reverb send to -80 dB", { action: "send_level", db: -80, trackName: "the vocal", bus: "reverb", mode: "absolute" })).toMatchObject({ kind: "blocked", code: "invalid_slot" });
      expect(engine.mutationCalls).toEqual([]);
    });

    it("a send readback off the target by more than 0.05 dB fails the postcondition and rolls back", async () => {
      const engine = auditFixture();
      const environment = environmentFor(engine);
      const originalExec = environment.exec;
      (environment as { exec: typeof originalExec }).exec = async (command, args, transaction) => {
        const result = await originalExec(command, args, transaction);
        if (command === "set_send_level") trackNamed(engine, "Vocal").sends![0]!.db = (args.db as number) + 0.2;
        return result;
      };
      const outcome = await run(engine, "set the vocal reverb send to -18 dB", { action: "send_level", db: -18, trackName: "the vocal", bus: "reverb", mode: "absolute" }, environment);
      expect(outcome).toMatchObject({ kind: "blocked", code: "postcondition_failed" });
      expect(engine.rollbackCalls).toBe(1);
      expect(vocalSendDb(engine)).toBe(-12);
    });
  });

  describe("'another N dB' (S3, F2)", () => {
    it("F2: as the first ask it blocks, asks for the track, and runs nothing", async () => {
      const engine = auditFixture();
      const outcome = await run(engine, "another 3 dB", { action: "repeat_last", db: 3 });
      expect(outcome).toMatchObject({ kind: "blocked", code: "missing_target", say: "another what? name the track" });
      expect(engine.batchBeginCalls).toHaveLength(0);
      expect(engine.mutationCalls).toEqual([]);
    });

    it("S3: right after 'lower the vocal 3 dB' (-10 -> -13) it takes Vocal to -16", async () => {
      const engine = auditFixture();
      await run(engine, "lower the vocal 3 dB", { action: "adjust_level", db: -3, trackName: "the vocal" });
      const outcome = await run(engine, "another 3 dB", { action: "repeat_last", db: 3 });
      expect(outcome).toMatchObject({ kind: "completed", say: "Vocal −13 → −16 dB" });
      expect(engine.mutationCalls).toEqual([
        { command: "set_track_volume", args: { trackId: "v", db: -13 } },
        { command: "set_track_volume", args: { trackId: "v", db: -16 } },
      ]);
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-16);
    });

    it("'same again' reuses the last amount and direction; 'N dB more' takes a new amount", async () => {
      const engine = auditFixture();
      await run(engine, "raise the drums 2 dB", { action: "adjust_level", db: 2, trackName: "the drums" });
      expect(await run(engine, "same again", { action: "repeat_last" })).toMatchObject({ kind: "completed", say: "Drums 2 → 4 dB" });
      expect(await run(engine, "1 dB more", { action: "repeat_last", db: 1 })).toMatchObject({ kind: "completed", say: "Drums 4 → 5 dB" });
      expect(trackNamed(engine, "Drums").volumeDb).toBe(5);
    });

    it("follows a send move too: 'more reverb on the vocal' then 'another 3 dB' takes the send -9 -> -6", async () => {
      const engine = auditFixture();
      await run(engine, "more reverb on the vocal", { action: "send_level", db: 3, trackName: "the vocal", bus: "reverb", mode: "relative" });
      const outcome = await run(engine, "another 3 dB", { action: "repeat_last", db: 3 });
      expect(outcome).toMatchObject({ kind: "completed", say: "Vocal → Reverb send −9 → −6 dB" });
      expect(vocalSendDb(engine)).toBe(-6);
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-10);
    });

    it("an absolute 'set … to N dB' seeds nothing — 'another' after it still asks for the track", async () => {
      const engine = auditFixture();
      await run(engine, "set the vocal to -13 dB", { action: "set_level", db: -13, trackName: "the vocal" });
      expect(await run(engine, "another 3 dB", { action: "repeat_last", db: 3 })).toMatchObject({ kind: "blocked", code: "missing_target" });
      expect(engine.mutationCalls).toHaveLength(1);
    });

    it("refuses across a project-epoch change", async () => {
      const engine = auditFixture();
      await run(engine, "lower the vocal 3 dB", { action: "adjust_level", db: -3, trackName: "the vocal" });
      engine.projectEpoch += 1;
      expect(await run(engine, "another 3 dB", { action: "repeat_last", db: 3 })).toMatchObject({ kind: "blocked", code: "missing_target" });
      expect(engine.mutationCalls).toHaveLength(1);
    });

    it("expires ten minutes after the last completed move (the environment's clock)", async () => {
      const engine = auditFixture();
      let now = 1_000_000;
      const environment = environmentFor(engine, undefined, () => now);
      await run(engine, "lower the vocal 3 dB", { action: "adjust_level", db: -3, trackName: "the vocal" }, environment);
      now += 9 * 60_000;
      expect(await run(engine, "another 3 dB", { action: "repeat_last", db: 3 }, environment)).toMatchObject({ kind: "completed" });
      now += 10 * 60_000 + 1;
      expect(await run(engine, "another 3 dB", { action: "repeat_last", db: 3 }, environment)).toMatchObject({ kind: "blocked", code: "missing_target" });
      expect(trackNamed(engine, "Vocal").volumeDb).toBe(-16);
    });

    it("a project replacement (the runtime's clear hook) forgets the last move", async () => {
      const engine = auditFixture();
      await run(engine, "lower the vocal 3 dB", { action: "adjust_level", db: -3, trackName: "the vocal" });
      clearExplicitBalanceContinuationsV1();
      expect(await run(engine, "another 3 dB", { action: "repeat_last", db: 3 })).toMatchObject({ kind: "blocked", code: "missing_target" });
    });
  });
});
