"use client";
import { useState, useEffect, useRef } from "react";

type Tab = "oauth" | "jwt" | "verify" | "better-auth";
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

// ── Refresh token flow ────────────────────────────────────────────────────────

const R_ACTORS = [
  { label: "Client App",      sub: "Your App",       x: 100 },
  { label: "Auth Server",     sub: "Google / Auth0", x: 310 },
  { label: "Resource Server", sub: "Your API",       x: 520 },
];

interface RefreshStep {
  from: number; to: number;
  label: string; detail: string;
  color: string; dashed?: boolean;
}

const REFRESH_STEPS: RefreshStep[] = [
  {
    from: 2, to: 0,
    label: "401 Unauthorized — token expired",
    detail: "The access token's exp claim is in the past. Resource Server rejects the request with 401. Client detects this and starts the silent refresh — no user interaction needed.",
    color: "#ef4444", dashed: true,
  },
  {
    from: 0, to: 1,
    label: "POST /token  grant_type=refresh_token",
    detail: "Client sends a direct server-to-server POST to the token endpoint: grant_type=refresh_token, refresh_token=<opaque_value>, client_id=…. No user redirect, no browser involvement — this is a background call.",
    color: "#6366f1",
  },
  {
    from: 1, to: 0,
    label: "new access_token + rotated refresh_token",
    detail: "Auth Server validates the refresh token: checks it exists in its store, hasn't expired, and hasn't been revoked. Issues a fresh access_token (JWT, ~15min) and a NEW refresh_token (rotation). The old refresh token is immediately invalidated — reuse of an old token is a theft signal.",
    color: "#34d399", dashed: true,
  },
  {
    from: 0, to: 2,
    label: "Retry: GET /api  Bearer <new_access_token>",
    detail: "Client transparently retries the original failed request with the new access token. The user never saw an interruption — to them the app just worked.",
    color: "#6366f1",
  },
  {
    from: 2, to: 0,
    label: "200 OK — protected data",
    detail: "Resource Server validates the new JWT (RS256 signature, exp, iss, aud) and returns the response. The full silent refresh cycle completes in < 500ms on a healthy network.",
    color: "#34d399", dashed: true,
  },
];

const R_SVG_H = 80 + REFRESH_STEPS.length * DY + 30;

function RefreshFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const step = REFRESH_STEPS[activeStep];

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 620 ${R_SVG_H}`} className="w-full" style={{ minWidth: 420 }}>
          <defs>
            {REFRESH_STEPS.map((s, i) => (
              <marker
                key={i}
                id={`ref-a-${i}`}
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

          {/* Actors */}
          {R_ACTORS.map((actor, ai) => {
            const isActive = step.from === ai || step.to === ai;
            return (
              <g key={ai}>
                <rect
                  x={actor.x - 52} y={10} width={104} height={42} rx={7}
                  fill={isActive ? "#1e1b4b" : "#18181b"}
                  stroke={isActive ? "#6366f1" : "#3f3f46"}
                  strokeWidth={isActive ? 2 : 1}
                />
                <text x={actor.x} y={27} textAnchor="middle"
                  fill={isActive ? "#e4e4e7" : "#a1a1aa"}
                  fontSize="10" fontWeight="600" fontFamily="sans-serif">{actor.label}</text>
                <text x={actor.x} y={42} textAnchor="middle"
                  fill="#52525b" fontSize="8" fontFamily="sans-serif">{actor.sub}</text>
                <line
                  x1={actor.x} y1={52} x2={actor.x} y2={R_SVG_H - 5}
                  stroke={isActive ? "#2d2d3a" : "#1f1f23"}
                  strokeWidth="1" strokeDasharray="4,4"
                />
              </g>
            );
          })}

          {/* Arrows */}
          {REFRESH_STEPS.map((s, i) => {
            const isActive = i === activeStep;
            const fromX = R_ACTORS[s.from].x;
            const toX   = R_ACTORS[s.to].x;
            const y     = 80 + i * DY;
            const right = toX > fromX;
            const lineEnd = right ? toX - 9 : toX + 9;
            const midX  = (fromX + toX) / 2;
            const color = isActive ? s.color : "#3f3f46";

            return (
              <g key={i} style={{ cursor: "pointer" }}
                onClick={() => setActiveStep(i)}>
                <rect x={Math.min(fromX, toX)} y={y - 16}
                  width={Math.abs(toX - fromX)} height={32} fill="transparent" />
                <line
                  x1={fromX} y1={y} x2={lineEnd} y2={y}
                  stroke={color}
                  strokeWidth={isActive ? "2" : "1"}
                  strokeDasharray={s.dashed ? (isActive ? "6,3" : "4,3") : "none"}
                  markerEnd={`url(#ref-a-${i})`}
                />
                <text x={midX} y={y - 5} textAnchor="middle"
                  fill={color}
                  fontSize={isActive ? "8.5" : "7.5"}
                  fontFamily="monospace"
                  fontWeight={isActive ? "600" : "400"}>
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Step detail */}
      <div className={`rounded-xl border p-4 flex flex-col gap-2 min-h-[76px] ${
        step.color === "#ef4444"
          ? "border-red-900/50 bg-red-950/20"
          : step.color === "#34d399"
          ? "border-emerald-900/50 bg-emerald-950/20"
          : "border-indigo-900/50 bg-indigo-950/20"
      }`}>
        <div className="text-xs font-mono font-semibold" style={{ color: step.color }}>
          Step {activeStep + 1} / {REFRESH_STEPS.length} — {step.label}
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{step.detail}</p>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveStep(p => Math.max(0, p - 1))}
          disabled={activeStep === 0}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-30 transition-colors"
        >← Prev</button>
        <button
          onClick={() => setActiveStep(p => Math.min(REFRESH_STEPS.length - 1, p + 1))}
          disabled={activeStep === REFRESH_STEPS.length - 1}
          className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-30 transition-colors"
        >Next →</button>
        <button
          onClick={() => setActiveStep(0)}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >↺ Reset</button>
      </div>

      {/* Rotation explainer */}
      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        {[
          {
            title: "Rotation (RFC 6749)",
            color: "text-emerald-400",
            body: "Every successful refresh issues a brand-new refresh token and immediately invalidates the old one. Reuse of a revoked token is treated as theft — all tokens for that user are revoked.",
          },
          {
            title: "Expiry & sliding window",
            color: "text-amber-400",
            body: "Refresh tokens have a max lifetime (e.g. 30 days) and an idle timeout (e.g. 7 days of inactivity). Continuous usage resets the idle clock; absolute expiry forces re-authentication.",
          },
          {
            title: "Secure storage",
            color: "text-rose-400",
            body: "Never store refresh tokens in localStorage (XSS risk). Server-side apps store them in encrypted sessions. SPAs use short-lived memory and rely on HttpOnly cookies for silent refresh via the Auth Server's SSO session.",
          },
        ].map(({ title, color, body }) => (
          <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 flex flex-col gap-1.5">
            <span className={`font-semibold ${color}`}>{title}</span>
            <p className="text-zinc-500 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

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

const VERIFY_STEPS = [
  {
    label: "Receive Bearer token",
    code: `// HTTP request arrives\nconst auth = req.headers["authorization"];\nif (!auth?.startsWith("Bearer ")) return res.status(401).end();\nconst token = auth.slice(7);`,
    detail: "Extract the token from the Authorization header. Any request without a valid Bearer prefix is rejected immediately with 401 — before any crypto work.",
    tag: "receive",
  },
  {
    label: "Parse the JWT structure",
    code: `const [rawHeader, rawPayload, rawSig] = token.split(".");\nconst header  = JSON.parse(Buffer.from(rawHeader, "base64url").toString());\n// header → { alg: "RS256", typ: "JWT", kid: "key-2024-01" }\nconst payload = JSON.parse(Buffer.from(rawPayload, "base64url").toString());\n// payload → { sub, iss, aud, exp, iat, scope }`,
    detail: "Split on '.' to get header, payload, and signature. Decode header and payload from base64url. Do NOT trust any claim yet — the signature has not been verified.",
    tag: "parse",
  },
  {
    label: "Fetch public keys (JWKS)",
    code: `// Cache keys by kid to avoid fetching on every request\nconst cached = jwksCache.get(header.kid);\nconst publicKey = cached\n  ?? await fetchJWKS("https://auth.example.com/.well-known/jwks.json", header.kid);\n// JWKS endpoint returns the auth server's current public key set`,
    detail: "Fetch the Auth Server's public key set from its well-known JWKS endpoint. Cache by kid with a short TTL (e.g. 1h). Only re-fetch on cache miss or an unknown kid — never on every request.",
    tag: "jwks",
  },
  {
    label: "Verify RS256 signature",
    code: `const data = rawHeader + "." + rawPayload;\nconst isValid = await crypto.subtle.verify(\n  { name: "RSASSA-PKCS1-v1_5" },\n  publicKey,\n  Buffer.from(rawSig, "base64url"),\n  Buffer.from(data)\n);\nif (!isValid) return res.status(401).json({ error: "invalid_signature" });`,
    detail: "Verify that RSASHA256(header.payload, Auth_Server_Private_Key) matches the signature. If valid, the token was definitely issued by the Auth Server and has not been tampered with. Any bit flip in header or payload changes the hash.",
    tag: "signature",
  },
  {
    label: "Validate standard claims",
    code: `const now = Math.floor(Date.now() / 1000);\nif (payload.exp < now)                        throw err(401, "token_expired");\nif (payload.iss !== EXPECTED_ISSUER)           throw err(401, "invalid_issuer");\nif (!payload.aud.includes(MY_API_AUDIENCE))   throw err(401, "invalid_audience");\nif (!hasScope(payload.scope, requiredScope))  throw err(403, "insufficient_scope");`,
    detail: "The signature proves the token is authentic; claims prove it's authorized for this request. The aud check is critical — without it, a token issued for api-a.example.com could be replayed against api-b.example.com (confused deputy attack).",
    tag: "claims",
  },
  {
    label: "Check revocation (optional)",
    code: `// Strategy A — accept the expiry window (common for short-lived tokens)\n// Strategy B — jti blocklist in Redis\nif (await redis.exists(\`revoked:\${payload.jti}\`)) throw err(401, "token_revoked");\n// Strategy C — introspection endpoint (adds a network hop)\nconst { active } = await POST("/introspect", { token });\nif (!active) throw err(401, "token_revoked");`,
    detail: "JWT is stateless — a valid signature always passes. Revocation requires extra state. Choose based on your risk tolerance: short expiry (5–15 min) is simplest; a jti Redis blocklist is fast; token introspection is authoritative but adds latency.",
    tag: "revoke",
  },
];

const JWKS_EXAMPLE = `{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "key-2024-01",
      "n":   "0vx7agoebGcQSuuPiLJXZptN9nndrQmbX...",
      "e":   "AQAB"
    }
  ]
}`;

const REVOCATION_STRATEGIES = [
  {
    name: "Short expiry",
    how: "Set exp to 5–15 min. Use refresh tokens for long-lived sessions.",
    pro: "No extra infrastructure. Pure stateless.",
    con: "Leaked token valid until expiry. Revocation takes minutes.",
    risk: "Low–medium",
  },
  {
    name: "jti blocklist",
    how: "Store revoked token IDs (jti claim) in Redis with TTL = exp.",
    pro: "Immediate revocation. No Auth Server round-trip.",
    con: "Requires shared cache. All instances must hit it.",
    risk: "Very low",
  },
  {
    name: "Token introspection",
    how: "POST /introspect to Auth Server on every request.",
    pro: "Always authoritative. Instant revocation.",
    con: "Extra network hop per request. Auth Server becomes hot path.",
    risk: "Very low",
  },
  {
    name: "Refresh rotation",
    how: "Short access tokens + rotate refresh token on every use.",
    pro: "Stolen refresh token detected on reuse (RFC 6749 §10.4).",
    con: "Access token still valid until expiry after logout.",
    risk: "Low",
  },
];

function TokenVerify() {
  const [activeStep, setActiveStep] = useState(0);
  const step = VERIFY_STEPS[activeStep];

  const tagColor: Record<string, string> = {
    receive:   "text-zinc-400 bg-zinc-800/60 border-zinc-700",
    parse:     "text-blue-400 bg-blue-950/30 border-blue-800/50",
    jwks:      "text-amber-400 bg-amber-950/30 border-amber-800/50",
    signature: "text-violet-400 bg-violet-950/30 border-violet-800/50",
    claims:    "text-emerald-400 bg-emerald-950/30 border-emerald-800/50",
    revoke:    "text-rose-400 bg-rose-950/30 border-rose-800/50",
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Vertical step pipeline */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Step list */}
        <div className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-visible shrink-0 pb-1 sm:pb-0">
          {VERIFY_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left whitespace-nowrap sm:whitespace-normal transition-colors ${
                i === activeStep
                  ? `${tagColor[s.tag]} font-medium`
                  : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <span className={`text-xs font-mono w-4 shrink-0 ${i === activeStep ? "" : "text-zinc-700"}`}>
                {i + 1}
              </span>
              <span className="text-xs">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step detail */}
        <div className={`flex-1 flex flex-col gap-3 rounded-xl border p-4 ${tagColor[step.tag]}`}>
          <div className="text-xs font-semibold uppercase tracking-wide">
            Step {activeStep + 1} — {step.label}
          </div>
          <pre className="text-xs font-mono text-zinc-300 bg-zinc-900/70 rounded-lg p-3 overflow-x-auto leading-relaxed">
            {step.code}
          </pre>
          <p className="text-xs text-zinc-400 leading-relaxed">{step.detail}</p>
        </div>
      </div>

      {/* JWKS endpoint */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-400">
          JWKS Endpoint — <code className="font-mono normal-case">/.well-known/jwks.json</code>
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <pre className="text-xs font-mono text-zinc-300 bg-zinc-900/70 rounded-lg p-3 border border-zinc-800 overflow-x-auto leading-relaxed">
            {JWKS_EXAMPLE}
          </pre>
          <ul className="flex flex-col gap-2 text-xs text-zinc-400 justify-center">
            {[
              ["kty", "Key type — RSA"],
              ["use", "sig = signing key (vs enc = encryption)"],
              ["kid", "Key ID — matched against JWT header kid"],
              ["n / e", "RSA public key modulus + exponent"],
              ["alg", "RS256 — the only algorithm to accept"],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-2">
                <code className="text-amber-400 shrink-0">{k}</code>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Revocation strategies */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-rose-400">
          Revocation Strategies
        </h4>
        <div className="grid sm:grid-cols-2 gap-2">
          {REVOCATION_STRATEGIES.map((s) => (
            <div key={s.name} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-200">{s.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                  s.risk === "Very low"
                    ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-400"
                    : "border-amber-800/50 bg-amber-950/30 text-amber-400"
                }`}>
                  risk: {s.risk}
                </span>
              </div>
              <p className="text-xs text-zinc-500">{s.how}</p>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs text-emerald-400 flex gap-1.5"><span>+</span>{s.pro}</p>
                <p className="text-xs text-red-400 flex gap-1.5"><span>−</span>{s.con}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Better Auth ───────────────────────────────────────────────────────────────

type ArchMode = "monolith" | "microservice";

const BA_NODE_STYLES: Record<string, { fill: string; stroke: string; label: string; sub: string }> = {
  client:  { fill: "#18181b", stroke: "#52525b", label: "#d4d4d8", sub: "#71717a" },
  gateway: { fill: "#1e1b4b", stroke: "#4f46e5", label: "#a5b4fc", sub: "#818cf8" },
  auth:    { fill: "#431407", stroke: "#c2410c", label: "#fdba74", sub: "#ea580c" },
  service: { fill: "#1e1b4b", stroke: "#6366f1", label: "#c7d2fe", sub: "#818cf8" },
  storage: { fill: "#042f2e", stroke: "#0d9488", label: "#5eead4", sub: "#14b8a6" },
  app:     { fill: "#0f172a", stroke: "#334155", label: "#94a3b8", sub: "#475569" },
};

const BA_NW = 112, BA_NH = 40;

function baBorderPt(cx: number, cy: number, dir: number) {
  const c = Math.cos(dir), s = Math.sin(dir);
  const hw = BA_NW / 2 + 2, hh = BA_NH / 2 + 2;
  if (Math.abs(c) < 1e-9) return { x: cx, y: cy + hh * Math.sign(s) };
  if (Math.abs(s) < 1e-9) return { x: cx + hw * Math.sign(c), y: cy };
  const t = Math.min(hw / Math.abs(c), hh / Math.abs(s));
  return { x: cx + c * t, y: cy + s * t };
}

interface BANode { id: string; label: string; sub: string; x: number; y: number; type: string }
interface BAEdge { from: string; to: string; label?: string; dashed?: boolean }

function BADiagram({ nodes, edges }: { nodes: BANode[]; edges: BAEdge[] }) {
  const map = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <svg viewBox="0 0 640 210" className="w-full" style={{ minWidth: 420 }}>
      <defs>
        <marker id="ba-ah" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="#52525b" />
        </marker>
        <marker id="ba-ah-d" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="#3f3f46" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const a = map[e.from], b = map[e.to];
        if (!a || !b) return null;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const p1 = baBorderPt(a.x, a.y, ang);
        const p2 = baBorderPt(b.x, b.y, ang + Math.PI);
        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const ox = (-dy / len) * 9, oy = (dx / len) * 9;
        return (
          <g key={i}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={e.dashed ? "#3f3f46" : "#52525b"} strokeWidth={1.5}
              strokeDasharray={e.dashed ? "5,3" : undefined}
              markerEnd={e.dashed ? "url(#ba-ah-d)" : "url(#ba-ah)"} />
            {e.label && (
              <text x={mx + ox} y={my + oy} textAnchor="middle" dominantBaseline="middle"
                fill={e.dashed ? "#3f3f46" : "#71717a"} fontSize="7" fontFamily="monospace">
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {nodes.map(n => {
        const s = BA_NODE_STYLES[n.type];
        return (
          <g key={n.id}>
            <rect x={n.x - BA_NW/2} y={n.y - BA_NH/2} width={BA_NW} height={BA_NH} rx={6}
              fill={s.fill} stroke={s.stroke} strokeWidth={1.5} />
            <text x={n.x} y={n.y - 5} textAnchor="middle"
              fill={s.label} fontSize="9" fontWeight="600" fontFamily="sans-serif">{n.label}</text>
            <text x={n.x} y={n.y + 9} textAnchor="middle"
              fill={s.sub} fontSize="7.5" fontFamily="sans-serif">{n.sub}</text>
          </g>
        );
      })}
    </svg>
  );
}

const MONOLITH_NODES: BANode[] = [
  { id:"cli",  label:"Browser / App",  sub:"Client",               x:60,  y:105, type:"client"  },
  { id:"app",  label:"Next.js App",    sub:"Single process",       x:200, y:105, type:"app"     },
  { id:"ba",   label:"Better Auth",    sub:"/api/auth/*",          x:360, y:55,  type:"auth"    },
  { id:"api",  label:"App Routes",     sub:"/api/* + pages",       x:360, y:155, type:"service" },
  { id:"db",   label:"Database",       sub:"Prisma / Drizzle",     x:520, y:105, type:"storage" },
];
const MONOLITH_EDGES: BAEdge[] = [
  { from:"cli", to:"app", label:"HTTP" },
  { from:"app", to:"ba",  label:"/api/auth/*" },
  { from:"app", to:"api", label:"/api/* + UI" },
  { from:"ba",  to:"db",  label:"users / sessions" },
  { from:"api", to:"db",  label:"app data", dashed:true },
];

const MICROSERVICE_NODES: BANode[] = [
  { id:"cli",  label:"Browser / App",  sub:"Client",               x:55,  y:105, type:"client"  },
  { id:"gw",   label:"API Gateway",    sub:"Entry point",          x:190, y:105, type:"gateway" },
  { id:"ba",   label:"Better Auth",    sub:"Auth Service",         x:335, y:55,  type:"auth"    },
  { id:"adb",  label:"Auth Database",  sub:"users / sessions",     x:480, y:55,  type:"storage" },
  { id:"svc",  label:"App Services",   sub:"Product / Orders …",   x:335, y:155, type:"service" },
  { id:"sdb",  label:"App Database",   sub:"domain data",          x:480, y:155, type:"storage" },
];
const MICROSERVICE_EDGES: BAEdge[] = [
  { from:"cli", to:"gw",  label:"HTTP" },
  { from:"gw",  to:"ba",  label:"/auth/*" },
  { from:"gw",  to:"svc", label:"Bearer token" },
  { from:"ba",  to:"adb", label:"read/write" },
  { from:"svc", to:"ba",  label:"validate token", dashed:true },
  { from:"svc", to:"sdb", label:"read/write" },
];

function BetterAuthViz() {
  const [mode, setMode] = useState<ArchMode>("monolith");

  const isMonolith = mode === "monolith";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-orange-400">better-auth</span>
          <a href="https://www.better-auth.com" target="_blank" rel="noopener noreferrer"
            className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300 font-mono transition-colors">
            better-auth.com ↗
          </a>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-950/40 border border-orange-800/40 text-orange-400 font-mono">
            TypeScript-first
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
          Better Auth is a self-hosted, framework-agnostic authentication library for TypeScript.
          Unlike Auth.js (NextAuth), it owns the full auth database schema, supports plugins (2FA, passkeys, organizations, API keys),
          and works with any ORM via adapters. You run it inside your own app — no third-party auth server needed.
        </p>
      </div>

      {/* Architecture toggle */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">Where does it live in your architecture?</span>
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
            {(["monolith", "microservice"] as ArchMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === m ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}>
                {m === "monolith" ? "Monolith" : "Microservice"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <BADiagram
            nodes={isMonolith ? MONOLITH_NODES : MICROSERVICE_NODES}
            edges={isMonolith ? MONOLITH_EDGES : MICROSERVICE_EDGES}
          />
        </div>

        <div className={`rounded-xl border p-4 text-xs leading-relaxed ${
          isMonolith
            ? "border-zinc-700 bg-zinc-900/40 text-zinc-400"
            : "border-indigo-900/40 bg-indigo-950/10 text-zinc-400"
        }`}>
          {isMonolith ? (
            <>
              <span className="text-zinc-200 font-semibold">Monolith (recommended starting point).</span>{" "}
              Better Auth runs inside your Next.js / Express / SvelteKit app. A single
              catch-all route <code className="text-orange-400">/api/auth/[...all]</code> handles all auth
              endpoints (sign-in, sign-out, OAuth callbacks, session refresh).
              It shares the same database as your app — just a separate schema. Zero extra infrastructure,
              instant setup, easy to reason about. Best for startups and single-product apps.
            </>
          ) : (
            <>
              <span className="text-zinc-200 font-semibold">Microservice (auth as a dedicated service).</span>{" "}
              Better Auth runs as a standalone service with its own database. The API Gateway routes{" "}
              <code className="text-indigo-400">/auth/*</code> traffic to it; other services receive a
              Bearer token and validate it against Better Auth&apos;s{" "}
              <code className="text-indigo-400">GET /api/auth/get-session</code> endpoint or by
              verifying the JWT directly. Adds operational overhead but gives you a single,
              centralized auth surface across many services.
            </>
          )}
        </div>
      </div>

      {/* Comparison */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className={`rounded-xl border p-4 flex flex-col gap-2 ${
          isMonolith ? "border-emerald-900/50 bg-emerald-950/15" : "border-zinc-800 bg-zinc-900/20 opacity-50"
        }`}>
          <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            {isMonolith && <span>✓</span>} Monolith
          </h4>
          <ul className="flex flex-col gap-1.5 text-xs text-zinc-400">
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>Zero extra infra — runs in your existing app</li>
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>Single database transaction across auth + app data</li>
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>Simple local dev, easy to debug</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">−</span>Auth scales with the monolith — no independent scaling</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">−</span>Multiple apps can&apos;t share the same auth instance easily</li>
          </ul>
        </div>
        <div className={`rounded-xl border p-4 flex flex-col gap-2 ${
          !isMonolith ? "border-indigo-900/50 bg-indigo-950/15" : "border-zinc-800 bg-zinc-900/20 opacity-50"
        }`}>
          <h4 className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
            {!isMonolith && <span>✓</span>} Microservice
          </h4>
          <ul className="flex flex-col gap-1.5 text-xs text-zinc-400">
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>Single sign-on across multiple services</li>
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>Independent scaling and deployment of auth</li>
            <li className="flex gap-2"><span className="text-emerald-500 shrink-0">+</span>Centralised audit log for all auth events</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">−</span>Network hop on every session validation</li>
            <li className="flex gap-2"><span className="text-red-500 shrink-0">−</span>Operational overhead: extra service, DB, deployment</li>
          </ul>
        </div>
      </div>

      {/* Setup snippet */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Minimal setup (Next.js)</h4>
        <pre className="text-xs font-mono text-zinc-300 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 overflow-x-auto leading-relaxed">{`// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    github: { clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! },
    google: { clientId: process.env.GOOGLE_ID!, clientSecret: process.env.GOOGLE_SECRET! },
  },
  emailAndPassword: { enabled: true },
});

// app/api/auth/[...all]/route.ts — single catch-all handler
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);

// middleware.ts — protect routes
import { betterFetch } from "@better-fetch/fetch";
export async function middleware(req: NextRequest) {
  const { data: session } = await betterFetch("/api/auth/get-session", {
    baseURL: req.nextUrl.origin,
    headers: { cookie: req.headers.get("cookie") ?? "" },
  });
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}`}</pre>
      </div>

      {/* vs alternatives */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">vs other solutions</h4>
        <div className="grid sm:grid-cols-3 gap-2 text-xs">
          {[
            { name:"Better Auth", own:"Self-hosted, TS-first, full schema ownership, plugin ecosystem", fit:"Apps that need custom auth logic without a managed service" },
            { name:"Auth.js / NextAuth", own:"Minimal session store, provider adapters, less opinionated schema", fit:"Quick OAuth setup for Next.js; simpler but less extensible" },
            { name:"Auth0 / Clerk", own:"Managed SaaS — you call their API, they own user data", fit:"Teams who want zero auth infra; trade control for convenience" },
          ].map(({ name, own, fit }) => (
            <div key={name} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 flex flex-col gap-1.5">
              <span className="font-semibold text-zinc-200">{name}</span>
              <p className="text-zinc-500">{own}</p>
              <p className="text-zinc-600 italic">{fit}</p>
            </div>
          ))}
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
        {(["oauth", "jwt", "verify", "better-auth"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "oauth" ? "OAuth 2.0 + PKCE" : t === "jwt" ? "JWT Anatomy" : t === "verify" ? "Token Verification" : "Better Auth"}
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

          {/* Refresh token flow */}
          <div className="flex flex-col gap-3 pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Refresh token flow</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 font-mono">
                when access token expires
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Access tokens are short-lived (~15 min). When one expires, the client silently exchanges the long-lived refresh token for a new pair — no user interaction required.
            </p>
            <RefreshFlow />
          </div>
        </div>
      )}

      {tab === "jwt"          && <JwtAnatomy />}
      {tab === "verify"       && <TokenVerify />}
      {tab === "better-auth"  && <BetterAuthViz />}
    </div>
  );
}
