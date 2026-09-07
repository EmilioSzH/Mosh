"""Assert the rehearsal's half-2 outcomes. The harness has no assertion pseudo-command,
so every claim is checked here against the run output and the ledger."""
import json
import os

WORK = "/private/tmp/claude-501/-Users-emiliosanchez-harris-Mosh--claude-worktrees-affectionate-banach-08583b/8290031e-a025-4c4c-b257-9b8f43e941ba/scratchpad/rehearsal"
SESSION = "/Users/emiliosanchez-harris/Library/Mosh/_harness/rehearsal-songa"
TERMINAL = {"committed", "rolled_back"}
LEAD = "1015"

results = []


def check(label, ok, detail):
    results.append((label, ok, detail))


def load(path):
    rows = []
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


p1 = load(os.path.join(WORK, "p1-out.jsonl"))
p2 = load(os.path.join(WORK, "p2-out.jsonl"))
ledger = load(os.path.join(SESSION, "agent-transactions.jsonl"))

snaps1 = {r.get("label"): r for r in p1 if r.get("command") == "__snapshot"}


def lead_db(snap):
    for t in snap["data"]["tracks"]:
        if t.get("name") == "Lead":
            return t.get("volumeDb")
    return None


# 1. ledger: last record per transaction id
last = {}
for r in ledger:
    last[r["transactionId"]] = r["status"]
check("ledger holds exactly the two transactions the fixture created (no stray records)",
      set(last) == {"T-good", "T-fail"}, "ids=%s" % sorted(last))
check("T-good's last record is terminal", last.get("T-good") in TERMINAL, "status=%s" % last.get("T-good"))
check("T-fail's last record is NON-terminal (this is the defect)",
      last.get("T-fail") not in TERMINAL, "status=%s" % last.get("T-fail"))

tfail = [r for r in ledger if r["transactionId"] == "T-fail"][-1]
check("T-fail applied nothing and its fingerprint equals its pre-fingerprint "
      "(the state is unambiguous, so blocking on it is unnecessary)",
      tfail["applied"] == 0 and tfail["fingerprint"] == tfail["preFingerprint"],
      "applied=%s pre=%s post=%s" % (tfail["applied"], tfail["preFingerprint"][:8], tfail["fingerprint"][:8]))

# 2. one undo restores
base, good, undone = lead_db(snaps1["base"]), lead_db(snaps1["after_good"]), lead_db(snaps1["after_undo"])
check("the committed edit moved the Lead fader", good is not None and abs(good - (-2.0)) < 0.01,
      "base=%s after_good=%s" % (base, good))
check("ONE undo restored the pre-edit value", undone is not None and base is not None and abs(undone - base) < 0.001,
      "base=%s after_undo=%s" % (base, undone))

# 3. process 2 refused
bb2 = [r for r in p2 if r.get("command") == "batch_begin"]
refused = bool(bb2) and not bb2[0].get("ok", False) and "unresolved_after_restart" in str(bb2[0].get("error", ""))
check("process 2's batch_begin was REFUSED after a clean restart", refused,
      (bb2[0].get("error", "") if bb2 else "no batch_begin result")[:110])

# 4. does the snapshot say anything about the block?
sess = snaps1["after_fail"]["data"]["session"]
names = [k for k in sess if "unresolved" in k.lower() or "transaction" in k.lower()]
check("the snapshot publishes NO field naming the unresolved transaction "
      "(so no UI can show it)", not names, "matching session keys=%s" % (names or "none"))
rec = [k for k in sess if "recover" in k.lower()]
check("the snapshot carries NO recovery key at all, so the recovery banner cannot appear "
      "either — there is no UI route out of the block", not rec, "recovery-ish keys=%s" % (rec or "none"))

# 5. project integrity
tracks = snaps1["after_fail"]["data"]["tracks"]
check("all seven tracks still present", len(tracks) == 7, "count=%d" % len(tracks))
clips = [c for t in tracks for c in t.get("clips", [])]
lens = {round(c["length"], 7) for c in clips}
check("every clip is still 92.6896875 s (no auto-tempo stretch)",
      lens == {92.6896875}, "n=%d lengths=%s" % (len(clips), sorted(lens)))
check("no clip has auto-tempo armed", all(c.get("autoTempo") is False for c in clips),
      "autoTempo values=%s" % sorted({c.get("autoTempo") for c in clips}))
plugs = sorted(p.get("type") or p.get("name") for t in tracks for p in t.get("mixerPlugins", []))
check("the mixer plugin inventory is unchanged (7 level faders, nothing added)",
      len(plugs) == 7, "n=%d %s" % (len(plugs), plugs))

print("\n%-95s %s" % ("ASSERTION", "RESULT"))
print("-" * 108)
fails = 0
for label, ok, detail in results:
    print("%-95s %s" % (label[:95], "PASS" if ok else "FAIL"))
    print("%-95s   %s" % ("", detail))
    if not ok:
        fails += 1
print("-" * 108)
print("%d/%d assertions passed" % (len(results) - fails, len(results)))
