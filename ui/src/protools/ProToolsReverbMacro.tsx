// Step-1 brief, slice 7 — "Lead-vocal reverb amount", the one direct control in the Ask Moshi
// drawer. It is a macro over an EXISTING send, never a router or a model call: the binding is
// re-derived from the authoritative snapshot on every render, a gesture commits exactly one
// `set_send_level` through store.exec (one command = one undo step), the number shown is the
// engine's readback, and when the binding cannot be verified the control does not exist.
//
// Provenance: the brief tags this command with origin "macro". That field belongs to slice 6's
// transaction envelope, which this baseline's store.exec does not carry yet, so the call goes
// through the plain (command, args) path until that envelope lands.
import { useState } from "react";
import { useStore } from "../store";
import type { Bus, CommandResult, Snapshot, Track } from "../types";
import { ReconciledRange } from "../v2/ReconciledRange";

/** A non-return track that reads as the lead vocal: "Vocal", "Vocals", "Lead Vox", "Vocal 2"… */
export const VOCAL_TRACK_NAME = /\b(lead\s+)?vo(x|cal|cals)\b/i;
/** A bus that reads as a reverb: "Reverb", "Vocal Verb", "Plate Verb"… */
export const REVERB_BUS_NAME = /reverb|verb/i;

const UNBOUND_LINE = "no verified vocal→reverb send";

export type ReverbMacroBinding = {
  readonly track: Track;
  readonly bus: Bus;
  /** The engine's current send level, read back from the snapshot. */
  readonly db: number;
};

/**
 * The verified binding, or null. "Verified" is strict on purpose — an ambiguous or missing
 * target must produce no control rather than a guess:
 *  - exactly one non-return track whose name matches VOCAL_TRACK_NAME;
 *  - among the buses that track actually sends to, exactly one whose name matches
 *    REVERB_BUS_NAME (a send to a bus number the snapshot no longer lists does not count).
 */
export function resolveReverbMacroBinding(snapshot: Snapshot | null): ReverbMacroBinding | null {
  if (!snapshot) return null;
  const vocals = snapshot.tracks.filter((track) => !track.isReturn && VOCAL_TRACK_NAME.test(track.name));
  if (vocals.length !== 1) return null;
  const [track] = vocals;
  const buses = snapshot.buses ?? [];
  const reverbSends = (track.sends ?? []).flatMap((send) => {
    const bus = buses.find((candidate) => candidate.bus === send.bus);
    return bus && REVERB_BUS_NAME.test(bus.name) ? [{ bus, db: send.db }] : [];
  });
  if (reverbSends.length !== 1) return null;
  const [{ bus, db }] = reverbSends;
  return { track, bus, db };
}

function readSendDb(trackId: string, bus: number, fallback: number): number {
  return useStore.getState().snapshot?.tracks.find((track) => track.id === trackId)
    ?.sends?.find((send) => send.bus === bus)?.db ?? fallback;
}

// The level Reset returns to: the readback at the moment the binding FIRST resolved for this
// (project, track, bus). "Project" is two things, and either one moving re-captures:
//  - the store's projectEpoch, which moves when the STORE swaps projects (exec's
//    open/new/reload/recover path, or an invalidation flagged projectReplaced);
//  - the snapshot's own session.editFile, which moves when a different project arrives
//    through a path the store did not notice — a plain refresh after a reconnect/resync, a
//    peer- or engine-initiated swap, an invalidation nobody flagged. Keyed on the epoch
//    alone, a reopened project whose track and bus ids coincide with the previous one's
//    inherited the PREVIOUS project's reset point: an inverted Reset. An older backend that
//    reports no editFile falls back to the epoch alone.
// It is React state, so it lives exactly as long as this mount — closing and reopening the
// drawer starts a fresh capture. That per-open limitation is deliberate: a longer-lived reset
// point would need a store slice for pure view state, which is more machinery than the one
// direct control in this step should carry.
type ResetPoint = { readonly scope: string; readonly db: number };

/** The snapshot's own project identity, or null when it reports none (an older backend). */
function projectFileOf(snapshot: Snapshot): string | null {
  const { editFile } = snapshot.session;
  return typeof editFile === "string" ? editFile : null;
}

/**
 * One string naming the (epoch, project file, track:bus) that a reset point — and the range's
 * in-progress draft — belong to. Any part changing starts both over.
 */
function resetScope(epoch: number, projectFile: string | null, bindingKey: string): string {
  return JSON.stringify([epoch, projectFile, bindingKey]);
}

export function ProToolsReverbMacro() {
  const snapshot = useStore((state) => state.snapshot);
  const exec = useStore((state) => state.exec);
  const refresh = useStore((state) => state.refresh);
  const setLastError = useStore((state) => state.setLastError);
  const projectEpoch = useStore((state) => state.projectEpoch);
  const projectTransitioning = useStore((state) => state.projectTransitioning);
  // While the store swaps projects (open/new/reload/recover) the epoch has already moved but
  // `snapshot` still describes the OUTGOING project until the new one lands. A binding read
  // from it would be verified against the wrong project, and its level would be captured as
  // the new epoch's reset point — an inverted Reset once the real snapshot arrives. Nothing
  // is verified until the transition ends, so for that window the control does not exist.
  const binding = projectTransitioning ? null : resolveReverbMacroBinding(snapshot);
  const [captured, setCaptured] = useState<ResetPoint | null>(null);

  if (!binding) {
    return (
      <section className="pt-reverb-macro" data-testid="pt-reverb-macro" aria-label="Lead-vocal reverb amount">
        <p className="pt-reverb-macro-unbound" data-testid="pt-reverb-macro-unbound" role="status">{UNBOUND_LINE}</p>
      </section>
    );
  }

  const { track, bus, db } = binding;
  const bindingKey = `${track.id}:${bus.bus}`;
  // `snapshot` is non-null here — the binding resolved from it; the guard only narrows the type.
  const scope = resetScope(projectEpoch, snapshot ? projectFileOf(snapshot) : null, bindingKey);
  // Adjust-state-during-render (the React-documented pattern for state derived from props):
  // a new scope — project epoch, project file or bound target — re-captures; otherwise the
  // first capture holds.
  const resetPoint = captured && captured.scope === scope ? captured : { scope, db };
  if (resetPoint !== captured) setCaptured(resetPoint);

  const isCurrentProject = (epoch: number) => useStore.getState().projectEpoch === epoch;
  const commit = async (next: number): Promise<CommandResult> => {
    const epoch = useStore.getState().projectEpoch;
    const result = await exec("set_send_level", { trackId: track.id, bus: bus.bus, db: next });
    if (!result.ok && isCurrentProject(epoch))
      setLastError(result.error ?? "The lead-vocal reverb send level could not be changed.");
    return result;
  };

  return (
    <section className="pt-reverb-macro" data-testid="pt-reverb-macro" aria-label="Lead-vocal reverb amount">
      <div className="pt-reverb-macro-label" id="pt-reverb-macro-label" title={`${track.name} → ${bus.name} send`}>
        Lead-vocal reverb → {track.name} → {bus.name} (bus {bus.bus})
      </div>
      <div className="pt-reverb-macro-row">
        <ReconciledRange key={scope} min={-60} max={6} step={0.5} value={db}
          data-testid="pt-reverb-macro-level" aria-label="Lead-vocal reverb send level"
          aria-describedby="pt-reverb-macro-label"
          onCommit={commit}
          reconcile={async () => {
            if (isCurrentProject(projectEpoch)) await refresh();
            return readSendDb(track.id, bus.bus, db);
          }} />
        <output data-testid="pt-reverb-macro-readout" aria-live="polite">{db.toFixed(1)} dB</output>
        <button type="button" data-testid="pt-reverb-macro-reset" disabled={db === resetPoint.db}
          title={`Return to ${resetPoint.db.toFixed(1)} dB`}
          aria-label={`Reset lead-vocal reverb send to ${resetPoint.db.toFixed(1)} dB`}
          onClick={() => void commit(resetPoint.db)}>
          Reset
        </button>
      </div>
    </section>
  );
}
