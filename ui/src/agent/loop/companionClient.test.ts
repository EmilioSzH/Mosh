// Step-1 slice 6 — the produce driver's commands name their lane. ui/scripts/lib/
// companionClient.mts is the headless driver's ONLY route into a running app
// (POST /command → RemoteCompanionServer hands the whole `command` object to
// MoshOps::execute), and MoshOps reads that envelope's `origin` sibling at its outermost
// call to stamp every JSONL line the command writes. Without the sibling the engine stamps
// "native", so a correction-round reader could not tell a driver edit from an
// engine-internal one. This pins the wire body: `{command, args}` exactly as before, plus
// `origin` (default "produce_driver", overridable per call). The client is vite-node-only
// and has no harness of its own, so its wire shape is proven here through a stubbed fetch
// rather than a running companion server.

import { afterEach, describe, expect, it, vi } from "vitest";
import { makeCompanionClient } from "../../../scripts/lib/companionClient.mts";

type PostBody = {
  token: string;
  command: { command: string; args: Record<string, unknown>; origin?: string };
  timeoutMs: number;
};

/** Stub the global fetch the client calls; `inner` is the MoshOps::execute result the
 *  companion server wraps as `{ok:true, data:<inner>}`. Records every parsed POST body. */
function stubCompanion(inner: unknown): { bodies: PostBody[] } {
  const bodies: PostBody[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
    bodies.push(JSON.parse(String(init?.body)) as PostBody);
    return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, data: inner }) };
  }));
  return { bodies };
}

// A log path that cannot exist: the timeout fallback tails mosh-log.jsonl, and this test
// must never read (let alone write) the real one under ~/Library/Mosh.
const client = () => makeCompanionClient({ url: "http://127.0.0.1:1", token: "tok", logPath: "/nonexistent/mosh-log.jsonl", defaultTimeoutMs: 1_000 });

describe("companionClient.command — the origin sibling (step-1 slice 6)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("every /command body carries origin 'produce_driver' beside command/args by default", async () => {
    const { bodies } = stubCompanion({ ok: true, data: { volumeDb: -13 } });
    const result = await client().command("set_track_volume", { trackId: "t1", db: -13 });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toEqual({
      token: "tok",
      command: { command: "set_track_volume", args: { trackId: "t1", db: -13 }, origin: "produce_driver" },
      timeoutMs: 1_000,
    });
    expect(Object.keys(bodies[0]!.command)).toEqual(["command", "args", "origin"]);
    // The inner MoshOps envelope still unwraps exactly as before.
    expect(result).toEqual({ ok: true, error: undefined, data: { volumeDb: -13 } });
  });

  it("origin is overridable per call and never leaks into args", async () => {
    const { bodies } = stubCompanion({ ok: true });
    await client().command("batch_begin", { name: "produce", turn_id: "t-1" }, { origin: "macro" });
    expect(bodies[0]!.command).toEqual({ command: "batch_begin", args: { name: "produce", turn_id: "t-1" }, origin: "macro" });
    expect("origin" in bodies[0]!.command.args).toBe(false);
  });
});
