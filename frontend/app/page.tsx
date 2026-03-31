"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getVenues, getMe, getLineLoginUrl, clearToken, getFreeRaces, VenueInfo, VenueData, UserKey } from "@/lib/api";
import RaceCard from "@/components/RaceCard";

export default function Home() {
  const [venues, setVenues] = useState<VenueInfo[]>([]);
  const [date, setDate] = useState("");
  const [key, setKey] = useState("");
  const [user, setUser] = useState<{ display_name: string; picture_url: string } | null>(null);
  const [userKeys, setUserKeys] = useState<UserKey[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [freeVenues, setFreeVenues] = useState<VenueData[]>([]);
  const [freeCount, setFreeCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    getVenues().then((res) => {
      setVenues(res.venues);
      setDate(res.date);
    }).catch(() => {});

    getFreeRaces().then((res) => {
      setFreeVenues(res.venues);
      setFreeCount(res.free_count);
    }).catch(() => {});

    getMe().then((res) => {
      if (res.authenticated && res.user) {
        setUser(res.user);
        setUserKeys(res.keys || []);
      }
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));
  }, []);

  const handleUnlock = () => {
    if (!key.trim()) return;
    if (!user) {
      localStorage.setItem("mrwide_pending_key", key.trim());
      handleLineLogin();
    } else {
      router.push(`/unlock?key=${encodeURIComponent(key.trim())}`);
    }
  };

  const handleLineLogin = async () => {
    const { url } = await getLineLoginUrl();
    window.location.href = url;
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setUserKeys([]);
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
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {authChecked && user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                {user.picture_url && (
                  <img src={user.picture_url} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full shrink-0" />
                )}
                <span className="text-[10px] sm:text-xs text-white/50 truncate max-w-[60px] sm:max-w-[100px]">{user.display_name}</span>
                <button onClick={handleLogout} className="text-[10px] sm:text-xs text-white/30 hover:text-white transition shrink-0">
                  ログアウト
                </button>
              </div>
            ) : authChecked ? (
              <button
                onClick={handleLineLogin}
                className="text-[10px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-full bg-[#06C755] text-white font-bold hover:opacity-90 transition shrink-0"
              >
                LINEログイン
              </button>
            ) : null}
            <a href="https://www.tornadeai.com" target="_blank" rel="noopener noreferrer" className="hidden sm:inline text-xs text-white/30 hover:text-white transition shrink-0">
              TornadoAI
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

      {/* Free Races */}
      {freeCount > 0 && (
        <section className="max-w-lg mx-auto px-4 sm:px-6 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-md bg-[#fbbf24]/20 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
            <p className="text-xs font-bold tracking-[0.15em] text-[#fbbf24]/80 uppercase">
              本日の無料公開 — {freeCount}レース
            </p>
          </div>
          <div className="space-y-6">
            {freeVenues.map((v) => (
              <div key={v.venue}>
                <p className="text-sm font-black text-white/70 mb-2 pl-1">{v.venue}</p>
                <div className="space-y-3">
                  {v.races.map((race) => (
                    <RaceCard key={race.race_id} race={race} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Input */}
      <section className="max-w-md mx-auto px-4 sm:px-6 mb-8">
        <div className="rounded-2xl border-2 border-[#10b981]/20 bg-[#10b981]/[0.03] p-4 sm:p-6 backdrop-blur-sm">
          <h2 className="text-base sm:text-lg font-black text-center mb-4">閲覧キーを入力</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder=""
              maxLength={8}
              className="flex-1 min-w-0 bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 text-center text-base sm:text-lg font-mono tracking-wider sm:tracking-widest focus:outline-none focus:border-[#10b981]/50 transition placeholder:text-white/20"
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            />
            <button
              onClick={handleUnlock}
              className="px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-95 shrink-0"
              style={{
                background: "linear-gradient(135deg, #10b981, #fbbf24)",
                boxShadow: "0 0 30px rgba(16,185,129,0.25)",
              }}
            >
              開く
            </button>
          </div>
          <p className="text-xs text-white/30 mt-3 text-center">
            アクセスキーを入力してください
          </p>
          {!user && (
            <p className="text-xs text-white/25 mt-1 text-center">
              初回利用時はLINE認証が必要です
            </p>
          )}
        </div>
      </section>

      {/* User's Keys */}
      {user && userKeys.length > 0 && (
        <section className="max-w-md mx-auto px-4 sm:px-6 mb-8">
          <p className="text-xs font-bold tracking-[0.25em] text-white/30 uppercase mb-3">
            購入済みキー
          </p>
          <div className="space-y-2">
            {userKeys.map((uk) => (
              <button
                key={uk.key}
                onClick={() => router.push(`/unlock?key=${encodeURIComponent(uk.key)}`)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 sm:px-4 py-3 hover:border-[#10b981]/30 hover:bg-[#10b981]/[0.03] transition"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-xs sm:text-sm font-mono text-white/50 shrink-0">{uk.key}</span>
                  <span className="text-xs sm:text-sm font-bold truncate">{uk.venue}</span>
                </div>
                <span className="text-[10px] sm:text-xs text-white/30 shrink-0">
                  {uk.date && `${uk.date.slice(4, 6)}/${uk.date.slice(6, 8)}`}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Today's Venues */}
      {venues.length > 0 && (
        <section className="max-w-md mx-auto px-4 sm:px-6 mb-12">
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
      <section className="max-w-lg mx-auto px-4 sm:px-6 mb-16">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
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
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 sm:px-4 py-3">
              <span className="text-xs sm:text-sm text-white/50 shrink-0">エンジン</span>
              <span className="text-xs sm:text-sm font-black bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent text-right">TornadoAI 4基</span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 sm:px-4 py-3">
              <span className="text-xs sm:text-sm text-white/50 shrink-0">上位5頭の複勝率</span>
              <span className="text-xs sm:text-sm font-black bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent text-right">理論値 約60%</span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 sm:px-4 py-3">
              <span className="text-xs sm:text-sm text-white/50 shrink-0">ワイド推奨</span>
              <span className="text-xs sm:text-sm font-black bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent text-right">鉄板・準鉄板・妙味</span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 sm:px-4 py-3">
              <span className="text-xs sm:text-sm text-white/50 shrink-0">対象</span>
              <span className="text-xs sm:text-sm font-black bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent text-right">地方競馬 毎日全レース</span>
            </div>
          </div>
          <p className="text-[11px] text-white/25 mt-4 leading-relaxed">
            ※ 理論複勝率はTornadoAIエンジンの地方競馬過去データに基づく統計値です。将来の的中を保証するものではありません。
          </p>
        </div>
      </section>

      {/* LINE CTA */}
      <section className="max-w-md mx-auto px-4 sm:px-6 mb-12">
        <a
          href="https://lin.ee/s0dqTW3"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "#06C755", boxShadow: "0 0 25px rgba(6,199,85,0.3)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
          公式LINEを友だち追加
        </a>
        <p className="text-xs text-white/25 mt-2 text-center">お知らせ・サポートはLINEで受け取れます</p>
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
            <a className="hover:text-white transition" href="https://lin.ee/s0dqTW3" target="_blank" rel="noopener">公式LINE</a>
            <a className="hover:text-white transition" href="https://x.com/tekkyu_algo" target="_blank" rel="noopener">@tekkyu_algo</a>
          </div>
          <p className="text-xs text-white/20">&copy; 2026 TornadoAI</p>
        </div>
      </footer>
    </div>
  );
}
