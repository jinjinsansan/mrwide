import requests, json
base = "http://localhost:8001"
# Health
print("Health:", requests.get(f"{base}/api/health").json())
# Venues
print("Venues:", requests.get(f"{base}/api/venues").json())
# Unlock
r = requests.post(f"{base}/api/unlock", json={"key": "MW8A80J0"})
d = r.json()
print(f"Unlock: success={d['success']} venue={d.get('venue')} races={len(d.get('data',{}).get('races',[]))}")
# Invalid key
r2 = requests.post(f"{base}/api/unlock", json={"key": "INVALID1"})
print(f"Invalid: {r2.json()}")
