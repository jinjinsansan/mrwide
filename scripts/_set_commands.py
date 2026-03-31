import urllib.request
import json

TOKEN = "8338719664:AAEGqDgRwnbQpns91-Nc8eff-1VEv4MsEwA"
url = f"https://api.telegram.org/bot{TOKEN}/setMyCommands"

commands = [
    {"command": "free", "description": "無料レース設定 (例: /free 20260401 園田 1,5,11)"},
    {"command": "resolve", "description": "チケット返信 (例: /resolve 10001 回答内容)"},
]

data = json.dumps({"commands": commands}).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
print(json.loads(resp.read()))
