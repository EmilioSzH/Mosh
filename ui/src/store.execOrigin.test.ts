// Step-1 slice 6 — provenance on the command envelope. `origin` rides BESIDE
// command/args (exactly like the FS-B2a `transaction` sibling), so MoshOps::execute
// can stamp it on every JSONL line the command writes. Every GUI caller omits it, so
// the envelope stays byte-identical and the engine stamps "ui" itself — an absent key,
// never an empty string. Proven at the bridge seam the app ships through.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./bridge", async () => {
  const actual = await vi.importActual<typeof import("./bridge")>("./bridge");
  return { ...actual, executeCommand: vi.fn(actual.executeCommand) };
});

import { executeCommand } from "./bridge";
import { useStore } from "./store";
import { __resetMockForTests } from "./bridge.mock";

type Envelope = Record<string, unknown>;
const envelopes = (): Envelope[] =>
  vi.mocked(executeCommand).mock.calls.map(([req]) => req as Envelope);
const lastEnvelope = (): Envelope => {
  const all = envelopes();
  const last = all[all.length - 1];
  if (!last) throw new Error("no envelope reached the bridge");
  return last;
};
const firstTrackId = (): string => {
  const t = useStore.getState().snapshot?.tracks[0];
  if (!t) throw new Error("mock snapshot has no track");
  return t.id;
};

describe("store.exec — the origin sibling (step-1 slice 6)", () => {
  beforeEach(async () => {
    __resetMockForTests();
    await useStore.getState().refresh();
    vi.mocked(executeCommand).mockClear();
  });
  afterEach(() => {
    vi.mocked(executeCommand).mockClear();
  });

  it("carries origin beside command/args when the caller gives one", async () => {
    const trackId = firstTrackId();
    const res = await useStore.getState().exec("set_track_volume", { trackId, db: -7 }, undefined, "agent_loop");
    expect(res.ok).toBe(true);
    expect(lastEnvelope()).toEqual({
      command: "set_track_volume",
      args: { trackId, db: -7 },
      origin: "agent_loop",
    });
  });

  it("omits the key entirely when no origin is given — the engine stamps \"ui\" itself", async () => {
    const trackId = firstTrackId();
    const res = await useStore.getState().exec("set_track_volume", { trackId, db: -7 });
    expect(res.ok).toBe(true);
    expect(Object.keys(lastEnvelope())).toEqual(["command", "args"]);
  });

  it("an empty-string origin is treated as absent (never an empty sibling)", async () => {
    const trackId = firstTrackId();
    await useStore.getState().exec("set_track_volume", { trackId, db: -7 }, undefined, "");
    expect(Object.keys(lastEnvelope())).toEqual(["command", "args"]);
  });

  it("rides alongside the transaction sibling without touching it", async () => {
    const trackId = firstTrackId();
    const transaction = { transactionId: "txn-origin-1", requestId: "r0", index: 0 };
    // No such transaction is open, so the mock refuses — the envelope SHAPE is what is
    // under test here, and it reaches the bridge before the refusal.
    await useStore.getState().exec("set_track_volume", { trackId, db: -7 }, transaction, "studio_skill");
    expect(lastEnvelope()).toEqual({
      command: "set_track_volume",
      args: { trackId, db: -7 },
      transaction,
      origin: "studio_skill",
    });
  });
});
