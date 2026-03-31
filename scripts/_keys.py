import json
for f in ["/opt/mrwide/data/wide_index_20260331.json", "/opt/mrwide/data/wide_index_20260401.json"]:
    with open(f) as fp:
        d = json.load(fp)
    print(f"=== {d['date']} ===")
    for ak in d["access_keys"]:
        print(f"  {ak['venue']}: {ak['key']} ({ak['race_count']}R)")
    print()
