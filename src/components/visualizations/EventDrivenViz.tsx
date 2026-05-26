"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface EventPacket {
  id: number;
  eventType: string;
  color: string;
  fromY: number;
  toY: number;
  phase: "to-broker" | "to-consumer";
  progress: number;
  consumerId: number;
}

const EVENT_TYPES = [
  { type: "OrderPlaced",    color: "#a78bfa", producer: 0 },
  { type: "PaymentFailed",  color: "#f87171", producer: 1 },
  { type: "UserSignedUp",   color: "#60a5fa", producer: 2 },
  { type: "StockUpdated",   color: "#34d399", producer: 0 },
  { type: "ShipmentSent",   color: "#fb923c", producer: 1 },
];

const PRODUCERS = [
  { label: "Order Service",   y: 60  },
  { label: "Payment Service", y: 160 },
  { label: "User Service",    y: 260 },
];

const CONSUMERS = [
  { label: "Analytics Service",     y: 60  },
  { label: "Notification Service",  y: 160 },
  { label: "Inventory Service",     y: 260 },
];

const BROKER_Y_CENTER = 175;
const BROKER_X = 240;

export function EventDrivenViz() {
  const [packets, setPackets] = useState<EventPacket[]>([]);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<Array<{ type: string; consumer: string; color: string }>>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const packetId = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((type: string, consumer: string, color: string) => {
    setLog((prev) => [{ type, consumer, color }, ...prev].slice(0, 6));
  }, []);

  const spawnEvent = useCallback(() => {
    const def = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    const producer = PRODUCERS[def.producer];
    const consumerIdx = Math.floor(Math.random() * CONSUMERS.length);
    const consumer = CONSUMERS[consumerIdx];

    const p: EventPacket = {
      id: packetId.current++,
      eventType: def.type,
      color: def.color,
      fromY: producer.y + 20,
      toY: consumer.y + 20,
      phase: "to-broker",
      progress: 0,
      consumerId: consumerIdx,
    };
    setPackets((prev) => [...prev.slice(-10), p]);
  }, []);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(spawnEvent, 800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, spawnEvent]);

  useEffect(() => {
    let raf: number;
    function tick() {
      setPackets((prev) => {
        const next: EventPacket[] = [];
        for (const p of prev) {
          if (p.phase === "to-broker") {
            const np = { ...p, progress: p.progress + 0.04 };
            if (np.progress >= 1) {
              next.push({ ...np, phase: "to-consumer", progress: 0 });
            } else {
              next.push(np);
            }
          } else {
            const np = { ...p, progress: p.progress + 0.035 };
            if (np.progress >= 1) {
              addLog(np.eventType, CONSUMERS[np.consumerId].label, np.color);
            } else {
              next.push(np);
            }
          }
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [addLog]);

  const PROD_X = 60;
  const CONS_X = 430;
  const WIDTH = 580;
  const HEIGHT = 340;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            running ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-100" : "bg-violet-600 hover:bg-violet-500 text-white"
          }`}
        >
          {running ? "⏸ Pause" : "▶ Start event stream"}
        </button>
        <button
          onClick={spawnEvent}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
        >
          + Emit event
        </button>
        <span className="text-xs text-zinc-600">Click an event type to highlight it</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {EVENT_TYPES.map((e) => (
          <button
            key={e.type}
            onClick={() => setHighlight(highlight === e.type ? null : e.type)}
            className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${
              highlight === e.type ? "bg-zinc-700 border-zinc-500" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
            }`}
            style={{ color: e.color }}
          >
            {e.type}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          {/* Producer nodes */}
          {PRODUCERS.map((prod, i) => (
            <g key={i}>
              <rect x={PROD_X - 50} y={prod.y} width={110} height={40} rx={8} fill="#18181b" stroke="#7c3aed" strokeWidth="1" />
              <text x={PROD_X + 5} y={prod.y + 15} textAnchor="middle" fill="#e4e4e7" fontSize="9.5" fontWeight="600" fontFamily="sans-serif">
                {prod.label}
              </text>
              <text x={PROD_X + 5} y={prod.y + 30} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="sans-serif">
                Producer
              </text>
              {/* Connector line to broker */}
              <line
                x1={PROD_X + 60} y1={prod.y + 20}
                x2={BROKER_X - 10} y2={BROKER_Y_CENTER}
                stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3"
              />
            </g>
          ))}

          {/* Event Broker */}
          <rect x={BROKER_X - 10} y={BROKER_Y_CENTER - 55} width={100} height={110} rx={10} fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.5" />
          <text x={BROKER_X + 40} y={BROKER_Y_CENTER - 25} textAnchor="middle" fill="#a5b4fc" fontSize="10" fontWeight="700" fontFamily="sans-serif">
            Event Bus
          </text>
          <text x={BROKER_X + 40} y={BROKER_Y_CENTER - 10} textAnchor="middle" fill="#6366f1" fontSize="8" fontFamily="monospace">
            Kafka / SNS
          </text>
          {/* Broker queue lines */}
          {[-15, 0, 15].map((offset) => (
            <rect key={offset} x={BROKER_X + 10} y={BROKER_Y_CENTER + offset} width={60} height={10} rx={3}
              fill="#312e81" stroke="#4338ca" strokeWidth="0.5" />
          ))}

          {/* Consumer nodes */}
          {CONSUMERS.map((cons, i) => (
            <g key={i}>
              <rect x={CONS_X - 50} y={cons.y} width={120} height={40} rx={8} fill="#18181b" stroke="#059669" strokeWidth="1" />
              <text x={CONS_X + 10} y={cons.y + 15} textAnchor="middle" fill="#e4e4e7" fontSize="9.5" fontWeight="600" fontFamily="sans-serif">
                {cons.label}
              </text>
              <text x={CONS_X + 10} y={cons.y + 30} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="sans-serif">
                Consumer
              </text>
              {/* Connector line from broker */}
              <line
                x1={BROKER_X + 90} y1={BROKER_Y_CENTER}
                x2={CONS_X - 50} y2={cons.y + 20}
                stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3"
              />
            </g>
          ))}

          {/* Animated packets */}
          {packets.map((p) => {
            const isDimmed = highlight !== null && p.eventType !== highlight;
            let cx: number, cy: number;

            if (p.phase === "to-broker") {
              const producerIdx = EVENT_TYPES.find((e) => e.type === p.eventType)?.producer ?? 0;
              const fromX = PROD_X + 60;
              const fromY = PRODUCERS[producerIdx].y + 20;
              cx = fromX + (BROKER_X - fromX) * p.progress;
              cy = fromY + (BROKER_Y_CENTER - fromY) * p.progress;
            } else {
              const fromX = BROKER_X + 90;
              const fromY = BROKER_Y_CENTER;
              const toX = CONS_X - 50;
              const toY = CONSUMERS[p.consumerId].y + 20;
              cx = fromX + (toX - fromX) * p.progress;
              cy = fromY + (toY - fromY) * p.progress;
            }

            return (
              <g key={p.id} opacity={isDimmed ? 0.15 : 1}>
                <circle cx={cx} cy={cy} r={5} fill={p.color} />
                <circle cx={cx} cy={cy} r={8} fill={p.color} opacity={0.2} />
                {p.phase === "to-broker" && (
                  <text x={cx + 8} y={cy - 5} fontSize="7" fill={p.color} fontFamily="monospace">
                    {p.eventType}
                  </text>
                )}
              </g>
            );
          })}

          {/* Labels */}
          <text x={PROD_X + 5} y={320} textAnchor="middle" fill="#52525b" fontSize="8" fontFamily="sans-serif">Producers</text>
          <text x={BROKER_X + 40} y={320} textAnchor="middle" fill="#52525b" fontSize="8" fontFamily="sans-serif">Broker</text>
          <text x={CONS_X + 10} y={320} textAnchor="middle" fill="#52525b" fontSize="8" fontFamily="sans-serif">Consumers</text>
        </svg>
      </div>

      {/* Event log */}
      {log.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-1 font-mono text-xs">
          <span className="text-zinc-600 mb-1">Event delivery log</span>
          {log.map((entry, i) => (
            <div key={i} className="flex items-center gap-2">
              <span style={{ color: entry.color }}>{entry.type}</span>
              <span className="text-zinc-600">→</span>
              <span className="text-zinc-400">{entry.consumer}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
