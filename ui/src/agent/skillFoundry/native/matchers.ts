// Skill Foundry Slice B, Task 6 — deterministic utterance -> slots matchers for the two
// native handlers (takeCycleV1, explicitBalanceV1) that expect an already-filled
// `slots.action` rather than parsing the utterance themselves (sessionControlV1 and
// loadNamedPluginV1 already do their own parsing — `matchSessionControlActionV1` in
// sessionControl.ts and `pluginQueryV1` in loadNamedPlugin.ts). The runtime (runtime.ts)
// calls all four skills' matchers in a fixed order to deterministically resolve BOTH which
// skill an utterance names AND its slot values, with no model call, exactly like the
// existing deterministic fast paths (fastPath.ts) do today for the commands they cover.
//
// DESIGN DECISION: this is a deliberately SMALL, closed phrase/regex vocabulary — not the
// full "retrieve top three, then ask the brain for structured slots" pipeline spec 9.2
// describes for the general case. Extending coverage (more paraphrases, brain-assisted
// slot filling for a name/level the deterministic matcher misses) is future work; this
// slice ships the deterministic core the four journeys need to be reachable at all.

import type { TakeCycleActionV1 } from "./takeCycle";
import type { ExplicitBalanceActionV1 } from "./explicitBalance";

export function matchTakeCycleActionV1(utterance: string): TakeCycleActionV1 | null {
  const t = utterance.trim().toLowerCase().replace(/[?!.]+$/, "");
  if (/^(record( a take)?|start recording|hit record)$/.test(t)) return "start";
  if (/^(stop( recording)?)$/.test(t)) return "stop";
  if (/^(try (it |that )?again|record again|one more take|again)$/.test(t)) return "again";
  if (/^(next take|audition next|later take|the next one)$/.test(t)) return "audition_next";
  if (/^(previous take|audition previous|earlier take|last take|the previous one)$/.test(t)) return "audition_previous";
  if (/^keep(\s+(it|that|this take))?$/.test(t)) return "keep";
  return null;
}

export type ExplicitBalanceMatchV1 = {
  readonly action: ExplicitBalanceActionV1;
  /** `set_level`: the absolute level. `adjust_level`: the SIGNED delta. `send_level`: the
   *  absolute level (mode "absolute") or the signed delta (mode "relative"; ±3 when the ask
   *  names no amount). `repeat_last`: the unsigned amount, absent for "same again". */
  readonly db?: number;
  /** The spoken target VERBATIM ("the vocal", "Vocal 2", "my drums track") — article
   *  stripping, plural and whole-word matching are the handler's job (explicitBalance.ts),
   *  so the matcher never guesses at a track. */
  readonly trackName?: string;
  /** `send_level` only — the bus WORD as spoken and lower-cased ("reverb", "verb", "delay",
   *  "echo"); the handler resolves it against `snapshot.buses`. */
  readonly bus?: string;
  readonly mode?: "absolute" | "relative";
};

/** A pronoun/deictic target ("it", "this", "that track") means "use the selection" —
 *  returns undefined so the handler falls through to `selected_track`. */
function namedTargetOrSelected(text: string): string | undefined {
  const normalized = text.trim().toLowerCase();
  if (["it", "its", "this", "that", "this track", "that track", "the selected track"].includes(normalized)) return undefined;
  return text.trim();
}

/** Step-1 slice 5 — a captured "track name" that is really the rest of a compound or
 *  collective ask ("drop the drums 3 dB then bring the vocal up 1 dB", "bring everything down
 *  3 dB") is NOT claimed: `null` leaves those to the router/loop, which owns multi-clause and
 *  whole-mix work. Deliberately narrow — an embedded dB amount, a "then", or a collective
 *  word — so real names ("Kick and Snare", "Vocal 2") still pass. */
const COLLECTIVE_TARGETS_V1 = new Set(["everything", "all", "all tracks", "all the tracks", "the mix", "mix", "the master", "master", "the whole mix", "the whole thing"]);
function plausibleTrackTarget(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (COLLECTIVE_TARGETS_V1.has(normalized)) return false;
  return !/\bthen\b|,|\d+(?:\.\d+)?\s*db\b/i.test(normalized);
}

const AMOUNT_V1 = String.raw`(\d+(?:\.\d+)?)`;
const SIGNED_LEVEL_V1 = String.raw`(-?\d+(?:\.\d+)?)`;

export function matchExplicitBalanceUtteranceV1(utterance: string): ExplicitBalanceMatchV1 | null {
  const t = utterance.trim();

  // ── Step-1 slice 5: the deterministic balance lane (audit S5/S8/F1/F3) ──────────────
  // An explicit SEND level comes before the fader form so "set the vocal reverb send to
  // -18 dB" is a send on "the vocal", never a fader on a track called "the vocal reverb send".
  let m = t.match(new RegExp(String.raw`^set\s+(.+?)(?:'s)?\s+([a-z]+)\s+send\s+(?:to|at)\s+${SIGNED_LEVEL_V1}\s*db$`, "i"));
  if (m) {
    if (!plausibleTrackTarget(m[1]!)) return null;
    return { action: "send_level", trackName: namedTargetOrSelected(m[1]!), bus: m[2]!.toLowerCase(), mode: "absolute", db: Number(m[3]) };
  }

  m = t.match(/^(?:set|put)\s+(.+?)\s+(?:to|at)\s+(-?\d+(?:\.\d+)?)\s*db$/i);
  if (m) return { action: "set_level", trackName: namedTargetOrSelected(m[1]!), db: Number(m[2]) };

  // more|less <bus-word> on <track> [by N dB] — a relative send move, ±3 dB when unspoken.
  m = t.match(new RegExp(String.raw`^(more|less)\s+([a-z]+)\s+on\s+(.+?)(?:\s+by\s+${AMOUNT_V1}\s*db)?$`, "i"));
  if (m) {
    if (!plausibleTrackTarget(m[3]!)) return null;
    const amount = m[4] ? Number(m[4]) : 3;
    return { action: "send_level", trackName: namedTargetOrSelected(m[3]!), bus: m[2]!.toLowerCase(), mode: "relative", db: m[1]!.toLowerCase() === "more" ? amount : -amount };
  }

  // "another N dB" / "N dB more" / "same again" — repeat the last completed move.
  m = t.match(new RegExp(String.raw`^another\s+${AMOUNT_V1}\s*db$`, "i"));
  if (m) return { action: "repeat_last", db: Number(m[1]) };
  m = t.match(new RegExp(String.raw`^${AMOUNT_V1}\s*db\s+more$`, "i"));
  if (m) return { action: "repeat_last", db: Number(m[1]) };
  if (/^(?:the\s+)?same\s+again$/i.test(t)) return { action: "repeat_last" };

  // turn|bring|push|pull|nudge|bump|move|take <track> down|up [by] N dB — the direction word
  // carries the sign. Tried before the verb-only forms so "bump Vocal 2 up 1 dB" keeps its name.
  m = t.match(new RegExp(String.raw`^(?:turn|bring|push|pull|nudge|bump|move|take)\s+(.+?)\s+(down|up)\s+(?:by\s+)?${AMOUNT_V1}\s*db$`, "i"));
  if (m) {
    if (!plausibleTrackTarget(m[1]!)) return null;
    return { action: "adjust_level", trackName: namedTargetOrSelected(m[1]!), db: m[2]!.toLowerCase() === "up" ? Number(m[3]) : -Number(m[3]) };
  }
  // lower|drop|dip|cut|reduce <track> [by] N dB — down; raise|boost|lift|bump <track> [by] N dB — up.
  m = t.match(new RegExp(String.raw`^(lower|drop|dip|cut|reduce|raise|boost|lift|bump)\s+(.+?)\s+(?:by\s+)?${AMOUNT_V1}\s*db$`, "i"));
  if (m) {
    if (!plausibleTrackTarget(m[2]!)) return null;
    const up = ["raise", "boost", "lift", "bump"].includes(m[1]!.toLowerCase());
    return { action: "adjust_level", trackName: namedTargetOrSelected(m[2]!), db: up ? Number(m[3]) : -Number(m[3]) };
  }
  // A bare "<track> down|up N dB".
  m = t.match(new RegExp(String.raw`^(.+?)\s+(down|up)\s+(?:by\s+)?${AMOUNT_V1}\s*db$`, "i"));
  if (m) {
    if (!plausibleTrackTarget(m[1]!)) return null;
    return { action: "adjust_level", trackName: namedTargetOrSelected(m[1]!), db: m[2]!.toLowerCase() === "up" ? Number(m[3]) : -Number(m[3]) };
  }

  m = t.match(/^mute\s+(.+)$/i);
  if (m) return { action: "mute", trackName: namedTargetOrSelected(m[1]!) };
  if (/^mute(\s+(it|this|that))?$/i.test(t)) return { action: "mute" };

  m = t.match(/^unmute\s+(.+)$/i);
  if (m) return { action: "unmute", trackName: namedTargetOrSelected(m[1]!) };
  if (/^unmute(\s+(it|this|that))?$/i.test(t)) return { action: "unmute" };

  m = t.match(/^solo\s+(.+)$/i);
  if (m) return { action: "solo", trackName: namedTargetOrSelected(m[1]!) };
  if (/^solo(\s+(it|this|that))?$/i.test(t)) return { action: "solo" };

  return null;
}
