#!/bin/bash
# Calibrate the compressor: Lead alone, compressor only, threshold swept. Crest factor
# (peak - RMS) tells us which direction the normalised threshold actually compresses in,
# and by how much. No guessing about what 0.25 means.
set -u
FIX=/private/tmp/claude-501/-Users-emiliosanchez-harris-Mosh--claude-worktrees-affectionate-banach-08583b/8290031e-a025-4c4c-b257-9b8f43e941ba/scratchpad/cand
BASE=/Users/emiliosanchez-harris/Library/Mosh/mix-2026-09-songA-first-pass/calib
BIN=/Users/emiliosanchez-harris/Mosh/.claude/worktrees/step1-useful-edits/build-macos-arm64-release/Mosh_artefacts/Release/Mosh.app/Contents/MacOS/Mosh
SRC=/Users/emiliosanchez-harris/Library/Mosh/references/songs/greg/mosh
mkdir -p "$BASE"

# Everything except Lead is muted, so the measurement is the lead vocal alone.
MUTES='{"command":"set_track_mute","args":{"trackId":"1010","mute":true}}
{"command":"set_track_mute","args":{"trackId":"1020","mute":true}}
{"command":"set_track_mute","args":{"trackId":"1025","mute":true}}
{"command":"set_track_mute","args":{"trackId":"1030","mute":true}}
{"command":"set_track_mute","args":{"trackId":"1035","mute":true}}'

for thr in none 0.10 0.25 0.50 0.75; do
  tag="thr$thr"
  rm -rf "$BASE/$tag" "$HOME/Library/Mosh/_harness/calib-$tag"
  cp -R "$SRC" "$BASE/$tag"
  {
    echo "{\"command\":\"open_project\",\"args\":{\"file\":\"$BASE/$tag/greg.mosh\"}}"
    echo '{"command":"__wait","args":{"ms":400}}'
    echo "$MUTES"
    if [ "$thr" != "none" ]; then
      echo '{"command":"load_builtin","args":{"trackId":"1015","type":"compressor"},"capture":{"C":"index"}}'
      echo "{\"command\":\"set_plugin_param\",\"args\":{\"trackId\":\"1015\",\"index\":\"\${C}\",\"paramIndex\":0,\"value\":$thr}}"
      echo '{"command":"set_plugin_param","args":{"trackId":"1015","index":"${C}","paramIndex":1,"value":0.80}}'
    fi
    echo "{\"command\":\"export_audio\",\"args\":{\"file\":\"$BASE/lead-$tag.wav\",\"format\":\"wav\",\"bitDepth\":32,\"range\":\"full\",\"tail\":\"cut\"}}"
  } > "$FIX/calib-$tag.jsonl"

  MOSH_NO_AUDIO=1 MOSH_ENABLE_SA3=0 MOSH_SELFTEST_SESSION="_harness/calib-$tag" \
    MOSH_RUN_SCRIPT="$FIX/calib-$tag.jsonl" MOSH_RUN_SCRIPT_OUT="$FIX/calib-$tag-out.jsonl" \
    "$BIN" --run-script > /dev/null 2>&1
  echo "rendered $tag (rc=$?)"
done

python3 - "$BASE" <<'PY'
import re, subprocess, sys, os, glob
base = sys.argv[1]
def stats(p):
    out = subprocess.run(["ffmpeg","-hide_banner","-i",p,"-af","astats=measure_perchannel=none",
                          "-f","null","-"], capture_output=True, text=True).stderr
    v={}
    for line in out.splitlines():
        s=re.sub(r"^\[[^\]]*\]\s*","",line.strip())
        if s.startswith("RMS level dB:"): v["rms"]=float(s.split(":")[1])
        if s.startswith("Peak level dB:"): v["peak"]=float(s.split(":")[1])
    return v
print("\n%-10s %8s %8s %8s" % ("threshold","peak","RMS","crest"))
for tag in ["none","0.10","0.25","0.50","0.75"]:
    p = os.path.join(base, "lead-thr%s.wav" % tag)
    if not os.path.exists(p):
        print("%-10s (missing)" % tag); continue
    v = stats(p)
    print("%-10s %8.2f %8.2f %8.2f" % (tag, v["peak"], v["rms"], v["peak"]-v["rms"]))
PY
