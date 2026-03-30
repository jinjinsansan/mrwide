import requests
import json

base = "https://bot.dlogicai.in/wide"

print("=== GET /api/venues ===")
r = requests.get(f"{base}/api/venues")
print(f"Status: {r.status_code}")
print(f"Body: {r.text[:200]}")

print("\n=== POST /api/unlock ===")
r = requests.post(f"{base}/api/unlock", json={"key": "MW8A80J0"})
print(f"Status: {r.status_code}")
print(f"Headers: {dict(r.headers)}")
d = r.json()
print(f"Success: {d.get('success')}")
print(f"Venue: {d.get('venue')}")
if d.get('data'):
    print(f"Races: {len(d['data'].get('races', []))}")
else:
    print(f"Error: {d.get('error')}")
