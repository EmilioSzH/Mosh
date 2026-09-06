import { describe, expect, it } from "vitest";
import { matchExplicitBalanceUtteranceV1, matchTakeCycleActionV1 } from "./matchers";

describe("matchTakeCycleActionV1", () => {
  it("matches each of the six actions plus a held-out phrasing", () => {
    expect(matchTakeCycleActionV1("record a take")).toBe("start");
    expect(matchTakeCycleActionV1("stop")).toBe("stop");
    expect(matchTakeCycleActionV1("try that again")).toBe("again");
    expect(matchTakeCycleActionV1("next take")).toBe("audition_next");
    expect(matchTakeCycleActionV1("previous take")).toBe("audition_previous");
    expect(matchTakeCycleActionV1("keep it")).toBe("keep");
    expect(matchTakeCycleActionV1("hit record")).toBe("start");
  });

  it("returns null for an unrelated utterance", () => {
    expect(matchTakeCycleActionV1("mute the drums")).toBeNull();
  });
});

describe("matchExplicitBalanceUtteranceV1", () => {
  it("parses an explicit level with a named track", () => {
    expect(matchExplicitBalanceUtteranceV1("set Drums to -6 dB")).toEqual({ action: "set_level", trackName: "Drums", db: -6 });
  });

  it("parses an explicit level with a pronoun target as the selected track (no name)", () => {
    expect(matchExplicitBalanceUtteranceV1("set it to -6 dB")).toEqual({ action: "set_level", db: -6 });
  });

  it("parses mute/unmute/solo with and without a named target", () => {
    expect(matchExplicitBalanceUtteranceV1("mute the vocals")).toEqual({ action: "mute", trackName: "the vocals" });
    expect(matchExplicitBalanceUtteranceV1("mute it")).toEqual({ action: "mute" });
    expect(matchExplicitBalanceUtteranceV1("unmute it")).toEqual({ action: "unmute" });
    expect(matchExplicitBalanceUtteranceV1("solo the bass")).toEqual({ action: "solo", trackName: "the bass" });
  });

  it("returns null for a vague taste request", () => {
    expect(matchExplicitBalanceUtteranceV1("mix this professionally")).toBeNull();
    expect(matchExplicitBalanceUtteranceV1("make it sound better")).toBeNull();
  });
});

// Step-1 repair (slice 5 "Deterministic balance") — the audit's S5/S8/F1/F3 phrasings and
// the relative / send / repeat vocabulary the brief lists. The matcher only classifies and
// extracts; article stripping, whole-word track matching and bus resolution are the
// handler's (explicitBalance.ts) job, so the spoken name is returned VERBATIM here.
describe("matchExplicitBalanceUtteranceV1 — deterministic balance lane (step-1 slice 5)", () => {
  it("S5: an explicit level keeps its spoken target verbatim (the handler resolves the article)", () => {
    expect(matchExplicitBalanceUtteranceV1("set the vocal to -13 dB")).toEqual({ action: "set_level", trackName: "the vocal", db: -13 });
  });

  it("S8: an explicit send level names the track and the bus word, never a track called 'the vocal reverb send'", () => {
    expect(matchExplicitBalanceUtteranceV1("set the vocal reverb send to -18 dB"))
      .toEqual({ action: "send_level", trackName: "the vocal", bus: "reverb", mode: "absolute", db: -18 });
    expect(matchExplicitBalanceUtteranceV1("set Vocal's reverb send to -18 dB"))
      .toEqual({ action: "send_level", trackName: "Vocal", bus: "reverb", mode: "absolute", db: -18 });
    expect(matchExplicitBalanceUtteranceV1("set the keys delay send at -20 dB"))
      .toEqual({ action: "send_level", trackName: "the keys", bus: "delay", mode: "absolute", db: -20 });
  });

  it("relative moves: lower/drop/dip/cut/reduce <track> [by] N dB is a negative delta", () => {
    expect(matchExplicitBalanceUtteranceV1("lower the vocal 3 dB")).toEqual({ action: "adjust_level", trackName: "the vocal", db: -3 });
    expect(matchExplicitBalanceUtteranceV1("lower the vocals 3 dB")).toEqual({ action: "adjust_level", trackName: "the vocals", db: -3 });
    expect(matchExplicitBalanceUtteranceV1("drop the drums 3 dB")).toEqual({ action: "adjust_level", trackName: "the drums", db: -3 });
    expect(matchExplicitBalanceUtteranceV1("cut the bass by 2 dB")).toEqual({ action: "adjust_level", trackName: "the bass", db: -2 });
    expect(matchExplicitBalanceUtteranceV1("reduce the keys 1.5 dB")).toEqual({ action: "adjust_level", trackName: "the keys", db: -1.5 });
    expect(matchExplicitBalanceUtteranceV1("dip the hats by 1 db")).toEqual({ action: "adjust_level", trackName: "the hats", db: -1 });
  });

  it("relative moves: turn/bring/push/pull/nudge <track> down|up [by] N dB carries the sign of the direction", () => {
    expect(matchExplicitBalanceUtteranceV1("turn the drums down 2 dB")).toEqual({ action: "adjust_level", trackName: "the drums", db: -2 });
    expect(matchExplicitBalanceUtteranceV1("bring the vocal up 1 dB")).toEqual({ action: "adjust_level", trackName: "the vocal", db: 1 });
    expect(matchExplicitBalanceUtteranceV1("nudge the hats up by 0.5 dB")).toEqual({ action: "adjust_level", trackName: "the hats", db: 0.5 });
    expect(matchExplicitBalanceUtteranceV1("pull the bass down by 4 dB")).toEqual({ action: "adjust_level", trackName: "the bass", db: -4 });
  });

  it("relative moves: raise/boost/lift/bump <track> [by] N dB is a positive delta", () => {
    expect(matchExplicitBalanceUtteranceV1("raise the drums 2 dB")).toEqual({ action: "adjust_level", trackName: "the drums", db: 2 });
    expect(matchExplicitBalanceUtteranceV1("boost the bass by 3 dB")).toEqual({ action: "adjust_level", trackName: "the bass", db: 3 });
    expect(matchExplicitBalanceUtteranceV1("bump Vocal 2 up 1 dB")).toEqual({ action: "adjust_level", trackName: "Vocal 2", db: 1 });
  });

  it("relative moves: a bare '<track> down|up N dB'", () => {
    expect(matchExplicitBalanceUtteranceV1("the vocal down 3 dB")).toEqual({ action: "adjust_level", trackName: "the vocal", db: -3 });
    expect(matchExplicitBalanceUtteranceV1("drums up 2 dB")).toEqual({ action: "adjust_level", trackName: "drums", db: 2 });
  });

  it("send moves: more|less <bus-word> on <track> [by N dB], default ±3 dB", () => {
    expect(matchExplicitBalanceUtteranceV1("more reverb on the drums")).toEqual({ action: "send_level", trackName: "the drums", bus: "reverb", mode: "relative", db: 3 });
    expect(matchExplicitBalanceUtteranceV1("more reverb on the vocal")).toEqual({ action: "send_level", trackName: "the vocal", bus: "reverb", mode: "relative", db: 3 });
    expect(matchExplicitBalanceUtteranceV1("less reverb on the vocal by 6 dB")).toEqual({ action: "send_level", trackName: "the vocal", bus: "reverb", mode: "relative", db: -6 });
    expect(matchExplicitBalanceUtteranceV1("more echo on the keys by 2 dB")).toEqual({ action: "send_level", trackName: "the keys", bus: "echo", mode: "relative", db: 2 });
    expect(matchExplicitBalanceUtteranceV1("less verb on the snare")).toEqual({ action: "send_level", trackName: "the snare", bus: "verb", mode: "relative", db: -3 });
  });

  it("repeat: 'another N dB', 'N dB more' carry the amount; 'same again' carries none", () => {
    expect(matchExplicitBalanceUtteranceV1("another 3 dB")).toEqual({ action: "repeat_last", db: 3 });
    expect(matchExplicitBalanceUtteranceV1("2 dB more")).toEqual({ action: "repeat_last", db: 2 });
    expect(matchExplicitBalanceUtteranceV1("same again")).toEqual({ action: "repeat_last" });
    expect(matchExplicitBalanceUtteranceV1("the same again")).toEqual({ action: "repeat_last" });
  });

  it("still refuses a move with no dB amount and taste words — those stay with the router", () => {
    expect(matchExplicitBalanceUtteranceV1("lower the vocal")).toBeNull();
    expect(matchExplicitBalanceUtteranceV1("turn the vocal down")).toBeNull();
    expect(matchExplicitBalanceUtteranceV1("make the vocal louder")).toBeNull();
    expect(matchExplicitBalanceUtteranceV1("the vocal is 3 dB too loud, fix it")).toBeNull();
    expect(matchExplicitBalanceUtteranceV1("drop the drums 3 dB then bring the vocal up 1 dB")).toBeNull();
  });

  it("the pre-existing vocabulary is byte-identical", () => {
    expect(matchExplicitBalanceUtteranceV1("set Drums to -6 dB")).toEqual({ action: "set_level", trackName: "Drums", db: -6 });
    expect(matchExplicitBalanceUtteranceV1("set it to -6 dB")).toEqual({ action: "set_level", db: -6 });
    expect(matchExplicitBalanceUtteranceV1("mute the vocals")).toEqual({ action: "mute", trackName: "the vocals" });
    expect(matchExplicitBalanceUtteranceV1("solo the bass")).toEqual({ action: "solo", trackName: "the bass" });
  });
});
