"use client";
import { useState, useEffect, useRef } from "react";
import { useAnimPausedRef } from "./pause-context";

type Mode = "hit-miss" | "cache-aside" | "stale";

interface LogEntry {
  id: number;
  text: string;
  color: string;
}

interface PacketState {
  x: number; // % along the track
  ms: number; // transition duration
  color: string;
  visible: boolean;
}

interface Flash {
  text: string;
  color: string; // text color class
  border: string; // border color class
}

const APP_X = 10;
const CACHE_X = 50;
const DB_X = 90;

export function CacheFlowViz({ mode = "hit-miss" }: { mode?: Mode }) {
  const [packet, setPacket] = useState<PacketState>({ x: APP_X, ms: 0, color: "#a78bfa", visible: false });
  const [cacheFlash, setCacheFlash] = useState<Flash | null>(null);
  const [chip, setChip] = useState<{ text: string; crossed: boolean } | null>(null);
  const [dbValue, setDbValue] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const [timing, setTiming] = useState<{ text: string; color: string } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logId = useRef(0);
  const pausedRef = useAnimPausedRef();

  useEffect(() => {
    let cancelled = false;
    const timeouts = new Set<ReturnType<typeof setTimeout>>();

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          timeouts.delete(t);
          resolve();
        }, ms);
        timeouts.add(t);
      });

    const wait = async (ms: number) => {
      await sleep(ms);
      // hold at this step boundary while paused
      while (pausedRef.current && !cancelled) {
        await sleep(100);
      }
    };

    const addLog = (text: string, color: string) => {
      if (cancelled) return;
      setLog((prev) => [{ id: logId.current++, text, color }, ...prev].slice(0, 4));
    };

    const move = async (x: number, ms = 600) => {
      if (cancelled) return;
      setPacket((p) => ({ ...p, x, ms }));
      await wait(ms + 100);
    };

    const teleport = async (x: number, color: string) => {
      if (cancelled) return;
      setPacket({ x, ms: 0, color, visible: false });
      await wait(60);
      setPacket((p) => ({ ...p, visible: true }));
      await wait(60);
    };

    const hidePacket = () => setPacket((p) => ({ ...p, visible: false }));

    const flash = async (text: string, color: string, border: string, ms = 800) => {
      if (cancelled) return;
      setCacheFlash({ text, color, border });
      await wait(ms);
      setCacheFlash(null);
    };

    async function runHitMiss() {
      setChip(null);
      setTiming(null);
      // Round 1: MISS
      await teleport(APP_X, "#a78bfa");
      addLog("GET user:42 → cache", "text-zinc-300");
      await move(CACHE_X);
      await flash("MISS", "text-red-400", "border-red-500");
      addLog("Cache MISS — go to DB", "text-red-400");
      await move(DB_X);
      await wait(350);
      await move(CACHE_X);
      setChip({ text: "user:42", crossed: false });
      addLog("Store user:42 in cache", "text-emerald-400");
      await wait(300);
      await move(APP_X);
      setTiming({ text: "~12ms", color: "text-amber-400" });
      addLog("Response in ~12ms", "text-amber-400");
      await wait(1200);
      // Round 2: HIT
      addLog("GET user:42 → cache", "text-zinc-300");
      await move(CACHE_X);
      await flash("HIT", "text-emerald-400", "border-emerald-500");
      addLog("Cache HIT", "text-emerald-400");
      await move(APP_X, 450);
      setTiming({ text: "~0.2ms", color: "text-emerald-400" });
      addLog("Response in ~0.2ms", "text-emerald-400");
      await wait(1800);
      hidePacket();
      setChip(null);
      setTiming(null);
      await wait(600);
    }

    async function runCacheAside() {
      setChip(null);
      setTiming(null);
      await teleport(APP_X, "#a78bfa");
      addLog("1. App checks cache", "text-zinc-300");
      await move(CACHE_X);
      await flash("MISS", "text-red-400", "border-red-500");
      addLog("2. Miss — app queries DB", "text-red-400");
      await move(DB_X);
      await wait(350);
      await move(CACHE_X);
      setChip({ text: "user:42", crossed: false });
      addLog("3. App writes result to cache", "text-emerald-400");
      await wait(300);
      await move(APP_X);
      await wait(900);
      addLog("4. Next read hits cache", "text-zinc-300");
      await move(CACHE_X);
      await flash("HIT", "text-emerald-400", "border-emerald-500");
      await move(APP_X, 450);
      await wait(1800);
      hidePacket();
      setChip(null);
      await wait(600);
    }

    async function runStale() {
      setChip({ text: "price: $10", crossed: false });
      setDbValue("$10");
      setBadge(null);
      setTiming(null);
      await wait(700);
      // Write goes straight to DB
      await teleport(APP_X, "#fbbf24");
      addLog("WRITE price = $15 → DB", "text-amber-400");
      await move(DB_X, 1000);
      setDbValue("$15");
      addLog("DB updated to $15", "text-cyan-400");
      await wait(600);
      hidePacket();
      // Read hits the stale cache
      await teleport(APP_X, "#a78bfa");
      addLog("READ price → cache", "text-zinc-300");
      await move(CACHE_X);
      await flash("STALE!", "text-red-400", "border-red-500", 900);
      await move(APP_X, 450);
      addLog("Returned $10 — wrong!", "text-red-400");
      setBadge("⚠ cache and DB disagree");
      await wait(1800);
      setBadge(null);
      // The fix: delete key on write
      addLog("fix: delete key on write", "text-zinc-300");
      setChip((c) => (c ? { ...c, crossed: true } : c));
      await wait(800);
      setChip(null);
      await wait(400);
      // Re-read goes through to DB and re-caches
      addLog("READ price → cache", "text-zinc-300");
      await move(CACHE_X);
      await flash("MISS", "text-red-400", "border-red-500", 600);
      await move(DB_X);
      await wait(300);
      await move(CACHE_X);
      setChip({ text: "price: $15", crossed: false });
      await flash("FRESH", "text-emerald-400", "border-emerald-500", 700);
      await move(APP_X);
      addLog("Returned $15 ✓", "text-emerald-400");
      await wait(1800);
      hidePacket();
      setChip(null);
      setDbValue(null);
      await wait(500);
    }

    async function loop() {
      while (!cancelled) {
        if (mode === "hit-miss") await runHitMiss();
        else if (mode === "cache-aside") await runCacheAside();
        else await runStale();
      }
    }

    setLog([]);
    loop();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [mode, pausedRef]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 select-none">
      {/* Diagram */}
      <div className="relative" style={{ height: 150 }}>
        {/* Track line */}
        <div className="absolute left-[10%] right-[10%] top-[44px] h-px bg-zinc-800" />

        {/* Packet */}
        <div
          className="absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${packet.x}%`,
            top: 44,
            background: packet.color,
            boxShadow: `0 0 8px ${packet.color}`,
            opacity: packet.visible ? 1 : 0,
            transition: `left ${packet.ms}ms ease-in-out, opacity 150ms`,
          }}
        />

        {/* App box */}
        <div
          className="absolute -translate-x-1/2 rounded-lg border border-violet-500/60 bg-violet-950/30 px-3 py-2"
          style={{ left: `${APP_X}%`, top: 24 }}
        >
          <span className="font-mono text-xs font-bold text-violet-400">App</span>
        </div>

        {/* Cache box */}
        <div
          className={`absolute -translate-x-1/2 rounded-lg border px-3 py-2 transition-colors duration-150 ${
            cacheFlash ? `${cacheFlash.border} bg-zinc-900` : "border-emerald-500/60 bg-emerald-950/30"
          }`}
          style={{ left: `${CACHE_X}%`, top: 24 }}
        >
          <span className="font-mono text-xs font-bold text-emerald-400">Cache ⚡</span>
          {cacheFlash && (
            <div
              className={`absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[11px] font-bold ${cacheFlash.color}`}
            >
              {cacheFlash.text}
            </div>
          )}
          {chip && (
            <div
              className={`absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] transition-opacity ${
                chip.crossed ? "text-red-400 line-through opacity-60" : "text-zinc-300"
              }`}
            >
              {chip.text}
            </div>
          )}
        </div>

        {/* Database box */}
        <div
          className="absolute -translate-x-1/2 rounded-lg border border-cyan-500/60 bg-cyan-950/30 px-3 py-2"
          style={{ left: `${DB_X}%`, top: 24 }}
        >
          <span className="font-mono text-xs font-bold text-cyan-400">Database</span>
          {dbValue && (
            <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
              price: {dbValue}
            </div>
          )}
        </div>

        {/* Timing label */}
        {timing && (
          <div className={`absolute right-0 top-0 font-mono text-xs font-bold ${timing.color}`}>
            {timing.text}
          </div>
        )}

        {/* Badge */}
        {badge && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 rounded-lg border border-red-500 bg-red-950/80 px-3 py-1 font-mono text-[11px] font-bold text-red-400">
            {badge}
          </div>
        )}
      </div>

      {/* Step log */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5 font-mono text-[11px] flex flex-col gap-1" style={{ minHeight: 84 }}>
        {log.length === 0 && <span className="text-zinc-600">…</span>}
        {log.map((entry, i) => (
          <div key={entry.id} className={entry.color} style={{ opacity: 1 - i * 0.2 }}>
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}
