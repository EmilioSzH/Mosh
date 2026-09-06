import { describe, it, expect } from "vitest";
import { routeAsk } from "./router";

// The lane router's golden table — each row is how a producer actually asks.
// loop = plan/act/observe/repair. "single" is NOT a cheaper LLM route: by the time
// routeAsk runs, the fast path and the studio skills have already declined, so a
// "single" verdict ends the turn as a HUH (AgentComposer's studio_skill_unsupported
// tail). Read every "single" row below as "we deliberately do not serve this yet".
const CASES: Array<[string, "single" | "loop"]> = [
  // stays single: one clear move the deterministic lanes above already own
  ["mute the vocal", "single"],
  ["pan the keys a bit right", "single"],
  ["split the 808 clip at bar 3", "single"],
  // FLIPPED single → loop (step-1 brief, 2026-09-05). No deterministic lane owns a
  // RELATIVE dB move today: explicit-balance claims only the absolute "set X to N dB"
  // (matchExplicitBalanceUtteranceV1 returns null for "lower/turn … 3 dB"), and
  // fastPath's RULES table has no dB rule. "single" here was therefore a refusal
  // before any model call, not a cheaper owner. Re-flip only when a lane above the
  // router actually claims relative dB moves.
  ["drop the drums 3 dB", "loop"],
  // imperative single-clause mix edits → loop (step-1 brief, slice 1). The first five
  // are the asks typed into the 2026-09-04 GUI probe (MOSHI-EDIT-PROBE seq 278–286);
  // the rest are the capability audit's balance forms. Every one printed "single" at
  // baseline and ended the turn as "I can't do that reliably yet."
  ["turn the clap down 3 dB", "loop"],
  ["sustain the stabs", "loop"],
  ["make the B section darker", "loop"],
  ["halve the hats in bar 7", "loop"],
  ["add a counter phrase", "loop"], // composing a new part: clip + notes + key, like "write a bassline"
  ["lower the vocal 3 dB", "loop"],
  ["more reverb on the vocal", "loop"],
  ["can you lower the vocal 3 dB", "loop"], // polite prefix does not change the class
  ["please tighten the hats", "loop"],
  ["hey moshi, brighten the keys", "loop"],
  ["less delay on the keys", "loop"],
  ["make the keys quieter", "loop"], // comparative taste word; "keys" is not a creative object
  ["the vocal is 3 dB too loud, fix it", "loop"], // brief S12 — the dB token alone carries it
  // questions stay single — answered or declined, never planned. "what is the tempo"
  // routed to loop at baseline via TEMPO_WORD; a question is never a tempo edit.
  ["is the vocal too loud", "single"],
  ["what is the tempo", "single"],
  // sequential clauses → loop
  ["mute the vocal then duck the drums", "loop"],
  ["set 90 bpm; lay a boom bap groove", "loop"],
  ["add a bus, next route the vocal into it", "loop"],
  // creative builds → loop
  ["build me a lofi sketch", "loop"],
  ["make a beat", "loop"],
  ["write a bassline", "loop"], // composing needs a clip + notes + the key — multi-step by nature
  ["give the keys a little melody idea, nothing fancy, keep it in key", "loop"],
  // vague taste → loop
  ["give the whole thing a better vibe", "loop"],
  ["make the mix feel wider", "loop"],
  // tempo → loop. No lane above the router carries a tempo rule (fastPath's RULES
  // table and session-control's anchored phrases are both tempo-free), so a "single"
  // verdict here is a refusal of a thing we can plainly do. Comparative, relative and
  // absolute phrasings all have to land in the same lane or the capability is a
  // coin flip on wording. NOTE these are routeAsk verdicts in isolation: the fast
  // path now claims the tightly-anchored NUMERIC forms ("set the tempo to 128")
  // before the router is ever consulted, so in the app those reach set_tempo without
  // an API call. The rows stay because routeAsk must still catch what the fast path
  // declines — "set the tempo to something faster", a fuzzier numeric phrasing, or a
  // tempo ask riding along with other work.
  ["make it faster", "loop"],
  ["make it slower", "loop"],
  ["speed it up", "loop"],
  ["speed this up", "loop"],
  ["can you speed it up", "loop"],
  ["speed up the track", "loop"],
  ["slow it down", "loop"],
  ["slow down", "loop"],
  ["make it quicker", "loop"],
  ["pick up the pace", "loop"],
  ["half time", "loop"],
  ["double time", "loop"],
  ["set the tempo to 128", "loop"],
  ["change the tempo to 140", "loop"],
  ["bring the tempo up", "loop"],
  ["drop the tempo", "loop"],
  ["128 bpm", "loop"],
  ["bump it to 140 bpm", "loop"],
  // conjunction pileup → loop
  ["mute the vocal and solo the drums and pan the keys left", "loop"],
];

describe("routeAsk — the lane router golden table", () => {
  for (const [ask, lane] of CASES)
    it(`"${ask}" → ${lane}`, () => expect(routeAsk(ask)).toBe(lane));
});
