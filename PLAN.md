# arch.design — Improvement Plan

## Priority 1 — Fill the visualization gap ✅ DONE

17 of 21 principles have no visualization. This breaks the core promise of the project.
Build interactive visualizations for each, ordered by educational value.

### 1.1 CQRS ✅ DONE → `implemented: true`
- Split command path (write) vs query path (read) side by side
- Animated: Command → Write Model → Event → Read Model projection
- Show two separate data stores: normalized write DB, denormalized read DB
- Toggle: send a Command, watch the read-side update after a short lag (eventual consistency)

### 1.2 Saga Pattern ✅ DONE → `implemented: true`
- Choreography flavour: step-by-step animated workflow
  (Reserve Inventory → Charge Payment → Ship Order)
- Failure scenario: Payment fails → compensating transactions roll back in reverse
- Toggle between happy path and failure path

### 1.3 Layered Architecture ✅ DONE → `implemented: true`
- Animated request flowing down through layers (Presentation → Business → Data)
- Show "sinkhole anti-pattern": layers passing calls through with no logic added
- Click each layer to see what belongs there

### 1.4 Kubernetes ✅ DONE → `implemented: true`
- Cluster with nodes and pods
- Animate: pod scheduling, node failure → rescheduling on healthy node
- Rolling deploy: old pods replaced one-by-one with new version

### 1.5 DNS Resolution ✅ DONE → `implemented: true`
- Step-by-step recursive lookup animation
  (Client → Recursive Resolver → Root NS → TLD NS → Authoritative NS → IP returned)
- Show TTL caching on the return path
- Show what happens on cache HIT vs MISS

### 1.6 Remaining principles ✅ DONE
- API Gateway ✅ — auth check, rate limit meter, routing to services, real request buttons
- Event Sourcing ✅ — append-only log, time-travel by clicking any event, balance history chart
- Service Mesh ✅ — without/with mesh toggle, mTLS blocking, sidecar proxy + control plane
- CDN ✅ — 4 global PoPs, HIT/MISS animation, TTL countdown, per-PoP hit rate stats
- Load Balancing ✅ — 3 algorithms, server health toggle, traffic distribution bars

---

## Stack Levels Feature ✅ DONE

Added Code / Service / System / Infrastructure / Network level taxonomy across all 22 principles.

- `Level` type in `src/types/principle.ts`
- `level` field on every principle in `src/lib/registry.ts`
- `LEVELS` + `LEVEL_META` constants for colors, icons, descriptions
- `LevelBadge` component in `src/components/ui/Badge.tsx`
- `StackOverview` interactive component — click level bands to filter, chips link to detail pages
- Browse page (`/principles`): level filter buttons + "Stack map" view toggle
- Detail page (`/principles/[slug]`): LevelBadge in header + level context box with mini stack indicator
- Home page (`/`): LevelBadge on featured cards + StackOverview section

---

## Priority 2 — "Which pattern for my problem?" decision guide

A page at `/guide` that organises patterns by the problem they solve rather than by name.

**Problem categories:**
- Need to isolate failures → Circuit Breaker, Bulkhead
- Need cross-service transactions → Saga Pattern
- Need an audit trail → Event Sourcing, CQRS
- Need to scale independently → Microservices, CQRS (read side)
- Need to migrate a legacy system → Strangler Fig
- Need to enforce business rules cleanly → Clean Architecture, DDD
- Need to handle async workloads → Event-Driven, Serverless

Implementation: filterable card grid where you pick your problem and matching patterns surface with a one-line explanation of why.

---

## Priority 3 — Side-by-side comparison

A `/compare/[slug-a]/[slug-b]` route.

- Two-column trade-off table
- Popularity bars side by side
- "When to choose A over B" summary written per pair
- Pre-linked pairs on each principle detail page:
  - Microservices vs Monolith
  - CQRS vs Simple CRUD
  - Event Sourcing vs Traditional DB
  - Service Mesh vs API Gateway
  - Clean Architecture vs Layered

---

## Priority 4 — Learning paths

A `/paths` page with curated progression routes:

**Path: Backend Foundations**
Layered Architecture → Clean Architecture → DDD → CQRS → Event Sourcing

**Path: Distributed Systems**
Microservices → API Gateway → Circuit Breaker → Saga → Service Mesh

**Path: Cloud & Infrastructure**
Containers → Kubernetes → Cloud-Native → Serverless → Multi-Cloud

**Path: Networking Basics**
OSI Model → DNS → Load Balancing → CDN

Each path shows a horizontal progress indicator and links to each principle in order.

---

## Priority 5 — Static diagrams for remaining non-interactive principles

For any principle that ends up without a full animation, add a clean SVG diagram
embedded directly on the detail page — better than text alone.
