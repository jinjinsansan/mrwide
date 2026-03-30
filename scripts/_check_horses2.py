import json
with open('/opt/mrwide/data/wide_index_20260331.json') as f:
    data = json.load(f)
mismatch = 0
for v in data['venues']:
    for r in v['races']:
        actual = len(r['horses'])
        expected = r['num_horses']
        status = 'OK' if actual == expected else 'MISMATCH'
        if status == 'MISMATCH':
            mismatch += 1
        print(f"  {status}: {v['venue']} {r['race_number']}R: expected={expected} actual={actual}")
print(f"\nTotal mismatches: {mismatch}")
print(f"\nNew keys:")
for ak in data['access_keys']:
    print(f"  {ak['venue']}: {ak['key']}")
