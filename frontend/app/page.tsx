"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getVenues, VenueInfo } from "@/lib/api";

export default function Home() {
  const [venues, setVenues] = useState<VenueInfo[]>([]);
  const [date, setDate] = useState("");
  const [key, setKey] = useState("");
  const router = useRouter();

  useEffect(() => {
    getVenues()
      .then((res) => {
        setVenues(res.venues);
        setDate(res.date);
      })
      .catch(() => {});
  }, []);

  const handleUnlock = () => {
    if (key.trim()) {
      router.push(`/unlock?key=${encodeURIComponent(key.trim())}`);
    }
  };

  const formattedDate = date
    ? `${date.slice(0, 4)}/${date.slice(4, 6)}/${date.slice(6, 8)}`
    : "";

  return (
    <div className="min-h-screen">
      {/* Background glow */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#10b981]/[0.04] rounded-full blur-[150px]" />
        <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] bg-[#fbbf24]/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#080c18]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-wide">
              <span className="bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">Mr.</span>Wide
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://www.tornadeai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/30 hover:text-white transition"
            >
              TornadoAI
            </a>
            <a
              href="https://x.com/tekkyu_algo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/30 hover:text-white transition"
            >
              @tekkyu_algo
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center pt-28 pb-12 px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#10b981]/30 bg-[#10b981]/5 px-5 py-2 mb-8 backdrop-blur-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          <span className="text-sm font-medium tracking-wide text-[#10b981]">TornadoAI シリーズ</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-center leading-tight mb-4">
          地方競馬を、<br />
          <span className="bg-gradient-to-r from-[#10b981] via-[#fbbf24] to-[#f97316] bg-clip-text text-transparent">
            ワイドで獲る。
          </span>
        </h1>
        <p className="text-base sm:text-lg text-white/50 text-center max-w-xl leading-relaxed mt-4">
          TornadoAIエンジンが全馬を0〜100で指数化。上位馬の組み合わせから
          鉄板・準鉄板・妙味のワイド推奨を毎日お届けします。
        </p>
      </section>

      {/* Key Input */}
      <section className="max-w-md mx-auto px-6 mb-12">
        <div className="rounded-2xl border-2 border-[#10b981]/20 bg-[#10b981]/[0.03] p-6 backdrop-blur-sm">
          <h2 className="text-lg font-black text-center mb-4">閲覧キーを入力</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="MW??????"
              maxLength={8}
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-center text-lg font-mono tracking-widest focus:outline-none focus:border-[#10b981]/50 transition placeholder:text-white/20"
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            />
            <button
              onClick={handleUnlock}
              className="px-7 py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #10b981, #fbbf24)",
                boxShadow: "0 0 30px rgba(16,185,129,0.25)",
              }}
            >
              開く
            </button>
          </div>
          <p className="text-xs text-white/30 mt-3 text-center">
            noteで購入したキーを入力してください
          </p>
        </div>
      </section>

      {/* Today's Venues */}
      {venues.length > 0 && (
        <section className="max-w-md mx-auto px-6 mb-12">
          <p className="text-xs font-bold tracking-[0.25em] text-white/30 uppercase mb-4">
            {formattedDate} の開催
          </p>
          <div className="grid grid-cols-2 gap-3">
            {venues.map((v) => (
              <div
                key={v.venue}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center transition hover:border-[#10b981]/30 hover:bg-[#10b981]/[0.03]"
              >
                <div className="text-xl font-black">{v.venue}</div>
                <div className="text-sm text-white/40 mt-1">{v.race_count}R</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-lg mx-auto px-6 mb-16">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl border border-white/10 flex items-center justify-center bg-[#10b981]/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <h2 className="text-lg font-black">Wide指数とは</h2>
          </div>
          <p className="text-sm text-white/50 leading-relaxed mb-5">
            TornadoAIエンジンが算出した予測を独自の重み付けで統合。
            各馬の3着以内に入る可能性を0〜100のスコアで表します。
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <span className="text-sm text-white/50">分析エンジン</span>
              <span className="text-sm font-black bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">TornadoAI 4基搭載</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <span className="text-sm text-white/50">上位5頭 → 3着以内</span>
              <span className="text-sm font-black bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">理論複勝率 約60%</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <span className="text-sm text-white/50">ワイド推奨</span>
              <span className="text-sm font-black bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">鉄板・準鉄板・妙味</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <span className="text-sm text-white/50">対象</span>
              <span className="text-sm font-black bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">地方競馬 毎日全レース</span>
            </div>
          </div>
          <p className="text-[11px] text-white/25 mt-4 leading-relaxed">
            ※ 理論複勝率はTornadoAIエンジンの地方競馬過去データに基づく統計値です。将来の的中を保証するものではありません。
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black">
              <span className="bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">Mr.</span>Wide
            </span>
            <span className="text-xs text-white/30">TornadoAI シリーズ</span>
          </div>
          <div className="flex gap-6 text-xs text-white/30">
            <a className="hover:text-white transition" href="https://www.tornadeai.com" target="_blank" rel="noopener">TornadoAI</a>
            <a className="hover:text-white transition" href="https://x.com/tekkyu_algo" target="_blank" rel="noopener">@tekkyu_algo</a>
          </div>
          <p className="text-xs text-white/20">&copy; 2026 TornadoAI</p>
        </div>
      </footer>
    </div>
  );
}
