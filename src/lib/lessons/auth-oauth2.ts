import { Lesson } from "@/types/lesson";

export const oauthLesson: Lesson = {
  slug: "auth-oauth2",
  title: "OAuth 2.0",
  description:
    "How apps request delegated access without ever seeing your password — the authorization code flow, tokens, scopes, and PKCE.",
  duration: "~10 min",
  level: "intermediate",
  tags: ["auth", "security", "oauth"],
  series: "Authentication",
  seriesOrder: 1,
  slides: [
    {
      id: "password-antipattern",
      title: "The password anti-pattern",
      body: [
        {
          kind: "text",
          text: "The old approach: give a third-party app your actual username and password so it can act on your behalf. Every app that needed access to your data asked for your full credentials and stored them — indefinitely.",
        },
        {
          kind: "points",
          items: [
            {
              label: "PROBLEM",
              accent: "red",
              text: "App sees your full credentials",
            },
            {
              label: "PROBLEM",
              accent: "red",
              text: "No way to revoke access without changing password",
            },
            {
              label: "PROBLEM",
              accent: "red",
              text: "App can impersonate you completely",
            },
            {
              label: "RESULT",
              accent: "amber",
              text: "Every breach exposes everything",
            },
          ],
        },
      ],
      summary:
        "Sharing passwords gives apps unlimited, unrevokable access — a fundamentally broken trust model.",
    },
    {
      id: "what-is-oauth2",
      title: "What OAuth 2.0 is",
      body: [
        {
          kind: "text",
          text: "**OAuth 2.0** is a delegation framework — it lets users grant apps **limited access** to their resources without sharing credentials. It is an authorization protocol, not an authentication protocol.",
        },
        {
          kind: "stats",
          items: [
            { value: "2012", label: "RFC 6749 published", accent: "zinc" },
            { value: "4", label: "grant types", accent: "violet" },
            { value: "0", label: "credentials shared", accent: "emerald" },
          ],
        },
      ],
      summary:
        "OAuth 2.0 delegates specific permissions (scopes) to a client — your password never leaves the auth server.",
    },
    {
      id: "four-roles",
      title: "The four roles",
      body: [
        {
          kind: "points",
          items: [
            {
              label: "OWNER",
              accent: "violet",
              text: "The **resource owner** — you, the user who controls the data",
            },
            {
              label: "CLIENT",
              accent: "cyan",
              text: "The **client app** — the third-party app requesting access (e.g. Spotify)",
            },
            {
              label: "AUTH SRV",
              accent: "emerald",
              text: "The **authorization server** — issues tokens after verifying consent (e.g. Google)",
            },
            {
              label: "RSRC SRV",
              accent: "amber",
              text: "The **resource server** — the API holding the protected data (e.g. Google Drive)",
            },
          ],
        },
      ],
      summary:
        "Four distinct roles keep responsibilities separated — the client never talks directly to the resource owner's credentials.",
    },
    {
      id: "auth-code-flow",
      title: "Authorization Code Flow",
      body: [
        {
          kind: "text",
          text: "The most secure flow for apps with a backend server. The `authorization_code` never travels through the browser's address bar long-term.",
        },
        {
          kind: "sequence",
          title: "Authorization Code Flow",
          actors: ["Browser", "Your App", "Auth Server"],
          steps: [
            {
              from: "Browser",
              to: "Your App",
              label: "click Login with Google",
            },
            {
              from: "Your App",
              to: "Browser",
              label: "redirect /authorize",
              style: "response",
              note: "includes scope, state, redirect_uri",
            },
            {
              from: "Browser",
              to: "Auth Server",
              label: "GET /authorize",
            },
            {
              from: "Auth Server",
              to: "Browser",
              label: "show consent screen",
              style: "response",
            },
            {
              from: "Browser",
              to: "Auth Server",
              label: "user approves",
            },
            {
              from: "Auth Server",
              to: "Browser",
              label: "redirect /callback?code=X",
              style: "response",
            },
            {
              from: "Browser",
              to: "Your App",
              label: "GET /callback?code=X",
            },
            {
              from: "Your App",
              to: "Auth Server",
              label: "POST /token (code+secret)",
            },
            {
              from: "Auth Server",
              to: "Your App",
              label: "access_token + refresh_token",
              style: "response",
            },
            {
              from: "Your App",
              to: "Browser",
              label: "session set, user logged in",
              style: "response",
            },
          ],
        },
      ],
      summary:
        "The auth code is short-lived and exchanged server-to-server — the access token never appears in the browser URL.",
    },
    {
      id: "tokens",
      title: "Access tokens vs Refresh tokens",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "Access Token",
              accent: "violet",
              points: [
                "Short-lived (minutes to hours)",
                "Sent with every API request in `Authorization: Bearer`",
                "Stateless — server validates without a DB lookup",
                "Scoped to specific resources",
              ],
            },
            {
              title: "Refresh Token",
              accent: "emerald",
              points: [
                "Long-lived (days to months)",
                "Stored securely server-side, never in the browser",
                "Exchanged for a new access token when it expires",
                "Can be revoked without changing passwords",
              ],
            },
          ],
        },
      ],
      summary:
        "Short access tokens limit blast radius; refresh tokens enable long sessions without re-login.",
    },
    {
      id: "scopes",
      title: "Scopes — limiting what you grant",
      body: [
        {
          kind: "text",
          text: "Scopes define the exact **permissions** a client is requesting. Users see them on the consent screen and can often grant partial access.",
        },
        {
          kind: "points",
          items: [
            {
              label: "EXAMPLE",
              accent: "cyan",
              text: "`read:profile` — see your name and avatar only",
            },
            {
              label: "EXAMPLE",
              accent: "cyan",
              text: "`repo` — full GitHub repository access",
            },
            {
              label: "EXAMPLE",
              accent: "amber",
              text: "`openid profile email` — OIDC identity scopes",
            },
            {
              label: "RULE",
              accent: "violet",
              text: "Request the **minimum scopes** needed — users reject over-broad requests",
            },
          ],
        },
      ],
      summary:
        "Scopes are the contract between user and app — always request least-privilege.",
    },
    {
      id: "pkce",
      title: "PKCE — for public clients",
      body: [
        {
          kind: "text",
          text: "**PKCE** (Proof Key for Code Exchange, RFC 7636) protects the auth code flow for public clients (SPAs, mobile apps) that cannot keep a `client_secret` safe.",
        },
        {
          kind: "sequence",
          title: "PKCE Flow (public client)",
          actors: ["SPA / Mobile", "Auth Server"],
          steps: [
            {
              from: "SPA / Mobile",
              to: "Auth Server",
              label: "gen verifier → hash → challenge",
            },
            {
              from: "SPA / Mobile",
              to: "Auth Server",
              label: "/authorize + code_challenge",
              note: "challenge stored on server",
            },
            {
              from: "Auth Server",
              to: "SPA / Mobile",
              label: "redirect ?code=X",
              style: "response",
            },
            {
              from: "SPA / Mobile",
              to: "Auth Server",
              label: "/token + code_verifier",
            },
            {
              from: "Auth Server",
              to: "SPA / Mobile",
              label: "token (if hash matches)",
              style: "response",
              note: "SHA256(verifier) == challenge",
            },
          ],
        },
      ],
      summary:
        "PKCE binds the code request to the token exchange — intercepted auth codes are useless without the verifier.",
    },
    {
      id: "which-flow",
      title: "When to use which flow",
      body: [
        {
          kind: "points",
          items: [
            {
              label: "SERVER",
              accent: "violet",
              text: "**Authorization Code** — web apps with a backend; most secure, tokens never touch browser",
            },
            {
              label: "SPA / MOBILE",
              accent: "cyan",
              text: "**Auth Code + PKCE** — no `client_secret`; standard for public clients since 2019",
            },
            {
              label: "MACHINE",
              accent: "emerald",
              text: "**Client Credentials** — service-to-service; no user involved, client authenticates directly",
            },
            {
              label: "AVOID",
              accent: "red",
              text: "**Implicit Flow** — deprecated; access token leaked in URL fragment, replaced by PKCE",
            },
            {
              label: "AVOID",
              accent: "red",
              text: "**Password Grant** — defeats the purpose; never use for third-party apps",
            },
          ],
        },
      ],
      summary:
        "Authorization Code + PKCE is the right default for almost every new OAuth integration.",
    },
  ],
};
