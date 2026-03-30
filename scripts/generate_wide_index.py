#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ミスターワイド Wide指数生成バッチ

翌日の地方競馬全レースについて:
1. dlogic-agentのプリフェッチ出馬表JSONを読み込み
2. VPSバックエンドAPIで4エンジン予測を取得
3. 重み付き統合でWide指数(0-100)を算出
4. ワイド推奨組み合わせを計算
5. JSON出力（Supabase保存 or ファイルキャッシュ）
6. 開催ごとに閲覧キーを生成

使い方:
  python scripts/generate_wide_index.py 20260331
  python scripts/generate_wide_index.py  # 翌日自動
"""

import argparse
import hashlib
import json
import logging
import os
import random
import string
import sys
import time
from datetime import datetime, timedelta

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(SCRIPTS_DIR, '..')
OUTPUT_DIR = os.path.join(PROJECT_DIR, 'data')
os.makedirs(OUTPUT_DIR, exist_ok=True)

DLOGIC_PREFETCH_DIR = os.path.join(os.path.dirname(SCRIPTS_DIR), 'dlogic-agent', 'data', 'prefetch')

BACKEND_API_URL = "http://localhost:8000"
VPS_BACKEND_URL = "http://220.158.24.157:8000"

# Engine weights for Wide index calculation (tuned for chihou)
ENGINE_WEIGHTS = {
    "metalogic": 1.3,
    "ilogic": 1.2,
    "dlogic": 1.1,
    "viewlogic": 0.7,
}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

_session = requests.Session()
_retry = Retry(total=3, backoff_factor=2, status_forcelist=[502, 503, 504])
_session.mount("http://", HTTPAdapter(max_retries=_retry))


def load_prefetch(date_str: str) -> dict | None:
    """dlogic-agentのプリフェッチJSONを読み込み"""
    path = os.path.join(DLOGIC_PREFETCH_DIR, f"races_{date_str}.json")
    if not os.path.exists(path):
        # VPS上の場合
        path = f"/opt/dlogic/linebot/data/prefetch/races_{date_str}.json"
        if not os.path.exists(path):
            logger.error(f"Prefetch file not found for {date_str}")
            return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_local_races(prefetch_data: dict) -> list[dict]:
    """プリフェッチデータから地方競馬レースのみ抽出"""
    return [r for r in prefetch_data.get('races', []) if r.get('is_local', False)]


def call_prediction_api(race: dict, api_url: str) -> dict | None:
    """バックエンドAPIで4エンジン予測を取得"""
    payload = {
        "race_id": race.get("race_id", ""),
        "horses": race.get("horses", []),
        "horse_numbers": race.get("horse_numbers", []),
        "venue": race.get("venue", ""),
        "race_number": race.get("race_number", 0),
        "jockeys": race.get("jockeys", []),
        "posts": race.get("posts", []),
        "distance": race.get("distance", ""),
        "track_condition": race.get("track_condition", "良"),
    }
    try:
        resp = _session.post(
            f"{api_url}/api/v2/predictions/newspaper",
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error(f"Prediction API error for {race.get('race_id')}: {e}")
        return None


def calculate_wide_index(prediction_data: dict, num_horses: int) -> list[dict]:
    """4エンジンの予測結果からWide指数を算出

    Returns: [{horse_number, wide_index, rank}, ...] sorted by wide_index desc
    """
    scores = {}

    for engine, weight in ENGINE_WEIGHTS.items():
        rankings = prediction_data.get(engine, [])
        if not rankings:
            continue
        for pos, horse_num in enumerate(rankings):
            if horse_num not in scores:
                scores[horse_num] = 0.0
            score = (num_horses - pos) / num_horses
            scores[horse_num] += score * weight

    if not scores:
        return []

    total_weight = sum(ENGINE_WEIGHTS.values())
    max_possible = total_weight

    result = []
    for horse_num, raw_score in scores.items():
        wide_index = round(raw_score / max_possible * 100)
        wide_index = min(99, max(1, wide_index))
        result.append({
            "horse_number": horse_num,
            "wide_index": wide_index,
        })

    result.sort(key=lambda x: x["wide_index"], reverse=True)
    for i, item in enumerate(result):
        item["rank"] = i + 1

    return result


def generate_wide_recommendations(indexed_horses: list[dict], top_n: int = 5) -> list[dict]:
    """上位馬からワイド推奨組み合わせを生成"""
    top = indexed_horses[:top_n]
    if len(top) < 2:
        return []

    recommendations = []

    # 鉄板: 1位×2位
    if len(top) >= 2:
        combined = top[0]["wide_index"] + top[1]["wide_index"]
        recommendations.append({
            "type": "teppan",
            "label": "鉄板",
            "horse_a": top[0]["horse_number"],
            "horse_b": top[1]["horse_number"],
            "confidence": min(99, round(combined / 2)),
        })

    # 準鉄板: 1位×3位, 2位×3位
    if len(top) >= 3:
        for i, j in [(0, 2), (1, 2)]:
            combined = top[i]["wide_index"] + top[j]["wide_index"]
            recommendations.append({
                "type": "junTeppan",
                "label": "準鉄板",
                "horse_a": top[i]["horse_number"],
                "horse_b": top[j]["horse_number"],
                "confidence": min(99, round(combined / 2)),
            })

    # 妙味: 上位×4-5位
    for i in range(min(2, len(top))):
        for j in range(3, min(top_n, len(top))):
            combined = top[i]["wide_index"] + top[j]["wide_index"]
            recommendations.append({
                "type": "myomi",
                "label": "妙味",
                "horse_a": top[i]["horse_number"],
                "horse_b": top[j]["horse_number"],
                "confidence": min(99, round(combined / 2)),
            })

    recommendations.sort(key=lambda x: x["confidence"], reverse=True)
    return recommendations


def generate_access_key() -> str:
    """8桁の閲覧キーを生成 (MW + 6桁英数字)"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choices(chars, k=6))
    return f"MW{suffix}"


def process_venue(venue: str, races: list[dict], api_url: str) -> dict:
    """1開催分（1競馬場×1日）の全レースを処理"""
    venue_data = {
        "venue": venue,
        "race_count": len(races),
        "races": [],
    }

    for race in sorted(races, key=lambda r: r.get("race_number", 0)):
        race_id = race.get("race_id", "")
        race_number = race.get("race_number", 0)
        horses = race.get("horses", [])
        horse_numbers = race.get("horse_numbers", [])
        num_horses = len(horses)

        logger.info(f"  {venue} {race_number}R: {race.get('race_name', '')} ({num_horses}頭)")

        if num_horses < 2:
            logger.warning(f"    Skipped: too few horses")
            continue

        prediction = call_prediction_api(race, api_url)
        if not prediction:
            logger.warning(f"    Skipped: API error")
            continue

        indexed = calculate_wide_index(prediction, num_horses)

        # 馬名をマッピング
        name_map = {num: name for num, name in zip(horse_numbers, horses)}
        jockey_map = {}
        if race.get("jockeys"):
            jockey_map = {num: jockey for num, jockey in zip(horse_numbers, race["jockeys"])}

        for item in indexed:
            item["horse_name"] = name_map.get(item["horse_number"], "?")
            item["jockey"] = jockey_map.get(item["horse_number"], "")

        recommendations = generate_wide_recommendations(indexed)

        race_data = {
            "race_id": race_id,
            "race_number": race_number,
            "race_name": race.get("race_name", ""),
            "distance": race.get("distance", ""),
            "num_horses": num_horses,
            "horses": indexed,
            "top5": indexed[:5],
            "recommendations": recommendations,
        }
        venue_data["races"].append(race_data)

    return venue_data


def main():
    parser = argparse.ArgumentParser(description="Wide指数生成")
    parser.add_argument("date", nargs="?", default=None, help="日付 YYYYMMDD")
    parser.add_argument("--api", default=None, help="バックエンドAPI URL")
    args = parser.parse_args()

    if args.date:
        date_str = args.date
    else:
        tomorrow = datetime.now() + timedelta(days=1)
        date_str = tomorrow.strftime('%Y%m%d')

    api_url = args.api or VPS_BACKEND_URL

    logger.info("=" * 60)
    logger.info(f"ミスターワイド Wide指数生成")
    logger.info(f"対象日: {date_str}")
    logger.info(f"API: {api_url}")
    logger.info("=" * 60)

    # プリフェッチデータ読み込み
    prefetch = load_prefetch(date_str)
    if not prefetch:
        logger.error("プリフェッチデータが見つかりません")
        sys.exit(1)

    local_races = get_local_races(prefetch)
    if not local_races:
        logger.info("地方競馬のレースなし")
        sys.exit(0)

    # 開催場ごとにグルーピング
    venues = {}
    for race in local_races:
        v = race.get("venue", "不明")
        if v not in venues:
            venues[v] = []
        venues[v].append(race)

    logger.info(f"開催場: {list(venues.keys())} (計{len(local_races)}レース)")

    # 各開催を処理
    all_venues = []
    access_keys = []

    for venue, races in sorted(venues.items()):
        logger.info(f"\n[{venue}] {len(races)}レース")
        venue_data = process_venue(venue, races, api_url)
        if venue_data["races"]:
            all_venues.append(venue_data)

            key = generate_access_key()
            access_keys.append({
                "key": key,
                "venue": venue,
                "race_date": date_str,
                "race_count": len(venue_data["races"]),
            })
            venue_data["access_key"] = key
            logger.info(f"  キー発行: {key}")

    # 出力
    output = {
        "date": date_str,
        "generated_at": datetime.now().isoformat(),
        "venues": all_venues,
        "access_keys": access_keys,
    }

    output_file = os.path.join(OUTPUT_DIR, f"wide_index_{date_str}.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    logger.info(f"\n保存: {output_file}")

    # サマリー
    logger.info("\n" + "=" * 60)
    logger.info("サマリー:")
    total_races = sum(len(v["races"]) for v in all_venues)
    logger.info(f"  開催場: {len(all_venues)}")
    logger.info(f"  レース数: {total_races}")
    logger.info(f"  キー数: {len(access_keys)}")
    for ak in access_keys:
        logger.info(f"    {ak['venue']}: {ak['key']} ({ak['race_count']}R)")


if __name__ == "__main__":
    main()
