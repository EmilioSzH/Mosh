// The loop FSM, unit-tested with a scripted chat + a scripted env — the
// skillHarness deps-injection idiom. No network, no store: the FSM's contract
// is (chat replies in, batches out, outcome honest).

import { describe, it, expect } from "vitest";
import { runAgentLoop, DEFAULT_LOOP_BUDGETS, type LoopDeps } from "./loop";
import type { Snapshot } from "../../types";
import type { StepCommandResult } from "../loopSeam";

const SNAP = { schemaVersion: 1, session: { tempo: 120 }, tracks: [], transport: {}, master: { volumeDb: -3, pan: 0, plugins: [] } } as unknown as Snapshot;

function scriptedChat(replies: Array<Record<string, unknown> | string>) {
  const seen: string[] = [];
  return {
    seen,
    chat: async (messages: Array<{ role: string; content: string }>) => {
      seen.push(messages[messages.length - 1]!.content);
      const next = replies.shift();
      if (next === undefined) throw new Error("scripted chat exhausted");
      return { content: typeof next === "string" ? next : JSON.stringify(next), ms: 1 };
    },
  };
}

/** Env whose runBatch pops scripted per-batch results; ok-by-default. */
function scriptedEnv(script: Array<StepCommandResult[] | "ok">) {
  const batches: Array<{ label: string; commands: string[] }> = [];
  return {
    batches,
    env: {
      async getSnapshot() { return SNAP; },
      async runBatch(label: string, calls: readonly { command: string }[]) {
        batches.push({ label, commands: calls.map((c) => c.command) });
        const next = script.shift() ?? "ok";
        const results = next === "ok"
          ? calls.map((c) => ({ command: c.command, ok: true }))
          : next;
        return { results, snapshot: SNAP };
      },
    },
  };
}

const CMD = (command: string, args: Record<string, unknown> = {}) => ({ command, args });

describe("runAgentLoop — the FSM", () => {
  it("happy path: a fully-inline plan executes with ONE model call and finishes done", async () => {
    const { chat, seen } = scriptedChat([
      { intent: "ACK_WORKING", say: "building it", status: "continue", plan: [
        { goal: "tempo", commands: [CMD("set_tempo", { bpm: 90 })] },
        { goal: "drums", commands: [CMD("add_drum_pattern", { pattern: "kick: x..." })] },
      ] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok"]);
    const run = await runAgentLoop({ ask: "make a beat" }, { chat, env } as LoopDeps);

    expect(run.outcome).toBe("done");
    expect(run.stepCount).toBe(2);
    expect(batches.map((b) => b.commands)).toEqual([["set_tempo"], ["add_drum_pattern"]]);
    expect(seen).toHaveLength(1); // plan call only — no closing call for a completed plan
    expect(run.deferred).toBe(false);
  });

  it("goal-only plan steps are compiled with one call each, then done at exhaustion", async () => {
    const { chat, seen } = scriptedChat([
      { status: "continue", plan: [{ goal: "set the tempo" }, { goal: "mute the vocal" }] },
      { status: "continue", commands: [CMD("set_tempo", { bpm: 100 })] },
      { status: "continue", commands: [CMD("set_track_mute", { trackId: "1", mute: true })] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok"]);
    const run = await runAgentLoop({ ask: "prep the session" }, { chat, env } as LoopDeps);

    expect(run.outcome).toBe("done");
    expect(batches).toHaveLength(2);
    expect(seen).toHaveLength(3);
    expect(seen[1]).toContain("set the tempo");   // the compile call names its goal
    expect(seen[2]).toContain("mute the vocal");
  });

  it("a compile reply that re-wraps its commands inside a plan entry is still executed (first live produce run, 2026-09-02)", async () => {
    const { chat } = scriptedChat([
      { status: "continue", plan: [{ goal: "drums" }, { goal: "808" }] },
      // compile for "drums": commands at top level (the documented shape)
      { status: "continue", commands: [CMD("add_midi_clip", { trackId: "1", start: 0, length: 32 })] },
      // compile for "808": Sonnet echoed the plan and put the commands in plan[1]
      { status: "continue", plan: [{ goal: "drums" }, { goal: "808", commands: [CMD("add_midi_clip", { trackId: "2", start: 0, length: 32 })] }] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok"]);
    const run = await runAgentLoop({ ask: "produce a beat" }, { chat, env } as LoopDeps);

    expect(run.outcome).toBe("done");
    expect(batches).toHaveLength(2);
    expect(batches[1]!.commands).toEqual(["add_midi_clip"]);
  });

  it("a compile reply whose plan carries commands in SEVERAL entries is still 'no commands' (error, not a guess)", async () => {
    const { chat } = scriptedChat([
      { status: "continue", plan: [{ goal: "drums" }] },
      { status: "continue", plan: [{ goal: "a", commands: [CMD("set_tempo", { bpm: 90 })] }, { goal: "b", commands: [CMD("set_tempo", { bpm: 91 })] }] },
    ]);
    const { env, batches } = scriptedEnv([]);
    const run = await runAgentLoop({ ask: "produce a beat" }, { chat, env } as LoopDeps);
    expect(run.outcome).toBe("error");
    expect(batches).toHaveLength(0);
  });

  it("a failed step triggers ONE repair call that sees the verbatim error", async () => {
    const { chat, seen } = scriptedChat([
      { status: "continue", plan: [{ goal: "warp", commands: [CMD("set_clip_warp", { clipId: "9", autoTempo: true })] }] },
      { status: "done", say: "fixed", commands: [CMD("stretch_clip", { clipId: "9", bars: 4 })] },
    ]);
    const { env, batches } = scriptedEnv([
      [{ command: "set_clip_warp", ok: false, error: "not an audio clip" }],
      "ok",
    ]);
    const run = await runAgentLoop({ ask: "warp it" }, { chat, env } as LoopDeps);

    expect(run.outcome).toBe("done");
    expect(run.stepCount).toBe(2);
    expect(seen[1]).toContain("not an audio clip");      // the error envelope, verbatim
    expect(batches[1]!.commands).toEqual(["stretch_clip"]);
  });

  it("a repair that keeps failing lands outcome error within the planner budget", async () => {
    const fail = [{ command: "set_tempo", ok: false, error: "nope" }];
    const { chat } = scriptedChat([
      { status: "continue", plan: [{ goal: "t", commands: [CMD("set_tempo", { bpm: 90 })] }] },
      { status: "continue", commands: [CMD("set_tempo", { bpm: 90 })] },  // repair 1 — fails again
      { status: "continue", commands: [CMD("set_tempo", { bpm: 90 })] },  // repair 2 — fails again
    ]);
    const { env } = scriptedEnv([fail, fail, fail]);
    const run = await runAgentLoop({ ask: "x" }, { chat, env } as LoopDeps);

    expect(run.outcome).toBe("error");
    expect(run.stepCount).toBe(3); // original + 2 repair attempts, then the planner budget (3) is spent
  });

  it("need_user parks the task deferred with zero batches", async () => {
    const { chat } = scriptedChat([{ intent: "HUH", say: "which clip?", status: "need_user" }]);
    const { env, batches } = scriptedEnv([]);
    const run = await runAgentLoop({ ask: "fix the bad one" }, { chat, env } as LoopDeps);

    expect(run.outcome).toBe("need_user");
    expect(run.deferred).toBe(true);
    expect(run.say).toBe("which clip?");
    expect(batches).toHaveLength(0);
  });

  it("bare-commands incremental mode: continue → another call, done closes", async () => {
    const { chat, seen } = scriptedChat([
      { status: "continue", commands: [CMD("create_track", { name: "A" })] },
      { status: "done", commands: [CMD("set_track_volume", { trackId: "1", db: -3 })] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok"]);
    const run = await runAgentLoop({ ask: "add and level a track" }, { chat, env } as LoopDeps);

    expect(run.outcome).toBe("done");
    expect(batches).toHaveLength(2);
    expect(seen).toHaveLength(2);
  });

  it("the step budget stops a runaway plan honestly", async () => {
    const steps = Array.from({ length: 10 }, (_, i) => ({ goal: `s${i}`, commands: [CMD("set_tempo", { bpm: 60 + i })] }));
    const { chat } = scriptedChat([{ status: "continue", plan: steps }]);
    const { env, batches } = scriptedEnv(Array(10).fill("ok"));
    const run = await runAgentLoop({ ask: "x" }, { chat, env, budgets: { maxSteps: 3 } } as LoopDeps);

    expect(run.outcome).toBe("budget");
    expect(batches).toHaveLength(3);
  });

  it("abort stops before the next step and reports aborted", async () => {
    const signal = { aborted: false };
    const { chat } = scriptedChat([
      { status: "continue", plan: [
        { goal: "a", commands: [CMD("set_tempo", { bpm: 90 })] },
        { goal: "b", commands: [CMD("set_tempo", { bpm: 91 })] },
      ] },
    ]);
    const base = scriptedEnv(["ok", "ok"]);
    const env = {
      ...base.env,
      async runBatch(label: string, calls: readonly { command: string }[]) {
        signal.aborted = true; // user hits Stop while the first batch runs
        return base.env.runBatch(label, calls);
      },
    };
    const run = await runAgentLoop({ ask: "x" }, { chat, env, signal } as LoopDeps);

    expect(run.outcome).toBe("aborted");
    expect(run.stepCount).toBe(1);
    expect(base.batches).toHaveLength(1);
  });

  it("a planning-call crash reports outcome error, never a silent empty done", async () => {
    const chat = async () => { throw new Error("socket down"); };
    const { env } = scriptedEnv([]);
    const run = await runAgentLoop({ ask: "x" }, { chat, env } as LoopDeps);

    expect(run.outcome).toBe("error");
    expect(run.error).toMatch(/socket down/);
    expect(run.deferred).toBe(true);
  });

  it("defaults are the approved budgets", () => {
    expect(DEFAULT_LOOP_BUDGETS).toMatchObject({ maxSteps: 8, maxPlannerCalls: 3, maxStepCalls: 8 });
  });
});

describe("runAgentLoop — M2 deps.memory forwarding", () => {
  // deps.memory is a pre-rendered string the app-side glue (runTask.ts) computes
  // ONCE before the loop starts — the FSM itself never calls the bridge. This proves
  // the FSM actually threads it into buildLoopSystemPrompt on EVERY model call
  // (plan + any repair/continue), not just the first.
  function scriptedChatCapturingSystem(replies: Array<Record<string, unknown> | string>) {
    const systemSeen: string[] = [];
    return {
      systemSeen,
      chat: async (messages: Array<{ role: string; content: string }>) => {
        systemSeen.push(messages[0]!.content);
        const next = replies.shift();
        if (next === undefined) throw new Error("scripted chat exhausted");
        return { content: typeof next === "string" ? next : JSON.stringify(next), ms: 1 };
      },
    };
  }

  it("an omitted deps.memory never adds a Memory section to the system prompt", async () => {
    const { chat, systemSeen } = scriptedChatCapturingSystem([
      { status: "done", commands: [] },
    ]);
    const { env } = scriptedEnv(["ok"]);
    await runAgentLoop({ ask: "x" }, { chat, env } as LoopDeps);
    expect(systemSeen[0]).not.toContain("Memory —");
  });

  it("a provided deps.memory appears in EVERY model call's system prompt (plan AND a follow-up repair call)", async () => {
    const { chat, systemSeen } = scriptedChatCapturingSystem([
      { status: "continue", plan: [{ goal: "a" }] },   // plan call — no commands, needs a compile
      { status: "done", commands: [CMD("set_tempo", { bpm: 90 })] },  // compile call for step "a"
    ]);
    const { env } = scriptedEnv(["ok"]);
    const run = await runAgentLoop({ ask: "x" }, {
      chat, env, memory: "Memory — a made-up section.\n- (this project) a fact",
    } as LoopDeps);

    expect(run.outcome).toBe("done");
    expect(systemSeen.length).toBeGreaterThanOrEqual(2);
    for (const sys of systemSeen) expect(sys).toContain("Memory — a made-up section.");
  });
});

describe("runAgentLoop — exactly once (step-1 slice 3)", () => {
  // R3 in docs/pivot-2026-09/BRIEF-STEP1-USEFUL-EDITS-EXACTLY-ONCE.md: the live log
  // (seq 289–294) showed A,B,A,B in one transaction, two batches ~20 ms apart, ONE
  // model reply — the reply carried the same commands at the top level AND on
  // plan[0], and the plan build ran the top-level copy as a "start" step ahead of
  // the plan step that already carried them.
  //
  // The rule is deliberately NARROW (verifier round on 4fdf12fc): only the
  // planner's top-level copy is deduped against the plan, at plan build. Steps the
  // model AUTHORED as repeats ("duplicate it twice", undo/undo) execute as written;
  // a repair that re-sends a command which already succeeded in the failed step
  // skips just that command. Every dropped/skipped command is visible: a note on
  // the transcript step it rides with and a `skip` progress event.
  const A = CMD("transform_notes", { clipId: "9", op: "transpose", semitones: 2 });
  const B = CMD("set_drum_pad", { trackId: "3", pad: 0, sample: "kick.wav" });
  const C = CMD("set_tempo", { bpm: 90 });

  /** Captures every progress event, returning the `skip` ones for assertions. */
  function progressSpy() {
    const events: Array<{ kind: string } & Record<string, unknown>> = [];
    return {
      events,
      onProgress: (e: { kind: string }) => { events.push(e as { kind: string } & Record<string, unknown>); },
      skips: () => events.filter((e) => e.kind === "skip"),
    };
  }

  it("a reply carrying the same commands at top level AND on plan[0] executes ONE batch", async () => {
    const { chat } = scriptedChat([
      { status: "continue", say: "on it", commands: [A, B], plan: [{ goal: "do both", commands: [A, B] }] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok"]);
    const run = await runAgentLoop({ ask: "transpose and swap the kick" }, { chat, env } as LoopDeps);

    expect(batches.map((b) => b.commands)).toEqual([["transform_notes", "set_drum_pad"]]);
    expect(run.stepCount).toBe(1);
    expect(run.outcome).toBe("done");
  });

  it("an additive add_note issued twice in one reply (top level + flattened across plan steps) lands each note once", async () => {
    const n1 = CMD("add_note", { clipId: "101", pitch: 69, start: 0, length: 0.5, velocity: 88 });
    const n2 = CMD("add_note", { clipId: "101", pitch: 72, start: 0.5, length: 0.5, velocity: 82 });
    const { chat } = scriptedChat([
      { status: "continue", commands: [n1, n2], plan: [{ goal: "first note", commands: [n1] }, { goal: "second note", commands: [n2] }] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok", "ok"]);
    const run = await runAgentLoop({ ask: "two notes" }, { chat, env } as LoopDeps);

    // two batches (one per plan step) — never a third "start" batch re-adding both notes
    expect(batches.map((b) => b.commands)).toEqual([["add_note"], ["add_note"]]);
    expect(run.stepCount).toBe(2);
    expect(run.outcome).toBe("done");
  });

  it("a top-level copy that only PARTLY overlaps plan[0] runs the remainder as the start step — each command once, the drop visible", async () => {
    const spy = progressSpy();
    const { chat } = scriptedChat([
      { status: "continue", commands: [A, B, C], plan: [{ goal: "notes and kick", commands: [A, B] }] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok", "ok"]);
    const run = await runAgentLoop({ ask: "x" }, { chat, env, onProgress: spy.onProgress } as LoopDeps);

    expect(batches.map((b) => b.commands)).toEqual([["set_tempo"], ["transform_notes", "set_drum_pad"]]);
    expect(run.stepCount).toBe(2);
    expect(run.outcome).toBe("done");
    // the two dropped commands are visible: a transcript note on the step they ride with…
    expect(run.transcript[0]!.say).toMatch(/skipped 2 .*transform_notes, set_drum_pad/);
    // …and a skip progress event naming them
    expect(spy.skips()).toHaveLength(1);
    expect(spy.skips()[0]).toMatchObject({ kind: "skip", index: 0, commands: [A, B] });
  });

  it("an ORDER-SWAPPED top-level copy (list order and arg key order) is still the plan's copy — one batch", async () => {
    const spy = progressSpy();
    const Aswapped = CMD("transform_notes", { semitones: 2, op: "transpose", clipId: "9" });   // same call, keys reordered
    const { chat } = scriptedChat([
      { status: "continue", commands: [B, Aswapped], plan: [{ goal: "do both", commands: [A, B] }] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok"]);
    const run = await runAgentLoop({ ask: "x" }, { chat, env, onProgress: spy.onProgress } as LoopDeps);

    expect(batches.map((b) => b.commands)).toEqual([["transform_notes", "set_drum_pad"]]);
    expect(run.stepCount).toBe(1);
    expect(run.outcome).toBe("done");
    expect(run.transcript[0]!.say).toMatch(/skipped 2 /);
    expect(spy.skips()[0]).toMatchObject({ kind: "skip", commands: [B, Aswapped] });
  });

  it("two AUTHORED duplicate_clip steps both execute ('duplicate it twice') — nothing skipped, nothing noted", async () => {
    const spy = progressSpy();
    const dup = CMD("duplicate_clip", { clipId: "9" });
    const { chat } = scriptedChat([
      { status: "continue", plan: [
        { goal: "copy 1", commands: [dup] },
        { goal: "copy 2", commands: [dup] },               // authored repeat ⇒ executes
        { goal: "b", commands: [CMD("set_track_mute", { trackId: "1", mute: true })] },
      ] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok", "ok"]);
    const run = await runAgentLoop({ ask: "duplicate it twice" }, { chat, env, onProgress: spy.onProgress } as LoopDeps);

    expect(batches.map((b) => b.commands)).toEqual([["duplicate_clip"], ["duplicate_clip"], ["set_track_mute"]]);
    expect(run.stepCount).toBe(3);
    expect(run.outcome).toBe("done");
    expect(spy.skips()).toEqual([]);
    expect(run.transcript.every((s) => s.say === undefined)).toBe(true);
  });

  it("undo, undo — two authored identical steps at the END of a plan both execute and finish done", async () => {
    const { chat } = scriptedChat([
      { status: "continue", plan: [
        { goal: "back one", commands: [CMD("undo")] },
        { goal: "back two", commands: [CMD("undo")] },
      ] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok"]);
    const run = await runAgentLoop({ ask: "undo the last two" }, { chat, env } as LoopDeps);
    expect(batches.map((b) => b.commands)).toEqual([["undo"], ["undo"]]);
    expect(run.outcome).toBe("done");
  });

  it("bare-commands continue mode: a model repeating its commands executes them again (authored) instead of being re-asked until the budget dies", async () => {
    const { chat, seen } = scriptedChat([
      { status: "continue", commands: [C] },
      { status: "continue", commands: [C] },              // repeated verbatim ⇒ executes
      { status: "done", commands: [] },
    ]);
    const { env, batches } = scriptedEnv(["ok", "ok"]);
    const run = await runAgentLoop({ ask: "x" }, { chat, env } as LoopDeps);

    expect(batches.map((b) => b.commands)).toEqual([["set_tempo"], ["set_tempo"]]);
    expect(seen).toHaveLength(3);
    expect(run.outcome).toBe("done");
  });

  it("a plan step whose only twin is the previous FAILED step is NOT skipped (repair semantics intact)", async () => {
    const { chat } = scriptedChat([
      { status: "continue", plan: [{ goal: "t", commands: [CMD("set_tempo", { bpm: 90 })] }] },
      { status: "done", commands: [CMD("set_tempo", { bpm: 90 })] },   // repair repeats it verbatim; the env now accepts
    ]);
    const { env, batches } = scriptedEnv([
      [{ command: "set_tempo", ok: false, error: "transport busy" }],
      "ok",
    ]);
    const run = await runAgentLoop({ ask: "x" }, { chat, env } as LoopDeps);
    expect(batches).toHaveLength(2);
    expect(run.outcome).toBe("done");
  });

  it("a repair twin of a PARTIALLY failed step re-runs only what did not succeed, and says so", async () => {
    const spy = progressSpy();
    const W = CMD("set_clip_warp", { clipId: "9", autoTempo: true });
    const S = CMD("stretch_clip", { clipId: "9", bars: 4 });
    const { chat } = scriptedChat([
      { status: "continue", plan: [{ goal: "tempo and warp", commands: [C, W] }] },
      { status: "done", say: "fixed", commands: [C, S] },   // the twin re-sends C, which already landed
    ]);
    const { env, batches } = scriptedEnv([
      [{ command: "set_tempo", ok: true }, { command: "set_clip_warp", ok: false, error: "not an audio clip" }],
      "ok",
    ]);
    const run = await runAgentLoop({ ask: "warp it" }, { chat, env, onProgress: spy.onProgress } as LoopDeps);

    expect(batches.map((b) => b.commands)).toEqual([["set_tempo", "set_clip_warp"], ["stretch_clip"]]);
    expect(run.outcome).toBe("done");
    expect(run.stepCount).toBe(2);
    // the repair step's record holds only what was submitted (aligned with its results) plus the note
    expect(run.transcript[1]!.commands).toEqual([S]);
    expect(run.transcript[1]!.results).toEqual([{ command: "stretch_clip", ok: true }]);
    expect(run.transcript[1]!.say).toMatch(/skipped 1 .*set_tempo/);
    expect(spy.skips()).toHaveLength(1);
    expect(spy.skips()[0]).toMatchObject({ kind: "skip", index: 1, commands: [C] });
  });

  it("a two-round repair chain never re-runs a command that succeeded earlier in the chain", async () => {
    const spy = progressSpy();
    const N = CMD("add_note", { clipId: "9", pitch: 60, start: 0, length: 1 });
    const W = CMD("set_clip_warp", { clipId: "9", autoTempo: true });
    const S1 = CMD("stretch_clip", { clipId: "9", bars: 4 });
    const S2 = CMD("stretch_clip", { clipId: "9", bars: 2 });
    const { chat } = scriptedChat([
      { status: "continue", plan: [{ goal: "note and warp", commands: [N, W] }] },
      { status: "continue", commands: [S1] },              // repair 1 — fails too
      { status: "done", say: "fixed", commands: [N, S2] }, // repair 2 re-sends N, which landed in step 1
    ]);
    const { env, batches } = scriptedEnv([
      [{ command: "add_note", ok: true }, { command: "set_clip_warp", ok: false, error: "not an audio clip" }],
      [{ command: "stretch_clip", ok: false, error: "too short" }],
      "ok",
    ]);
    const run = await runAgentLoop({ ask: "warp it" }, { chat, env, onProgress: spy.onProgress } as LoopDeps);

    // add_note is issued exactly once across the whole chain (RED before the chain-wide window: twice)
    expect(batches.map((b) => b.commands)).toEqual([["add_note", "set_clip_warp"], ["stretch_clip"], ["stretch_clip"]]);
    expect(run.outcome).toBe("done");
    expect(spy.skips().map((s) => s.commands)).toEqual([[N]]);
    expect(run.transcript[2]!.say).toMatch(/skipped 1 .*steps 1–2.*add_note/);
  });

  it("a repair that re-sends ONLY already-applied commands runs nothing, ends by its status, and the skip stays visible", async () => {
    const spy = progressSpy();
    const W = CMD("set_clip_warp", { clipId: "9", autoTempo: true });
    const { chat, seen } = scriptedChat([
      { status: "continue", plan: [{ goal: "tempo and warp", commands: [C, W] }] },
      { status: "continue", commands: [C] },                 // nothing new: C landed, W was dropped without a fix
    ]);
    const { env, batches } = scriptedEnv([
      [{ command: "set_tempo", ok: true }, { command: "set_clip_warp", ok: false, error: "not an audio clip" }],
      "ok",
    ]);
    const run = await runAgentLoop({ ask: "warp it" }, { chat, env, onProgress: spy.onProgress } as LoopDeps);

    expect(batches).toHaveLength(1);                         // no second batch, no re-ask loop
    expect(seen).toHaveLength(2);
    expect(run.outcome).toBe("error");                       // same rule as an empty repair reply
    expect(run.stepCount).toBe(1);
    expect(run.transcript[0]!.results.map((r) => r.ok)).toEqual([true, false]);   // the failure is not masked
    expect(run.transcript[0]!.say).toMatch(/skipped 1 .*set_tempo/);
    expect(spy.skips()[0]).toMatchObject({ kind: "skip", index: 1, commands: [C] });
  });
});

describe("runAgentLoop — session-revision binding (step-1 slice 3)", () => {
  // The engine slice exposes `session.revision` (MoshOps editRevision_, bumped by
  // every mutating command and by undo/redo). The loop records it after each batch
  // and re-reads it right before the next batch: a GUI edit in between (F5 in the
  // brief) parks the task instead of acting on a plan made against a stale session.
  const SAY = "the session changed while I was working — ask again";
  const withRevision = (revision: number | undefined): Snapshot =>
    ({ ...SNAP, session: { ...(SNAP.session as object), ...(revision === undefined ? {} : { revision }) } } as unknown as Snapshot);

  /** An env whose every mutation bumps a revision counter; `gui()` simulates a fader
   *  move outside the loop (bumps the counter without a batch). */
  function revisionEnv(initial: number | undefined) {
    let rev = initial;
    const batches: string[][] = [];
    let snapshotReads = 0;
    return {
      batches,
      reads: () => snapshotReads,
      gui: () => { if (rev !== undefined) rev++; },
      env: {
        async getSnapshot() { snapshotReads++; return withRevision(rev); },
        async runBatch(_label: string, calls: readonly { command: string }[]) {
          batches.push(calls.map((c) => c.command));
          if (rev !== undefined) rev++;              // our own batch bumps it — that is NOT drift
          return { results: calls.map((c) => ({ command: c.command, ok: true })), snapshot: withRevision(rev) };
        },
      },
    };
  }
  const twoStepPlan = () => scriptedChat([
    { status: "continue", plan: [
      { goal: "a", commands: [CMD("set_track_volume", { trackId: "1", db: -13 })] },
      { goal: "b", commands: [CMD("set_track_volume", { trackId: "2", db: -2 })] },
    ] },
  ]);

  it("a revision that moved between two steps parks need_user after exactly one batch", async () => {
    const { chat } = twoStepPlan();
    const r = revisionEnv(7);
    const env = {
      ...r.env,
      async runBatch(label: string, calls: readonly { command: string }[]) {
        const out = await r.env.runBatch(label, calls);
        r.gui();                                      // a fader move lands right after batch 1
        return out;
      },
    };
    const run = await runAgentLoop({ ask: "x" }, { chat, env } as LoopDeps);

    expect(r.batches).toEqual([["set_track_volume"]]);
    expect(run.outcome).toBe("need_user");
    expect(run.say).toBe(SAY);
    expect(run.stepCount).toBe(1);
  });

  it("a revision moved between the plan and the FIRST step parks with zero batches (F5)", async () => {
    const { chat } = twoStepPlan();
    const r = revisionEnv(7);
    let planned = false;
    const chatThenGui = async (messages: Array<{ role: string; content: string }>) => {
      const reply = await chat(messages);
      if (!planned) { planned = true; r.gui(); }     // the GUI edit lands while the model is planning
      return reply;
    };
    const run = await runAgentLoop({ ask: "x" }, { chat: chatThenGui, env: r.env } as LoopDeps);

    expect(r.batches).toEqual([]);
    expect(run.outcome).toBe("need_user");
    expect(run.say).toBe(SAY);
    expect(run.deferred).toBe(true);
  });

  it("our own batches bump the revision without tripping the guard — both steps run", async () => {
    const { chat } = twoStepPlan();
    const r = revisionEnv(7);
    const run = await runAgentLoop({ ask: "x" }, { chat, env: r.env } as LoopDeps);

    expect(r.batches).toEqual([["set_track_volume"], ["set_track_volume"]]);
    expect(run.outcome).toBe("done");
    expect(r.reads()).toBeGreaterThan(1);           // the guard actually re-read before stepping
  });

  it("an undefined revision (old engine, mocks) keeps the guard inert — no extra snapshot reads, both steps run", async () => {
    const { chat } = twoStepPlan();
    const r = revisionEnv(undefined);
    const env = {
      ...r.env,
      async runBatch(label: string, calls: readonly { command: string }[]) { const out = await r.env.runBatch(label, calls); r.gui(); return out; },
    };
    const run = await runAgentLoop({ ask: "x" }, { chat, env } as LoopDeps);

    expect(r.batches).toEqual([["set_track_volume"], ["set_track_volume"]]);
    expect(run.outcome).toBe("done");
    expect(r.reads()).toBe(1);                        // only the planning observation
  });
});
