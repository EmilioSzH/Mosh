
import json, glob
from pathlib import Path
R = Path("docs/produce-corrections"); L = Path.home()/"Library/Mosh/produce-ab"
def first_existing(paths):
    for p in paths:
        if Path(p).exists(): return str(p).replace(str(Path.home()),"~")
    return "AUDIO NOT FOUND"
rows=[]
for f in sorted(R.glob("*.meta.json")):
    d=json.load(open(f)); base=f.stem.replace(".meta","")
    cands=d.get("candidates")
    if not isinstance(cands,list):
        rows.append((base,"(file)",d.get("rating"),len(d.get("notes") or []),bool(d.get("user_verdict")),"external:"+str(d.get("reference"))[:70],"hist-compose")); continue
    for c in cands:
        if isinstance(c,str): name=c; rating="(group) "+str(d.get("rating")); n=len(d.get("notes") or []); uv=bool(d.get("user_verdict"))
        else: name=c.get("candidate"); rating=c.get("rating"); n=len(c.get("notes") or []); uv=bool(c.get("user_verdict"))
        stem=name.replace("B-mosh-","").replace("B-labkit-","").replace(".wav","")
        cands_paths=[L/"2026-09-02"/name, L/"2026-09-04"/name]
        cands_paths+= [Path(p) for p in glob.glob(str(L/"2026-09-02"/"*"/stem/"mix.wav"))]
        cands_paths+= [Path(p) for p in glob.glob(str(L/"2026-09-04"/"runs"/stem/"mix.wav"))]
        cands_paths+= [Path(p) for p in glob.glob(str(L/"2026-09-02"/"*"/stem/"*.wav"))]
        cands_paths+= [Path(p) for p in glob.glob(str(L/"2026-09-02"/"round1-failed"/"*"/name))]
        cands_paths+= [Path(p) for p in glob.glob(str(L/"2026-09-02"/"round1-failed"/"*"/"*"/name))]
        rows.append((base,name,rating,n,uv,first_existing(cands_paths),"compose"))
for r in rows: print(" | ".join(str(x) for x in r))
print("--- verdict.json rows ---")
for v in sorted(L.glob("*/verdict*.json")):
    d=json.load(open(v)); print(v.parent.name, v.name, [(e.get("candidate"), e.get("rating")) for e in d])
print("--- produce-ab tree ---")
for dd in sorted(L.glob("*/*")):
    if dd.is_dir(): print(dd.relative_to(L), sorted(p.name for p in dd.iterdir())[:14])
for dd in sorted(L.glob("*/round1-failed/*")):
    if dd.is_dir(): print(dd.relative_to(L), sorted(p.name for p in dd.iterdir())[:10])

