"use client";
import { useState, useEffect, useRef } from "react";

type Tab = "oauth" | "jwt";
type JwtPart = "header" | "payload" | "signature";

const ACTORS = [
  { label: "Browser",         sub: "User Agent",     x: 65  },
  { label: "Client App",      sub: "Your App",       x: 210 },
  { label: "Auth Server",     sub: "Google / Auth0", x: 390 },
  { label: "Resource Server", sub: "Your API",       x: 555 },
];

const Y0 = 90;
const DY = 40;
const SVG_W = 620;

interface Step {
  from: number;
  to: number;
  label: string;
  detail: string;
  color: string;
  dashed?: boolean;
}

const STEPS: Step[] = [
  {
    from: 0, to: 1,
    label: "Click 'Sign in'",
    detail: "User clicks Sign In. Client generates a random code_verifier (43–128 chars) and derives code_challenge = BASE64URL(SHA256(code_verifier)). This is PKCE — Proof Key for Code Exchange (RFC 7636).",
    color: "#818cf8",
  },
  {
    from: 1, to: 2,
    label: "GET /authorize?code_challenge=…",
    detail: "Client redirects browser: GET /authorize?response_type=code&client_id=…&redirect_uri=…&scope=openid+profile&state=<random>&code_challenge=…&code_challenge_method=S256. State is a random value to prevent CSRF.",
    color: "#6366f1",
  },
  {
    from: 2, to: 0,
    label: "Render login & consent UI",
    detail: "Auth Server serves its login page. The user enters credentials. If first login, a consent screen shows which scopes the app requests (e.g. read:profile, read:orders). Auth Server authenticates via password, MFA, or passkey.",
    color: "#f59e0b",
    dashed: true,
  },
  {
    from: 0, to: 2,
    label: "Submit credentials + consent",
    detail: "User submits credentials and grants consent. Auth Server validates them, records the authorization request (tied to code_challenge), and generates a short-lived authorization code (30–60s, single-use).",
    color: "#818cf8",
  },
  {
    from: 2, to: 0,
    label: "302 → redirect_uri?code=…&state=…",
    detail: "Auth Server redirects the browser back to the Client's redirect_uri with the authorization code and state. The code is short-lived and can only be used once. Client validates state matches what it sent (CSRF check).",
    color: "#f59e0b",
    dashed: true,
  },
  {
    from: 0, to: 1,
    label: "Browser delivers code to app",
    detail: "The browser follows the redirect, bringing the authorization code to the Client App's redirect handler. The app extracts the code and state from the URL parameters.",
    color: "#818cf8",
  },
  {
    from: 1, to: 2,
    label: "POST /token  (code + code_verifier)",
    detail: "Client makes a direct server-to-server POST: grant_type=authorization_code, code=…, redirect_uri=…, client_id=…, code_verifier=… (the original random value). The verifier proves the same party that initiated the flow is completing it — preventing code interception attacks.",
    color: "#6366f1",
  },
  {
    from: 2, to: 1,
    label: "access_token + refresh_token",
    detail: "Auth Server verifies: code is valid & unexpired, SHA256(code_verifier) matches stored code_challenge, client_id matches. Returns: access_token (signed JWT, short-lived ~15min), refresh_token (opaque, long-lived), and optionally id_token (OIDC identity assertion).",
    color: "#34d399",
    dashed: true,
  },
  {
    from: 1, to: 3,
    label: "GET /api  Authorization: Bearer <token>",
    detail: "Client calls the Resource Server API, sending the access_token in the Authorization: Bearer header. The signed JWT carries the user's identity and granted scopes without any round-trip to the Auth Server.",
    color: "#6366f1",
  },
  {
    from: 3, to: 1,
    label: "200 OK — protected data",
    detail: "Resource Server validates the JWT: verifies RS256 signature using Auth Server's public key (fetched once from /jwks.json), checks exp (not expired), iss (correct issuer), aud (this API is the intended audience), and required scopes. No database lookup needed — the signature is the proof.",
    color: "#34d399",
    dashed: true,
  },
];

const SVG_H = Y0 + STEPS.length * DY + 30;

const JWT_PARTS = {
  header:  { alg: "RS256", typ: "JWT", kid: "key-2024-01" },
  payload: {
    sub: "usr_01HQKZ",
    iss: "https://auth.example.com",
    aud: "https://api.example.com",
    exp: 1735689600,
    iat: 1735686000,
    scope: "read:profile",
    email: "alice@example.com",
  },
};

function JwtAnatomy() {
  const [active, setActive] = useState<JwtPart>("header");

  const colors: Record<JwtPart, { text: string; bg: string; border: string; dim: string }> = {
    header:    { text: "text-rose-400",    bg: "bg-rose-950/30",    border: "border-rose-800/50",    dim: "text-rose-600/50" },
    payload:   { text: "text-indigo-400",  bg: "bg-indigo-950/30",  border: "border-indigo-800/50",  dim: "text-indigo-600/50" },
    signature: { text: "text-emerald-400", bg: "bg-emerald-950/30", border: "border-emerald-800/50", dim: "text-emerald-600/50" },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Token display */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm leading-relaxed break-all">
        <span className="text-zinc-500 text-xs block mb-2">// Click each part to decode</span>
        <button
          onClick={() => setActive("header")}
          className={`transition-colors ${active === "header" ? colors.header.text + " underline decoration-dotted" : colors.header.dim + " hover:text-rose-400"}`}
        >
          eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0yMDI0LTAxIn0
        </button>
        <span className="text-zinc-600">.</span>
        <button
          onClick={() => setActive("payload")}
          className={`transition-colors ${active === "payload" ? colors.payload.text + " underline decoration-dotted" : colors.payload.dim + " hover:text-indigo-400"}`}
        >
          eyJzdWIiOiJ1c3JfMDFIUUtaIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tIiwiYXVkIjoiaHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20ifQ
        </button>
        <span className="text-zinc-600">.</span>
        <button
          onClick={() => setActive("signature")}
          className={`transition-colors ${active === "signature" ? colors.signature.text + " underline decoration-dotted" : colors.signature.dim + " hover:text-emerald-400"}`}
        >
          SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
        </button>
      </div>

      {/* Part detail */}
      <div className={`rounded-xl border p-4 flex flex-col gap-3 ${colors[active].bg} ${colors[active].border}`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${colors[active].text}`}>
          {active === "header"    && "Header — Algorithm & Key ID"}
          {active === "payload"   && "Payload — Claims (Base64URL encoded, NOT encrypted)"}
          {active === "signature" && "Signature — Tamper-Proof Binding"}
        </h3>

        {active === "header" && (
          <>
            <pre className="text-xs text-zinc-300 font-mono bg-zinc-900/60 rounded-lg p-3">
              {JSON.stringify(JWT_PARTS.header, null, 2)}
            </pre>
            <div className="grid sm:grid-cols-2 gap-2 text-xs text-zinc-400">
              <div><span className="text-zinc-300 font-medium">alg: RS256</span> — RSA + SHA-256. Auth Server signs with private key; anyone verifies with public key. Never accept <code className="text-rose-400">alg:none</code>.</div>
              <div><span className="text-zinc-300 font-medium">kid</span> — Key ID for selecting the correct public key from the JWKS endpoint during key rotation.</div>
            </div>
          </>
        )}

        {active === "payload" && (
          <>
            <pre className="text-xs text-zinc-300 font-mono bg-zinc-900/60 rounded-lg p-3">
              {JSON.stringify(JWT_PARTS.payload, null, 2)}
            </pre>
            <div className="grid sm:grid-cols-3 gap-2 text-xs">
              {[
                ["sub", "Subject — user ID"],
                ["iss", "Issuer URL"],
                ["aud", "Intended audience"],
                ["exp", "Expiry (Unix ts)"],
                ["iat", "Issued at"],
                ["scope", "Granted permissions"],
              ].map(([k, v]) => (
                <div key={k} className="text-zinc-400">
                  <span className="text-zinc-300 font-medium">{k}</span> — {v}
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-400/80">
              Payload is Base64URL-encoded, not encrypted — anyone can decode it. Never store passwords, secrets, or PII beyond what the Resource Server needs.
            </p>
          </>
        )}

        {active === "signature" && (
          <>
            <pre className="text-xs font-mono text-zinc-300 bg-zinc-900/60 rounded-lg p-3">
{`RSASHA256(
  BASE64URL(header) + "." + BASE64URL(payload),
  Auth_Server_Private_Key  // never leaves the Auth Server
)`}
            </pre>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The signature cryptographically binds the header and payload. Any modification to either part produces a different signature hash — the verification fails. The Resource Server verifies using the Auth Server&apos;s <strong className="text-zinc-300">public key</strong> fetched once from <code className="text-zinc-300">/jwks.json</code>.
            </p>
            <div className="flex flex-col gap-1 mt-1">
              {[
                "Verify RS256 signature with public key from /jwks.json",
                "exp > Date.now() — token not expired",
                "iss === expected issuer URL",
                "aud includes this server's identifier",
                "scope contains required permissions",
              ].map((check, i) => (
                <div key={i} className="text-xs font-mono text-emerald-400 flex gap-2">
                  <span className="opacity-60">✓</span>{check}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* JWT vs Session */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">JWT — Stateless</h4>
          <ul className="flex flex-col gap-1.5 text-xs text-zinc-400">
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>No server-side session store needed</li>
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>Any server instance can verify — scales horizontally</li>
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>Works across domains and microservices</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">−</span>Cannot revoke before expiry without a token blocklist</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">−</span>Payload is readable — avoid storing sensitive data</li>
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Session — Stateful</h4>
          <ul className="flex flex-col gap-1.5 text-xs text-zinc-400">
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>Instant revocation — delete the session record</li>
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>Smaller cookie payload (just a session ID)</li>
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>No sensitive data in the client token</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">−</span>DB or cache lookup required on every request</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">−</span>Horizontal scaling requires a shared session store (Redis)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function AuthViz() {
  const [tab, setTab]             = useState<Tab>("oauth");
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= STEPS.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1800);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing]);

  const step = STEPS[activeStep];

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 w-fit">
        {(["oauth", "jwt"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "oauth" ? "OAuth 2.0 + PKCE Flow" : "JWT Anatomy"}
          </button>
        ))}
      </div>

      {tab === "oauth" && (
        <div className="flex flex-col gap-4">
          {/* Sequence diagram */}
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full"
              style={{ minWidth: 480 }}
            >
              <defs>
                {STEPS.map((s, i) => (
                  <marker
                    key={i}
                    id={`auth-a-${i}`}
                    markerWidth="8" markerHeight="6"
                    refX="8" refY="3" orient="auto"
                  >
                    <polygon
                      points="0 0, 8 3, 0 6"
                      fill={i === activeStep ? s.color : "#3f3f46"}
                    />
                  </marker>
                ))}
              </defs>

              {/* Actor boxes + lifelines */}
              {ACTORS.map((actor, ai) => {
                const isActive = step.from === ai || step.to === ai;
                return (
                  <g key={ai}>
                    <rect
                      x={actor.x - 52} y={10}
                      width={104} height={42}
                      rx={7}
                      fill={isActive ? "#1e1b4b" : "#18181b"}
                      stroke={isActive ? "#6366f1" : "#3f3f46"}
                      strokeWidth={isActive ? 2 : 1}
                    />
                    <text
                      x={actor.x} y={27}
                      textAnchor="middle"
                      fill={isActive ? "#e4e4e7" : "#a1a1aa"}
                      fontSize="10" fontWeight="600" fontFamily="sans-serif"
                    >
                      {actor.label}
                    </text>
                    <text
                      x={actor.x} y={42}
                      textAnchor="middle"
                      fill="#52525b"
                      fontSize="8" fontFamily="sans-serif"
                    >
                      {actor.sub}
                    </text>
                    <line
                      x1={actor.x} y1={52}
                      x2={actor.x} y2={SVG_H - 5}
                      stroke={isActive ? "#2d2d3a" : "#1f1f23"}
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                  </g>
                );
              })}

              {/* Step arrows */}
              {STEPS.map((s, i) => {
                const isActive = i === activeStep;
                const fromX = ACTORS[s.from].x;
                const toX   = ACTORS[s.to].x;
                const y     = Y0 + i * DY;
                const right = toX > fromX;
                const lineEnd = right ? toX - 9 : toX + 9;
                const midX  = (fromX + toX) / 2;
                const color = isActive ? s.color : "#3f3f46";

                return (
                  <g
                    key={i}
                    style={{ cursor: "pointer" }}
                    onClick={() => { setActiveStep(i); setPlaying(false); }}
                  >
                    <rect
                      x={Math.min(fromX, toX)}
                      y={y - 16}
                      width={Math.abs(toX - fromX)}
                      height={32}
                      fill="transparent"
                    />
                    <line
                      x1={fromX} y1={y}
                      x2={lineEnd} y2={y}
                      stroke={color}
                      strokeWidth={isActive ? "2" : "1"}
                      strokeDasharray={s.dashed ? (isActive ? "6,3" : "4,3") : "none"}
                      markerEnd={`url(#auth-a-${i})`}
                    />
                    <text
                      x={midX} y={y - 5}
                      textAnchor="middle"
                      fill={color}
                      fontSize={isActive ? "8.5" : "7.5"}
                      fontFamily="monospace"
                      fontWeight={isActive ? "600" : "400"}
                    >
                      {s.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Step detail card */}
          <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-4 flex flex-col gap-2 min-h-[76px]">
            <div className="text-xs font-mono font-semibold text-indigo-400">
              Step {activeStep + 1} / {STEPS.length} — {step.label}
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{step.detail}</p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { setActiveStep((p) => Math.max(0, p - 1)); setPlaying(false); }}
              disabled={activeStep === 0}
              className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-30 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                } else {
                  if (activeStep === STEPS.length - 1) setActiveStep(0);
                  setPlaying(true);
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                playing
                  ? "bg-zinc-700 text-zinc-300 border border-zinc-600"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {playing ? "⏸ Pause" : "▶ Auto-play"}
            </button>
            <button
              onClick={() => { setActiveStep((p) => Math.min(STEPS.length - 1, p + 1)); setPlaying(false); }}
              disabled={activeStep === STEPS.length - 1}
              className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
            <button
              onClick={() => { setActiveStep(0); setPlaying(false); }}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              ↺ Reset
            </button>
          </div>

          {/* PKCE callout */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-500 leading-relaxed">
            <span className="text-zinc-400 font-medium">Why PKCE?</span> — The plain Authorization Code flow was vulnerable: a malicious app registered on the same device could receive the code via redirect URI. PKCE (RFC 7636) adds a cryptographic one-time challenge that ties the token exchange to the exact party that started the flow — even if the code is intercepted, it&apos;s useless without the verifier.
          </div>
        </div>
      )}

      {tab === "jwt" && <JwtAnatomy />}
    </div>
  );
}
