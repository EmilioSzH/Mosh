// Step-1 slice 6 — the produce driver's batch_begin marker. ui/scripts/produceLiveRun.mts
// (vite-node only, no vitest harness of its own) builds the args it opens each run's undo
// transaction with through this pure helper, so the marker's shape is pinned by a unit
// test here. The existing keys keep their exact order (name, turn_id, source, utterance?)
// — the harvester reads them positionally-agnostic but byte-stable — and two new keys
// follow: `run_id` (the driver's --run-id, so a correction round can group a session's
// turns by run) and `prompt_version` (producePrompt.ts's own PRODUCE_VERSION, so a reader
// can tell which produce prompt authored the turn without diffing prompt text).

import { PRODUCE_VERSION } from "./producePrompt";

export type ProduceBatchBeginInput = {
  /** The undo-transaction label (the ask, truncated by the driver). */
  readonly label: string;
  readonly turnId: string;
  /** The lane; the driver passes "agent_loop" like the app's task executor. */
  readonly source?: string;
  /** The verbatim ask; omitted from the args when none reached us (never faked). */
  readonly utterance?: string;
  /** The driver's --run-id. */
  readonly runId: string;
};

export function produceBatchBeginArgs(input: ProduceBatchBeginInput): Record<string, unknown> {
  const args: Record<string, unknown> = {
    name: input.label,
    turn_id: input.turnId,
    source: input.source ?? "agent_loop",
  };
  if (input.utterance) args.utterance = input.utterance;
  args.run_id = input.runId;
  args.prompt_version = PRODUCE_VERSION;
  return args;
}
