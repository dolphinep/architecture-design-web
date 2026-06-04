export interface AuthFramework {
  slug: string;
  name: string;
  tagline: string;
  type: "library" | "saas" | "primitives";
  hosting: "self-hosted" | "managed";
  openSource: boolean;
  popularity: number;
  url: string;
  architectureFit: "monolith" | "microservice" | "both" | "saas";
  description: string;
  features: string[];
  tradeoffs: { pro: string; con: string }[];
  whenToUse: string[];
  whenNotToUse: string[];
  setupCode: string;
  realWorld: { company: string; usage: string }[];
}

export const authFrameworks: AuthFramework[] = [
  {
    slug: "better-auth",
    name: "Better Auth",
    tagline: "TypeScript-first, self-hosted authentication with full schema ownership",
    type: "library",
    hosting: "self-hosted",
    openSource: true,
    popularity: 4,
    url: "https://www.better-auth.com",
    architectureFit: "both",
    description: `Better Auth is a TypeScript-first authentication library that gives you complete ownership of your auth schema and user data. Unlike Auth.js, it ships with a fully defined database schema (via Prisma or Drizzle adapters) and a rich plugin ecosystem covering 2FA, passkeys, organizations, API keys, and more.

It exposes a single catch-all route handler that wires up all auth endpoints automatically. The client-side SDK works across React, Vue, Svelte, and vanilla JS, making it framework-agnostic despite its TypeScript-first design.

In a monolith it runs as part of your app, sharing the same database. In a microservice setup, it can run as a standalone auth service with its own database, issuing tokens that other services validate.`,
    features: [
      "Full database schema ownership (users, sessions, accounts, verifications)",
      "Prisma and Drizzle ORM adapters",
      "Social OAuth (GitHub, Google, Discord, Twitter…)",
      "Email + password with secure hashing (Argon2)",
      "2FA (TOTP), passkeys (WebAuthn), magic links",
      "Organizations + roles + permissions plugin",
      "API key management plugin",
      "OpenAPI spec generation",
      "Type-safe client SDK (React, Vue, Svelte, vanilla)",
    ],
    tradeoffs: [
      { pro: "Full data ownership — users never leave your database", con: "You manage migrations, backups, and scaling" },
      { pro: "Richer schema than Auth.js — easier to extend", con: "More setup than NextAuth for simple OAuth-only apps" },
      { pro: "Plugin system avoids maintaining fork for custom features", con: "Smaller community than Auth.js or Passport" },
      { pro: "Works in monolith or standalone microservice", con: "Microservice mode adds a network hop per session check" },
    ],
    whenToUse: [
      "Next.js / SvelteKit / Nuxt apps that need custom auth logic",
      "Teams that want self-hosted auth without building from scratch",
      "Apps requiring organizations, API keys, or passkeys out of the box",
      "Projects already using Prisma or Drizzle",
    ],
    whenNotToUse: [
      "Enterprise SSO/SAML requirements — use WorkOS or Auth0",
      "Teams who want zero auth infra to operate — use Clerk",
      "Simple prototypes that only need one OAuth provider",
    ],
    setupCode: `// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor, organization } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: { clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! },
    google: { clientId: process.env.GOOGLE_ID!, clientSecret: process.env.GOOGLE_SECRET! },
  },
  plugins: [twoFactor(), organization()],
});

// app/api/auth/[...all]/route.ts
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);

// middleware.ts — protect routes server-side
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";

export async function middleware(req: NextRequest) {
  const { data: session } = await betterFetch<Session>("/api/auth/get-session", {
    baseURL: req.nextUrl.origin,
    headers: { cookie: req.headers.get("cookie") ?? "" },
  });
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

// Client usage (React)
import { authClient } from "@/lib/auth-client";
const { data: session } = await authClient.useSession();
await authClient.signIn.social({ provider: "github" });`,
    realWorld: [
      { company: "Turso", usage: "Uses Better Auth to secure their database-as-a-service platform" },
      { company: "Various SaaS", usage: "Adopted widely in the Next.js + Drizzle/Prisma ecosystem since 2024" },
    ],
  },

  {
    slug: "authjs",
    name: "Auth.js (NextAuth v5)",
    tagline: "The most popular authentication library for Next.js and the JS ecosystem",
    type: "library",
    hosting: "self-hosted",
    openSource: true,
    popularity: 5,
    url: "https://authjs.dev",
    architectureFit: "monolith",
    description: `Auth.js (formerly NextAuth.js) is the most widely used authentication library for JavaScript frameworks. v5 unifies the API across Next.js, SvelteKit, Express, Qwik, and more under the \`@auth/*\` family of packages.

It takes a provider-first approach — you wire up OAuth providers and the library handles the session and token management. The database adapter is optional; without one, it uses stateless JWTs. With one (Prisma, Drizzle, MongoDB…), it persists sessions and linked accounts.

The schema is intentionally minimal compared to Better Auth — great for getting OAuth working in minutes, but requires more custom work for features like organizations or API keys.`,
    features: [
      "50+ built-in OAuth providers (GitHub, Google, Twitter, Discord…)",
      "Credentials provider for custom email/password",
      "Stateless JWT or database sessions (your choice)",
      "Prisma, Drizzle, MongoDB, Supabase adapters",
      "Magic links (email provider)",
      "Middleware-based route protection",
      "Works in Next.js, SvelteKit, Express, Nuxt, Qwik",
    ],
    tradeoffs: [
      { pro: "Largest community + most examples in the ecosystem", con: "Minimal schema — custom fields require adapter overrides" },
      { pro: "Zero database required for JWT-only mode", con: "v4 → v5 migration was breaking; frequent API churn" },
      { pro: "Simplest path to OAuth in under 10 minutes", con: "No built-in support for orgs, API keys, 2FA without custom code" },
      { pro: "Official adapters for every major database/ORM", con: "Credentials provider still considered anti-pattern by maintainers" },
    ],
    whenToUse: [
      "Need OAuth working fast in a Next.js or SvelteKit app",
      "App primarily uses social login (GitHub, Google, etc.)",
      "JWT-only sessions, no database persistence needed",
      "Team already familiar with NextAuth v4",
    ],
    whenNotToUse: [
      "Need organizations, roles, or API keys out of the box",
      "Custom auth flows requiring full schema control",
      "Express/Node apps — Passport still has better ecosystem",
    ],
    setupCode: `// auth.ts (App Router, Next.js 14+)
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({ clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! }),
    Google({ clientId: process.env.GOOGLE_ID!, clientSecret: process.env.GOOGLE_SECRET! }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});

// app/api/auth/[...nextauth]/route.ts
export const { GET, POST } = handlers;

// middleware.ts — protect all routes except /login
export { auth as middleware } from "@/auth";
export const config = { matcher: ["/((?!login|api/auth).*)"] };

// Server Component — read session
const session = await auth();
if (!session) redirect("/login");`,
    realWorld: [
      { company: "Vercel", usage: "Auth.js is maintained by the Vercel team and used across their ecosystem" },
      { company: "Thousands of Next.js projects", usage: "Most popular auth solution in the Next.js ecosystem since 2021" },
    ],
  },

  {
    slug: "clerk",
    name: "Clerk",
    tagline: "Managed authentication with prebuilt UI components — zero infrastructure",
    type: "saas",
    hosting: "managed",
    openSource: false,
    popularity: 4,
    url: "https://clerk.com",
    architectureFit: "saas",
    description: `Clerk is a fully managed authentication and user management platform. You embed their React components (SignIn, SignUp, UserButton) and Clerk handles everything: UI, sessions, MFA, device management, social OAuth, and user data storage — all on their infrastructure.

Unlike library-based solutions, your users are stored in Clerk's database. Your app receives a JWT (Clerk session token) that you validate using their SDK or middleware. This trades data ownership for zero operational overhead.

Clerk's free tier is generous (10,000 MAUs), and their dashboard gives you a full user management UI out of the box. The SDK works seamlessly with Next.js App Router, including server components and middleware.`,
    features: [
      "Prebuilt <SignIn />, <SignUp />, <UserButton /> components",
      "Organizations + roles + permissions",
      "Multi-factor authentication (TOTP, SMS, backup codes)",
      "Social OAuth, passkeys, magic links, phone OTP",
      "Device session management",
      "User impersonation for support workflows",
      "Webhooks on auth events (user.created, session.ended…)",
      "Bot detection and rate limiting built-in",
    ],
    tradeoffs: [
      { pro: "Zero infrastructure — no DB schema, no migrations, no ops", con: "User data lives on Clerk's servers — data residency concerns" },
      { pro: "Prebuilt UI that matches your theme — fastest time to auth", con: "Expensive at scale ($0.02/MAU above free tier)" },
      { pro: "Organizations, MFA, passkeys out of the box", con: "Vendor lock-in — migrating users out is painful" },
      { pro: "First-class Next.js App Router + Middleware support", con: "Customisation limited to what Clerk exposes in their SDK" },
    ],
    whenToUse: [
      "Startups that want auth done in a day with no ops burden",
      "Apps where prebuilt UI quality matters more than customisation",
      "Teams that need organizations + RBAC without building it",
      "Projects under 10k MAU (generous free tier)",
    ],
    whenNotToUse: [
      "Data residency requirements (EU GDPR, healthcare, finance)",
      "Scale where per-MAU pricing becomes prohibitive (>100k users)",
      "Need full control over the authentication database schema",
      "Apps that need deep customisation of auth UI flows",
    ],
    setupCode: `// middleware.ts — protect all routes
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (!isPublic(req)) auth().protect();
});

// app/layout.tsx — wrap with ClerkProvider
import { ClerkProvider } from "@clerk/nextjs";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider><html><body>{children}</body></html></ClerkProvider>;
}

// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";
export default function Page() {
  return <SignIn />;
}

// Server Component — read session
import { auth, currentUser } from "@clerk/nextjs/server";
const { userId } = await auth();
if (!userId) redirect("/sign-in");
const user = await currentUser();

// Client Component
import { useAuth, useUser } from "@clerk/nextjs";
const { isSignedIn, userId } = useAuth();`,
    realWorld: [
      { company: "Perplexity", usage: "Uses Clerk for user authentication across their AI search product" },
      { company: "Loom", usage: "Clerk powers auth including organizations for team workspaces" },
      { company: "Many YC startups", usage: "Clerk is the default auth choice for most Vercel-deployed Next.js startups" },
    ],
  },

  {
    slug: "lucia",
    name: "Lucia",
    tagline: "Minimal session management primitives — you control the auth logic",
    type: "primitives",
    hosting: "self-hosted",
    openSource: true,
    popularity: 3,
    url: "https://lucia-auth.com",
    architectureFit: "monolith",
    description: `Lucia is a minimal, framework-agnostic session management library. It deliberately does NOT handle password hashing, OAuth flows, or token generation — it only manages sessions and their lifecycle. You write the auth logic; Lucia handles the session store.

The Lucia author (pilcrowOnPaper) has since sunset active development and now recommends reading the Lucia source as educational material and writing session management yourself. However, the existing library remains stable and production-worthy.

For greenfield projects, the author's newer library oslo provides cryptographic primitives (PKCE, HMAC, password hashing) that you assemble yourself — the "build your own auth" approach with solid primitives.`,
    features: [
      "Session CRUD with automatic expiry and rolling sessions",
      "Adapters for every major database (Prisma, Drizzle, MySQL, Postgres, Redis…)",
      "Framework adapters (Next.js, SvelteKit, Astro, Hono…)",
      "Typed session attributes — extend with any fields",
      "Cookie-based or Bearer token session storage",
      "oslo companion library for OAuth, PKCE, HOTP, password hashing",
    ],
    tradeoffs: [
      { pro: "Complete control — you write every auth decision", con: "More code to write — no OAuth or password handling built in" },
      { pro: "Tiny footprint, no magic, easy to audit", con: "Actively sunset by author — consider it in maintenance mode" },
      { pro: "Best for learning how auth works under the hood", con: "No organizations, 2FA, or passkeys without building them" },
      { pro: "Works everywhere Node.js runs", con: "Smaller plugin/community ecosystem than Auth.js or Better Auth" },
    ],
    whenToUse: [
      "You want to deeply understand session management",
      "Custom auth flows that no framework handles well",
      "SvelteKit or Astro apps where Auth.js support is limited",
      "Teams who value simplicity over features",
    ],
    whenNotToUse: [
      "Production apps starting today — Better Auth covers the same ground with more features",
      "Need OAuth, 2FA, or passkeys without writing them yourself",
      "Large teams who need a maintained, feature-rich solution",
    ],
    setupCode: `// lib/lucia.ts
import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";

export const lucia = new Lucia(new PrismaAdapter(prisma.session, prisma.user), {
  sessionCookie: { attributes: { secure: process.env.NODE_ENV === "production" } },
  getUserAttributes: (attrs) => ({ email: attrs.email, username: attrs.username }),
});

// Register — hash password yourself (use oslo/password)
import { Argon2id } from "oslo/password";
const hash = await new Argon2id().hash(password);
await prisma.user.create({ data: { email, passwordHash: hash } });
const session = await lucia.createSession(user.id, {});
const cookie = lucia.createSessionCookie(session.id);

// Middleware — validate session on every request
const sessionId = lucia.readSessionCookie(req.headers.get("cookie") ?? "");
if (!sessionId) return new Response(null, { status: 401 });
const { session, user } = await lucia.validateSession(sessionId);
if (!session) return new Response(null, { status: 401 });

// Rolling session — extend expiry on activity
if (session.fresh) {
  res.headers.set("Set-Cookie", lucia.createSessionCookie(session.id).serialize());
}`,
    realWorld: [
      { company: "Community projects", usage: "Popular in SvelteKit and Astro communities for custom auth setups" },
      { company: "Educational codebases", usage: "Widely used in auth tutorials for teaching session management fundamentals" },
    ],
  },

  {
    slug: "passport",
    name: "Passport.js",
    tagline: "The original Node.js authentication middleware — 500+ strategies",
    type: "library",
    hosting: "self-hosted",
    openSource: true,
    popularity: 4,
    url: "https://www.passportjs.org",
    architectureFit: "monolith",
    description: `Passport.js is the original authentication middleware for Node.js, released in 2011. It introduced the strategy pattern for authentication — each provider (local, OAuth, SAML, LDAP) is a separate pluggable strategy. With 500+ strategies available, it covers virtually every auth scenario.

Passport doesn't prescribe sessions or token management — it integrates with Express session middleware (express-session) or sets a req.user after validation, leaving the rest to you. This makes it extremely flexible but requires wiring up several pieces yourself.

Despite being over a decade old, Passport remains the dominant choice for Express and Fastify applications. The ecosystem of strategies for enterprise protocols (SAML, LDAP, Kerberos) is unmatched.`,
    features: [
      "500+ authentication strategies (local, OAuth, SAML, LDAP, OIDC…)",
      "Plugs into any Express-compatible middleware chain",
      "req.user populated after successful authentication",
      "Works with express-session for stateful sessions",
      "Works with JWT strategies for stateless APIs",
      "SAML and LDAP strategies for enterprise SSO",
      "Maintains user serialization/deserialization for sessions",
    ],
    tradeoffs: [
      { pro: "Largest strategy ecosystem — covers SAML, LDAP, Kerberos, OIDC", con: "Callback-heavy API design — predates async/await" },
      { pro: "Battle-tested since 2011, extremely stable", con: "Wires multiple packages — passport + session + strategy" },
      { pro: "Framework-agnostic (Express, Fastify, Koa)", con: "Not designed for Next.js App Router or Edge runtime" },
      { pro: "Best choice for enterprise SSO in Node.js backends", con: "No built-in UI, organizations, or modern auth primitives" },
    ],
    whenToUse: [
      "Express or Fastify REST APIs",
      "Enterprise SAML/LDAP/Kerberos SSO requirements",
      "Migrating a legacy Node.js app with existing Passport setup",
      "Need a specific strategy that only Passport has",
    ],
    whenNotToUse: [
      "New Next.js projects — Auth.js, Better Auth, or Clerk are better fits",
      "Edge runtime or serverless (Passport needs Node.js APIs)",
      "Apps that need organizations, API keys, or passkeys built-in",
    ],
    setupCode: `// Express setup with local + GitHub strategies
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GitHubStrategy } from "passport-github2";
import session from "express-session";

// Session serialization
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await db.user.findUnique({ where: { id } });
  done(null, user);
});

// Local strategy (email + password)
passport.use(new LocalStrategy({ usernameField: "email" },
  async (email, password, done) => {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.passwordHash))
      return done(null, false, { message: "Invalid credentials" });
    return done(null, user);
  }
));

// GitHub OAuth strategy
passport.use(new GitHubStrategy(
  { clientID: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET!, callbackURL: "/auth/github/callback" },
  async (accessToken, refreshToken, profile, done) => {
    const user = await db.user.upsert({
      where: { githubId: profile.id },
      create: { githubId: profile.id, email: profile.emails?.[0].value },
      update: {},
    });
    return done(null, user);
  }
));

// Middleware wiring
app.use(session({ secret: process.env.SESSION_SECRET!, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.post("/auth/login", passport.authenticate("local", { successRedirect: "/", failureRedirect: "/login" }));
app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
app.get("/auth/github/callback", passport.authenticate("github", { successRedirect: "/" }));

// Protect a route
app.get("/dashboard", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  res.json({ user: req.user });
});`,
    realWorld: [
      { company: "LinkedIn", usage: "Uses Passport's OAuth strategies in their developer ecosystem APIs" },
      { company: "Express ecosystem", usage: "Dominant auth solution for Express apps, used by hundreds of thousands of Node.js projects" },
    ],
  },
];

export function getFramework(slug: string): AuthFramework | undefined {
  return authFrameworks.find(f => f.slug === slug);
}
