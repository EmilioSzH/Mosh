// Step-1 slice 6 — the brain-chat executor threads its turn provenance onto the
// command ENVELOPE as `origin`, so MoshOps stamps it on every JSONL line of the turn
// (batch_begin, each command, batch_end) — not only inside batch_begin's args. The
// value is the same `source` the batch_begin marker already carries: a reader that
// groups lines by origin and turn_id gets the whole turn without opening args.
// Driven through the REAL store + mock seam with the bridge's executeCommand spied.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../bridge", async () => {
  const actual = await vi.importActual<typeof import("../bridge")>("../bridge");
  return { ...actual, executeCommand: vi.fn(actual.executeCommand) };
});

import { executeCommand } from "../bridge";
import { useStore } from "../store";
import { __resetMockForTests } from "../bridge.mock";
import { logAgentTurn, runAgentBatch } from "./executor";

type Envelope = Record<string, unknown>;
const envelopes = (): Envelope[] =>
  vi.mocked(executeCommand).mock.calls.map(([req]) => req as Envelope);
const firstTrackId = (): string => {
  const t = useStore.getState().snapshot?.tracks[0];
  if (!t) throw new Error("mock snapshot has no track");
  return t.id;
};

describe("runAgentBatch — origin on the envelope (step-1 slice 6)", () => {
  beforeEach(async () => {
    __resetMockForTests();
    await useStore.getState().refresh();
    vi.mocked(executeCommand).mockClear();
  });
  afterEach(() => {
    vi.mocked(executeCommand).mockClear();
  });

  it("stamps meta.source on batch_begin, every command and batch_end", async () => {
    const trackId = firstTrackId();
    const changes = await runAgentBatch(
      "lower the vocal",
      [{ command: "set_track_volume", args: { trackId, db: -6 } }],
      { utterance: "lower the vocal 3 dB", source: "studio_skill" },
    );
    expect(changes.applied).toBe(1);
    const seen = envelopes();
    expect(seen.map((e) => e.command)).toEqual(["batch_begin", "set_track_volume", "batch_end"]);
    for (const e of seen) expect(e.origin).toBe("studio_skill");
    // The marker's own args keep carrying the same provenance they always did.
    expect((seen[0]!.args as Record<string, unknown>).source).toBe("studio_skill");
  });

  it("defaults to brain_chat — the same value the marker's source field defaults to", async () => {
    const trackId = firstTrackId();
    await runAgentBatch("lower it", [{ command: "set_track_volume", args: { trackId, db: -6 } }]);
    const seen = envelopes();
    expect(seen.length).toBe(3);
    for (const e of seen) expect(e.origin).toBe("brain_chat");
  });

  it("logAgentTurn's empty marker pair carries the origin", async () => {
    await logAgentTurn("no idea", { utterance: "make it purple", source: "studio_skill_blocked" });
    const seen = envelopes();
    expect(seen.map((e) => e.command)).toEqual(["batch_begin", "batch_end"]);
    for (const e of seen) expect(e.origin).toBe("studio_skill_blocked");
  });

  it("a lone history control dispatched outside any batch carries the origin", async () => {
    const trackId = firstTrackId();
    await runAgentBatch("lower it", [{ command: "set_track_volume", args: { trackId, db: -6 } }], { source: "brain_chat" });
    vi.mocked(executeCommand).mockClear();
    await runAgentBatch("undo that", [{ command: "undo" }], { source: "brain_chat" });
    const seen = envelopes();
    expect(seen.map((e) => e.command)).toEqual(["undo"]);
    expect(seen[0]!.origin).toBe("brain_chat");
  });
});
