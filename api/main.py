#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ミスターワイド 認証 & 指数配信API
FastAPI on port 8001

エンドポイント:
  POST /api/unlock     閲覧キー認証 → 指数データ返却
  GET  /api/venues     今日の開催一覧（無認証）
  GET  /api/health     ヘルスチェック
"""

import json
import logging
import os
import glob
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Mr.Wide API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _load_index(date_str: str) -> dict | None:
    path = os.path.join(DATA_DIR, f"wide_index_{date_str}.json")
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _find_latest_index() -> dict | None:
    files = sorted(glob.glob(os.path.join(DATA_DIR, "wide_index_*.json")), reverse=True)
    if not files:
        return None
    with open(files[0], 'r', encoding='utf-8') as f:
        return json.load(f)


class UnlockRequest(BaseModel):
    key: str


class UnlockResponse(BaseModel):
    success: bool
    venue: str | None = None
    date: str | None = None
    data: dict | None = None
    error: str | None = None


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "mrwide"}


@app.get("/api/venues")
def get_venues(date: str | None = None):
    """今日の開催一覧（キー不要、概要のみ）"""
    date_str = date or datetime.now().strftime("%Y%m%d")
    index = _load_index(date_str)
    if not index:
        index = _find_latest_index()
    if not index:
        return {"date": date_str, "venues": []}

    venues = []
    for v in index.get("venues", []):
        venues.append({
            "venue": v["venue"],
            "race_count": v["race_count"],
            "has_key": bool(v.get("access_key")),
        })
    return {
        "date": index.get("date", date_str),
        "venues": venues,
    }


@app.post("/api/unlock", response_model=UnlockResponse)
def unlock(req: UnlockRequest):
    """閲覧キーで認証 → 該当開催の指数データを返却"""
    key = req.key.strip().upper()
    if not key or len(key) < 6:
        raise HTTPException(status_code=400, detail="Invalid key format")

    # 全ファイルからキーを検索
    files = sorted(glob.glob(os.path.join(DATA_DIR, "wide_index_*.json")), reverse=True)
    for fp in files[:7]:  # 直近7日分
        with open(fp, 'r', encoding='utf-8') as f:
            index = json.load(f)
        for venue_data in index.get("venues", []):
            if venue_data.get("access_key") == key:
                # キーにマッチ → データ返却（access_keyは除去）
                safe_data = {k: v for k, v in venue_data.items() if k != "access_key"}
                return UnlockResponse(
                    success=True,
                    venue=venue_data["venue"],
                    date=index.get("date"),
                    data=safe_data,
                )

    return UnlockResponse(success=False, error="無効なキーです。キーをご確認ください。")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
