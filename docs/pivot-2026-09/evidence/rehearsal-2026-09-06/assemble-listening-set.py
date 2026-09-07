"""Assemble round 1's blind listening set, exactly as MIX-PACKAGE-V0 §7.9 freezes it.

Order of operations matters and is deliberate:
  1. blind labels are derived from sha256(experiment:round:index) BEFORE anything is measured,
     so the order is provably independent of any score;
  2. excerpts are cut with ONE identical ffmpeg invocation per range, applied to every file;
  3. loudness is matched to CTRL-IMPORT — a reference fixed in advance by rule, never the
     loudest and never a candidate;
  4. the answer key is written one directory ABOVE the served root so it cannot leak over HTTP.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess

EXP = "mix-2026-09-songA-first-pass"
ROUND = 1
R1 = "/Users/emiliosanchez-harris/Library/Mosh/mix-2026-09-songA-first-pass/r1"
OUT = "/Users/emiliosanchez-harris/Library/Mosh/mix-2026-09-songA-first-pass/listening-r1"
SERVE = os.path.join(OUT, "blind")
REF = "CTRL-IMPORT"

# Condition -> source render. CTRL-OWNER is the owner's own master bounce; it consumes no
# output slot and is listening-only, but it is the end-to-end comparison the contract names.
SOURCES = {
    "CTRL-IMPORT": os.path.join(R1, "CTRL-IMPORT.wav"),
    "COND-C": os.path.join(R1, "COND-C.wav"),
    "COND-G": os.path.join(R1, "COND-G.wav"),
    "G-STAGING-NULL": os.path.join(R1, "G-STAGING-NULL.wav"),
    "CTRL-OWNER": "/Users/emiliosanchez-harris/Library/Mosh/references/songs/greg/source/greg.wav",
}
EXCERPTS = {"E1": (6.000, 39.750), "E2": (63.150, 86.500)}
TOLERANCE_LU = 0.2
TP_CEILING = -1.0


def sh(cmd):
    return subprocess.run(cmd, capture_output=True, text=True).stderr


def loudness(path):
    """Integrated LUFS and true peak, read from ebur128's summary."""
    lines = sh(["ffmpeg", "-hide_banner", "-i", path, "-af",
                "ebur128=peak=true:framelog=quiet", "-f", "null", "-"]).splitlines()
    lufs = tp = None
    section = None
    for line in lines:
        s = line.strip()
        if s.endswith(":") and not s.startswith(("I:", "Peak:", "Threshold:")):
            section = s
        if s.startswith("I:") and lufs is None:
            lufs = float(s.split(":")[1].replace("LUFS", ""))
        if s.startswith("Peak:") and section and "True peak" in section and tp is None:
            tp = float(s.split(":")[1].replace("dBFS", ""))
    return lufs, tp


def cut(src, dst, start, end):
    """One identical invocation per excerpt: trim, restamp, 10 ms fades at both edges.
    Everything is resampled to 44.1 kHz — the rate every candidate already renders at — so
    CTRL-OWNER's 48 kHz source gets the same single conversion as everything else."""
    dur = end - start
    af = ("atrim=start=%.3f:end=%.3f,asetpts=PTS-STARTPTS,"
          "afade=t=in:d=0.01,afade=t=out:st=%.3f:d=0.01" % (start, end, dur - 0.01))
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src,
                    "-af", af, "-ar", "44100", "-c:a", "pcm_f32le", dst], check=True)


def gain(src, dst, db):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src,
                    "-af", "volume=%.2fdB" % db, "-c:a", "pcm_f32le", dst], check=True)


if os.path.exists(OUT):
    shutil.rmtree(OUT)
os.makedirs(SERVE)
work = os.path.join(OUT, "_work")
os.makedirs(work)

names = sorted(SOURCES)
# STEP 1 — labels first, before any measurement.
order = sorted(range(len(names)),
               key=lambda i: hashlib.sha256(("%s:%d:%d" % (EXP, ROUND, i)).encode()).hexdigest())
label_of = {names[src_i]: chr(ord("A") + pos) for pos, src_i in enumerate(order)}

key = {"experiment": EXP, "round": ROUND, "reference_for_loudness": REF,
       "tolerance_LU": TOLERANCE_LU, "excerpts": EXCERPTS, "items": {}}

for ex, (s, e) in EXCERPTS.items():
    # STEP 2 — cut every file identically.
    cuts = {}
    for name, src in SOURCES.items():
        d = os.path.join(work, "%s-%s.wav" % (name, ex))
        cut(src, d, s, e)
        cuts[name] = d

    # STEP 3 — match to the reference fixed in advance.
    ref_lufs, _ = loudness(cuts[REF])
    offsets, matched = {}, {}
    for name, path in cuts.items():
        li, _ = loudness(path)
        offsets[name] = round(ref_lufs - li, 2)
        m = os.path.join(work, "%s-%s-matched.wav" % (name, ex))
        gain(path, m, offsets[name])
        matched[name] = m

    # A true peak over the ceiling lowers EVERY copy by the same further offset, so relative
    # matching is untouched.
    peaks = {n: loudness(p)[1] for n, p in matched.items()}
    worst = max(v for v in peaks.values() if v is not None)
    safety = round(min(0.0, TP_CEILING - worst), 2)

    for name, m in matched.items():
        lab = label_of[name]
        dest_dir = os.path.join(SERVE, "%s-%s" % (ex, lab))
        os.makedirs(dest_dir, exist_ok=True)
        dest = os.path.join(dest_dir, "%s-%s.wav" % (ex, lab))
        if safety:
            gain(m, dest, safety)
        else:
            shutil.copy(m, dest)
        final_lufs, final_tp = loudness(dest)
        key["items"]["%s-%s" % (ex, lab)] = {
            "condition": name,
            "gain_applied_dB": offsets[name] + safety,
            "residual_LU": round(final_lufs - (ref_lufs + safety), 2),
            "true_peak_dBTP": final_tp,
        }
    key.setdefault("safety_offset_dB", {})[ex] = safety
    key.setdefault("reference_LUFS", {})[ex] = ref_lufs

shutil.rmtree(work)
# STEP 4 — the key lives ABOVE the served root.
with open(os.path.join(OUT, "answer_key.json"), "w") as f:
    json.dump(key, f, indent=1)

print("served root : %s" % SERVE)
print("answer key  : %s  (outside the served root)" % os.path.join(OUT, "answer_key.json"))
print()
for k in sorted(key["items"]):
    it = key["items"][k]
    flag = "" if abs(it["residual_LU"]) <= TOLERANCE_LU else "   <-- OVER TOLERANCE"
    print("%-6s gain %+6.2f dB  residual %+5.2f LU  TP %6.2f dBTP%s"
          % (k, it["gain_applied_dB"], it["residual_LU"], it["true_peak_dBTP"], flag))
