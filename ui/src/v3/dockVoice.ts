import { requestMicrophonePermission as requestMicDefault } from "../bridge";

export type DockVoiceCallbacks = {
  onStart?: () => void;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onStop?: () => void;
  onError?: (err: string) => void;
};

export type DockVoice = {
  start: () => Promise<void>;
  stop: () => void;
};

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: {
    resultIndex: number;
    results: Array<{ isFinal: boolean; 0?: { transcript: string } }>;
  }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

export type DockVoiceDeps = {
  requestMicrophonePermission?: () => Promise<{ status: string }>;
  speechRecognition?: (new () => SpeechRec) | null;
};

const BLOCKED = new Set(["denied", "restricted", "timed-out"]);

function defaultSpeechCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Hold/tap-to-talk only. Does not open the mic until start(). */
export function createDockVoice(cb: DockVoiceCallbacks, deps: DockVoiceDeps = {}): DockVoice {
  const request = deps.requestMicrophonePermission ?? requestMicDefault;
  const Ctor = deps.speechRecognition === undefined ? defaultSpeechCtor() : deps.speechRecognition;
  let rec: SpeechRec | null = null;
  let listening = false;
  let finalText = "";

  const clean = (s: string) => s.replace(/\s+/g, " ").trim();

  const start = async () => {
    if (listening) return;
    const perm = await request();
    if (BLOCKED.has(perm.status)) {
      cb.onError?.(perm.status);
      return;
    }
    if (!Ctor) {
      cb.onError?.("no-speech");
      return;
    }
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
    finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res?.[0]?.transcript ?? "";
        if (res?.isFinal) finalText += txt;
        else interim += txt;
      }
      cb.onInterim?.(clean(finalText + interim));
    };
    r.onerror = (e) => { cb.onError?.(e?.error ?? "speech-error"); };
    r.onend = () => {
      listening = false;
      rec = null;
      cb.onStop?.();
      const t = clean(finalText);
      if (t) cb.onFinal?.(t);
    };
    rec = r;
    try {
      r.start();
      listening = true;
      cb.onStart?.();
    } catch (err) {
      listening = false;
      rec = null;
      cb.onError?.(String(err));
    }
  };

  const stop = () => {
    if (rec && listening) {
      try { rec.stop(); } catch { /* already stopped */ }
    }
  };

  return { start, stop };
}
