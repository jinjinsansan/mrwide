"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { setToken } from "@/lib/api";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const name = searchParams.get("name");

  useEffect(() => {
    if (token) {
      setToken(token);
      const pendingKey = localStorage.getItem("mrwide_pending_key");
      if (pendingKey) {
        localStorage.removeItem("mrwide_pending_key");
        router.replace(`/unlock?key=${encodeURIComponent(pendingKey)}`);
      } else {
        router.replace("/");
      }
    }
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-[#10b981] text-xl font-black mb-2 animate-pulse">
          ログイン完了
        </div>
        {name && <p className="text-white/50">{name}さん、ようこそ</p>}
        <p className="text-white/30 text-sm mt-2">リダイレクト中...</p>
      </div>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-[#10b981] animate-pulse">処理中...</div></div>}>
      <SuccessContent />
    </Suspense>
  );
}
