"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DiscoverRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?tab=discover");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono text-sm">
      <div className="text-indigo-400 animate-pulse">
        <span>Redirecting to Serendipity Seeker Directory...</span>
      </div>
    </div>
  );
}
