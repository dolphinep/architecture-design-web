"use client";

import dynamic from "next/dynamic";

const CanvasClient = dynamic(() => import("./CanvasClient"), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: "calc(100dvh - 56px)" }}
      className="flex items-center justify-center text-zinc-600 text-sm"
    >
      Loading canvas…
    </div>
  ),
});

export default function CanvasWrapper() {
  return <CanvasClient />;
}
