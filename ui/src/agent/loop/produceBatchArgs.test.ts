// Step-1 slice 6 — the produce driver's batch_begin marker names the RUN it belongs to
// and the prompt version it was produced under, so a correction-round reader can group
// a session's JSONL turns by run and tell which produce prompt authored them. The
// helper is pure so the driver (ui/scripts/produceLiveRun.mts, vite-node only) needs
// no test harness of its own; the existing marker keys keep their exact order.

import { describe, expect, it } from "vitest";
import { produceBatchBeginArgs } from "./produceBatchArgs";
import { PRODUCE_VERSION } from "./producePrompt";

describe("produceBatchBeginArgs — the driver's batch_begin marker", () => {
  it("appends run_id and prompt_version after the existing marker keys", () => {
    const args = produceBatchBeginArgs({
      label: "produce a dark jerk trap beat",
      turnId: "t-1",
      source: "agent_loop",
      utterance: "produce a dark jerk trap beat at 148 in D minor",
      runId: "r-42",
    });
    expect(args).toEqual({
      name: "produce a dark jerk trap beat",
      turn_id: "t-1",
      source: "agent_loop",
      utterance: "produce a dark jerk trap beat at 148 in D minor",
      run_id: "r-42",
      prompt_version: PRODUCE_VERSION,
    });
    expect(Object.keys(args)).toEqual(["name", "turn_id", "source", "utterance", "run_id", "prompt_version"]);
  });

  it("defaults source to agent_loop and omits utterance when none reached us", () => {
    const args = produceBatchBeginArgs({ label: "produce", turnId: "t-2", runId: "r-7" });
    expect(args).toEqual({ name: "produce", turn_id: "t-2", source: "agent_loop", run_id: "r-7", prompt_version: PRODUCE_VERSION });
    expect("utterance" in args).toBe(false);
  });

  it("prompt_version is the produce prompt's own PRODUCE_VERSION constant, unchanged", () => {
    const args = produceBatchBeginArgs({ label: "produce", turnId: "t-3", runId: "r-1" });
    expect(args.prompt_version).toBe(PRODUCE_VERSION);
    expect(typeof args.prompt_version).toBe("number");
  });
});
