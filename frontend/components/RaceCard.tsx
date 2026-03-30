"use client";

import { useState } from "react";
import { RaceData, Horse, WideRecommendation } from "@/lib/api";

function IndexBar({ value }: { value: number }) {
  const width = Math.max(5, value);
  const color =
    value >= 80
      ? "from-[#10b981] to-[#fbbf24]"
      : value >= 60
        ? "from-[#10b981] to-[#10b981]/60"
        : value >= 40
          ? "from-[#3b82f6] to-[#3b82f6]/60"
          : "from-white/20 to-white/10";
  return (
    <div className="w-20 h-3 bg-white/[0.03] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    teppan: "bg-gradient-to-r from-[#10b981] to-[#fbbf24] text-white",
    junTeppan: "bg-[#3b82f6] text-white",
    myomi: "border border-[#f97316]/40 bg-[#f97316]/10 text-[#f97316]",
  };
  const labels: Record<string, string> = {
    teppan: "鉄板",
    junTeppan: "準鉄板",
    myomi: "妙味",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${styles[type] || "bg-white/10"}`}>
      {labels[type] || type}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="w-6 text-right text-sm font-black text-[#fbbf24]">1</span>;
  if (rank === 2) return <span className="w-6 text-right text-sm font-black text-[#c0c0c0]">2</span>;
  if (rank === 3) return <span className="w-6 text-right text-sm font-black text-[#cd7f32]">3</span>;
  if (rank <= 5) return <span className="w-6 text-right text-sm font-bold text-white/80">{rank}</span>;
  return <span className="w-6 text-right text-xs text-white/30">{rank}</span>;
}

export default function RaceCard({ race }: { race: RaceData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all hover:border-white/15">
      {/* Race Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center gap-3">
          <span
            className="font-black text-sm px-2.5 py-1 rounded-lg text-white"
            style={{ background: "linear-gradient(135deg, #10b981, #10b981cc)" }}
          >
            {race.race_number}R
          </span>
          <div className="text-left">
            <div className="font-bold text-sm">{race.race_name}</div>
            <div className="text-xs text-white/30">
              {race.distance} / {race.num_horses}頭
            </div>
          </div>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-5 border-t border-white/5">
          {/* Top 5 */}
          <div className="mt-4 mb-5">
            <p className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase mb-3">
              Wide指数 TOP 5
            </p>
            <div className="space-y-2">
              {race.top5.map((h) => (
                <div key={h.horse_number} className="flex items-center gap-2.5">
                  <RankBadge rank={h.rank} />
                  <span className="bg-white/[0.05] text-xs font-mono w-7 text-center rounded py-0.5 border border-white/5">
                    {h.horse_number}
                  </span>
                  <span className="text-sm flex-1 truncate font-medium">{h.horse_name}</span>
                  <span className="text-sm font-black w-8 text-right">{h.wide_index}</span>
                  <IndexBar value={h.wide_index} />
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {race.recommendations.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase mb-3">
                おすすめワイド
              </p>
              <div className="space-y-2">
                {race.recommendations.slice(0, 4).map((rec, i) => {
                  const nameA = race.horses.find((h) => h.horse_number === rec.horse_a)?.horse_name || "";
                  const nameB = race.horses.find((h) => h.horse_number === rec.horse_b)?.horse_name || "";
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
                    >
                      <TypeBadge type={rec.type} />
                      <span className="text-sm font-black">
                        {rec.horse_a}-{rec.horse_b}
                      </span>
                      <span className="text-xs text-white/30 truncate">
                        {nameA} x {nameB}
                      </span>
                      <span className="text-xs font-black ml-auto bg-gradient-to-r from-[#10b981] to-[#fbbf24] bg-clip-text text-transparent">
                        {rec.confidence}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Horses */}
          <details className="mt-3">
            <summary className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase cursor-pointer hover:text-white/50 transition">
              全馬の指数を見る ({race.num_horses}頭)
            </summary>
            <div className="mt-3 space-y-1.5">
              {race.horses.map((h) => (
                <div
                  key={h.horse_number}
                  className={`flex items-center gap-2.5 ${h.rank <= 5 ? "" : "opacity-50"}`}
                >
                  <RankBadge rank={h.rank} />
                  <span className="bg-white/[0.05] text-xs font-mono w-7 text-center rounded py-0.5 border border-white/5">
                    {h.horse_number}
                  </span>
                  <span className={`flex-1 truncate ${h.rank <= 5 ? "text-sm font-medium" : "text-xs"}`}>
                    {h.horse_name}
                  </span>
                  <span className={`w-8 text-right ${h.rank <= 5 ? "text-sm font-black" : "text-xs"}`}>
                    {h.wide_index}
                  </span>
                  <IndexBar value={h.wide_index} />
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
