"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { unlockWithKey, VenueData } from "@/lib/api";
import RaceCard from "@/components/RaceCard";

function UnlockContent() {
  const searchParams = useSearchParams();
  const keyParam = searchParams.get("key") || "";
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!keyParam) {
      setError("キーが指定されていません");
      setLoading(false);
      return;
    }
    unlockWithKey(keyParam)
      .then((res) => {
        if (res.success && res.data) {
          setVenueData(res.data);
          setDate(res.date || "");
        } else {
          setError(res.error || "無効なキーです");
        }
      })
      .catch(() => setError("通信エラーが発生しました"))
      .finally(() => setLoading(false));
  }, [keyParam]);

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
      {/* Background glow */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#10b981]/[0.04] rounded-full blur-[150px]" />
      </div>

      {/* Header */}
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
        {/* Venue Info */}
        <div className="rounded-2xl border-2 border-[#10b981]/20 bg-[#10b981]/[0.03] p-6 mb-6 text-center backdrop-blur-sm">
          <div className="text-3xl font-black mb-2">{venueData.venue}</div>
          <div className="text-sm text-white/40">
            {formattedDate} | {venueData.race_count}レース | Wide指数
          </div>
        </div>

        {/* Race List */}
        <div className="space-y-4">
          {venueData.races.map((race) => (
            <RaceCard key={race.race_id} race={race} />
          ))}
        </div>

        {/* Disclaimer */}
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
