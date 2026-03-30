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
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-[#f5a623] text-2xl mb-4 animate-pulse">Wide指数を読み込み中...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-red-400 text-lg mb-4">{error}</div>
        <a href="/" className="text-[#f5a623] underline">トップに戻る</a>
      </main>
    );
  }

  if (!venueData) return null;

  const formattedDate = date
    ? `${date.slice(0, 4)}/${date.slice(4, 6)}/${date.slice(6, 8)}`
    : "";

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <a href="/" className="text-[#a0a0a0] text-sm">&larr; 戻る</a>
        <div className="text-right">
          <h1 className="text-xl font-bold">
            <span className="text-[#f5a623]">Mr.</span>Wide
          </h1>
        </div>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 border border-[#2a2a3e] text-center">
        <div className="text-2xl font-bold mb-1">{venueData.venue}</div>
        <div className="text-sm text-[#a0a0a0]">
          {formattedDate} | {venueData.race_count}レース | Wide指数
        </div>
      </div>

      <div className="space-y-4">
        {venueData.races.map((race) => (
          <RaceCard key={race.race_id} race={race} />
        ))}
      </div>

      <div className="text-center mt-8 text-xs text-[#a0a0a0]">
        <p>AI指数は参考情報です。投票は自己責任でお願いします。</p>
      </div>
    </main>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-[#f5a623] text-2xl animate-pulse">読み込み中...</div>
      </main>
    }>
      <UnlockContent />
    </Suspense>
  );
}
