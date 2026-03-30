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
    getVenues().then((res) => {
      setVenues(res.venues);
      setDate(res.date);
    }).catch(() => {});
  }, []);

  const handleUnlock = () => {
    if (key.trim()) {
      router.push(`/unlock?key=${encodeURIComponent(key.trim())}`);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-1">
          <span className="text-[#f5a623]">Mr.</span>Wide
        </h1>
        <p className="text-[#a0a0a0] text-sm">ワイドで獲る。</p>
      </div>

      {/* Key Input */}
      <div className="bg-[#1a1a2e] rounded-xl p-6 mb-6 border border-[#2a2a3e]">
        <h2 className="text-lg font-bold mb-3 text-center">閲覧キーを入力</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="MW??????"
            maxLength={8}
            className="flex-1 bg-[#0a0a0a] border border-[#2a2a3e] rounded-lg px-4 py-3 text-center text-lg font-mono tracking-widest focus:outline-none focus:border-[#f5a623]"
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
          />
          <button
            onClick={handleUnlock}
            className="bg-[#f5a623] text-black font-bold px-6 py-3 rounded-lg hover:bg-[#e09520] transition"
          >
            開く
          </button>
        </div>
        <p className="text-xs text-[#a0a0a0] mt-2 text-center">
          noteで購入したキーを入力してください
        </p>
      </div>

      {/* Today's Venues */}
      {venues.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm text-[#a0a0a0] mb-3">
            {date && `${date.slice(0, 4)}/${date.slice(4, 6)}/${date.slice(6, 8)}`} の開催
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {venues.map((v) => (
              <div
                key={v.venue}
                className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e] text-center"
              >
                <div className="text-lg font-bold">{v.venue}</div>
                <div className="text-sm text-[#a0a0a0]">{v.race_count}R</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* About */}
      <div className="bg-[#1a1a2e] rounded-xl p-6 border border-[#2a2a3e]">
        <h2 className="text-lg font-bold mb-3 text-[#f5a623]">Wide指数とは</h2>
        <p className="text-sm text-[#a0a0a0] leading-relaxed mb-3">
          独自AIが地方競馬の全馬を0〜100で指数化。
          数値が高いほど3着以内に入る可能性が高く、
          ワイド馬券の的中に直結します。
        </p>
        <div className="bg-[#0a0a0a] rounded-lg p-4 text-sm">
          <div className="flex justify-between mb-1">
            <span>上位5頭の3着以内率</span>
            <span className="text-[#f5a623] font-bold">80%超</span>
          </div>
          <div className="flex justify-between">
            <span>分析エンジン数</span>
            <span className="text-[#4a9eff] font-bold">4基搭載</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-xs text-[#a0a0a0]">
        <a href="https://x.com/tekkyu_algo" target="_blank" rel="noopener" className="hover:text-white">
          @tekkyu_algo
        </a>
        {" | "}
        <a href="https://note.com/" target="_blank" rel="noopener" className="hover:text-white">
          note
        </a>
      </div>
    </main>
  );
}
