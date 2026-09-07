#!/bin/bash
# Pro-C 2, second pass. The first sweep showed peaks surviving while the body dropped —
# the signature of an attack too slow to catch transients. Vary attack and lookahead at a
# fixed moderate threshold and watch the crest factor.
set -u
FIX=/private/tmp/claude-501/-Users-emiliosanchez-harris-Mosh--claude-worktrees-affectionate-banach-08583b/8290031e-a025-4c4c-b257-9b8f43e941ba/scratchpad/cand
BASE=/Users/emiliosanchez-harris/Library/Mosh/mix-2026-09-songA-first-pass/calib
BIN=/Users/emiliosanchez-harris/Mosh/.claude/worktrees/step1-useful-edits/build-macos-arm64-release/Mosh_artefacts/Release/Mosh.app/Contents/MacOS/Mosh
SRC=/Users/emiliosanchez-harris/Library/Mosh/references/songs/greg/mosh
PID="VST3-Pro-C 2-7cbf42c5-5bc82159"

MUTES='{"command":"set_track_mute","args":{"trackId":"1010","mute":true}}
{"command":"set_track_mute","args":{"trackId":"1020","mute":true}}
{"command":"set_track_mute","args":{"trackId":"1025","mute":true}}
{"command":"set_track_mute","args":{"trackId":"1030","mute":true}}
{"command":"set_track_mute","args":{"trackId":"1035","mute":true}}'

# tag        threshold ratio attack lookahead wetgain
run () {
  tag=$1; thr=$2; ratio=$3; att=$4; look=$5; wet=$6
  rm -rf "$BASE/$tag" "$HOME/Library/Mosh/_harness/calib-$tag"
  cp -R "$SRC" "$BASE/$tag"
  {
    echo "{\"command\":\"open_project\",\"args\":{\"file\":\"$BASE/$tag/greg.mosh\"}}"
    echo '{"command":"__wait","args":{"ms":400}}'
    echo "$MUTES"
    echo "{\"command\":\"load_plugin\",\"args\":{\"trackId\":\"1015\",\"pluginId\":\"$PID\"},\"capture\":{\"P\":\"index\"}}"
    echo '{"command":"__wait","args":{"ms":600}}'
    echo "{\"command\":\"set_plugin_param\",\"args\":{\"trackId\":\"1015\",\"index\":\"\${P}\",\"paramIndex\":3,\"value\":$thr}}"
    echo "{\"command\":\"set_plugin_param\",\"args\":{\"trackId\":\"1015\",\"index\":\"\${P}\",\"paramIndex\":4,\"value\":$ratio}}"
    echo "{\"command\":\"set_plugin_param\",\"args\":{\"trackId\":\"1015\",\"index\":\"\${P}\",\"paramIndex\":7,\"value\":$att}}"
    echo "{\"command\":\"set_plugin_param\",\"args\":{\"trackId\":\"1015\",\"index\":\"\${P}\",\"paramIndex\":10,\"value\":$look}}"
    echo "{\"command\":\"set_plugin_param\",\"args\":{\"trackId\":\"1015\",\"index\":\"\${P}\",\"paramIndex\":12,\"value\":$wet}}"
    echo "{\"command\":\"export_audio\",\"args\":{\"file\":\"$BASE/lead-$tag.wav\",\"format\":\"wav\",\"bitDepth\":32,\"range\":\"full\",\"tail\":\"cut\"}}"
  } > "$FIX/calib-$tag.jsonl"
  MOSH_NO_AUDIO=1 MOSH_ENABLE_SA3=0 MOSH_SELFTEST_SESSION="_harness/calib-$tag" \
    MOSH_RUN_SCRIPT="$FIX/calib-$tag.jsonl" MOSH_RUN_SCRIPT_OUT="$FIX/calib-$tag-out.jsonl" \
    "$BIN" --run-script > /dev/null 2>&1
  echo "rendered $tag rc=$?"
}

run fastatk  0.50 0.70 0.00 0.50 0.75
run fastatk2 0.35 0.70 0.00 1.00 0.90
run hithr    0.90 0.70 0.00 0.50 0.50
