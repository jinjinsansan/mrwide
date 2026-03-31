#!/bin/bash
# Mr.Wide 日次Wide指数生成 + Telegram通知
# dlogic-prefetch-nar完了後に実行 (18:30 JST)

set -e

MRWIDE_DIR="/opt/mrwide"
DLOGIC_VENV="/opt/dlogic/linebot/venv/bin/python3"
MRWIDE_LOG="/opt/mrwide/logs/daily_wide_index.log"
TELEGRAM_TOKEN="8338719664:AAEGqDgRwnbQpns91-Nc8eff-1VEv4MsEwA"
TELEGRAM_CHAT_ID="197618639"

mkdir -p /opt/mrwide/logs

# 翌日の日付
TOMORROW=$(date -d "+1 day" +%Y%m%d)

echo "$(date) === Mr.Wide daily batch start: $TOMORROW ===" >> "$MRWIDE_LOG"

# プリフェッチデータ確認
PREFETCH="/opt/dlogic/linebot/data/prefetch/races_${TOMORROW}.json"
if [ ! -f "$PREFETCH" ]; then
    echo "$(date) ERROR: Prefetch not found: $PREFETCH" >> "$MRWIDE_LOG"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": \"⚠️ Mr.Wide: ${TOMORROW} のプリフェッチ未完了\"}" > /dev/null
    exit 1
fi

# ANTHROPIC_API_KEY読み込み (AIコメント生成用)
if [ -f /opt/dlogic/linebot/.env.local ]; then
    export $(grep '^ANTHROPIC_API_KEY=' /opt/dlogic/linebot/.env.local | xargs)
fi

# Wide指数生成
cd "$MRWIDE_DIR"
OUTPUT=$($DLOGIC_VENV scripts/generate_wide_index.py "$TOMORROW" --api http://localhost:8000 2>&1)
EXIT_CODE=$?

echo "$OUTPUT" >> "$MRWIDE_LOG"

if [ $EXIT_CODE -ne 0 ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": \"❌ Mr.Wide: ${TOMORROW} Wide指数生成失敗\"}" > /dev/null
    exit 1
fi

# 結果JSONからキー情報を抽出してTelegram通知
NOTIFY=$($DLOGIC_VENV -c "
import json, sys
with open('data/wide_index_${TOMORROW}.json') as f:
    d = json.load(f)
lines = ['🎯 Mr.Wide ${TOMORROW}']
lines.append(f'{d[\"date\"][:4]}/{d[\"date\"][4:6]}/{d[\"date\"][6:8]}')
lines.append('')
total = 0
for v in d['venues']:
    rc = len(v['races'])
    total += rc
    key = v.get('access_key', '---')
    lines.append(f'📍 {v[\"venue\"]} {rc}R')
    lines.append(f'   キー: {key}')
lines.append('')
lines.append(f'合計: {len(d[\"venues\"])}開催 {total}レース')
print('\n'.join(lines))
" 2>&1)

# Telegram送信
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": $(echo "$NOTIFY" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}" > /dev/null

echo "$(date) === Mr.Wide daily batch complete ===" >> "$MRWIDE_LOG"
