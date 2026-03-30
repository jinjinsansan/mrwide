#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ミスターワイド 認証 & 指数配信API
FastAPI on port 8001

エンドポイント:
  GET  /api/health              ヘルスチェック
  GET  /api/venues              今日の開催一覧（無認証）
  GET  /api/auth/line-url       LINEログインURL生成
  POST /api/auth/callback       LINEコールバック処理
  GET  /api/auth/me             ログイン中ユーザー情報 + 紐付きキー一覧
  POST /api/unlock              キー認証（LINE認証済みユーザーのみ）
  POST /api/unlock/preview      キー存在確認（LINE認証前）
"""

import json
import logging
import os
import glob
import secrets
import hashlib
import threading
import urllib.parse
from datetime import datetime, timedelta, timezone

import httpx
import requests as sync_requests
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Mr.Wide API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

LINE_CHANNEL_ID = os.environ.get("LINE_CHANNEL_ID", "")
LINE_CHANNEL_SECRET = os.environ.get("LINE_CHANNEL_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://mrwide.vercel.app")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
TELEGRAM_WEBHOOK_SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
# Supabase (optional, falls back to file-based)
SUPABASE_URL = os.environ.get("MRWIDE_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("MRWIDE_SUPABASE_KEY", "")

JST = timezone(timedelta(hours=9))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory session store (token -> user_info)
_sessions: dict[str, dict] = {}

# Support ticket store (in-memory + file)
_ticket_seq = 0
_ticket_seq_lock = threading.Lock()


# --- Helpers ---

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


def _find_key_in_data(key: str) -> tuple[dict | None, dict | None, str | None]:
    """キーをファイルから検索。(venue_data, index, date) を返す"""
    files = sorted(glob.glob(os.path.join(DATA_DIR, "wide_index_*.json")), reverse=True)
    for fp in files[:7]:
        with open(fp, 'r', encoding='utf-8') as f:
            index = json.load(f)
        for venue_data in index.get("venues", []):
            if venue_data.get("access_key") == key:
                return venue_data, index, index.get("date")
    return None, None, None


def _get_user_from_token(authorization: str | None) -> dict | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]
    return _sessions.get(token)


def _save_key_binding(key: str, line_user_id: str):
    """キーファイルにLINE user IDを記録（簡易実装）"""
    bindings_path = os.path.join(DATA_DIR, "key_bindings.json")
    bindings = {}
    if os.path.exists(bindings_path):
        with open(bindings_path, 'r') as f:
            bindings = json.load(f)
    bindings[key] = {
        "line_user_id": line_user_id,
        "activated_at": datetime.now().isoformat(),
    }
    with open(bindings_path, 'w') as f:
        json.dump(bindings, f, ensure_ascii=False, indent=2)


def _get_key_binding(key: str) -> dict | None:
    bindings_path = os.path.join(DATA_DIR, "key_bindings.json")
    if not os.path.exists(bindings_path):
        return None
    with open(bindings_path, 'r') as f:
        bindings = json.load(f)
    return bindings.get(key)


def _get_user_keys(line_user_id: str) -> list[dict]:
    """ユーザーに紐付いた全キーを返す"""
    bindings_path = os.path.join(DATA_DIR, "key_bindings.json")
    if not os.path.exists(bindings_path):
        return []
    with open(bindings_path, 'r') as f:
        bindings = json.load(f)
    keys = []
    for key, info in bindings.items():
        if info.get("line_user_id") == line_user_id:
            venue_data, _, date = _find_key_in_data(key)
            keys.append({
                "key": key,
                "venue": venue_data["venue"] if venue_data else "不明",
                "date": date or "",
                "activated_at": info.get("activated_at", ""),
            })
    return keys


# --- Models ---

class UnlockRequest(BaseModel):
    key: str

class UnlockResponse(BaseModel):
    success: bool
    venue: str | None = None
    date: str | None = None
    data: dict | None = None
    error: str | None = None
    needs_auth: bool = False

class LineCallbackRequest(BaseModel):
    code: str
    state: str

class AuthResponse(BaseModel):
    success: bool
    token: str | None = None
    user: dict | None = None
    error: str | None = None


# --- Endpoints ---

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "mrwide", "version": "2.0.0"}


@app.get("/api/venues")
def get_venues(date: str | None = None):
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
    return {"date": index.get("date", date_str), "venues": venues}


@app.get("/api/auth/line-url")
def get_line_login_url(redirect_path: str = "/"):
    """LINEログインURLを生成"""
    state = secrets.token_urlsafe(16)
    params = {
        "response_type": "code",
        "client_id": LINE_CHANNEL_ID,
        "redirect_uri": f"{FRONTEND_URL}/api/auth/callback",
        "state": state,
        "scope": "profile openid",
        "bot_prompt": "aggressive",
    }
    url = f"https://access.line.me/oauth2/v2.1/authorize?{urllib.parse.urlencode(params)}"
    return {"url": url, "state": state}


@app.post("/api/auth/callback", response_model=AuthResponse)
async def line_callback(req: LineCallbackRequest):
    """LINEコールバック: code → access_token → profile → session"""
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for token
            token_resp = await client.post(
                "https://api.line.me/oauth2/v2.1/token",
                data={
                    "grant_type": "authorization_code",
                    "code": req.code,
                    "redirect_uri": f"{FRONTEND_URL}/api/auth/callback",
                    "client_id": LINE_CHANNEL_ID,
                    "client_secret": LINE_CHANNEL_SECRET,
                },
            )
            if token_resp.status_code != 200:
                logger.error(f"LINE token error: {token_resp.text}")
                return AuthResponse(success=False, error="LINE認証に失敗しました")

            token_data = token_resp.json()
            access_token = token_data.get("access_token")

            # Get profile
            profile_resp = await client.get(
                "https://api.line.me/v2/profile",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if profile_resp.status_code != 200:
                return AuthResponse(success=False, error="プロフィール取得に失敗しました")

            profile = profile_resp.json()

        line_user_id = profile.get("userId")
        display_name = profile.get("displayName", "")
        picture_url = profile.get("pictureUrl", "")

        # Create session token
        session_token = secrets.token_urlsafe(32)
        _sessions[session_token] = {
            "line_user_id": line_user_id,
            "display_name": display_name,
            "picture_url": picture_url,
            "logged_in_at": datetime.now().isoformat(),
        }

        logger.info(f"LINE login: {display_name} ({line_user_id})")

        return AuthResponse(
            success=True,
            token=session_token,
            user={
                "display_name": display_name,
                "picture_url": picture_url,
            },
        )

    except Exception as e:
        logger.exception(f"LINE callback error: {e}")
        return AuthResponse(success=False, error="認証処理中にエラーが発生しました")


@app.get("/api/auth/me")
def get_me(authorization: str | None = Header(default=None)):
    """ログイン中ユーザー情報 + 紐付きキー一覧"""
    user = _get_user_from_token(authorization)
    if not user:
        return {"authenticated": False}

    keys = _get_user_keys(user["line_user_id"])
    return {
        "authenticated": True,
        "user": {
            "display_name": user["display_name"],
            "picture_url": user["picture_url"],
        },
        "keys": keys,
    }


@app.post("/api/unlock/preview")
def unlock_preview(req: UnlockRequest):
    """キーの存在確認（LINE認証前に呼ぶ）"""
    key = req.key.strip().upper()
    venue_data, _, date = _find_key_in_data(key)
    if not venue_data:
        return {"exists": False, "error": "無効なキーです"}

    binding = _get_key_binding(key)
    if binding:
        return {
            "exists": True,
            "venue": venue_data["venue"],
            "date": date,
            "already_bound": True,
        }
    return {
        "exists": True,
        "venue": venue_data["venue"],
        "date": date,
        "already_bound": False,
    }


@app.post("/api/unlock", response_model=UnlockResponse)
def unlock(req: UnlockRequest, authorization: str | None = Header(default=None)):
    """キー認証 → LINE認証済みユーザーのみデータ返却"""
    key = req.key.strip().upper()
    if not key or len(key) < 6:
        raise HTTPException(status_code=400, detail="Invalid key format")

    user = _get_user_from_token(authorization)
    if not user:
        return UnlockResponse(
            success=False,
            error="LINEログインが必要です",
            needs_auth=True,
        )

    line_user_id = user["line_user_id"]

    # キー検索
    venue_data, index, date = _find_key_in_data(key)
    if not venue_data:
        return UnlockResponse(success=False, error="無効なキーです。キーをご確認ください。")

    # キーの紐付けチェック
    binding = _get_key_binding(key)
    if binding and binding.get("line_user_id") != line_user_id:
        return UnlockResponse(success=False, error="このキーは別のアカウントに紐付けられています。")

    # 未紐付けなら紐付け
    if not binding:
        _save_key_binding(key, line_user_id)
        logger.info(f"Key {key} bound to {line_user_id}")

    safe_data = {k: v for k, v in venue_data.items() if k != "access_key"}
    return UnlockResponse(
        success=True,
        venue=venue_data["venue"],
        date=date,
        data=safe_data,
    )


# --- Support Ticket System ---

TICKETS_PATH = os.path.join(DATA_DIR, "support_tickets.json")
REPLIES_PATH = os.path.join(DATA_DIR, "support_replies.json")


def _load_tickets() -> dict:
    if os.path.exists(TICKETS_PATH):
        with open(TICKETS_PATH, 'r') as f:
            return json.load(f)
    return {"seq": 0, "tickets": {}}


def _save_tickets(data: dict):
    with open(TICKETS_PATH, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _load_replies() -> dict:
    if os.path.exists(REPLIES_PATH):
        with open(REPLIES_PATH, 'r') as f:
            return json.load(f)
    return {}


def _save_replies(data: dict):
    with open(REPLIES_PATH, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _telegram_send(text: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning("Telegram credentials not configured")
        return False
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        resp = sync_requests.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }, timeout=20)
        return resp.status_code == 200
    except Exception as e:
        logger.error(f"Telegram send error: {e}")
        return False


class TicketRequest(BaseModel):
    message: str
    page: str = ""


@app.post("/api/support/tickets")
def create_ticket(req: TicketRequest, authorization: str | None = Header(default=None)):
    """お問い合わせチケット作成 → Telegram通知"""
    user = _get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="認証が必要です")

    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="メッセージが必要です")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="メッセージが長すぎます")

    data = _load_tickets()
    data["seq"] = data.get("seq", 0) + 1
    tid = data["seq"]

    ticket = {
        "id": tid,
        "line_user_id": user["line_user_id"],
        "display_name": user["display_name"],
        "status": "open",
        "message": message,
        "page": req.page,
        "created_at": datetime.now(JST).isoformat(),
    }
    data["tickets"][str(tid)] = ticket
    _save_tickets(data)

    name = user["display_name"]
    tg_text = (
        f"📩 <b>[Mr.Wide] 新規お問い合わせ</b>\n"
        f"ticket: <b>#{tid}</b>\n"
        f"user: {name}\n"
        f"page: <code>{req.page or '-'}</code>\n"
        f"\n<b>内容</b>\n{message}\n"
        f"\n<b>返信コマンド</b>\n<code>/resolve {tid} 返信内容...</code>"
    )
    sent = _telegram_send(tg_text)
    logger.info(f"Ticket #{tid} created by {name}, telegram={sent}")

    return {"ticket_id": tid, "sent": sent}


@app.get("/api/support/replies")
def get_replies(authorization: str | None = Header(default=None)):
    """ユーザーへの返信を取得（ポーリング）"""
    user = _get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="認証が必要です")

    uid = user["line_user_id"]
    replies_data = _load_replies()
    items = replies_data.pop(uid, [])
    if items:
        _save_replies(replies_data)
    return {"replies": items, "count": len(items)}


@app.post("/api/telegram/webhook")
async def telegram_webhook(request: Request):
    """Telegramからの /resolve コマンドを受信"""
    if TELEGRAM_WEBHOOK_SECRET:
        got = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if got != TELEGRAM_WEBHOOK_SECRET:
            raise HTTPException(status_code=403, detail="forbidden")

    update = await request.json()
    msg = (update.get("message") or {}).get("text") or ""
    msg = str(msg).strip()
    if not msg:
        return {"ok": True}

    if msg.startswith("/resolve"):
        parts = msg.split(maxsplit=2)
        if len(parts) < 3:
            return {"ok": True, "error": "usage: /resolve <id> <text>"}
        try:
            tid = int(parts[1])
        except Exception:
            return {"ok": True, "error": "invalid id"}

        reply_text = parts[2].strip()
        data = _load_tickets()
        ticket = data.get("tickets", {}).get(str(tid))
        if not ticket:
            return {"ok": True, "error": "ticket not found"}

        uid = ticket.get("line_user_id", "")

        # Save reply for user polling
        replies_data = _load_replies()
        if uid not in replies_data:
            replies_data[uid] = []
        replies_data[uid].append({
            "ticket_id": tid,
            "text": reply_text,
            "resolved_at": datetime.now(JST).isoformat(),
        })
        _save_replies(replies_data)

        ticket["status"] = "resolved"
        ticket["resolved_at"] = datetime.now(JST).isoformat()
        _save_tickets(data)

        _telegram_send(f"✅ [Mr.Wide] #{tid} resolved")
        logger.info(f"Ticket #{tid} resolved")

        return {"ok": True}

    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
