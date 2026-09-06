import { describe, expect, it, vi } from "vitest";
import { createDockVoice } from "./dockVoice";

class FakeSpeechRecognition {
  startCalls = 0;
  stopCalls = 0;
  start() { this.startCalls += 1; }
  stop() { this.stopCalls += 1; }
  abort() { this.stop(); }
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((e: { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((e: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
}

describe("createDockVoice", () => {
  it("does not request the microphone or start recognition until start()", () => {
    const requestMicrophonePermission = vi.fn();
    const Ctor = vi.fn(function (this: FakeSpeechRecognition) {
      return new FakeSpeechRecognition();
    });
    createDockVoice({}, {
      requestMicrophonePermission,
      speechRecognition: Ctor as unknown as new () => FakeSpeechRecognition,
    });
    expect(requestMicrophonePermission).not.toHaveBeenCalled();
    expect(Ctor).not.toHaveBeenCalled();
  });

  it("requests the microphone on start, then starts web speech", async () => {
    const rec = new FakeSpeechRecognition();
    const requestMicrophonePermission = vi.fn().mockResolvedValue({ status: "granted" });
    const voice = createDockVoice({}, {
      requestMicrophonePermission,
      speechRecognition: class {
        constructor() { return rec; }
      } as unknown as new () => FakeSpeechRecognition,
    });
    await voice.start();
    expect(requestMicrophonePermission).toHaveBeenCalledOnce();
    expect(rec.startCalls).toBe(1);
  });

  it("does not start web speech when permission is denied", async () => {
    const rec = new FakeSpeechRecognition();
    const onError = vi.fn();
    const voice = createDockVoice({ onError }, {
      requestMicrophonePermission: vi.fn().mockResolvedValue({ status: "denied" }),
      speechRecognition: class {
        constructor() { return rec; }
      } as unknown as new () => FakeSpeechRecognition,
    });
    await voice.start();
    expect(rec.startCalls).toBe(0);
    expect(onError).toHaveBeenCalled();
  });
});
