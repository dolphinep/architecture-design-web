"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  VizFrame, VizStage, VizHint, VizControls, VizButton, VizSpacer,
  VizStatus, VizStats, VizLegend, VizLog,
  VizSvg, VizText, VizEdge, VizPacket,
  useFlights, useInterval, useOnScreen, useReducedMotion, useEventLog,
  fadeOut, easeInOut,
  HUE, TYPE, STROKE, MOTION, type HueName, type Flight,
} from "./_shared";

type CBState = "CLOSED" | "OPEN" | "HALF_OPEN";

/** What a travelling request carries. `blocked` never leaves the breaker. */
interface Call {
  outcome: "success" | "fail";
  blocked: boolean;
}

const FAILURE_THRESHOLD = 3;
const SUCCESS_THRESHOLD = 2;
const RESET_TIMEOUT_S = 4;

const STATE_META: Record<CBState, { hue: HueName; label: string; desc: string }> = {
  CLOSED:    { hue: "success", label: "CLOSED",    desc: "Traffic flows through. Failures are counted." },
  OPEN:      { hue: "danger",  label: "OPEN",      desc: "Calls fail instantly. The service gets breathing room." },
  HALF_OPEN: { hue: "warning", label: "HALF-OPEN", desc: "Probes allowed. Enough successes close the circuit." },
};

// Design-space geometry for the traffic track
const W = 620;
const H = 190;
const CLIENT_X = 78;
const BREAKER_X = 310;
const SERVICE_X = 542;
const TRACK_Y = 84;

export function CircuitBreakerViz() {
  const [cbState, setCbState] = useState<CBState>("CLOSED");
  const [failures, setFailures] = useState(0);
  const [successes, setSuccesses] = useState(0);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { entries, push, clear: clearLog } = useEventLog(6);
  const { ref: hostRef, onScreen } = useOnScreen<HTMLDivElement>();
  const reduced = useReducedMotion();

  const stateRef = useRef<CBState>("CLOSED");
  const failuresRef = useRef(0);
  const successesRef = useRef(0);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Indirection so the land handler is stable while `settle` re-memoises. */
  const settleRef = useRef<(o: "success" | "fail") => void>(() => {});

  // Mirror state into refs from effects. Reading or writing refs during render
  // breaks under StrictMode replay and is what the React compiler rules flag.
  useEffect(() => { stateRef.current = cbState; }, [cbState]);
  useEffect(() => { failuresRef.current = failures; }, [failures]);
  useEffect(() => { successesRef.current = successes; }, [successes]);

  useEffect(() => () => { if (cdRef.current) clearInterval(cdRef.current); }, []);

  const { flights, launch, clear: clearFlights } = useFlights<Call>({
    active: onScreen,
    max: 8,
    reduced,
    onLand: (f) => {
      if (!f.meta.blocked) settleRef.current(f.meta.outcome);
    },
  });

  const transitionTo = useCallback((next: CBState) => {
    setCbState(next);
    stateRef.current = next;

    if (next === "OPEN") {
      push("Circuit OPENED — calls blocked", "danger");
      setCountdown(RESET_TIMEOUT_S);
      if (cdRef.current) clearInterval(cdRef.current);
      cdRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (cdRef.current) clearInterval(cdRef.current);
            setSuccesses(0);
            successesRef.current = 0;
            setCbState("HALF_OPEN");
            stateRef.current = "HALF_OPEN";
            push("Circuit HALF-OPEN — probing", "warning");
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else if (next === "CLOSED") {
      push("Circuit CLOSED — service recovered", "success");
      setFailures(0); failuresRef.current = 0;
      setSuccesses(0); successesRef.current = 0;
    }
  }, [push]);

  const sendRequest = useCallback((force?: "success" | "fail") => {
    const state = stateRef.current;

    if (state === "OPEN") {
      // Rejected at the breaker — a short hop that dies at the contact.
      launch({ outcome: "fail", blocked: true }, { duration: MOTION.quick, linger: 900 });
      push("✗ Rejected at the breaker (fail-fast)", "danger");
      return;
    }

    const outcome = force ?? (state === "HALF_OPEN"
      ? (Math.random() < 0.6 ? "success" : "fail")
      : (Math.random() < 0.45 ? "fail" : "success"));

    launch({ outcome, blocked: false }, { duration: MOTION.flight, linger: 700 });
  }, [launch, push]);

  // Applies the counters + state machine for a completed request
  const settle = useCallback((outcome: "success" | "fail") => {
    if (outcome === "fail") {
      const n = failuresRef.current + 1;
      setFailures(n); failuresRef.current = n;
      push(`✗ Request failed — ${n}/${FAILURE_THRESHOLD} to trip`, "danger");
      if (stateRef.current === "CLOSED" && n >= FAILURE_THRESHOLD) transitionTo("OPEN");
      else if (stateRef.current === "HALF_OPEN") transitionTo("OPEN");
    } else {
      const n = successesRef.current + 1;
      setSuccesses(n); successesRef.current = n;
      push("✓ Request succeeded", "success");
      if (stateRef.current === "HALF_OPEN" && n >= SUCCESS_THRESHOLD) transitionTo("CLOSED");
    }
  }, [push, transitionTo]);

  // Auto-simulation
  useInterval(running && onScreen, MOTION.tick, () => sendRequest());

  useEffect(() => { settleRef.current = settle; }, [settle]);

  const meta = STATE_META[cbState];
  const trackHue: HueName = cbState === "CLOSED" ? "success" : cbState === "OPEN" ? "danger" : "warning";

  function reset() {
    setCbState("CLOSED"); stateRef.current = "CLOSED";
    setFailures(0); failuresRef.current = 0;
    setSuccesses(0); successesRef.current = 0;
    clearFlights(); setRunning(false); setCountdown(0);
    clearLog();
    if (cdRef.current) clearInterval(cdRef.current);
  }

  return (
    <VizFrame>
      <VizStatus
        hue={meta.hue}
        label={meta.label}
        pulse={cbState !== "OPEN"}
        aside={
          cbState === "OPEN" && countdown > 0 ? (
            <span className="font-mono text-xs text-red-300 tabular-nums">
              half-open in {countdown}s
            </span>
          ) : null
        }
      >
        {meta.desc}
      </VizStatus>

      <div ref={hostRef}>
        <VizStage>
          <VizSvg w={W} h={H} label={`Circuit breaker in ${meta.label} state, between a client and a service`}>
            {/* ── State machine, top ── */}
            {(["CLOSED", "OPEN", "HALF_OPEN"] as CBState[]).map((s, i) => {
              const m = STATE_META[s];
              const on = cbState === s;
              const bx = 118 + i * 148;
              return (
                <g key={s}>
                  <rect
                    x={bx} y={16} width={116} height={30} rx={8}
                    fill={on ? "url(#viz-node-active)" : "url(#viz-node)"}
                    stroke={on ? HUE[m.hue].line : HUE.neutral.base}
                    strokeWidth={on ? STROKE.base : STROKE.hairline}
                    strokeOpacity={on ? 1 : 0.6}
                  />
                  <VizText
                    x={bx + 58} y={31} size={TYPE.small} weight={700} mono
                    fill={on ? HUE[m.hue].text : "#5c5c66"}
                  >
                    {m.label}
                  </VizText>
                  {i < 2 && (
                    <VizEdge
                      from={[bx + 120, 31]} to={[bx + 144, 31]}
                      hue="neutral" arrow dimmed={!on}
                    />
                  )}
                </g>
              );
            })}

            {/* ── Traffic track ── */}
            <VizEdge from={[CLIENT_X + 34, TRACK_Y]} to={[BREAKER_X - 30, TRACK_Y]} hue="neutral" />
            <VizEdge
              from={[BREAKER_X + 30, TRACK_Y]} to={[SERVICE_X - 34, TRACK_Y]}
              hue={cbState === "OPEN" ? "danger" : "neutral"}
              dashed={cbState === "OPEN"}
            />

            {/* Client */}
            <circle cx={CLIENT_X} cy={TRACK_Y} r={26} fill="url(#viz-node)" stroke={HUE.neutral.base} strokeWidth={STROKE.thin} />
            <VizText x={CLIENT_X} y={TRACK_Y} size={TYPE.micro} mono fill={HUE.neutral.text}>client</VizText>

            {/* Breaker */}
            <g>
              <circle
                cx={BREAKER_X} cy={TRACK_Y} r={30}
                fill="url(#viz-node-active)"
                stroke={HUE[trackHue].line}
                strokeWidth={STROKE.thick}
                filter={cbState === "OPEN" ? "url(#viz-glow)" : undefined}
              />
              <VizText x={BREAKER_X} y={TRACK_Y - 5} size={TYPE.small} weight={700} mono fill={HUE[trackHue].text}>
                CB
              </VizText>
              {/* Literal breaker: closed contact vs a visible gap */}
              {cbState === "OPEN" ? (
                <>
                  <line x1={BREAKER_X - 13} y1={TRACK_Y + 10} x2={BREAKER_X - 3} y2={TRACK_Y + 10}
                        stroke={HUE.danger.line} strokeWidth={STROKE.base} strokeLinecap="round" />
                  <line x1={BREAKER_X + 4} y1={TRACK_Y + 4} x2={BREAKER_X + 13} y2={TRACK_Y + 13}
                        stroke={HUE.danger.line} strokeWidth={STROKE.base} strokeLinecap="round" />
                </>
              ) : (
                <line x1={BREAKER_X - 13} y1={TRACK_Y + 10} x2={BREAKER_X + 13} y2={TRACK_Y + 10}
                      stroke={HUE[trackHue].line} strokeWidth={STROKE.base} strokeLinecap="round"
                      strokeDasharray={cbState === "HALF_OPEN" ? "3 3" : undefined} />
              )}
            </g>

            {/* Service */}
            <circle cx={SERVICE_X} cy={TRACK_Y} r={26} fill="url(#viz-node)"
                    stroke={cbState === "OPEN" ? HUE.success.base : HUE.neutral.base} strokeWidth={STROKE.thin} />
            <VizText x={SERVICE_X} y={TRACK_Y} size={TYPE.micro} mono fill={HUE.neutral.text}>service</VizText>
            {cbState === "OPEN" && (
              <VizText x={SERVICE_X} y={TRACK_Y + 40} size={TYPE.micro} hue="success" mono>
                recovering
              </VizText>
            )}

            {/* In-flight and landed markers */}
            {flights.map((f: Flight<Call>) => {
              const fade = fadeOut(f);

              if (f.meta.blocked) {
                // Travels only as far as the open contact, then bounces off.
                const bx = CLIENT_X + 34 + (BREAKER_X - 34 - CLIENT_X - 34) * easeInOut(f.t);
                return (
                  <g key={f.id}>
                    <VizPacket x={bx} y={TRACK_Y} hue="danger" r={5} opacity={f.landed ? fade : 1} />
                    {f.landed && (
                      <VizText
                        x={BREAKER_X - 44} y={TRACK_Y - 28} size={TYPE.small}
                        hue="danger" mono weight={700} opacity={fade}
                      >
                        ✗ rejected
                      </VizText>
                    )}
                  </g>
                );
              }

              const x = CLIENT_X + 34 + (SERVICE_X - 34 - CLIENT_X - 34) * easeInOut(f.t);
              const hue: HueName = f.landed
                ? (f.meta.outcome === "success" ? "success" : "danger")
                : "primary";
              return (
                <VizPacket
                  key={f.id} x={x} y={TRACK_Y} hue={hue} r={5}
                  opacity={f.landed ? fade : 1}
                />
              );
            })}

            {/* Axis captions */}
            <VizText x={CLIENT_X} y={TRACK_Y + 44} size={TYPE.micro} fill="#52525b">caller</VizText>
            <VizText x={BREAKER_X} y={TRACK_Y + 48} size={TYPE.micro} fill="#52525b">breaker</VizText>
            <VizText x={SERVICE_X} y={TRACK_Y + (cbState === "OPEN" ? 58 : 44)} size={TYPE.micro} fill="#52525b">
              dependency
            </VizText>

            {/* Threshold rail */}
            <VizText x={20} y={162} size={TYPE.micro} anchor="start" fill="#52525b" mono>
              trips at {FAILURE_THRESHOLD} consecutive failures · closes after {SUCCESS_THRESHOLD} probes
            </VizText>
          </VizSvg>
        </VizStage>
      </div>

      <VizControls>
        <VizButton variant={running ? "secondary" : "primary"} active={running} onClick={() => setRunning((r) => !r)}>
          {running ? "❙❙ Pause" : "▶ Auto simulate"}
        </VizButton>
        <VizButton variant="success" onClick={() => sendRequest("success")}>✓ Send success</VizButton>
        <VizButton variant="danger" onClick={() => sendRequest("fail")}>✗ Send failure</VizButton>
        <VizSpacer />
        <VizButton variant="ghost" onClick={reset}>↺ Reset</VizButton>
      </VizControls>

      <VizStats
        items={[
          {
            label: "consecutive failures",
            value: failures,
            hue: failures >= FAILURE_THRESHOLD ? "danger" : "neutral",
            meter: [failures, FAILURE_THRESHOLD],
            note: `/${FAILURE_THRESHOLD}`,
          },
          {
            label: "probe successes",
            value: successes,
            hue: "success",
            meter: [successes, SUCCESS_THRESHOLD],
            note: `/${SUCCESS_THRESHOLD}`,
          },
          { label: "circuit state", value: meta.label, hue: meta.hue },
        ]}
      />

      <VizLog entries={entries} rows={4} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <VizLegend
          items={[
            { hue: "primary", label: "in flight" },
            { hue: "success", label: "succeeded" },
            { hue: "danger", label: "failed / rejected" },
          ]}
        />
        <VizHint>
          Send failures until the breaker trips — then watch it probe its way back.
        </VizHint>
      </div>
    </VizFrame>
  );
}
