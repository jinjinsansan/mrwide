import json, glob, os
files = sorted(glob.glob("/opt/mrwide/data/wide_index_*.json"), reverse=True)
for f in files[:3]:
    with open(f) as fp:
        d = json.load(fp)
    venues = [f"{v['venue']}({len(v['races'])}R)" for v in d["venues"]]
    print(f"{d['date']}: {', '.join(venues)}")
