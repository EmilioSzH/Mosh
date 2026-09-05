// The lane router: which asks deserve the multi-step loop. Pure heuristic v1 (a
// model-based router is a later upgrade behind this same seam). Precedence is decided
// by the CALLER — sectionScope and the fast path always run first, and hands-free
// voice never reaches an LLM at all.
//
// "single" no longer means "the cheap single-shot LLM path" — that lane is gone.
// AgentComposer calls routeAsk LAST, after the fast path and the studio skills have
// both declined, so a "single" verdict ends the turn as a HUH (its
// studio_skill_unsupported tail). Adding an ask class here is therefore the
// difference between serving it and refusing it, not between cheap and expensive.

export type Lane = "single" | "loop";

const SEQUENTIAL = /\bthen\b|;|\bafter that\b|\bnext\b|\bfinally\b/;
const CREATIVE_VERB = /\b(build|make|create|start|write|compose|produce|lay|sketch|give)\b/;
const CREATIVE_OBJECT = /\b(beat|track|song|sketch|groove|bassline|melody|drums|hook|loop|mix|arrangement|idea)\b/;
const VAGUE_TASTE = /\b(better|vibe|vibes|feel|bigger|wider|cleaner|dustier|glue|polish)\b/;
// Tempo is its OWN class, deliberately not folded into VAGUE_TASTE: "faster" is a
// concrete direction, not taste — loopPrompt's dosage rule already reads it that way
// ("faster ⇒ tempo +8-12%"). It routes to the loop because NO lane above the router
// owns tempo (fastPath's RULES table and session-control's anchored phrases are both
// tempo-free), so a "single" verdict on a tempo ask ends the turn as a HUH rather
// than as a cheaper route. Comparative, relative and absolute phrasings are all here
// on purpose — serving "make it faster" but refusing "set the tempo to 128" makes the
// capability a coin flip on wording.
const TEMPO_WORD = /\b(faster|slower|quicker|tempo|bpm)\b/;
const TEMPO_PHRASE = /\bspeed (?:it |this |them |things )?up\b|\bslow (?:it |this |them |things )?down\b|\bpick up the pace\b|\b(?:half|double)[- ]time\b/;

// Imperative single-clause mix edits (step-1 brief, 2026-09-05, slice 1). "turn the
// clap down 3 dB", "sustain the stabs", "halve the hats in bar 7", "lower the vocal
// 3 dB", "more reverb on the vocal" all printed "single" at baseline and ended the
// turn as a refusal before any model call — NO lane above the router owns them
// (explicit-balance claims only the absolute "set X to N dB"; fastPath's RULES table
// has no dB, no send and no comparative rule). Precedence is unchanged: the fast path
// and the studio skills still run first, so "mute the vocal" keeps its deterministic
// owner; this class only turns refusals into loop attempts. Four sub-classes:
//   1. a LEADING edit verb, optionally behind a polite prefix ("can you", "could
//      you", "please", "hey moshi");
//   2. any "N dB" token anywhere ("the vocal is 3 dB too loud, fix it");
//   3. "more/less <reverb|delay|echo|space|room|air>" — a send/space move;
//   4. a comparative taste word ("darker", "louder", …) — a direction, not vague taste.
const ASK_PREFIX = "(?:(?:can|could)\\s+you\\s+|please\\s+|hey\\s+moshi[, ]+)*";
const EDIT_VERBS = "turn|bring|push|pull|lower|raise|drop|boost|cut|dip|nudge|sustain|shorten|lengthen|tighten|loosen|darken|brighten|halve|double|widen|narrow";
const IMPERATIVE_EDIT = new RegExp(`^${ASK_PREFIX}(?:${EDIT_VERBS})\\b`);
const DB_TOKEN = /\b\d+(?:\.\d+)?\s*db\b/;
const MORE_LESS_SPACE = /\b(?:more|less)\s+(?:reverb|delay|echo|space|room|air)\b/;
const COMPARATIVE_TASTE = /\b(?:darker|brighter|louder|quieter|softer|longer|shorter|tighter|drier|wetter)\b/;
// "add a counter phrase" (the fifth GUI-probe ask): composing a new PART is multi-step
// by nature — a clip, notes and the key — the same reason "write a bassline" routes
// here. Scoped to musical-part objects so "add a bus" / "add a send" / "add a track"
// keep whatever verdict their deterministic owners give them.
const ADD_PART = new RegExp(`^${ASK_PREFIX}add\\s+(?:(?:a|an|some|another|the)\\s+)?(?:[a-z'-]+\\s+){0,2}?(?:phrase|counter[- ]?(?:melody|line|phrase)|countermelody|riff|fill|melody|hook|bassline|harmony|harmonies|chords?)\\b`);
// A question is answered or declined, never planned: "is the vocal too loud", "what is
// the tempo" (which TEMPO_WORD alone would have sent to the loop). Checked AFTER the
// sequential/creative rules so an "is it possible to make a beat"-shaped request keeps
// its baseline verdict; "can you …" is a request prefix, not a question.
const QUESTION_OPENER = /^(?:what|what's|whats|which|why|where|when|who|is|are|am|does|do|did|was|were)\b/;

export const hasSequentialMarkers = (text: string): boolean => SEQUENTIAL.test(text.toLowerCase());

export function routeAsk(text: string): Lane {
  const t = text.toLowerCase().trim();
  if (!t) return "single";
  if (hasSequentialMarkers(t)) return "loop";
  if (CREATIVE_VERB.test(t) && CREATIVE_OBJECT.test(t)) return "loop";
  if (ADD_PART.test(t)) return "loop";
  if (QUESTION_OPENER.test(t)) return "single";
  if (VAGUE_TASTE.test(t)) return "loop";
  if (TEMPO_WORD.test(t) || TEMPO_PHRASE.test(t)) return "loop";
  if (IMPERATIVE_EDIT.test(t) || DB_TOKEN.test(t) || MORE_LESS_SPACE.test(t) || COMPARATIVE_TASTE.test(t)) return "loop";
  // several conjoined asks ("drop the drums and pan the keys and…")
  if ((t.match(/\band\b/g) ?? []).length >= 2) return "loop";
  if (t.length > 90) return "loop";
  return "single";
}
