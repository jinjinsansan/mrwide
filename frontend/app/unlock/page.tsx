"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { unlockWithKey, getLineLoginUrl, isLoggedIn, VenueData } from "@/lib/api";
import RaceCard from "@/components/RaceCard";
import SupportForm from "@/components/SupportForm";

function UnlockContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const keyParam = searchParams.get("key") || "";
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!keyParam) {
      setError("キーが指定されていません");
      setLoading(false);
      return;
    }

    if (!isLoggedIn()) {
      localStorage.setItem("mrwide_pending_key", keyParam);
      setNeedsAuth(true);
      setLoading(false);
      return;
    }

    unlockWithKey(keyParam)
      .then((res) => {
        if (res.needs_auth) {
          localStorage.setItem("mrwide_pending_key", keyParam);
          setNeedsAuth(true);
        } else if (res.success && res.data) {
          setVenueData(res.data);
          setDate(res.date || "");
        } else {
          setError(res.error || "無効なキーです");
        }
      })
      .catch(() => setError("通信エラーが発生しました"))
      .finally(() => setLoading(false));
  }, [keyParam]);

  const handleLineLogin = async () => {
    const { url } = await getLineLoginUrl();
    window.location.href = url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 text-[#10b981] text-xl font-black animate-pulse">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            Wide指数を読み込み中...
          </div>
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="mb-6">
            <span className="text-2xl font-black">
              <span className="bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">Mr.</span>Wide
            </span>
          </div>
          <p className="text-white/60 mb-2">指数の閲覧にはLINE認証が必要です</p>
          <p className="text-white/30 text-sm mb-8">
            初回のみLINEログインで本人確認を行います。<br />
            キーの不正利用を防止するための認証です。
          </p>
          <button
            onClick={handleLineLogin}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#06C755" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINEでログイン
          </button>
          <a href="/" className="inline-block mt-4 text-sm text-white/30 hover:text-white transition">
            トップに戻る
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-red-400 text-lg font-bold mb-4">{error}</div>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition"
          >
            トップに戻る
          </a>
        </div>
      </div>
    );
  }

  if (!venueData) return null;

  const formattedDate = date
    ? `${date.slice(0, 4)}/${date.slice(4, 6)}/${date.slice(6, 8)}`
    : "";

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#10b981]/[0.04] rounded-full blur-[150px]" />
      </div>

      <header className="fixed top-0 w-full z-50 bg-[#080c18]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-sm text-white/40 hover:text-white transition flex items-center gap-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
            戻る
          </a>
          <span className="text-lg font-black">
            <span className="bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">Mr.</span>Wide
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-24 pb-12">
        <div className="rounded-2xl border-2 border-[#10b981]/20 bg-[#10b981]/[0.03] p-6 mb-6 text-center backdrop-blur-sm">
          <div className="text-3xl font-black mb-2">{venueData.venue}</div>
          <div className="text-sm text-white/40">
            {formattedDate} | {venueData.race_count}レース | Wide指数
          </div>
        </div>

        <div className="space-y-4">
          {venueData.races.map((race) => (
            <RaceCard key={race.race_id} race={race} />
          ))}
        </div>

        <SupportForm />

        <div className="text-center mt-10 text-xs text-white/20">
          <p>AI指数は参考情報です。投票は自己責任でお願いします。</p>
          <p className="mt-1">&copy; 2026 TornadoAI</p>
        </div>
      </main>
    </div>
  );
}

export default function UnlockPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-[#10b981] text-xl font-black animate-pulse">読み込み中...</div>
        </div>
      }
    >
      <UnlockContent />
    </Suspense>
  );
}
