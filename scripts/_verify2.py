import json
with open("/opt/mrwide/data/wide_index_20260331.json") as f:
    d = json.load(f)
for v in d["venues"][:2]:
    for r in v["races"][:2]:
        print(f"\n{v['venue']} {r['race_number']}R {r['race_name']}")
        for rec in r["recommendations"][:3]:
            c = rec.get("comment", "(no comment)")
            print(f"  {rec['label']} {rec['horse_a']}-{rec['horse_b']} | {c}")
