"use client";

import React, { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle, Sparkles, Terminal, Activity } from "lucide-react";

export interface JobPollingTrackerProps {
  jobId: string;
  onComplete?: (resultData: any) => void;
  onError?: (errorMsg: string) => void;
}

interface JobRecord {
  id: string;
  status: string;
  percentage: number;
  error_message: string | null;
  result_data: any;
}

/**
 * ジョブ進捗ポーリングトラッカーコンポーネント (JobPollingTracker)
 * Inngest非同期ジョブの進行状況をポーリングし、エンタメ的・リアルタイムに進捗ログとパーセンテージを表示する。
 */
export function JobPollingTracker({
  jobId,
  onComplete,
  onError,
}: JobPollingTrackerProps) {
  const [job, setJob] = useState<JobRecord | null>(null);
  const [logHistory, setLogHistory] = useState<Array<{ time: string; text: string }>>([]);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const isCompletedRef = useRef(false);

  useEffect(() => {
    if (!jobId || isCompletedRef.current) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/market/status/${jobId}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch status`);
        }
        const data = await res.json();
        if (!isSubscribed) return;

        if (data.success && data.job) {
          const currentJob: JobRecord = data.job;
          setJob(currentJob);

          // ログ履歴の更新
          setLogHistory((prev) => {
            if (prev.length === 0 || prev[prev.length - 1].text !== currentJob.status) {
              const now = new Date().toLocaleTimeString();
              return [...prev, { time: now, text: currentJob.status }];
            }
            return prev;
          });

          // 完了検知
          if (
            currentJob.percentage >= 100 ||
            currentJob.status.toUpperCase() === "COMPLETED"
          ) {
            isCompletedRef.current = true;
            clearInterval(interval);
            if (onComplete) {
              onComplete(currentJob.result_data);
            }
          }

          // エラー検知
          if (currentJob.error_message) {
            isCompletedRef.current = true;
            clearInterval(interval);
            setPollingError(currentJob.error_message);
            if (onError) {
              onError(currentJob.error_message);
            }
          }
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        console.warn("Polling error:", err);
      }
    }, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [jobId, onComplete, onError]);

  const percentage = Math.min(100, Math.max(0, job?.percentage ?? 5));
  const isFinished = percentage >= 100;
  const isError = Boolean(pollingError || job?.error_message);

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 font-sans">
      {/* ヘッダー */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            {isFinished ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : isError ? (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-200">
              AI Market Gravity Pipeline
            </h3>
            <p className="text-xs text-slate-400 font-mono">Job ID: {jobId.slice(0, 18)}...</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-medium text-emerald-400">
            {isFinished ? "100%" : `${percentage}%`}
          </span>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="mt-5 space-y-2">
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isFinished
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                : isError
                ? "bg-rose-500"
                : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>{job?.status || "Analyzing market inputs..."}</span>
          <span className="font-mono">{percentage}%</span>
        </div>
      </div>

      {/* ターミナル風ライブ進捗ログ */}
      <div className="mt-5 bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 font-mono text-xs space-y-2">
        <div className="flex items-center space-x-2 pb-2 text-slate-400 border-b border-slate-800/60">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-300">Live Telemetry</span>
        </div>
        <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1 text-slate-300">
          {logHistory.map((log, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <span className="text-slate-500 select-none">[{log.time}]</span>
              <span className={idx === logHistory.length - 1 ? "text-indigo-300 font-medium" : "text-slate-400"}>
                {log.text}
              </span>
            </div>
          ))}
          {!isFinished && !isError && (
            <div className="flex items-center space-x-2 text-indigo-400 animate-pulse pt-1">
              <span>▶</span>
              <span>Running parallel friction extractors...</span>
            </div>
          )}
        </div>
      </div>

      {/* 完了バッジ */}
      {isFinished && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-emerald-300 text-xs">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Gravity map calculations complete! Rendering physics topology...</span>
        </div>
      )}

      {/* エラーバッジ */}
      {isError && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Error: {pollingError || job?.error_message}</span>
        </div>
      )}
    </div>
  );
}
