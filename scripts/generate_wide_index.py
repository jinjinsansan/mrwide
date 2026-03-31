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

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
COMMENT_MODEL = "claude-haiku-4-5"

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


def calculate_wide_index(prediction_data: dict, num_horses: int, horse_numbers: list) -> list[dict]:
    """4エンジンの予測結果からWide指数 + AI複勝率を算出

    Returns: [{horse_number, wide_index, ai_place_prob, rank}, ...] sorted by wide_index desc
    """
    scores = {hn: 0.0 for hn in horse_numbers}

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
        wide_index = max(1, min(99, wide_index))
        result.append({
            "horse_number": horse_num,
            "wide_index": wide_index,
        })

    # AI複勝率: Wide指数を合計300%(7頭以下は200%)に正規化
    target_sum = 200.0 if num_horses <= 7 else 300.0
    index_sum = sum(item["wide_index"] for item in result)
    for item in result:
        if index_sum > 0:
            prob = item["wide_index"] / index_sum * target_sum
            item["ai_place_prob"] = round(min(prob, 85.0), 1)
        else:
            item["ai_place_prob"] = 0.0

    result.sort(key=lambda x: x["wide_index"], reverse=True)
    for i, item in enumerate(result):
        item["rank"] = i + 1

    return result


def _calc_pair_hit_rate(prob_a: float, prob_b: float, num_horses: int) -> float:
    """2頭が両方3着以内に入る確率(ワイド的中率)を近似計算
    
    3着枠は3つ。人気馬同士は枠を食い合うため補正。
    P(A∩B in top3) ≒ P(A) × P(B) × 補正係数
    補正係数: 3着枠3つのうち2つを占めるので (3-1)/(N-1) で調整
    """
    if num_horses < 2:
        return 0.0
    pa = prob_a / 100.0
    pb = prob_b / 100.0
    # 条件付き確率: Aが3着内にいる場合、残り(N-1)頭で2枠を争う
    correction = min(1.0, 2.0 / max(1, num_horses - 1))
    raw = pa * pb * correction / (3.0 / max(1, num_horses)) * (3.0 / max(1, num_horses))
    # 簡易近似: pa * pb を基本に、枠の競合を反映
    pair_prob = pa * pb * (1.0 + correction) * 0.85
    return round(min(pair_prob * 100, 95.0), 1)


def generate_wide_recommendations(indexed_horses: list[dict], top_n: int = 5) -> list[dict]:
    """上位馬からワイド推奨組み合わせを生成(ペア的中率付き)"""
    top = indexed_horses[:top_n]
    if len(top) < 2:
        return []

    num_horses = len(indexed_horses)
    prob_map = {h["horse_number"]: h.get("ai_place_prob", 0) for h in indexed_horses}

    recommendations = []

    # 鉄板: 1位×2位
    if len(top) >= 2:
        combined = top[0]["wide_index"] + top[1]["wide_index"]
        pair_rate = _calc_pair_hit_rate(
            prob_map.get(top[0]["horse_number"], 0),
            prob_map.get(top[1]["horse_number"], 0),
            num_horses,
        )
        recommendations.append({
            "type": "teppan",
            "label": "鉄板",
            "horse_a": top[0]["horse_number"],
            "horse_b": top[1]["horse_number"],
            "confidence": min(99, round(combined / 2)),
            "pair_hit_rate": pair_rate,
        })

    # 準鉄板: 1位×3位, 2位×3位
    if len(top) >= 3:
        for i, j in [(0, 2), (1, 2)]:
            combined = top[i]["wide_index"] + top[j]["wide_index"]
            pair_rate = _calc_pair_hit_rate(
                prob_map.get(top[i]["horse_number"], 0),
                prob_map.get(top[j]["horse_number"], 0),
                num_horses,
            )
            recommendations.append({
                "type": "junTeppan",
                "label": "準鉄板",
                "horse_a": top[i]["horse_number"],
                "horse_b": top[j]["horse_number"],
                "confidence": min(99, round(combined / 2)),
                "pair_hit_rate": pair_rate,
            })

    # 妙味: 上位×4-5位
    for i in range(min(2, len(top))):
        for j in range(3, min(top_n, len(top))):
            combined = top[i]["wide_index"] + top[j]["wide_index"]
            pair_rate = _calc_pair_hit_rate(
                prob_map.get(top[i]["horse_number"], 0),
                prob_map.get(top[j]["horse_number"], 0),
                num_horses,
            )
            recommendations.append({
                "type": "myomi",
                "label": "妙味",
                "horse_a": top[i]["horse_number"],
                "horse_b": top[j]["horse_number"],
                "confidence": min(99, round(combined / 2)),
                "pair_hit_rate": pair_rate,
            })

    recommendations.sort(key=lambda x: x["confidence"], reverse=True)
    return recommendations


def generate_comments(race_info: dict, recommendations: list[dict], indexed_horses: list[dict]) -> dict:
    """Claude APIで各推奨ワイドに一言コメントを生成。キーは "horse_a-horse_b" """
    if not ANTHROPIC_API_KEY or not recommendations:
        return {}

    name_map = {h["horse_number"]: h.get("horse_name", "?") for h in indexed_horses}
    prob_map = {h["horse_number"]: h.get("ai_place_prob", 0) for h in indexed_horses}

    rec_lines = []
    for r in recommendations[:6]:
        a, b = r["horse_a"], r["horse_b"]
        rec_lines.append(
            f"{r['label']} {a}番{name_map.get(a,'')} x {b}番{name_map.get(b,'')} "
            f"AI複勝率{prob_map.get(a,0)}%/{prob_map.get(b,0)}% 的中率{r.get('pair_hit_rate',0)}%"
        )

    prompt = (
        f"競馬ワイド馬券の推奨コメントを書いてください。\n"
        f"レース: {race_info.get('race_name','')} {race_info.get('distance','')} {race_info.get('num_horses',0)}頭\n"
        f"推奨組み合わせ:\n" + "\n".join(rec_lines) + "\n\n"
        f"各組み合わせに対して15〜25文字の一言コメントを書いてください。"
        f"ワイド馬券(3着以内に2頭)の視点で、買いたくなるような簡潔な表現で。"
        f"絵文字は使わないでください。\n"
        f"JSON形式で返してください: {{\"horse_a-horse_b\": \"コメント\", ...}}\n"
        f"JSONのみ出力。説明不要。"
    )

    try:
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": COMMENT_MODEL,
                "max_tokens": 300,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        if resp.status_code != 200:
            logger.warning(f"Comment API error: {resp.status_code}")
            return {}
        text = resp.json()["content"][0]["text"].strip()
        # JSONブロックを抽出
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.warning(f"Comment generation failed: {e}")
        return {}


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

        indexed = calculate_wide_index(prediction, num_horses, horse_numbers)

        # 馬名をマッピング
        name_map = {num: name for num, name in zip(horse_numbers, horses)}
        jockey_map = {}
        if race.get("jockeys"):
            jockey_map = {num: jockey for num, jockey in zip(horse_numbers, race["jockeys"])}

        for item in indexed:
            item["horse_name"] = name_map.get(item["horse_number"], "?")
            item["jockey"] = jockey_map.get(item["horse_number"], "")

        recommendations = generate_wide_recommendations(indexed)

        # AIコメント生成
        race_info = {
            "race_name": race.get("race_name", ""),
            "distance": race.get("distance", ""),
            "num_horses": num_horses,
        }
        comments = generate_comments(race_info, recommendations, indexed)
        for rec in recommendations:
            key = f"{rec['horse_a']}-{rec['horse_b']}"
            rec["comment"] = comments.get(key, "")

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
