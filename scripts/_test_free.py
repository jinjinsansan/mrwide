import json
# Set test free races
free = {"20260401": {"園田": [1, 5, 11], "船橋": [1]}}
with open("/opt/mrwide/data/free_races.json", "w") as f:
    json.dump(free, f, ensure_ascii=False, indent=2)
print("Set free races:", free)

# Test API
import urllib.request
resp = urllib.request.urlopen("http://localhost:8001/api/free-races")
data = json.loads(resp.read())
print(f"\nfree_count: {data['free_count']}")
for v in data["venues"]:
    print(f"  {v['venue']}: {v['race_count']}R")
    for r in v["races"]:
        print(f"    {r['race_number']}R {r['race_name']} - top5: {len(r.get('top5',[]))}, recs: {len(r.get('recommendations',[]))}")
        if r.get("recommendations"):
            rec = r["recommendations"][0]
            print(f"      {rec['label']} {rec['horse_a']}-{rec['horse_b']} comment: {rec.get('comment','')[:30]}")
