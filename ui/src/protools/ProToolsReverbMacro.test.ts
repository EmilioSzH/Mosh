// Step-1 brief, slice 7 — the ONE direct control: "Lead-vocal reverb amount". The macro binds
// only to a VERIFIED vocal→reverb send (unique non-return track named like vocal/vox, unique
// reverb-named bus it sends to), commits `set_send_level` through store.exec (one command =
// one undo step, no model call), reads the level back from the snapshot, and refuses to
// render a control at all when the binding cannot be resolved.
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMockForTests, mockSnapshot } from "../bridge.mock";
import { useStore } from "../store";
import type { Bus, CommandResult, Send, Snapshot, Track } from "../types";
import { ProToolsMoshiDrawer } from "./ProToolsMoshiDrawer";
import { ProToolsReverbMacro } from "./ProToolsReverbMacro";

vi.mock("../bridge", async () => {
  const actual = await vi.importActual<typeof import("../bridge")>("../bridge");
  return { ...actual, onEvent: vi.fn(() => () => {}) };
});
// The drawer's other children are the shared agent surfaces. The mount case only has to
// prove the macro sits above the composer, so they stay inert here.
vi.mock("../v2/agent/AgentDrawer", () => ({ AgentDrawer: () => null }));
vi.mock("../v2/ChangeToast", () => ({ ChangeToast: () => null }));
vi.mock("../ui/AgentComposer", () => ({
  AgentComposer: () => React.createElement("input", { "data-testid": "agent-input" }),
}));

const REVERB_SEND: Send = { bus: 0, db: -12, mute: false, pan: 0, preFader: false };
const VOCAL: Track = { id: "vocal", index: 0, name: "Lead Vocal", type: "audio", clips: [], sends: [REVERB_SEND] };
const REVERB_RETURN: Track = {
  id: "reverb-return", index: 1, name: "Reverb", type: "audio", clips: [], isReturn: true, returnBus: 0,
};
const DELAY_RETURN: Track = {
  id: "delay-return", index: 2, name: "Delay", type: "audio", clips: [], isReturn: true, returnBus: 1,
};
const PLATE_RETURN: Track = {
  id: "plate-return", index: 2, name: "Plate Verb", type: "audio", clips: [], isReturn: true, returnBus: 1,
};
// A return whose NAME reads as a vocal and which itself feeds the reverb bus. It satisfies
// every binding rule except "non-return", so it is the one fixture that can tell the
// isReturn filter apart from the send rule.
const VOX_PLATE_RETURN: Track = {
  id: "vox-plate-return", index: 3, name: "Vox Plate", type: "audio", clips: [], isReturn: true, returnBus: 1,
  sends: [REVERB_SEND],
};
const REVERB_BUS: Bus = { bus: 0, name: "Reverb", trackId: "reverb-return" };
const DELAY_BUS: Bus = { bus: 1, name: "Delay", trackId: "delay-return" };
const PLATE_BUS: Bus = { bus: 1, name: "Plate Verb", trackId: "plate-return" };

const PROJECT_FILE = "/tmp/protools-reverb-macro.mosh";
// A different project whose track and bus ids happen to coincide with PROJECT_FILE's.
const OTHER_PROJECT_FILE = "/tmp/protools-reverb-macro-other.mosh";

function snapshotWith(tracks: Track[], buses: Bus[] = [REVERB_BUS], editFile = PROJECT_FILE): Snapshot {
  return {
    schemaVersion: 1,
    session: {
      sampleRate: 48_000,
      tempo: 120,
      editFile,
      key: { tonic: "C", mode: "major" },
    },
    tracks,
    buses,
    transport: { playing: false, recording: false, position: 0, looping: false, loopStart: 0, loopEnd: 0 },
  };
}
const withSendDb = (db: number, editFile = PROJECT_FILE): Snapshot =>
  snapshotWith([{ ...VOCAL, sends: [{ ...REVERB_SEND, db }] }, REVERB_RETURN], [REVERB_BUS], editFile);
/** The same fixture from an older backend whose snapshot reports no session.editFile at all. */
const withSendDbNoEditFile = (db: number): Snapshot => {
  const snapshot = withSendDb(db);
  const session: Partial<Snapshot["session"]> = { ...snapshot.session };
  delete session.editFile;
  return { ...snapshot, session: session as Snapshot["session"] };
};

const setValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) throw new Error("native input value setter is unavailable");
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

describe("Pro Tools lead-vocal reverb macro", () => {
  let host: HTMLDivElement;
  let root: Root;
  let exec: ReturnType<typeof vi.fn>;
  const originalState = useStore.getState();

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    exec = vi.fn(async (command: string): Promise<CommandResult> => ({ ok: true, command }));
    useStore.setState({
      snapshot: withSendDb(-12),
      projectEpoch: 71,
      projectTransitioning: false,
      exec,
      lastError: null,
      refresh: vi.fn(async () => {}),
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    useStore.setState({
      snapshot: originalState.snapshot,
      projectEpoch: originalState.projectEpoch,
      projectTransitioning: originalState.projectTransitioning,
      exec: originalState.exec,
      lastError: originalState.lastError,
      refresh: originalState.refresh,
    });
    vi.restoreAllMocks();
  });

  const render = () => act(() => root.render(React.createElement(ProToolsReverbMacro)));
  const macro = () => host.querySelector<HTMLElement>("[data-testid=pt-reverb-macro]");
  const level = () => host.querySelector<HTMLInputElement>("[data-testid=pt-reverb-macro-level]");
  const readout = () => host.querySelector("[data-testid=pt-reverb-macro-readout]")?.textContent;
  const reset = () => host.querySelector<HTMLButtonElement>("[data-testid=pt-reverb-macro-reset]");
  const unbound = () => host.querySelector("[data-testid=pt-reverb-macro-unbound]");
  const sendLevelCalls = () => exec.mock.calls.filter(([command]) => command === "set_send_level");

  it("binds to the unique vocal track's unique reverb send and shows the engine readback", () => {
    render();

    expect(macro()?.textContent).toContain("Lead-vocal reverb → Lead Vocal → Reverb (bus 0)");
    const input = level();
    expect(input?.value).toBe("-12");
    expect(input?.min).toBe("-60");
    expect(input?.max).toBe("6");
    expect(input?.step).toBe("0.5");
    expect(readout()).toBe("-12.0 dB");
    expect(unbound()).toBeNull();
    expect(exec).not.toHaveBeenCalled();
  });

  it("commits exactly one set_send_level per value change through store.exec, with no envelope and no model call", async () => {
    render();
    const input = level();
    if (!input) throw new Error("reverb level control is missing");

    await act(async () => setValue(input, "-6"));

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith("set_send_level", { trackId: "vocal", bus: 0, db: -6 });
  });

  it("issues one set_send_level per value change during a drag, never coalesced and never doubled", async () => {
    render();
    const input = level();
    if (!input) throw new Error("reverb level control is missing");

    // A pointer drag is a run of native `input` events; each carries its own value.
    await act(async () => {
      for (const value of ["-11.5", "-11", "-10.5"]) setValue(input, value);
    });

    expect(sendLevelCalls().map(([, args]) => args)).toEqual([
      { trackId: "vocal", bus: 0, db: -11.5 },
      { trackId: "vocal", bus: 0, db: -11 },
      { trackId: "vocal", bus: 0, db: -10.5 },
    ]);
  });

  it("binds past a vocal-named return track, even one that itself sends to the reverb bus", () => {
    useStore.setState({ snapshot: snapshotWith([VOCAL, REVERB_RETURN, VOX_PLATE_RETURN], [REVERB_BUS, PLATE_BUS]) });
    render();

    expect(macro()?.textContent).toContain("Lead-vocal reverb → Lead Vocal → Reverb (bus 0)");
    expect(level()?.value).toBe("-12");
    expect(exec).not.toHaveBeenCalled();
  });

  it("Reset returns to the level captured when the binding first resolved in this project", async () => {
    render();
    // Nothing to reset until the engine reports a different level.
    expect(reset()?.disabled).toBe(true);

    act(() => useStore.setState({ snapshot: withSendDb(-20) }));
    expect(readout()).toBe("-20.0 dB");
    expect(reset()?.disabled).toBe(false);

    const button = reset();
    if (!button) throw new Error("reset control is missing");
    await act(async () => button.click());

    expect(sendLevelCalls()).toEqual([["set_send_level", { trackId: "vocal", bus: 0, db: -12 }]]);
  });

  it("re-captures the reset point when the project epoch changes", async () => {
    render();

    act(() => useStore.setState({ projectEpoch: 72, snapshot: withSendDb(-20) }));
    act(() => useStore.setState({ snapshot: withSendDb(-15) }));
    const button = reset();
    if (!button) throw new Error("reset control is missing");
    await act(async () => button.click());

    expect(sendLevelCalls()).toEqual([["set_send_level", { trackId: "vocal", bus: 0, db: -20 }]]);
  });

  it("re-captures the reset point when a different project file arrives under the same epoch and the same ids", async () => {
    render();
    // The user moved the send in this project…
    act(() => useStore.setState({ snapshot: withSendDb(-20) }));
    // …then a replacement the store did not initiate lands through a plain refresh (a
    // reconnect/resync, a peer- or engine-initiated swap, an invalidation nobody flagged as
    // projectReplaced): ANOTHER file whose track and bus ids coincide, reporting −15. The
    // epoch has not moved — only the snapshot's own identity has.
    act(() => useStore.setState({ snapshot: withSendDb(-15, OTHER_PROJECT_FILE) }));

    // Nothing in the arriving project has moved yet, so its first readback IS its reset point;
    // the previous project's −12 must not survive into it.
    expect(reset()?.title).toBe("Return to -15.0 dB");
    expect(reset()?.disabled).toBe(true);

    act(() => useStore.setState({ snapshot: withSendDb(-9, OTHER_PROJECT_FILE) }));
    expect(reset()?.disabled).toBe(false);
    const button = reset();
    if (!button) throw new Error("reset control is missing");
    await act(async () => button.click());

    expect(sendLevelCalls()).toEqual([["set_send_level", { trackId: "vocal", bus: 0, db: -15 }]]);
  });

  it("falls back to the epoch when the snapshot carries no editFile: the same epoch holds, a new epoch re-captures", () => {
    useStore.setState({ snapshot: withSendDbNoEditFile(-12) });
    render();
    expect(reset()?.title).toBe("Return to -12.0 dB");

    act(() => useStore.setState({ snapshot: withSendDbNoEditFile(-20) }));
    expect(reset()?.title).toBe("Return to -12.0 dB");
    expect(reset()?.disabled).toBe(false);

    act(() => useStore.setState({ projectEpoch: 72, snapshot: withSendDbNoEditFile(-15) }));
    expect(reset()?.title).toBe("Return to -15.0 dB");
    expect(reset()?.disabled).toBe(true);
  });

  it("never latches the outgoing project's level as the reset point while the store is swapping projects", () => {
    render();
    // A user edit in the outgoing project, then the store's exact open_project sequence:
    // exec bumps the epoch and raises projectTransitioning BEFORE the new snapshot lands,
    // so for that window `snapshot` still describes the project being closed.
    act(() => useStore.setState({ snapshot: withSendDb(-20) }));
    act(() => useStore.setState({ projectEpoch: 72, projectTransitioning: true }));
    const controlDuringTransition = level();
    act(() => useStore.setState({ snapshot: withSendDb(-12), projectTransitioning: false }));

    // The reopened project reports −12; nothing in it has moved, so there is nothing to reset to.
    expect(reset()?.title).toBe("Return to -12.0 dB");
    expect(reset()?.disabled).toBe(true);
    expect(readout()).toBe("-12.0 dB");
    // Nothing is verified against a project that has not arrived yet: no control, no command.
    expect(controlDuringTransition).toBeNull();
    expect(exec).not.toHaveBeenCalled();
  });

  it("follows a snapshot update in both the readback and the control", () => {
    render();

    act(() => useStore.setState({ snapshot: withSendDb(-3.5) }));

    expect(readout()).toBe("-3.5 dB");
    expect(level()?.value).toBe("-3.5");
  });

  it.each<[string, Snapshot | null]>([
    ["two vocal tracks", snapshotWith([VOCAL, { ...VOCAL, id: "vocal-2", index: 2, name: "Vocal 2" }, REVERB_RETURN])],
    ["no vocal track", snapshotWith([{ ...VOCAL, name: "Keys" }, REVERB_RETURN])],
    ["a vocal with no sends", snapshotWith([{ ...VOCAL, sends: [] }, REVERB_RETURN])],
    ["a vocal sending only to a non-reverb bus",
      snapshotWith([{ ...VOCAL, sends: [{ ...REVERB_SEND, bus: 1 }] }, REVERB_RETURN, DELAY_RETURN], [REVERB_BUS, DELAY_BUS])],
    ["a vocal sending to two reverb buses",
      snapshotWith([{ ...VOCAL, sends: [REVERB_SEND, { ...REVERB_SEND, bus: 1 }] }, REVERB_RETURN, PLATE_RETURN], [REVERB_BUS, PLATE_BUS])],
    ["only a return track named like a vocal", snapshotWith([{ ...REVERB_RETURN, name: "Vocal Reverb" }])],
    ["only a vocal-named return track, even one that sends to the reverb bus",
      snapshotWith([VOX_PLATE_RETURN, REVERB_RETURN], [REVERB_BUS, PLATE_BUS])],
    ["a send whose bus is missing from the snapshot", snapshotWith([VOCAL, REVERB_RETURN], [])],
    ["no snapshot", null],
  ])("renders the disabled line and never executes with %s", (_case, snapshot) => {
    useStore.setState({ snapshot });
    render();

    expect(unbound()?.textContent).toBe("no verified vocal→reverb send");
    expect(level()).toBeNull();
    expect(reset()).toBeNull();
    expect(exec).not.toHaveBeenCalled();
  });

  it("surfaces a refused command through the shared error banner", async () => {
    exec.mockResolvedValueOnce({ ok: false, command: "set_send_level", error: "no send to that bus" });
    render();
    const input = level();
    if (!input) throw new Error("reverb level control is missing");

    await act(async () => setValue(input, "-6"));

    expect(useStore.getState().lastError).toBe("no send to that bus");
  });

  it("mounts in the Moshi drawer above the composer", () => {
    act(() => root.render(React.createElement(ProToolsMoshiDrawer, {
      open: true,
      onClose: () => {},
      returnFocusRef: { current: null },
    })));

    const control = macro();
    const composer = host.querySelector("[data-testid=agent-input]");
    if (!control || !composer) throw new Error("macro or composer is missing from the drawer");
    expect(control.compareDocumentPosition(composer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// Brief §5: "on the mock bridge". The cases above pin the macro's contract against a scripted
// store; these drive the REAL store.exec / store.refresh against the in-memory dev-mock (which
// implements set_send_level and undo exactly as MoshOps does), so the commit → engine value →
// reconcile → readback → undo path is asserted rather than inferred.
describe("Pro Tools lead-vocal reverb macro on the mock bridge", () => {
  let host: HTMLDivElement;
  let root: Root;
  const originalState = useStore.getState();
  // ReconciledRange's commit → reconcile → refresh chain is a run of microtasks; one macrotask
  // lets it finish before the DOM is read.
  const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    __resetMockForTests();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    useStore.setState({
      snapshot: null,
      projectEpoch: 0,
      projectTransitioning: false,
      lastError: null,
      exec: originalState.exec,
      refresh: originalState.refresh,
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    useStore.setState({
      snapshot: originalState.snapshot,
      projectEpoch: originalState.projectEpoch,
      projectTransitioning: originalState.projectTransitioning,
      lastError: originalState.lastError,
      exec: originalState.exec,
      refresh: originalState.refresh,
    });
    __resetMockForTests();
  });

  const level = () => host.querySelector<HTMLInputElement>("[data-testid=pt-reverb-macro-level]");
  const readout = () => host.querySelector("[data-testid=pt-reverb-macro-readout]")?.textContent;
  const reset = () => host.querySelector<HTMLButtonElement>("[data-testid=pt-reverb-macro-reset]");
  const engineSendDb = async (trackId: string, bus: number) => (await mockSnapshot<Snapshot>()).tracks
    .find((track) => track.id === trackId)?.sends?.find((send) => send.bus === bus)?.db;

  /** The brief's fixture, built through commands: a "Vocal" track with a −12 dB send to a "Reverb" bus. */
  const seedVocalReverbSend = async () => {
    const { exec, refresh } = useStore.getState();
    const vocal = await exec("create_track", { name: "Vocal", type: "audio" });
    const reverb = await exec("create_bus", { name: "Reverb" });
    const trackId = (vocal.data as { trackId: string }).trackId;
    const bus = (reverb.data as { busNumber: number }).busNumber;
    expect((await exec("add_send", { trackId, bus, db: -12 })).ok).toBe(true);
    await refresh();
    await act(async () => root.render(React.createElement(ProToolsReverbMacro)));
    expect(readout()).toBe("-12.0 dB");
    const input = level();
    if (!input) throw new Error("reverb level control is missing");
    return { exec, refresh, trackId, bus, input };
  };

  it("commits through the real store, reads the engine value back through its own reconcile, and restores on one undo", async () => {
    const { exec, refresh, trackId, bus, input } = await seedVocalReverbSend();

    await act(async () => setValue(input, "-6"));
    await settle();

    expect(await engineSendDb(trackId, bus)).toBe(-6);
    // No snapshot was hand-set here: −6 reached the DOM through the macro's reconcile → refresh.
    expect(readout()).toBe("-6.0 dB");
    expect(input.value).toBe("-6");
    expect(reset()?.disabled).toBe(false);
    expect(useStore.getState().lastError).toBeNull();

    await act(async () => {
      expect((await exec("undo")).ok).toBe(true);
      await refresh();
    });

    expect(await engineSendDb(trackId, bus)).toBe(-12);
    expect(readout()).toBe("-12.0 dB");
    expect(reset()?.disabled).toBe(true);
  });

  it("a drag of three values is three commands and three undo steps", async () => {
    const { exec, trackId, bus, input } = await seedVocalReverbSend();

    await act(async () => {
      for (const value of ["-11.5", "-11", "-10.5"]) setValue(input, value);
    });
    await settle();
    expect(await engineSendDb(trackId, bus)).toBe(-10.5);
    expect(readout()).toBe("-10.5 dB");

    for (const restored of [-11, -11.5, -12]) {
      expect((await exec("undo")).ok).toBe(true);
      expect(await engineSendDb(trackId, bus)).toBe(restored);
    }
  });
});
