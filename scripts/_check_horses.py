import json
with open('/opt/mrwide/data/wide_index_20260331.json') as f:
    data = json.load(f)
for v in data['venues']:
    for r in v['races']:
        if r['num_horses'] != len(r['horses']):
            print(f"MISMATCH: {v['venue']} {r['race_number']}R: num_horses={r['num_horses']}, actual={len(r['horses'])}")
        if r['num_horses'] == 12:
            print(f"{v['venue']} {r['race_number']}R: num_horses={r['num_horses']}, horses_in_data={len(r['horses'])}")
            for h in r['horses']:
                print(f"  {h['rank']}位 {h['horse_number']}番 {h['horse_name']} wide={h['wide_index']}")
            break
    else:
        continue
    break
