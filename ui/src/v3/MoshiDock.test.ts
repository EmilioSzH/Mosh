import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MoshiDock, recordingDisablesDock } from "./MoshiDock";
import { useStore } from "../store";
import { requestMicrophonePermission } from "../bridge";

vi.mock("../vendor/moshi.js", () => ({}));
vi.mock("../bridge", async () => {
  const actual = await vi.importActual<typeof import("../bridge")>("../bridge");
  return {
    ...actual,
    brainRuntimeStatus: async () => ({ state: "unavailable" }),
    onEvent: () => () => {},
    requestMicrophonePermission: vi.fn(),
  };
});

const requestMic = vi.mocked(requestMicrophonePermission);

describe("v3 Moshi dock", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    useStore.setState({
      agentBusy: false,
      celebrateTick: 0,
      agentChangeSet: null,
      transport: { playing: false, recording: false, position: 0, looping: false } as never,
      setAgentBusy: vi.fn(),
      setAgentChangeSet: vi.fn(),
      pushAgentUtter: vi.fn(),
    });
    requestMic.mockReset();
    requestMic.mockResolvedValue({ status: "granted" });
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("recording disables the dock", async () => {
    expect(recordingDisablesDock(true)).toBe(true);
    expect(recordingDisablesDock(false)).toBe(false);
    useStore.setState({ transport: { playing: false, recording: true, position: 0, looping: false } as never });
    await act(async () => {
      root.render(React.createElement(MoshiDock));
      await Promise.resolve();
    });
    const dock = host.querySelector('[data-testid="v3-moshi-dock"]');
    expect(dock?.getAttribute("data-recording-safe")).toBe("true");
    expect(host.querySelector<HTMLInputElement>('[data-testid="v3-moshi-field"]')?.disabled).toBe(true);
    expect(host.querySelector('[data-testid="v3-receipt"]')).toBeNull();
    expect(host.querySelector<HTMLButtonElement>('[data-testid="v3-moshi-mic"]')?.disabled).toBe(true);
  });

  it("does not request the microphone on idle mount, and keeps the mic enabled", async () => {
    await act(async () => {
      root.render(React.createElement(MoshiDock));
      await Promise.resolve();
    });
    expect(requestMic).not.toHaveBeenCalled();
    const mic = host.querySelector<HTMLButtonElement>('[data-testid="v3-moshi-mic"]');
    expect(mic?.disabled).toBe(false);
  });

  it("requests the microphone only after tap-to-talk", async () => {
    await act(async () => {
      root.render(React.createElement(MoshiDock));
      await Promise.resolve();
    });
    const mic = host.querySelector<HTMLButtonElement>('[data-testid="v3-moshi-mic"]');
    if (!mic) throw new Error("v3 mic is missing");
    await act(async () => {
      mic.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
      mic.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }));
      await Promise.resolve();
    });
    expect(requestMic).toHaveBeenCalledOnce();
  });
});
