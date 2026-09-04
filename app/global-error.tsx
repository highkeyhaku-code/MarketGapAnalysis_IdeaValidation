'use client'

import React from 'react'

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <html lang="ja">
      <body>
        <div style={{ padding: "2rem", fontFamily: "sans-serif", background: "#020617", color: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h2>システムエラーが発生しました</h2>
          <p style={{ color: "#f43f5e", fontSize: "0.875rem" }}>{error?.message || "An unexpected error occurred"}</p>
          <button
            onClick={() => retry()}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  )
}
