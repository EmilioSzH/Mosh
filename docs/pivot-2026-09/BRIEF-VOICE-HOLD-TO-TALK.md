# Implementation brief — hold-to-talk (minimal, press-and-hold only)

Owner decision 2026-09-05 (amendment clause 9): build the minimal hold-to-talk path as an
addition; removal rule waived. Documentation only until a candidate branch starts. Baseline
`0da6c638` code tree (branch `claude/voice-hold-to-talk`); independent audit before merge;
one bounded repair cycle.

## 1. Scope in one paragraph

Press-and-hold a control → macOS `SFSpeechRecognizer` transcribes the microphone through its
**own** `AVAudioEngine` client (on-device when available) → on release the final transcript
lands in the Moshi composer input. Only an exact match of an existing deterministic
session-control / take-cycle utterance (`matchSessionControlActionV1`,
`matchTakeCycleActionV1`) auto-submits; everything else waits for Enter. Mic hot only from
press to release plus ≤3 s finalisation, capped at 60 s. No always-listening mode. Nothing
touches the DAW audio callback; recording never depends on the recognizer; physical
stop/controls remain. **Hands-free statement:** the hold button is hands-free of nothing;
the hold key (Alt+L) is hands-free of the mouse, not the keyboard; a USB foot pedal emitting
Alt+L would be hands-free of both (not in scope, unverified).

## 2. Why these choices (verified at HEAD)

- A working wrapper existed: `git show 1f133ce7^:src/voice/NativeSpeech.mm` (320 lines).
  `1f133ce7` (2026-09-01) removed it with the always-on mode and flipped six guards to
  **forbid** `NSSpeechRecognitionUsageDescription`. A bundle without that key aborts inside
  TCC on the first `requestAuthorization` (history: PR #175), so the key must be restored
  **first** and all six guards flipped back to "required".
- The engine opens the device with no inputs (`src/engine/MoshEngine.cpp` `shouldOpenAudioInputByDefault() = false`);
  inputs open only via `activateAudioInput()` (blocking permission request + device restart).
  A second `AudioIODeviceCallback` on the DAW's `AudioDeviceManager` would therefore require
  the very path `1f133ce7` removed and would bind voice to the tracking interface. `AVAudioEngine`
  is a separate CoreAudio client on the system default input: no engine involvement, no device
  restart, no persisted config change. Its tap block does one `appendAudioPCMBuffer` (Apple's
  documented pattern; allocation behaviour unverified, and not on Mosh's audio thread either way).
- `MICROPHONE_PERMISSION_ENABLED TRUE` (`CMakeLists.txt`) already injects the mic usage string;
  AVFoundation is already linked; only `-framework Speech` is new.
- `Alt+L` is unbound in every keymap preset (`ui/src/keymap.ts` only has `Mod+L`/`Mod+Shift+L`);
  Space chords auto-repeat into transport actions (`useKeyboardShortcuts.ts` does not filter
  `e.repeat`), Cmd chords collide with native menu equivalents, letters are taken by the qwerty
  instrument / Pro Tools track controls / MIDI editor.

## 3. Allowed files and symbols

| Commit | Files | Change |
|---|---|---|
| 1 `build(macos): NSSpeechRecognitionUsageDescription required again` | `cmake/InjectInfoPlistKeys.cmake`, `cmake/MoshRemoteInfo.plist`, `scripts/release/check-plist-keys.sh`, `scripts/auto-loop/gate.sh`, `tests/privacy-manifest-test.sh`, `run-mosh.sh` | restore the `plutil -replace` + post-verify PRESENT (text: "Mosh transcribes what you say while you hold the talk key, so you can ask Moshi without typing."); delete the FORBIDDEN blocks; assert present |
| 2 `feat(voice): HoldToTalk + selftest` | new `src/voice/HoldToTalk.{h,mm}`, `src/voice/HoldToTalk_stub.cpp`, `src/app/selftest/HoldToTalkSelfTest.{h,cpp}`; `CMakeLists.txt` (APPLE: sources + `-fobjc-arc` + `-framework Speech`; non-APPLE: stub); `src/app/SelfTest.h` (drop the stale `runVoiceSmoke` decl) | trimmed re-land of `NativeSpeech.mm` with: session-generation counter captured by every marshalled block (fixes the old stop-before-auth race); async `SFSpeechRecognizer requestAuthorization:` then async `AVCaptureDevice requestAccessForMediaType:` (never the blocking `mac::requestMicrophonePermission`); `requiresOnDeviceRecognition = supportsOnDeviceRecognition` reported as `onDevice`; `addsPunctuation = NO` (`@available` macOS 13); `juce::Timer` 60 s → `stop("max_duration")`; after `endAudio`, "no speech" and finalisation timeout map to `onFinal("")`; keep the `tapBufferCount()` diagnostic |
| 3 `feat(bridge): voice functions/events + store slice` | `src/webview/WebBridge.{h,cpp}` (lazy `std::unique_ptr<voice::HoldToTalk>`), `ui/src/bridge.ts`, `ui/src/store.ts`, new `ui/src/store/voice.ts` (pure reducer) + test | see §4 |
| 4 `feat(ui): hold button + Alt+L; composer routes finals` | `ui/src/ui/AgentComposer.tsx`, new `ui/src/agent/voiceTrigger.ts`, `ui/src/protools/ProToolsMoshiDrawer.tsx`, new `ui/src/hooks/useHoldToTalkKey.ts`, `ui/src/protools/css/panels.css`, tests | see §4 |
| 5 `docs(voice): smoke checklist` | new `docs/verify/VOICE-HOLD-SMOKE.md`, `docs/CURRENT_STATUS.md` pointer | owner smoke table |

**Protected:** the JUCE audio callback and `MoshEngine` device setup (untouched); `run()`
precedence in the composer (the gate decides only whether to call it); no new MoshOps
commands; the keymap presets; `set_transport`/record paths; `MOSH_DISABLE_VOICE=1` disables
everything without a rebuild.

## 4. Interfaces

**Native** (`src/voice/HoldToTalk.h`, message-thread only):
`SpeechAuth {notDetermined, denied, restricted, authorized, unsupported}`;
`Availability {speech, mic, recognizerAvailable, onDevice}` (synchronous, never prompts);
`StartResult {ok, code, message, sessionId}` with sync refusal codes `busy | unsupported |
speech_denied | speech_restricted | mic_denied | mic_restricted | unavailable | disabled`;
`Callbacks {onListening, onPartial, onFinal, onStopped(reason: released|max_duration|cancelled), onError(code,msg)}`
all marshalled to the message thread; `Dependencies` (injectable `speechStatus`, `micStatus`,
`recognizerAvailable`, `maxHoldMs = 60000`, `finalizeGraceMs = 3000`) for the selftest;
`start(Callbacks)`, `stop()` (endAudio → wait ≤ grace for the final → `onFinal` → `onStopped("released")`; idempotent),
`cancel()`, `isActive()`, `currentSession()`; destructor cancels.

**Bridge** (next to `microphone_permission_status` in `src/webview/WebBridge.cpp`):
`voice_authorization_status()` → `{speech, microphone, available, onDevice, hint?}`;
`voice_hold_start()` → `{ok:true, sessionId}` | `{ok:false, code, error}`;
`voice_hold_stop()` → `{ok:true}` always. Events (`emitEvent`; note events are dropped while the
window is hidden — a hold that ends minimized loses its transcript, documented):
`voice_state {sessionId, state: listening|idle|error, onDevice?, reason?, code?, error?}`,
`voice_transcript {sessionId, text, isFinal}`.

**UI:** `bridge.ts` wrappers mirroring `microphonePermissionStatus` (`unsupported` when no
native bridge); `store.ts` slice `voice {state, sessionId, onDevice, partial, final{text,seq}|null, error}`
with `voiceHoldStart/Stop` and `voiceConsumeFinal(seq)`; stale-session payloads ignored;
`voiceTrigger.ts`: `normaliseTranscript` (collapse whitespace, strip trailing `.!?`) and
`isDeterministicVoiceTrigger` = `matchSessionControlActionV1(t) !== null || matchTakeCycleActionV1(t) !== null`;
composer `useEffect` on `voice.final.seq`: empty → consume only; trigger and not busy →
`run(text, "push_to_talk")`; otherwise `setInput(text)` + focus; partials shown only in the
placeholder. Drawer: `<button data-testid="pt-moshi-hold" aria-pressed>` with pointer capture
(`pointerdown` start; `pointerup`/`pointercancel`/`lostpointercapture` stop). Hook
`useHoldToTalkKey`: keydown `KeyL + altKey` (no meta/ctrl/shift, `!repeat`, not active) →
start; while active swallow `KeyL` keydowns; keyup of `KeyL` or `Alt`, window `blur`,
`visibilitychange → hidden` → stop; runs even when the input is focused; not rebindable in v1.

## 5. Failure behaviour

Speech denied/restricted → `{ok:false, code:"speech_denied", error:"Speech Recognition is off for Mosh. System Settings › Privacy & Security › Speech Recognition, then hold again."}` shown as one `say` line; mic denied → the existing `mac::microphonePermissionError` text; not-determined → the async prompts appear on the first hold (release during a prompt cancels, nothing lands); recognizer unavailable (offline, no on-device model) → `unavailable`; release before any result / silence → `onFinal("")`, nothing happens; hold > 60 s → auto-stop, final still lands, caption "held for 60 s — released"; AVAudioEngine configuration change mid-hold → `capture_failed`, the DAW keeps recording; bridge rejection → `voice.error{code:"bridge"}`, hold controls reset on the next keyup/pointerup.

## 6. Tests

- vitest: `ui/src/store/voice.test.ts` (transitions, stale-session drop, consume);
  `ui/src/agent/voiceTrigger.test.ts` (10 positives: record, stop, play, again, keep that,
  keep, next take, undo, save, from the top; 10 negatives: "stop the music", "play the drums
  louder", "keep going", "record this idea for later", "again and again", "save me", "undo the
  reverb on the vocal", "play it back slower", "stop stop stop", ""); `ui/src/ui/AgentComposer.voice.test.ts`
  (pattern of `AgentComposer.namedPlugin.test.ts`: final "stop" → `set_transport` via the
  mock; final "make the drums louder" → input equals text, no exec; empty → nothing; final
  while busy → placed, not run); `ui/src/hooks/useHoldToTalkKey.test.ts` (start once, repeat
  ignored, keyup/blur stop, `Mod+L` and plain `L` never start); drawer test (pointer events →
  start/stop mocks).
- `--selftest` section (`src/app/selftest/HoldToTalkSelfTest.cpp`, injected deps, no mic, no
  TCC prompt): availability names in the 5-value set; `speechStatus = denied` → `start()`
  returns `speech_denied` synchronously and no callback fires after pumping; `micStatus =
  denied` → `mic_denied`; `stop()`/`cancel()` on idle → no crash; second `start()` while
  active → `busy`; destructor mid-session → no crash.
- ctest `PrivacyManifest` and `check-plist-keys.sh` assert the key present (commit 1).
- Owner smoke (`docs/verify/VOICE-HOLD-SMOKE.md`): Developer-ID-signed bundle (ad-hoc
  re-signs re-prompt TCC every rebuild); table phrase / expected / observed / auto-submitted /
  count: 10 positives ("record", "stop", "again", "keep that", "play", "next take", "undo",
  "save", "from the top", "stop recording") ×3, 10 negatives spoken ×3 and 10 played from a
  track whose lyrics contain the words ×3, release-before-speech ×5 (expect nothing), one
  60 s hold, hold while a take records ×3 (take intact; `tapBufferCount > 0`). The pass bar is
  the owner's, recorded in the table, never asserted by code.

## 7. Acceptance artifacts and rollback

Per commit: vitest/typecheck/selftest exit codes with SHAs; `check-plist-keys.sh` output;
the smoke table with counts; a screenshot of the drawer button states. Rollback: reverse-order
`git revert`; each commit is independently revertible (reverting 4 leaves native dormant;
keeping only 1 leaves an unused usage string). Unverified: WKWebView keyup suppression under
Cmd (design avoids Cmd), `appendAudioPCMBuffer` allocation, `addsPunctuation` availability
(guarded), current macOS settings path wording.
