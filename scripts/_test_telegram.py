import json, requests

TOKEN = "8338719664:AAEGqDgRwnbQpns91-Nc8eff-1VEv4MsEwA"
CHAT_ID = "197618639"

with open('/opt/mrwide/data/wide_index_20260331.json') as f:
    d = json.load(f)

lines = ['🎯 Mr.Wide キー発行通知']
lines.append(f'{d["date"][:4]}/{d["date"][4:6]}/{d["date"][6:8]}')
lines.append('')
total = 0
for v in d['venues']:
    rc = len(v['races'])
    total += rc
    key = v.get('access_key', '---')
    lines.append(f'📍 {v["venue"]} {rc}R')
    lines.append(f'   キー: {key}')
lines.append('')
lines.append(f'合計: {len(d["venues"])}開催 {total}レース')

text = '\n'.join(lines)
print(text)
print()

resp = requests.post(
    f"https://api.telegram.org/bot{TOKEN}/sendMessage",
    json={"chat_id": CHAT_ID, "text": text},
)
print(f"Status: {resp.status_code}")
print(resp.json().get("ok"))
