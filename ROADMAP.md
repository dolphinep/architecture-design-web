# arch.design — Roadmap

Living document. Update the **Changelog** whenever something ships, and move items between
**Now / Next / Later** as priorities change.

---

## v1.1.0 — current (2026-08-22)

First version tagged. The core promise — *learn architecture by interacting with it, not reading
about it* — is delivered for the patterns that have visualizations, and the Learning module has
grown into the strongest part of the site.

### What's in it

| Area | State |
| --- | --- |
| Principles | **45** catalogued across architecture / infrastructure / cloud / networking |
| Interactive visualizations | **15**, all on the shared design system (Clean Arch, Microservices, Layered, Event-Driven, CQRS, Event Sourcing, Circuit Breaker, API Gateway, Saga, Auth, K8s, Load Balancing, Service Mesh, CDN, DNS) |
| Learning lessons | **8** — Redis Cache, Message Queues & Kafka, OAuth 2.0, OIDC, RAG, AI Infrastructure, Open WebUI, MCP |
| Hands-on labs | **4** (Redis, Kafka, Open WebUI, MCP) with per-language tracks |
| Slide animations | **23** animation types across **21** SVG components |
| Tools | Excalidraw canvas, DBML-style DB diagram editor with local persistence |
| Stack levels | Code / Service / System / Infrastructure / Network taxonomy across all principles |

### Known gaps (honest accounting)

- **30 of 45 principles have no visualization** — mostly the SOLID / OOP / FP set added after the
  original 15. The detail pages carry good prose, but the site's core promise is unmet for them.
- **Category imbalance** — 35 architecture vs. 4 infrastructure, 3 cloud, 3 networking. The nav
  advertises four peer categories; three of them are nearly empty.
- **No cross-pattern navigation** — no way to compare two patterns, or to arrive from a problem
  ("I need cross-service transactions") rather than from a pattern name.
- **Canvas and DB Diagram are unlinked islands** — real tools, but nothing in the learning
  content routes users to them.

---

## Now — v1.2.0

Close the biggest credibility gap: principles that promise interaction and don't deliver.

- [ ] **Static SVG diagrams for the 30 unvisualized principles.** A clean, labelled diagram on
      each detail page is a large step up from prose and far cheaper than 30 animations.
      Add a `diagram` field to `Principle` so it degrades gracefully. Build them on the
      `_shared` primitives that now exist.
- [ ] **Animate the highest-value remaining principles** — `hexagonal-architecture`,
      `dependency-injection`, `strangler-fig`, `serverless`, `osi-model`.
- [ ] **Link the tools into the content.** "Open in Canvas" on principle pages; "Model this schema"
      from any lesson that shows a data model.
- [ ] **Apply the `_shared` visualization system to the 21 lesson animations**
      in `src/components/learning/animations/`, which were not part of the v1.1.0 pass and still
      carry the old sub-10px typography.

## Next — v1.3.0

Make the catalogue navigable by *problem*, not just by name. Both items were scoped in the
retired `PLAN.md` and remain the right calls.

- [ ] **`/guide` — decision guide.** Filterable grid keyed on the problem you have:
      isolate failures → Circuit Breaker / Bulkhead; cross-service transactions → Saga;
      audit trail → Event Sourcing / CQRS; migrate a legacy system → Strangler Fig;
      async workloads → Event-Driven / Serverless.
- [ ] **`/compare/[a]/[b]` — side-by-side.** Trade-off table, popularity bars, and a written
      "when to choose A over B". Seed the pairs people actually argue about:
      Microservices vs Monolith · CQRS vs CRUD · Event Sourcing vs Traditional DB ·
      Service Mesh vs API Gateway · Clean vs Layered.
- [ ] **`/paths` — learning paths.** Backend Foundations · Distributed Systems ·
      Cloud & Infrastructure · Networking Basics, each with an ordered progress indicator.

## Later — v1.4.0+

- [ ] **Fill the thin categories.** Networking: TCP/IP, TLS handshake, WebSockets, gRPC, QUIC.
      Infrastructure: observability, database indexing, sharding, rate limiting, idempotency.
- [ ] **New lessons.** Agent architectures (tool loops, planning, memory — the natural sequel to
      the MCP lesson) · Database indexing · Observability & tracing · gRPC vs REST.
- [ ] **Search.** 45 principles and 8 lessons is past the point where browsing suffices.
- [ ] **Persist lesson progress** in `localStorage`, matching the DB-diagram pattern already in
      `src/lib/db-diagram/storage.ts`.
- [ ] **Deep-linkable slides** (`/learning/[slug]#slide-id`) so lessons can be cited precisely.
- [ ] **Accessibility pass.** The animations are SVG + state with no reduced-motion handling and
      little keyboard support.

## Maintenance

- [ ] **7 remaining lint errors — React hygiene.** Surfaced once `bun run lint` was repaired
      (see Changelog). All are real but need per-component care, since the components animate
      correctly today and naive fixes change timing. The visualization ones were resolved in
      v1.1.0; what remains is in `db-diagram` and the lesson animations:
      - `setState` called synchronously inside an effect (cascading renders) —
        `CanvasPanel.tsx:63,172` · `DBDiagramClient.tsx:51` · `CacheFlowViz.tsx:206` ·
        `DBOverloadViz.tsx:64,82`
      - refs accessed during render — `pause-context.tsx:19`
- [ ] **15 lint warnings** — unused variables, mostly dead locals in visualization components.
- [ ] **TypeScript 7** — major, currently pinned at 5.9.3.
- [ ] **ESLint 10** — major, currently pinned at 9.x.
- [ ] **`@types/node` 26** — major, tracking Node 20 types today.
- [ ] Prune the committed `package-lock.json`; the project builds with `bun.lock`.

---

## Changelog

### v1.1.0 — 2026-08-22

**Visualization design system.** All 15 interactive visualizations were rebuilt on a shared
foundation in `src/components/visualizations/_shared/`. The audit that prompted it found the same
faults repeated across the set rather than isolated rough edges.

*What the audit found*

- **92 SVG labels at 10px or below**, `fontSize="8"` being the single most common value in the
  codebase. Worse, uniform `viewBox` scaling meant a 780-unit diagram in a 259px mobile column
  rendered an 11px label at **3.7px**.
- **Hardcoded SVG widths** (`width="600"`) inside ~540px containers — diagrams clipped or crammed
  against the left edge with dead space beside them.
- **Connectors at 0.2–0.35 stroke opacity**, which read as empty space on a zinc-950 ground.
- **Ad-hoc chrome in all 15** — every visualization invented its own control row, stat tiles,
  legend, and status line, so nothing transferred between them.
- **Unconditional `requestAnimationFrame` loops** calling `setState` every frame for the lifetime
  of the page, whether or not anything was moving, and off-screen.
- **Frame-rate–dependent motion** (`progress += 0.025` per frame), so animations ran ~2× fast on
  a 120 Hz display.

*New shared foundation*

- `tokens.ts` — semantic hues, an SVG type scale with an enforced 11px floor, stroke weights with
  minimum visible opacities, motion timings.
- `VizSvg` — responsive canvas that refuses to shrink past the width keeping `TYPE.micro` at
  ~9.5px, scrolling the stage instead. Mobile legibility went from 3.7px to 9.5px.
- `VizChrome` — `VizFrame`, `VizStage` (gridded, lit ground), `VizStatus`, `VizControls`,
  `VizButton`, `VizStats` (with threshold meters), `VizLegend`, `VizLog`, `VizDetail`.
- `VizSvg` primitives — `VizNode`, `VizEdge` (with routed bows), `VizPacket`, `VizText`,
  plus `edgeControl`/`pointOnEdge` so a packet always travels the exact path drawn.
- `flight.ts` — pure, time-based packet model. `advance()` is a pure function; **21 unit tests**
  cover frame-rate independence, single-landing guarantees, and marker lifecycle.
- `hooks.ts` — `useFlights`, `useRafLoop` (runs only when something moves), `useOnScreen`
  (pauses off-screen simulations), `useReducedMotion` via `useSyncExternalStore`, `useEventLog`.
- `WorldMap.tsx` — coarse equirectangular backdrop for geographic diagrams.

**Correctness bugs fixed while converting**

- `EventDrivenViz` published each event to **one random consumer**. Pub/sub fan-out to *every*
  subscriber is the entire point of the pattern; consumers now declare subscriptions and one
  event fans out to all of them.
- `CleanArchitectureViz` printed **"Entities" twice** — the ring loop and a hardcoded centre
  label both rendered it.
- Side effects were being run **inside `setState` updaters** in `CircuitBreakerViz`,
  `EventDrivenViz`, `KubernetesViz`, and `CDNViz`, which fires them twice under StrictMode replay.
- Module-level mutable state leaking across component instances and navigations:
  `let rrIdx` in `LoadBalancingViz`, `let nextId` in `CQRSViz`.
- `KubernetesViz` seeded pod ids with `Math.random()` during module init — server and client
  disagreed on hydration. Now a deterministic counter.
- `KubernetesViz` node-failure indexed `failedPods[0]`/`[1]`, assuming exactly two pods.
- `EventSourcingViz` computed balance history with a quadratic reduce that recomputed the whole
  log per step and produced wrong intermediate values. Now a single pure fold; the chart also
  scales to the data instead of a hardcoded 1500 ceiling.
- `DNSViz` matched diagram nodes by **substring-matching display labels**, and its step ids did
  not describe what the steps did. Hops now reference nodes by id.
- `APIGatewayViz` **mutated state objects in place** (`req.state = …`).
- `CircuitBreakerViz`'s event log faded entries with interpolated Tailwind classes
  (`opacity-${n}`) that were never in the compiled stylesheet, so the fade did nothing.
- Layout collisions fixed: edges routed through intervening nodes (Microservices, Service Mesh),
  labels overlapping datastore captions, clipped bottom-row labels, and unreadable 12px edge stubs
  between adjacent nodes.

**Accessibility**

- Interactive SVG nodes are focusable, keyboard-operable (Enter/Space), and carry
  `role="button"` + `aria-pressed`; focus rings are drawn with filters, since `outline` on SVG is
  inconsistent across engines.
- Every diagram has an `aria-label` describing what it shows; status lines use `role="status"`
  with `aria-live="polite"`.
- `prefers-reduced-motion` is honoured throughout — flights land immediately rather than animating,
  and CSS transitions are disabled.
- Fixed-height logs and non-unmounting detail panels remove the layout shift that clicking around
  used to cause.

**Also**

- `4` of the 11 outstanding lint errors from v1.0.0 are resolved (all the visualization ones);
  `src/components/visualizations/` is now lint-clean. The remaining 7 are in `db-diagram` and the
  lesson animations.
- 33 unit tests added for the shared pure logic (packet flight, load-balancing algorithms).

### v1.0.0 — 2026-08-22

**Added**
- **MCP (Model Context Protocol) lesson** — 9 slides + a 5-step lab (TypeScript / Python).
  Covers the N×M integration problem, host/client/server topology, the three server primitives
  and who controls each, client primitives (sampling / roots / elicitation), the JSON-RPC
  handshake as a sequence diagram, stdio vs Streamable HTTP with their differing threat models,
  tool-design guidance, and where MCP is the wrong tool. Closes the largest gap in the
  AI Architecture module, which covered knowledge and inference but not actions.
- Inline `[label](/href)` link support in lesson slides, enabling cross-lesson references.

**Fixed**
- **`bun run lint` was completely broken** and had been for some time: `eslint.config.mjs` ran
  `eslint-config-next` through the legacy `FlatCompat` shim, but the package has shipped native
  flat config since at least 16.2.6 — the combination threw
  `TypeError: Converting circular structure to JSON` before linting a single file.
  Rewritten to import the flat configs directly. This surfaced 30 previously invisible errors;
  19 are fixed below, 11 are tracked under **Maintenance**.
- 19 lint errors fixed: unescaped JSX entities in displayed text (`"` → `&quot;`, `'` → `&apos;`)
  across `DiagramManagerModal`, `LabView`, `RAGPipelineViz`, `VectorSearchViz`, `LayeredArchViz`,
  and `CQRSViz`; intentional `//` code-comment text wrapped in expression containers in
  `AuthViz`, `CQRSViz`, and `EventSourcingViz`; one `prefer-const`.
- Lab language tabs were hardcoded to all three tracks — selecting a language a lab didn't
  provide silently rendered nothing. Tracks are now derived from lab content.
- `ai-infra`: `mistral:7b` was listed under the "Medium (13B–34B)" GPU tier; moved to Small and
  replaced with genuine mid-size models. `llama3.1:70b` → `llama3.3:70b`.
- `ai-infra`: the API-vs-self-hosted cost stat quoted a stale model at a wrong price
  (`$0.002` was not GPT-4o's per-1K output rate). Restated as per-1M ranges that age better.
- `ai-rag`: "Ask GPT-4 about your internal docs" → version-agnostic phrasing.
- `registry`: Cloudflare's footprint was cited as both "300+ PoPs" and "330+ PoPs" in the same
  file; normalized to "330+ cities".

**Changed**
- `package.json` version `0.1.0` → `1.0.0`.
- Dependencies to latest patch/minor: Next 16.2.6 → 16.3.2, React 19.2.4 → 19.2.8,
  Shiki 4.1.0 → 4.4.3, Zustand 5.0.13 → 5.0.15, Tailwind 4.3.0 → 4.3.3,
  eslint-config-next 16.2.6 → 16.3.2. Majors (TypeScript 7, ESLint 10) deliberately held.
- Retired `PLAN.md` — its Priority 1 work shipped; Priorities 2–5 carry forward into
  **Next** and **Later** above.
- Added `.claude/launch.json` so the dev server can be launched and previewed directly.
