import json
with open('/opt/mrwide/data/wide_index_20260331.json', 'r') as f:
    data = json.load(f)
v = data['venues'][0]
r = v['races'][0]
print(f"{v['venue']} {r['race_number']}R {r['race_name']} ({r['distance']}, {r['num_horses']}頭)")
print()
print("Wide指数ランキング:")
for h in r['horses'][:5]:
    bar = '#' * (h['wide_index'] // 10) + '.' * (10 - h['wide_index'] // 10)
    print(f"  {h['rank']}位 {h['horse_number']:>2}番 {h['horse_name']:<10} Wide指数 {h['wide_index']:>2}  [{bar}]")
print()
print("ワイド推奨:")
for rec in r['recommendations'][:4]:
    print(f"  [{rec['label']}] {rec['horse_a']}-{rec['horse_b']} (信頼度{rec['confidence']})")
print()
# Show keys
print("発行キー:")
for ak in data['access_keys']:
    print(f"  {ak['venue']}: {ak['key']} ({ak['race_count']}R)")
