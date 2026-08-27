import React from "react";
import "./globals.css";

export const metadata = {
  title: "The Garage - Market Gap Analysis & Idea Validation",
  description: "AI-powered Market Gap Analysis, Gravity Map Topology, and Hypothesis Crash Engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
