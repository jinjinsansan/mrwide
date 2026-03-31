import json
free = {"20260401": {"園田": [1, 2, 3], "船橋": [1, 2, 3]}}
with open("/opt/mrwide/data/free_races.json", "w") as f:
    json.dump(free, f, ensure_ascii=False, indent=2)
print("Set free races:", json.dumps(free, ensure_ascii=False))
