"use client";

import { useState } from "react";
import { RaceData, Horse, WideRecommendation } from "@/lib/api";

function IndexBar({ value }: { value: number }) {
  const width = Math.max(5, value);
  const color =
    value >= 80 ? "bg-[#f5a623]" :
    value >= 60 ? "bg-[#4a9eff]" :
    value >= 40 ? "bg-[#3ecf8e]" :
    "bg-[#666]";
  return (
    <div className="w-24 h-4 bg-[#0a0a0a] rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    teppan: "bg-[#f5a623] text-black",
    junTeppan: "bg-[#4a9eff] text-white",
    myomi: "bg-[#3ecf8e] text-black",
  };
  const labels: Record<string, string> = {
    teppan: "鉄板",
    junTeppan: "準鉄板",
    myomi: "妙味",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-bold ${styles[type] || "bg-gray-600"}`}>
      {labels[type] || type}
    </span>
  );
}

export default function RaceCard({ race }: { race: RaceData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-[#2a2a3e] overflow-hidden">
      {/* Race Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[#222240] transition"
      >
        <div className="flex items-center gap-3">
          <span className="bg-[#f5a623] text-black font-bold text-sm px-2 py-1 rounded">
            {race.race_number}R
          </span>
          <div className="text-left">
            <div className="font-bold text-sm">{race.race_name}</div>
            <div className="text-xs text-[#a0a0a0]">{race.distance} / {race.num_horses}頭</div>
          </div>
        </div>
        <span className="text-[#a0a0a0] text-lg">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#2a2a3e]">
          {/* Top 5 */}
          <div className="mt-3 mb-4">
            <div className="text-xs text-[#a0a0a0] mb-2">Wide指数 上位5頭</div>
            <div className="space-y-2">
              {race.top5.map((h) => (
                <div key={h.horse_number} className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 text-right ${
                    h.rank === 1 ? "text-[#f5a623]" :
                    h.rank === 2 ? "text-[#c0c0c0]" :
                    h.rank === 3 ? "text-[#cd7f32]" :
                    "text-[#a0a0a0]"
                  }`}>
                    {h.rank}
                  </span>
                  <span className="bg-[#0a0a0a] text-sm font-mono w-8 text-center rounded py-0.5">
                    {h.horse_number}
                  </span>
                  <span className="text-sm flex-1 truncate">{h.horse_name}</span>
                  <span className="text-sm font-bold w-8 text-right">{h.wide_index}</span>
                  <IndexBar value={h.wide_index} />
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {race.recommendations.length > 0 && (
            <div>
              <div className="text-xs text-[#a0a0a0] mb-2">🎯 おすすめワイド</div>
              <div className="space-y-1.5">
                {race.recommendations.slice(0, 4).map((rec, i) => {
                  const nameA = race.horses.find(h => h.horse_number === rec.horse_a)?.horse_name || "";
                  const nameB = race.horses.find(h => h.horse_number === rec.horse_b)?.horse_name || "";
                  return (
                    <div key={i} className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg px-3 py-2">
                      <TypeBadge type={rec.type} />
                      <span className="text-sm font-bold">
                        {rec.horse_a}-{rec.horse_b}
                      </span>
                      <span className="text-xs text-[#a0a0a0] truncate">
                        {nameA} × {nameB}
                      </span>
                      <span className="text-xs text-[#f5a623] ml-auto font-bold">
                        {rec.confidence}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Horses (collapsed) */}
          <details className="mt-3">
            <summary className="text-xs text-[#a0a0a0] cursor-pointer hover:text-white">
              全馬の指数を見る ({race.num_horses}頭)
            </summary>
            <div className="mt-2 space-y-1">
              {race.horses.map((h) => (
                <div key={h.horse_number} className={`flex items-center gap-3 ${h.rank <= 5 ? "text-sm" : "text-xs text-[#a0a0a0]"}`}>
                  <span className={`w-6 text-right font-bold ${
                    h.rank === 1 ? "text-[#f5a623]" :
                    h.rank === 2 ? "text-[#c0c0c0]" :
                    h.rank === 3 ? "text-[#cd7f32]" :
                    h.rank <= 5 ? "text-white" :
                    "text-[#a0a0a0]"
                  }`}>
                    {h.rank}
                  </span>
                  <span className="bg-[#0a0a0a] font-mono w-8 text-center rounded py-0.5 text-xs">
                    {h.horse_number}
                  </span>
                  <span className="flex-1 truncate">{h.horse_name}</span>
                  <span className={`w-8 text-right font-bold ${h.rank <= 5 ? "" : "font-normal"}`}>{h.wide_index}</span>
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
