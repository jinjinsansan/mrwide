import json
with open("/opt/mrwide/data/wide_index_20260331.json") as f:
    d = json.load(f)
r = d["venues"][0]["races"][0]
print(f"Race: {r['race_name']}")
for h in r["horses"][:5]:
    print(f"  {h['rank']}位 {h['horse_number']}番 {h['horse_name']} wide={h['wide_index']} ai_prob={h.get('ai_place_prob','N/A')}%")
print()
for x in r["recommendations"][:3]:
    print(f"  {x['label']} {x['horse_a']}-{x['horse_b']} pair_hit={x.get('pair_hit_rate','N/A')}%")
