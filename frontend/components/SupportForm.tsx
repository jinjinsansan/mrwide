"use client";

import { useState } from "react";
import { isLoggedIn } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://bot.dlogicai.in/wide";

export default function SupportForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (!isLoggedIn()) return null;

  const handleSubmit = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const token = localStorage.getItem("mrwide_token");
      const res = await fetch(`${API_BASE}/api/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message.trim(),
          page: window.location.pathname,
        }),
      });
      const data = await res.json();
      if (data.ticket_id) {
        setSent(true);
        setMessage("");
      } else {
        setError(data.detail || "送信に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <div className="text-center mt-6">
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-white/25 hover:text-white/50 transition underline underline-offset-2"
        >
          お問い合わせ・不具合報告
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-xl border border-[#10b981]/20 bg-[#10b981]/[0.03] p-4 text-center">
        <p className="text-sm text-[#10b981] font-bold">送信しました</p>
        <p className="text-xs text-white/30 mt-1">確認次第ご連絡いたします</p>
        <button
          onClick={() => { setSent(false); setOpen(false); }}
          className="text-xs text-white/30 hover:text-white mt-2 transition"
        >
          閉じる
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-white/40">お問い合わせ・不具合報告</p>
        <button onClick={() => setOpen(false)} className="text-xs text-white/30 hover:text-white transition">
          閉じる
        </button>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="内容を入力してください"
        maxLength={2000}
        rows={3}
        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#10b981]/50 transition resize-none placeholder:text-white/20"
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={sending || !message.trim()}
        className="mt-2 w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
        style={{ background: "linear-gradient(135deg, #10b981, #fbbf24)" }}
      >
        {sending ? "送信中..." : "送信"}
      </button>
    </div>
  );
}
