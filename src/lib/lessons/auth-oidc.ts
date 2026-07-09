import { Lesson } from "@/types/lesson";

export const oidcLesson: Lesson = {
  slug: "auth-oidc",
  title: "OpenID Connect",
  description:
    "Why OAuth 2.0 alone is not enough for authentication — OIDC adds an identity layer, the ID token, and standardized user profile claims.",
  duration: "~8 min",
  level: "intermediate",
  tags: ["auth", "security", "oidc", "jwt"],
  series: "Authentication",
  seriesOrder: 2,
  slides: [
    {
      id: "oauth-not-authn",
      title: "OAuth 2.0 is not authentication",
      body: [
        {
          kind: "text",
          text: "OAuth 2.0 answers **can this app access my Google Drive?** — not **who is this user?** Using OAuth alone for login is like using a hotel key card as proof of your identity.",
        },
        {
          kind: "points",
          items: [
            {
              label: "GAP",
              accent: "red",
              text: "Access token proves permission, not identity",
            },
            {
              label: "GAP",
              accent: "red",
              text: "No standard way to get the user's name or email",
            },
            {
              label: "GAP",
              accent: "red",
              text: "Nothing prevents token substitution attacks",
            },
            {
              label: "RESULT",
              accent: "amber",
              text: "Every app invented its own `/me` endpoint — incompatible, insecure",
            },
          ],
        },
      ],
      summary:
        "OAuth 2.0 grants access to resources; it says nothing about who the user is.",
    },
    {
      id: "what-oidc-adds",
      title: "What OIDC adds",
      body: [
        {
          kind: "text",
          text: "**OpenID Connect (OIDC)** is a thin identity layer on top of OAuth 2.0. It adds one thing: a signed **ID Token** — a JWT that proves the user's identity.",
        },
        {
          kind: "stats",
          items: [
            { value: "2014", label: "OIDC 1.0 finalized", accent: "zinc" },
            { value: "JWT", label: "ID token format", accent: "violet" },
            { value: "1 scope", label: "openid — enables OIDC", accent: "emerald" },
            { value: "✓", label: "built on OAuth 2.0", accent: "cyan" },
          ],
        },
      ],
      summary:
        "Add `scope=openid` to an OAuth request and you get an ID token — OIDC is OAuth 2.0, not a replacement.",
    },
    {
      id: "id-token-jwt",
      title: "The ID token — a JWT",
      body: [
        {
          kind: "text",
          text: "The **ID token** is a **JSON Web Token (JWT)** signed by the auth server. Your app verifies the signature locally — no network round-trip.",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "Header",
              accent: "zinc",
              points: [
                "`alg: RS256` — signature algorithm",
                "`kid` — key ID to fetch public key",
                "Base64url encoded (not encrypted)",
              ],
            },
            {
              title: "Payload (Claims)",
              accent: "violet",
              points: [
                "`sub` — unique user ID (stable)",
                "`iss` — issuer URL",
                "`aud` — your client ID (prevents token reuse)",
                "`exp` — expiry timestamp (always verify)",
                "`email`, `name`, `picture` — profile claims",
              ],
            },
          ],
        },
      ],
      summary:
        "Always verify iss, aud, and exp before trusting an ID token — a valid signature alone is not enough.",
    },
    {
      id: "oidc-code-flow",
      title: "The OIDC Code Flow",
      body: [
        {
          kind: "text",
          text: "OIDC reuses the OAuth 2.0 Authorization Code flow exactly. The only difference is adding `openid` to the scope and receiving an **ID token** alongside the access token.",
        },
        {
          kind: "sequence",
          title: "OIDC Authorization Code Flow",
          actors: ["Browser", "Your App", "Auth Server"],
          steps: [
            { from: "Browser", to: "Your App", label: "login click" },
            {
              from: "Your App",
              to: "Browser",
              label: "redirect /authorize",
              style: "response",
              note: "scope=openid profile email",
            },
            { from: "Browser", to: "Auth Server", label: "GET /authorize" },
            {
              from: "Auth Server",
              to: "Browser",
              label: "authentication + consent",
              style: "response",
            },
            { from: "Browser", to: "Auth Server", label: "user authenticates" },
            {
              from: "Auth Server",
              to: "Browser",
              label: "redirect /callback?code=X",
              style: "response",
            },
            { from: "Browser", to: "Your App", label: "GET /callback?code=X" },
            { from: "Your App", to: "Auth Server", label: "POST /token (code)" },
            {
              from: "Auth Server",
              to: "Your App",
              label: "access_token + id_token",
              style: "response",
              note: "verify id_token signature + claims",
            },
            {
              from: "Your App",
              to: "Auth Server",
              label: "GET /userinfo (optional)",
            },
            {
              from: "Auth Server",
              to: "Your App",
              label: "{sub, email, name, ...}",
              style: "response",
            },
            {
              from: "Your App",
              to: "Browser",
              label: "session created",
              style: "response",
            },
          ],
        },
      ],
      summary:
        "OIDC flow is identical to OAuth 2.0 — only scope and the id_token in the response are new.",
    },
    {
      id: "standard-claims",
      title: "Standard claims",
      body: [
        {
          kind: "text",
          text: "OIDC defines **standard claims** so apps don't need to parse custom `/me` endpoints. The `sub` claim is the only one guaranteed to be present.",
        },
        {
          kind: "points",
          items: [
            {
              label: "REQUIRED",
              accent: "violet",
              text: "`sub` — stable, unique user identifier (never changes, unlike email)",
            },
            {
              label: "PROFILE",
              accent: "cyan",
              text: "`name`, `given_name`, `family_name`, `picture`, `locale`",
            },
            {
              label: "EMAIL",
              accent: "emerald",
              text: "`email`, `email_verified` — always check `email_verified` before trusting",
            },
            {
              label: "PHONE",
              accent: "zinc",
              text: "`phone_number`, `phone_number_verified`",
            },
            {
              label: "BEST PRACTICE",
              accent: "amber",
              text: "Always use `sub` as the primary key in your DB, not `email` — emails change",
            },
          ],
        },
      ],
      summary:
        "Use sub as your user primary key — it's stable, globally unique within the issuer, and never reassigned.",
    },
    {
      id: "discovery-jwks",
      title: "Discovery & JWKS",
      body: [
        {
          kind: "text",
          text: "OIDC providers publish a **discovery document** at `/.well-known/openid-configuration`. This gives you all endpoints and the public keys needed to verify ID tokens — no hardcoding.",
        },
        {
          kind: "flow",
          steps: [
            "App fetches `{issuer}/.well-known/openid-configuration` on startup",
            "Discovery doc contains: authorization, token, userinfo endpoints + `jwks_uri`",
            "App fetches `jwks_uri` to get public signing keys (JWKS)",
            "For each ID token: verify signature with matching `kid` key + validate claims",
            "Keys rotate periodically — re-fetch JWKS when a token fails signature check",
          ],
        },
      ],
      summary:
        "Discovery makes OIDC integration portable — swap providers by just changing the issuer URL.",
    },
    {
      id: "oauth-vs-oidc-vs-saml",
      title: "OAuth 2.0 vs OIDC vs SAML",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "OAuth 2.0",
              accent: "cyan",
              points: [
                "Authorization only — what can this app do?",
                "Issues access tokens for API access",
                "No standard identity layer",
                "Use for: API access delegation",
              ],
            },
            {
              title: "OpenID Connect",
              accent: "violet",
              points: [
                "Authentication + Authorization",
                "Issues ID tokens + access tokens",
                "Standard claims and discovery",
                "Use for: login, SSO, federated identity",
              ],
            },
            {
              title: "SAML 2.0",
              accent: "zinc",
              points: [
                "XML-based, enterprise legacy",
                "Common in corporate SSO (Okta, AD FS)",
                "Complex — avoid for new projects",
                "Use for: enterprise integrations you inherit",
              ],
            },
          ],
        },
      ],
      summary:
        "OIDC is the modern default for login and SSO — SAML only when the enterprise forces it.",
    },
  ],
};
