import type { Principle } from "@/types/principle";

export const principleRegistry: Principle[] = [
  // ──────────────────────────────────────────────────────────────────────
  // ARCHITECTURE
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "clean-architecture",
    name: "Clean Architecture",
    category: "architecture",
    complexity: "intermediate",
    level: "code",
    popularity: 5,
    year: 2012,
    summary:
      "Organise code into concentric dependency rings so business logic never depends on frameworks, databases, or UI.",
    description:
      "Clean Architecture, introduced by Robert C. Martin (Uncle Bob), arranges code into four concentric layers: Entities, Use Cases, Interface Adapters, and Frameworks & Drivers. The Dependency Rule is absolute — source-code dependencies must always point inward. Nothing in an inner layer knows anything about an outer layer.\n\nEntities encapsulate enterprise-wide business rules. Use Cases orchestrate data flow to and from Entities. Interface Adapters convert data between Use Cases and delivery mechanisms. Frameworks & Drivers are the outermost circle: databases, web frameworks, and external APIs.\n\nThis separation lets you swap a REST API for gRPC, replace a SQL database with a NoSQL one, or test Use Cases without spinning up a web server.",
    whyItMatters:
      "Most software rot starts when business rules leak into framework code. Clean Architecture keeps the core testable, portable, and framework-independent — critical as systems grow.",
    whenToUse: [
      "Long-lived products where frameworks and databases may change",
      "Teams where different layers are owned by different groups",
      "When comprehensive unit testing of business logic is required",
      "Monoliths that may need to be decomposed into microservices later",
    ],
    whenNotToUse: [
      "Small scripts or one-off tools",
      "Prototype / MVP with tight deadlines",
      "Simple CRUD apps with no meaningful business logic",
    ],
    tradeoffs: [
      { pro: "Business logic is framework-independent and highly testable", con: "More initial boilerplate and indirection" },
      { pro: "Replacing databases or frameworks is safe and isolated", con: "Over-engineering risk for simple domains" },
      { pro: "Clear ownership boundaries between teams", con: "Learning curve for developers new to the pattern" },
    ],
    realWorld: [
      { company: "Netflix", usage: "Recommendation engine core logic isolated from delivery infrastructure" },
      { company: "Shopify", usage: "Checkout domain isolated from payment gateway providers" },
      { company: "Uber", usage: "Fare calculation engine independent of platform and persistence layers" },
    ],
    related: ["layered-architecture", "ddd", "hexagonal-architecture", "cqrs"],
    tags: ["solid", "testability", "dependency-rule", "uncle-bob"],
    implemented: true,
  },
  {
    slug: "microservices",
    name: "Microservices Architecture",
    category: "architecture",
    complexity: "advanced",
    level: "system",
    popularity: 5,
    year: 2011,
    summary:
      "Decompose an application into small, independently deployable services that communicate over a network.",
    description:
      "Microservices architecture structures an application as a collection of loosely coupled services, each responsible for a specific business capability. Services communicate via lightweight protocols — typically HTTP/REST, gRPC, or asynchronous messaging.\n\nEach service owns its data store, can be deployed independently, and is built around a business domain (e.g., User Service, Order Service, Payment Service). Teams can develop, deploy, and scale services independently.\n\nThe pattern introduces operational complexity: you need service discovery, distributed tracing, circuit breakers, and an API gateway. Tools like Kubernetes, Istio, and Prometheus typically form the operational backbone.",
    whyItMatters:
      "Microservices let large organisations scale development by allowing independent teams to own and deploy services, removing the bottleneck of a shared monolith.",
    whenToUse: [
      "Large teams that need independent deployment cadences",
      "Services with very different scaling requirements",
      "Different parts of the system require different technology stacks",
      "High availability requirements for specific business capabilities",
    ],
    whenNotToUse: [
      "Small teams (< 10 engineers) — operational overhead outweighs benefits",
      "Early-stage product where domain boundaries are still unknown",
      "When network latency would degrade user experience unacceptably",
    ],
    tradeoffs: [
      { pro: "Independent deployment and scaling per service", con: "Distributed systems complexity (network failures, latency)" },
      { pro: "Technology heterogeneity — right tool for each job", con: "Operational overhead: monitoring, tracing, service mesh" },
      { pro: "Fault isolation — one service failing doesn't crash others", con: "Data consistency across services is hard (eventual consistency)" },
    ],
    realWorld: [
      { company: "Netflix", usage: "700+ microservices; each team owns its service lifecycle" },
      { company: "Amazon", usage: "Two-pizza teams each own independent services (since ~2002)" },
      { company: "Uber", usage: "Decomposed monolith into domain-specific microservices as scale grew" },
    ],
    related: ["api-gateway", "service-mesh", "circuit-breaker", "saga-pattern", "event-driven"],
    tags: ["distributed-systems", "soa", "independent-deployment", "scalability"],
    implemented: true,
  },
  {
    slug: "layered-architecture",
    name: "Layered (N-Tier) Architecture",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    popularity: 5,
    year: 1990,
    summary:
      "Organise code into horizontal layers (Presentation, Business Logic, Data Access) where each layer only calls the one below it.",
    description:
      "Layered architecture is the most widely used architectural pattern. It divides an application into logical layers, each with a well-defined role. The classic three-tier model: Presentation (UI), Business Logic (Services), and Data Access (Repositories/DAOs).\n\nRequests flow downward through layers; responses travel back up. Strict layering means a layer only calls the layer directly beneath it. Relaxed layering allows skipping layers for performance.",
    whyItMatters:
      "Layered architecture is the default starting point for most applications — it's easy to reason about, maps to common team structures, and is supported by every major framework.",
    whenToUse: [
      "Standard web applications and APIs",
      "Teams organised by technical function (frontend, backend, data)",
      "Applications with clear separation between UI and data logic",
    ],
    whenNotToUse: [
      "When layers become meaningless pass-throughs with no logic",
      "High-performance systems where inter-layer calls add unacceptable overhead",
    ],
    tradeoffs: [
      { pro: "Simple, universally understood structure", con: "Can lead to 'sinkhole anti-pattern' — empty layers just passing calls" },
      { pro: "Easy to test each layer independently", con: "Changes to data model often cascade through all layers" },
    ],
    realWorld: [
      { company: "Most enterprise apps", usage: "Spring MVC, Django, Rails all enforce layered patterns by convention" },
      { company: "SAP", usage: "ERP systems built on strict three-tier client/server architecture" },
    ],
    related: ["clean-architecture", "ddd"],
    tags: ["n-tier", "mvc", "separation-of-concerns"],
    implemented: true,
  },
  {
    slug: "event-driven",
    name: "Event-Driven Architecture",
    category: "architecture",
    complexity: "intermediate",
    level: "system",
    popularity: 4,
    year: 1987,
    summary:
      "Services communicate by producing and consuming events asynchronously through a central event bus or message broker.",
    description:
      "In Event-Driven Architecture (EDA), components communicate by emitting events. A producer publishes an event to a broker (Kafka, RabbitMQ, AWS SNS/SQS) without knowing which consumers will process it. Consumers subscribe to relevant events and react independently.\n\nTwo main topologies: mediator (a central orchestrator routes events) and broker (components react directly to events on a shared bus). EDA enables extremely loose coupling and natural support for audit logs via event replay.\n\nThe main challenge is reasoning about eventual consistency — after a producer emits an event, downstream effects may take milliseconds or seconds.",
    whyItMatters:
      "EDA is the backbone of real-time systems. It enables loose coupling at scale and naturally supports streaming analytics, audit trails, and cross-domain integration.",
    whenToUse: [
      "Real-time data pipelines and streaming analytics",
      "Integrating multiple systems that should stay decoupled",
      "Audit logging and event replay requirements",
      "Workflows where multiple services react to the same event",
    ],
    whenNotToUse: [
      "Simple request/response CRUD with no async requirement",
      "When strong consistency is required (EDA is eventually consistent)",
      "Small systems where a message broker adds unnecessary complexity",
    ],
    tradeoffs: [
      { pro: "Extreme loose coupling — producers don't know consumers", con: "Eventual consistency is hard to reason about and debug" },
      { pro: "Natural scalability — consumers can scale independently", con: "Event schema evolution (versioning) requires careful management" },
      { pro: "Built-in audit log via event history", con: "Harder to trace request flows without distributed tracing tools" },
    ],
    realWorld: [
      { company: "LinkedIn", usage: "Kafka processes > 7 trillion events/day for activity feeds and analytics" },
      { company: "Uber", usage: "Real-time dispatch and surge pricing driven by location events" },
      { company: "Airbnb", usage: "Pricing, availability, and notifications all driven by booking events" },
    ],
    related: ["event-sourcing", "cqrs", "microservices", "saga-pattern"],
    tags: ["kafka", "async", "pub-sub", "loose-coupling", "streaming"],
    implemented: true,
  },
  {
    slug: "cqrs",
    name: "CQRS",
    category: "architecture",
    complexity: "intermediate",
    level: "code",
    popularity: 4,
    year: 2010,
    summary:
      "Separate the model used to read data (Query) from the model used to write data (Command) — each optimised independently.",
    description:
      "Command Query Responsibility Segregation (CQRS), popularised by Greg Young, splits a system's data model into two paths. Commands mutate state and return nothing (or just an ID). Queries read state and never mutate it.\n\nThis allows the write side (optimised for transactional integrity) and read side (optimised for query performance) to evolve independently. Read models are often denormalised projections kept up-to-date via events from the write side.\n\nCQRS pairs naturally with Event Sourcing — the write side publishes events that the read side uses to build projections.",
    whyItMatters:
      "In high-traffic systems, reads vastly outnumber writes. CQRS lets teams optimise each path independently — e.g. a normalised write store and multiple denormalised read stores per use case.",
    whenToUse: [
      "Read/write ratio heavily skewed (e.g. social media timelines)",
      "Complex domain logic on write side that shouldn't pollute queries",
      "Paired with Event Sourcing for full audit trail",
      "Multiple representations of the same data for different consumers",
    ],
    whenNotToUse: [
      "Simple CRUD apps — CQRS adds overhead with no benefit",
      "Small teams without capacity to maintain two models",
      "Strong consistency requirements on every read after write",
    ],
    tradeoffs: [
      { pro: "Read and write models can be optimised independently", con: "Eventual consistency between write and read stores" },
      { pro: "Complex command logic isolated from query logic", con: "More code — two models, two data stores, synchronisation logic" },
    ],
    realWorld: [
      { company: "Microsoft Azure", usage: "Azure Event Grid and Cosmos Change Feed enable CQRS projections" },
      { company: "Axon Framework", usage: "CQRS+ES framework used by banks and insurance companies" },
    ],
    related: ["event-sourcing", "event-driven", "ddd"],
    tags: ["command", "query", "read-model", "write-model", "projections"],
    implemented: true,
  },
  {
    slug: "event-sourcing",
    name: "Event Sourcing",
    category: "architecture",
    complexity: "advanced",
    level: "code",
    popularity: 3,
    year: 2005,
    summary:
      "Store state as an immutable log of events rather than the current snapshot — rebuild state by replaying events.",
    description:
      "In Event Sourcing, every state change is persisted as an immutable event in an append-only log. Current state is derived by replaying all events from the beginning (or from a snapshot + later events).\n\nThis gives you a full audit trail for free, the ability to replay history to correct bugs, and a natural integration point for CQRS. The event log IS the source of truth.\n\nThe main challenge is handling event schema evolution and ensuring replay performance as logs grow large.",
    whyItMatters:
      "Financial systems, healthcare, and legal applications often require a complete, immutable audit trail. Event Sourcing makes this a first-class concern rather than an afterthought.",
    whenToUse: [
      "Financial transactions, compliance-heavy domains",
      "Debugging requires full history of what happened and when",
      "Time-travel queries (what was the state at time T?)",
      "Paired with CQRS for complex read projections",
    ],
    whenNotToUse: [
      "Simple domains with no audit requirements",
      "When query patterns require current-state access without event replay overhead",
      "Teams unfamiliar with eventual consistency",
    ],
    tradeoffs: [
      { pro: "Complete immutable audit trail by design", con: "Schema evolution of past events is complex" },
      { pro: "Temporal queries and event replay for debugging", con: "Initial learning curve and operational complexity" },
    ],
    realWorld: [
      { company: "Kafka", usage: "Kafka's log is an event-sourced storage system at its core" },
      { company: "Git", usage: "Git history is a sequence of immutable events (commits)" },
      { company: "Banks", usage: "Ledger entries are never updated — only new entries are appended" },
    ],
    related: ["cqrs", "event-driven", "ddd"],
    tags: ["immutable-log", "audit", "append-only", "temporal"],
    implemented: true,
  },
  {
    slug: "circuit-breaker",
    name: "Circuit Breaker",
    category: "architecture",
    complexity: "intermediate",
    level: "service",
    popularity: 5,
    year: 2007,
    summary:
      "Automatically stop calling a failing service to give it time to recover — preventing cascading failures across distributed systems.",
    description:
      "The Circuit Breaker pattern (popularised by Michael Nygard in 'Release It!') wraps remote calls in a state machine with three states:\n\n— CLOSED: calls flow normally. Failures are counted.\n— OPEN: after a failure threshold is exceeded, all calls fail immediately (fail-fast) without hitting the remote service. The circuit 'opens'.\n— HALF-OPEN: after a timeout, a probe request is allowed through. If it succeeds, the circuit closes. If it fails, it opens again.\n\nThis prevents a slow or failing dependency from consuming all threads and causing cascading failure across the entire system.",
    whyItMatters:
      "In microservices, one slow service can exhaust thread pools and bring down calling services. Circuit Breaker is a fundamental resilience primitive — it's implemented in Hystrix, Resilience4j, and every major service mesh.",
    whenToUse: [
      "Any service-to-service call in a microservices system",
      "External third-party API calls (payment gateways, SMS providers)",
      "Database connection pools under heavy load",
    ],
    whenNotToUse: [
      "Synchronous, in-process calls — overhead without benefit",
      "Idempotent operations where retrying is safe and preferred",
    ],
    tradeoffs: [
      { pro: "Prevents cascading failures in distributed systems", con: "Adds complexity — thresholds need tuning per service" },
      { pro: "Fail-fast gives callers immediate error feedback", con: "OPEN state means legitimate requests also fail" },
      { pro: "Recovery detection via HALF-OPEN probe", con: "State management needs coordination in multi-instance deployments" },
    ],
    realWorld: [
      { company: "Netflix", usage: "Hystrix library (now Resilience4j) protects all service-to-service calls" },
      { company: "AWS", usage: "SDK retry + circuit breaker patterns recommended in Well-Architected Framework" },
      { company: "Envoy Proxy", usage: "Built-in outlier detection implements circuit-breaker semantics" },
    ],
    related: ["microservices", "service-mesh", "api-gateway"],
    tags: ["resilience", "hystrix", "resilience4j", "fail-fast", "bulkhead"],
    implemented: true,
  },
  {
    slug: "api-gateway",
    name: "API Gateway",
    category: "architecture",
    complexity: "intermediate",
    level: "system",
    popularity: 5,
    year: 2010,
    summary:
      "Single entry point for all clients that handles routing, authentication, rate limiting, and protocol translation.",
    description:
      "An API Gateway acts as the front door to a microservices system. Clients make a single request to the gateway, which routes to the appropriate backend service, handles cross-cutting concerns, and returns a unified response.\n\nTypical responsibilities: authentication & authorisation, SSL termination, rate limiting & throttling, request/response transformation, load balancing, caching, logging and metrics.\n\nThe gateway can also aggregate responses from multiple services into a single payload, shielding clients from microservice topology.",
    whyItMatters:
      "Without an API Gateway, each client must know the location and protocol of every service, cross-cutting concerns are duplicated, and there's no single place to enforce security policies.",
    whenToUse: [
      "Microservices with multiple client types (web, mobile, third-party)",
      "When centralising auth, rate limiting, or logging",
      "Protocol translation (REST to gRPC, WebSocket fan-out)",
    ],
    whenNotToUse: [
      "Single monolith with one client type — adds unnecessary hop",
      "When the gateway becomes a bottleneck or deployment bottleneck",
    ],
    tradeoffs: [
      { pro: "Single entry point — centralised security and observability", con: "Single point of failure if not deployed with HA" },
      { pro: "Clients decoupled from backend service topology", con: "Can become a 'god gateway' with too much logic" },
    ],
    realWorld: [
      { company: "AWS", usage: "API Gateway + Lambda is the standard serverless stack" },
      { company: "Kong", usage: "Open-source API gateway used by Nasdaq, Honeywell" },
      { company: "Netflix", usage: "Zuul gateway handles all inbound traffic before routing to services" },
    ],
    related: ["microservices", "bff", "circuit-breaker", "service-mesh"],
    tags: ["routing", "auth", "rate-limiting", "ingress", "kong", "nginx"],
    implemented: true,
  },
  {
    slug: "saga-pattern",
    name: "Saga Pattern",
    category: "architecture",
    complexity: "advanced",
    level: "system",
    popularity: 3,
    year: 1987,
    summary:
      "Manage distributed transactions across services using a sequence of local transactions with compensating rollbacks on failure.",
    description:
      "A Saga is a sequence of local transactions where each step publishes an event or message triggering the next. If a step fails, compensating transactions roll back completed steps.\n\nTwo flavours:\n— Choreography: each service listens for events and reacts, no central coordinator.\n— Orchestration: a central Saga orchestrator sends commands to each service.\n\nSagas replace ACID distributed transactions (which don't scale) with eventual consistency + compensation.",
    whyItMatters:
      "Distributed transactions via 2PC are impractical across microservices. The Saga pattern is the standard solution for maintaining data consistency across service boundaries.",
    whenToUse: [
      "Multi-step business transactions spanning multiple services",
      "Order processing: reserve inventory → charge payment → ship",
      "Any workflow where partial completion needs to be undone",
    ],
    whenNotToUse: [
      "Simple transactions within a single service/database",
      "When strong consistency is non-negotiable",
    ],
    tradeoffs: [
      { pro: "No distributed locking — services stay independent", con: "Compensating transactions must be designed and maintained" },
      { pro: "Works across different databases and services", con: "Debugging failures across steps is complex" },
    ],
    realWorld: [
      { company: "Amazon", usage: "Order workflow: payment → inventory → shipping each as separate steps with compensation" },
      { company: "Eventuate.io", usage: "Saga orchestration framework widely used in fintech" },
    ],
    related: ["microservices", "event-driven", "event-sourcing", "cqrs"],
    tags: ["distributed-transactions", "compensation", "choreography", "orchestration"],
    implemented: true,
  },
  {
    slug: "ddd",
    name: "Domain-Driven Design",
    category: "architecture",
    complexity: "advanced",
    level: "system",
    popularity: 4,
    year: 2003,
    summary:
      "Model software around the core business domain using a shared language between developers and domain experts.",
    description:
      "Domain-Driven Design (DDD), introduced by Eric Evans, focuses on building software that reflects the business domain deeply. Key tactical patterns include Entities, Value Objects, Aggregates, Domain Events, and Repositories.\n\nStrategic DDD maps the domain into Bounded Contexts — autonomous subsystems with their own model and language. A Context Map defines how Bounded Contexts integrate.\n\nThe Ubiquitous Language is central: developers and business experts use the same terms, and the code reflects those terms directly.",
    whyItMatters:
      "As software complexity grows, a mismatch between the business model and code leads to bugs and miscommunication. DDD aligns code with business reality, making systems more maintainable as they grow.",
    whenToUse: [
      "Complex business domains with rich behaviour",
      "Long-lived products with continuous feature development",
      "Large teams that benefit from explicit Bounded Context boundaries",
    ],
    whenNotToUse: [
      "Simple CRUD applications with no meaningful business logic",
      "Short-lived projects or prototypes",
      "Teams without domain expert access",
    ],
    tradeoffs: [
      { pro: "Code directly reflects business concepts", con: "Significant upfront investment in domain modelling" },
      { pro: "Natural service boundaries via Bounded Contexts", con: "Requires deep collaboration with domain experts" },
    ],
    realWorld: [
      { company: "Zalando", usage: "Platform architecture modelled around DDD Bounded Contexts per domain team" },
      { company: "Soundcloud", usage: "Microservices decomposition guided by DDD Context Maps" },
    ],
    related: ["clean-architecture", "cqrs", "event-sourcing", "microservices"],
    tags: ["bounded-context", "aggregate", "ubiquitous-language", "eric-evans"],
    implemented: false,
  },
  {
    slug: "strangler-fig",
    name: "Strangler Fig Pattern",
    category: "architecture",
    complexity: "intermediate",
    level: "system",
    popularity: 3,
    year: 2004,
    summary:
      "Incrementally replace a legacy system by building the new system alongside it, routing traffic over gradually until the old system is retired.",
    description:
      "Named by Martin Fowler after a parasitic fig tree that grows around its host, the Strangler Fig pattern allows safe incremental migration from a monolith to microservices.\n\nA facade (often an API Gateway or proxy) sits in front of the legacy system. New functionality is built as new services. The proxy routes requests to either the legacy system or a new service. Over time, more and more routes are migrated until the legacy system handles nothing and can be decommissioned.\n\nThis avoids the 'big bang' rewrite that historically fails.",
    whyItMatters:
      "Big-bang rewrites carry enormous risk. The Strangler Fig pattern is the industry-standard strategy for safely migrating from a legacy monolith.",
    whenToUse: [
      "Migrating from a legacy monolith to microservices",
      "When the legacy system cannot be taken offline for rewrite",
      "Feature-by-feature migration with business continuity",
    ],
    whenNotToUse: [
      "When the legacy system is too entangled to proxy safely",
      "Greenfield projects — no legacy to strangle",
    ],
    tradeoffs: [
      { pro: "Low risk — incremental, reversible migration", con: "Running two systems simultaneously increases operational cost" },
      { pro: "Business continuity during migration", con: "Proxy adds a network hop and potential bottleneck" },
    ],
    realWorld: [
      { company: "Amazon", usage: "Strangler Fig used to decompose original retail monolith" },
      { company: "LinkedIn", usage: "Gradual replacement of monolith with services over several years" },
    ],
    related: ["microservices", "api-gateway", "layered-architecture"],
    tags: ["migration", "legacy", "incremental", "martin-fowler"],
    implemented: false,
  },
  {
    slug: "bff",
    name: "Backend for Frontend (BFF)",
    category: "architecture",
    complexity: "intermediate",
    level: "system",
    popularity: 3,
    year: 2015,
    summary:
      "Create a dedicated backend service for each frontend — web, mobile, and third-party each get their own API tailored to their needs.",
    description:
      "The BFF pattern (coined by Sam Newman) creates a separate API layer for each type of frontend client. A mobile BFF returns compact payloads; a web BFF may aggregate more data. A third-party BFF exposes a stable public API.\n\nBFFs own the translation between backend microservices and frontend data needs. They can aggregate calls to multiple services, transform data shapes, and adapt to the evolution of each client type independently.",
    whyItMatters:
      "A single general-purpose API often becomes a compromise — too heavy for mobile, too sparse for web. BFF lets frontend teams own their API, moving faster without blocking backend teams.",
    whenToUse: [
      "Multiple client types with significantly different data needs",
      "Mobile apps where payload size and battery impact matters",
      "When frontend teams and backend teams move at different speeds",
    ],
    whenNotToUse: [
      "Single client type — adds unnecessary service",
      "Teams too small to own separate BFF services",
    ],
    tradeoffs: [
      { pro: "Each frontend gets an optimised API contract", con: "Code duplication across BFFs if logic is shared" },
      { pro: "Frontend teams can evolve their BFF independently", con: "More services to deploy, monitor, and maintain" },
    ],
    realWorld: [
      { company: "Netflix", usage: "Separate BFFs for TV devices, mobile, and browser" },
      { company: "SoundCloud", usage: "Originated the BFF approach for their platform rebuild" },
    ],
    related: ["api-gateway", "microservices"],
    tags: ["frontend", "mobile", "web", "sam-newman", "aggregation"],
    implemented: false,
  },
  // ──────────────────────────────────────────────────────────────────────
  // INFRASTRUCTURE
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "containers",
    name: "Container Architecture",
    category: "infrastructure",
    complexity: "intermediate",
    level: "infrastructure",
    popularity: 5,
    year: 2013,
    summary:
      "Package applications with all their dependencies into isolated, portable units that run consistently everywhere.",
    description:
      "Containers, popularised by Docker, package an application and its runtime dependencies into an immutable image. Unlike VMs, containers share the host OS kernel, making them lightweight and fast to start.\n\nA container image is built from a Dockerfile defining OS layers, dependencies, and the application binary. Images are pushed to registries (Docker Hub, ECR, GCR) and pulled onto any host.\n\nKey primitives: namespaces (isolate process trees, network, filesystem), cgroups (limit CPU and memory), and overlay filesystems (layer images efficiently).",
    whyItMatters:
      "Containers eliminate 'works on my machine'. They're the universal deployment unit for modern cloud-native applications and the foundation for Kubernetes orchestration.",
    whenToUse: [
      "Any modern web application or microservice",
      "CI/CD pipelines requiring repeatable build environments",
      "Applications that need to run across dev, staging, and prod identically",
    ],
    whenNotToUse: [
      "Applications with strict OS/kernel version requirements",
      "Legacy apps requiring GUI or Windows-specific dependencies (though Windows containers exist)",
    ],
    tradeoffs: [
      { pro: "Consistent environments from dev to production", con: "Container image size can grow large without careful layering" },
      { pro: "Fast startup vs VMs — seconds not minutes", con: "Shared kernel — less isolation than full VMs" },
      { pro: "Immutable deployments enable easy rollback", con: "Stateful containers require careful volume management" },
    ],
    realWorld: [
      { company: "Google", usage: "Running billions of containers per week internally (Borg → Kubernetes)" },
      { company: "Spotify", usage: "Entire infrastructure containerised on Google Kubernetes Engine" },
    ],
    related: ["kubernetes", "service-mesh", "cloud-native"],
    tags: ["docker", "oci", "image", "cgroups", "namespaces"],
    implemented: false,
  },
  {
    slug: "kubernetes",
    name: "Kubernetes Orchestration",
    category: "infrastructure",
    complexity: "advanced",
    level: "infrastructure",
    popularity: 5,
    year: 2014,
    summary:
      "Automate the deployment, scaling, and self-healing of containerised applications across a cluster of nodes.",
    description:
      "Kubernetes (K8s), open-sourced by Google from its internal Borg system, is the de-facto container orchestration platform. It schedules containers onto cluster nodes, manages their lifecycle, and ensures desired state is maintained.\n\nCore objects: Pod (smallest deployable unit — one or more containers), Deployment (desired replica count + rolling update strategy), Service (stable network endpoint for a set of Pods), Ingress (HTTP routing). The control plane (API Server, Scheduler, Controller Manager, etcd) continuously reconciles actual state toward desired state.",
    whyItMatters:
      "Managing containers manually at scale is impossible. Kubernetes automates scheduling, self-healing, scaling, and rolling deployments — it's the operating system for cloud-native applications.",
    whenToUse: [
      "Running multiple containerised services that need to scale",
      "Requiring automatic failover and self-healing",
      "Multi-tenant platform serving multiple teams",
    ],
    whenNotToUse: [
      "Simple single-container apps — use managed services (Cloud Run, Fargate)",
      "Small teams without DevOps capacity to operate a cluster",
    ],
    tradeoffs: [
      { pro: "Automatic self-healing and scaling", con: "High operational complexity — YAML sprawl, RBAC, networking" },
      { pro: "Declarative desired-state model", con: "Steep learning curve for operators and developers" },
      { pro: "Ecosystem richness (Helm, Operators, service meshes)", con: "Overkill for small workloads" },
    ],
    realWorld: [
      { company: "Airbnb", usage: "K8s runs their entire service fleet; hundreds of engineers deploy independently" },
      { company: "Pinterest", usage: "Migrated to K8s to improve resource utilisation by 20-30%" },
    ],
    related: ["containers", "service-mesh", "cloud-native"],
    tags: ["k8s", "pods", "deployments", "scheduling", "cncf"],
    implemented: true,
  },
  {
    slug: "load-balancing",
    name: "Load Balancing",
    category: "infrastructure",
    complexity: "intermediate",
    level: "infrastructure",
    popularity: 5,
    year: 1992,
    summary:
      "Distribute incoming traffic across multiple servers to maximise throughput, minimise latency, and prevent overload.",
    description:
      "Load balancers sit between clients and backend servers, distributing requests to ensure no single server is overwhelmed. They operate at different OSI layers:\n\n— Layer 4 (Transport): routes based on IP/TCP — fast, no HTTP awareness (HAProxy, AWS NLB)\n— Layer 7 (Application): routes based on HTTP headers, URL, cookies — smarter, enables path-based routing (Nginx, AWS ALB)\n\nDistribution algorithms: Round Robin, Least Connections, IP Hash (sticky sessions), Weighted Round Robin, Random.\n\nHealth checks poll backends; unhealthy instances are removed until they recover.",
    whyItMatters:
      "Without load balancing, a single server is a single point of failure and scalability ceiling. Load balancers are the fundamental building block for high availability.",
    whenToUse: [
      "Any service running multiple backend replicas",
      "High-traffic applications requiring horizontal scaling",
      "Zero-downtime deployments using rolling updates",
    ],
    whenNotToUse: [
      "Single-instance development environments",
      "When a service mesh already handles load distribution",
    ],
    tradeoffs: [
      { pro: "Horizontal scalability and high availability", con: "Stateful sessions require sticky routing or external session store" },
      { pro: "Health-check-based automatic failover", con: "Load balancer itself becomes a SPOF without redundancy" },
    ],
    realWorld: [
      { company: "AWS", usage: "ALB handles HTTPS termination and path-based routing for millions of apps" },
      { company: "Cloudflare", usage: "Anycast routing + load balancing across 300+ PoPs globally" },
    ],
    related: ["api-gateway", "service-mesh", "kubernetes", "cdn"],
    tags: ["l4", "l7", "round-robin", "nginx", "haproxy", "high-availability"],
    implemented: true,
  },
  {
    slug: "service-mesh",
    name: "Service Mesh",
    category: "infrastructure",
    complexity: "advanced",
    level: "infrastructure",
    popularity: 3,
    year: 2017,
    summary:
      "Offload cross-cutting network concerns (mTLS, retries, circuit breaking, observability) to a dedicated infrastructure layer via sidecar proxies.",
    description:
      "A service mesh injects a sidecar proxy (typically Envoy) alongside each service container. All inbound and outbound network traffic passes through the sidecar, which enforces policies without any changes to application code.\n\nThe data plane (all sidecars) handles: mutual TLS (mTLS), retries, timeouts, circuit breaking, traffic shaping, and telemetry. The control plane (Istio, Linkerd, Consul Connect) distributes configuration to all sidecars.\n\nThis eliminates duplicated network logic from each service and enables zero-trust security by default.",
    whyItMatters:
      "In large microservices deployments, implementing mTLS, retries, and observability in each service is error-prone and inconsistent. Service mesh makes the network observable and secure by default.",
    whenToUse: [
      "Large microservices deployments with complex inter-service traffic",
      "Zero-trust security requirements (mTLS between all services)",
      "Fine-grained traffic control (canary releases, A/B testing at network layer)",
    ],
    whenNotToUse: [
      "Small deployments — sidecar overhead is disproportionate",
      "Monolithic or simple two-service architectures",
    ],
    tradeoffs: [
      { pro: "Network policies and mTLS without application code changes", con: "Significant operational complexity and resource overhead per sidecar" },
      { pro: "Uniform observability across all services", con: "Debugging involves two layers (app + sidecar)" },
    ],
    realWorld: [
      { company: "Google", usage: "Istio (co-created by Google) runs on GKE clusters across all product lines" },
      { company: "Lyft", usage: "Created Envoy proxy, which powers most service meshes" },
    ],
    related: ["kubernetes", "microservices", "circuit-breaker", "api-gateway"],
    tags: ["istio", "envoy", "sidecar", "mtls", "observability", "linkerd"],
    implemented: true,
  },
  // ──────────────────────────────────────────────────────────────────────
  // CODE PATTERNS
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "repository-pattern",
    name: "Repository Pattern",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "design-patterns",
    popularity: 5,
    year: 2003,
    summary:
      "Decouple business logic from data access by defining a collection-like interface for retrieving and persisting domain objects.",
    description:
      "The Repository pattern, introduced by Martin Fowler in Patterns of Enterprise Application Architecture (2003), sits between the domain model and the data mapping layer. Domain objects interact with a repository interface as if it were an in-memory collection — they call save(), findById(), or delete() without knowing whether data is stored in Postgres, MongoDB, Redis, or anywhere else.\n\nThe interface lives in the domain layer. Concrete implementations (e.g. PgUserRepository) live in an adapters or infrastructure layer. Swapping the database requires writing a new adapter, not touching business logic.\n\nThis boundary also makes testing clean: replace the Postgres adapter with an InMemoryRepository in tests — no database, no slow I/O, full coverage of business logic.",
    whyItMatters:
      "SQL queries scattered through business logic are the leading cause of software that's hard to test, change, and reason about. A repository interface provides a clean seam between your domain and your database.",
    whenToUse: [
      "Any application with a meaningful domain model and persistence",
      "When you want to unit-test business logic without a database",
      "When you anticipate switching or abstracting the storage backend",
      "Paired with Clean Architecture, Hexagonal Architecture, or DDD",
    ],
    whenNotToUse: [
      "Simple CRUD apps with no real business logic — direct ORM calls are fine",
      "Scripts or one-off tools where the overhead isn't worth it",
    ],
    tradeoffs: [
      { pro: "Business logic is fully testable without a real database", con: "Extra abstraction layer adds boilerplate, especially for simple queries" },
      { pro: "Storage technology can be swapped transparently", con: "Complex queries (joins, aggregations) feel awkward behind a collection interface" },
      { pro: "Clear boundary between domain and infrastructure", con: "ORM-specific features (lazy loading, change tracking) may need workarounds" },
    ],
    realWorld: [
      { company: "Spring Framework", usage: "Spring Data auto-generates repository implementations from interface definitions" },
      { company: "Laravel", usage: "Repository pattern commonly layered over Eloquent ORM in large Laravel apps" },
      { company: "ASP.NET Core", usage: "EF Core DbContext is itself a repository/unit-of-work; custom repos add domain abstraction" },
    ],
    related: ["clean-architecture", "dependency-injection", "hexagonal-architecture", "ddd"],
    tags: ["fowler", "data-access", "interface", "testability", "persistence"],
    implemented: false,
  },
  {
    slug: "dependency-injection",
    name: "Dependency Injection",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "design-patterns",
    popularity: 5,
    year: 2004,
    summary:
      "Supply a component's dependencies from the outside rather than letting it construct them — so implementations can be swapped without changing the component.",
    description:
      "Dependency Injection (DI) is the practice of passing a component's collaborators to it (via constructor, method, or property) rather than letting it instantiate them with new or static calls. Martin Fowler named the pattern in 2004, building on the earlier Inversion of Control (IoC) principle.\n\nIn constructor injection — the preferred form — all required dependencies are declared in the constructor signature. A caller (or a DI container) provides them. The component only knows about the interface, not the concrete class.\n\nDI containers (Spring, Angular's injector, NestJS, ASP.NET DI) automate the wiring: you register bindings (interface → class) once, and the container resolves the full dependency graph on demand. Go and Rust typically use manual constructor injection — simpler and just as effective.",
    whyItMatters:
      "Without DI, components are tightly coupled to their collaborators. Changing an email provider, database, or third-party API requires modifying the component. With DI, you swap the implementation without touching the component — and unit tests inject mocks for complete isolation.",
    whenToUse: [
      "Any class with external collaborators (databases, email, APIs, services)",
      "When unit testing requires replacing real collaborators with test doubles",
      "Medium-to-large codebases where wiring is too complex to manage manually",
      "Frameworks like Spring, NestJS, Angular already expect it",
    ],
    whenNotToUse: [
      "Simple scripts or small utilities with no meaningful collaborators",
      "When DI container overhead is a concern (some embedded or real-time systems)",
    ],
    tradeoffs: [
      { pro: "Collaborators are swappable — easy testing with mocks", con: "DI containers add indirection that can make code harder to trace" },
      { pro: "Explicit dependencies improve readability and design", con: "Constructor bloat when a class has many dependencies (signals it needs splitting)" },
      { pro: "Loose coupling enables parallel development and modularity", con: "Misconfigured bindings fail at runtime (compile-time DI frameworks mitigate this)" },
    ],
    realWorld: [
      { company: "Spring / Spring Boot", usage: "Entire Java/Kotlin enterprise ecosystem built on DI — @Autowired, @Bean, ApplicationContext" },
      { company: "Angular", usage: "Hierarchical DI injector is core to how Angular components and services are composed" },
      { company: "NestJS", usage: "TypeScript DI container modelled after Angular; all providers are injected via decorators" },
    ],
    related: ["repository-pattern", "hexagonal-architecture", "clean-architecture", "strategy-pattern"],
    tags: ["ioc", "constructor-injection", "inversion-of-control", "testability", "loose-coupling"],
    implemented: false,
  },
  {
    slug: "hexagonal-architecture",
    name: "Hexagonal Architecture",
    category: "architecture",
    complexity: "intermediate",
    level: "code",
    group: "design-patterns",
    popularity: 4,
    year: 2005,
    summary:
      "Place the domain at the centre and connect all I/O (HTTP, database, messaging) through explicit ports and adapters — so the core is framework-free and infinitely testable.",
    description:
      "Hexagonal Architecture (also called Ports & Adapters) was defined by Alistair Cockburn in 2005. The core idea: your application has an inside (the domain) and an outside (everything else). The two communicate exclusively through ports — interfaces owned by the domain — and adapters that implement those interfaces.\n\nPorts come in two flavours. Driving ports (input/left side) define how the outside world calls into the domain — e.g. PlaceOrderUseCase. An HTTP controller is a driving adapter: it translates HTTP to a command and calls the port. Driven ports (output/right side) define what the domain needs from the outside — e.g. OrderRepository. A Postgres repository is a driven adapter: it implements the port.\n\nBecause the domain owns the port interfaces and knows nothing about HTTP, SQL, or message queues, you can swap any adapter — REST for gRPC, Postgres for DynamoDB — by writing a new adapter class. Tests drive the domain directly through its ports, with in-memory driven adapters, no framework or database required.",
    whyItMatters:
      "Frameworks and databases age faster than business logic. Hexagonal Architecture ensures your domain — where real value lives — stays clean and portable as technology changes around it.",
    whenToUse: [
      "Long-lived applications where technology choices may evolve",
      "Teams that want exhaustive domain testing without infrastructure setup",
      "Systems that need multiple delivery mechanisms (HTTP, CLI, gRPC, queues)",
      "When practising DDD — ports align naturally with domain service boundaries",
    ],
    whenNotToUse: [
      "Simple CRUD services with no real domain logic — pure overhead",
      "Short-lived scripts or MVPs where speed of delivery trumps structure",
    ],
    tradeoffs: [
      { pro: "Domain is 100% framework-free — test without running a server or DB", con: "Port/adapter abstraction doubles the number of files for each I/O boundary" },
      { pro: "Adapters are interchangeable — swap delivery or persistence transparently", con: "Requires discipline; teams without experience can create wrong-level abstractions" },
      { pro: "Multiple delivery mechanisms (HTTP + CLI + gRPC) with one domain", con: "Higher initial complexity vs a simple layered approach" },
    ],
    realWorld: [
      { company: "Netflix", usage: "Recommendation domain isolated behind ports; multiple delivery adapters serve different clients" },
      { company: "Axon Framework", usage: "Java CQRS/ES framework built on hexagonal principles — ports for commands, queries, and events" },
      { company: "Growing Django apps", usage: "Clean Architecture / hexagonal layering increasingly adopted to escape Django ORM lock-in" },
    ],
    related: ["clean-architecture", "repository-pattern", "dependency-injection", "ddd"],
    tags: ["ports-and-adapters", "cockburn", "domain-isolation", "testability", "adapters"],
    implemented: false,
  },
  {
    slug: "strategy-pattern",
    name: "Strategy Pattern",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "design-patterns",
    popularity: 4,
    year: 1994,
    summary:
      "Define a family of interchangeable algorithms behind a common interface so the calling context can swap them at runtime without changing its own code.",
    description:
      "The Strategy pattern, one of the 23 GoF design patterns (1994), solves a common problem: a context needs to perform a task in multiple ways, and which way to use should be a runtime decision. Without Strategy, this leads to large if/else or switch chains that grow every time a new variant is needed.\n\nThe solution: extract each algorithm variant into its own class implementing a common interface (the strategy interface). The context stores a reference to a strategy and delegates the work to it. At runtime, the caller sets the strategy based on whatever condition applies.\n\nIn Go, strategies are idiomatically expressed as function types — no interface struct needed. In Rust, trait objects (Box<dyn Strategy>) or enums provide similar flexibility. The key benefit in all languages: adding a new variant means writing a new class/impl, not modifying the context.",
    whyItMatters:
      "Long if/else chains conditioned on type or mode are a classic maintainability problem — every new variant requires touching existing code, risking regression. Strategy gives each variant its own isolated, testable unit.",
    whenToUse: [
      "Multiple algorithms for the same task (sort, price, ship, compress, validate)",
      "Algorithm selection needs to happen at runtime based on context",
      "When you want to eliminate conditionals that grow with each new variant",
      "When variants need to be independently testable",
    ],
    whenNotToUse: [
      "Only one algorithm exists and no variation is anticipated",
      "The number of strategies is small, fixed, and never changes — a simple conditional is clearer",
    ],
    tradeoffs: [
      { pro: "Adding a new variant requires no changes to existing code", con: "Small number of strategies can over-engineer what a simple conditional handles fine" },
      { pro: "Each strategy is independently testable in isolation", con: "Clients must know which strategies exist to select one" },
      { pro: "Open/Closed Principle — context is open for extension via new strategies", con: "Strategy proliferation: many small single-method classes can be hard to navigate" },
    ],
    realWorld: [
      { company: "Java Collections", usage: "Comparator<T> is the canonical strategy interface — pass any comparison logic to sort()" },
      { company: "Stripe", usage: "Payment method handlers (card, SEPA, PayPal) implement a common charge interface" },
      { company: "AWS S3", usage: "Encryption strategies (AES256, aws:kms) are selectable per-object at write time" },
    ],
    related: ["dependency-injection", "observer-pattern", "clean-architecture"],
    tags: ["gof", "algorithm", "interchangeable", "open-closed", "runtime-selection"],
    implemented: false,
  },
  {
    slug: "observer-pattern",
    name: "Observer Pattern",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "design-patterns",
    popularity: 5,
    year: 1994,
    summary:
      "Let a subject notify a dynamic list of dependents automatically when its state changes — without the subject knowing who is listening.",
    description:
      "The Observer pattern (GoF, 1994) defines a one-to-many dependency: when a subject's state changes, all registered observers are notified automatically. The subject holds a list of observers and calls a notification method on each. Observers register and unregister at runtime — the subject never imports or references concrete observer classes.\n\nThis is the code-level foundation of reactive and event-driven programming. Modern frameworks implement it everywhere: DOM event listeners, React's useState notifications, RxJS Observable, Node.js EventEmitter, and Kafka consumer groups are all variations of this pattern.\n\nUsed at the code level, Observer is the right tool when a domain event (order placed, user registered) needs to trigger multiple reactions (send email, update inventory, track analytics) without coupling the triggering code to the reactions.",
    whyItMatters:
      "Adding a new reaction to a domain event (e.g. adding analytics tracking when an order is placed) should not require editing the order service. Observer makes the subject open/closed: new observers can be registered at startup without modifying the subject.",
    whenToUse: [
      "A state change in one object needs to trigger side effects in others",
      "The set of reactions is open — new ones may be added without changing the subject",
      "Domain events (order placed, user signed up, payment failed) driving multiple side effects",
      "GUI event handling, reactive data flows, domain event publishing",
    ],
    whenNotToUse: [
      "When the dependency chain is fixed and simple — a direct call is clearer",
      "Memory leak risk: observers that are not explicitly unsubscribed hold strong references",
      "Deep observer chains make execution flow hard to trace",
    ],
    tradeoffs: [
      { pro: "New reactions can be added without modifying the subject", con: "Execution order of observers is non-deterministic and hard to reason about" },
      { pro: "Subject is decoupled from concrete observer implementations", con: "Forgetting to unsubscribe causes memory leaks (especially in long-lived objects)" },
      { pro: "Foundation for event-driven architectures at every scale", con: "Cascading updates through observer chains can cause unexpected side effects" },
    ],
    realWorld: [
      { company: "React", usage: "useState / useEffect are the framework's observer mechanism — components re-render on state change" },
      { company: "RxJS / Angular", usage: "Observable.subscribe() is textbook Observer — streams of events, multiple independent subscribers" },
      { company: "Node.js", usage: "EventEmitter.on() / emit() — the Observer pattern baked into Node's core APIs" },
    ],
    related: ["strategy-pattern", "event-driven", "event-sourcing"],
    tags: ["gof", "event", "subscribe", "reactive", "eventlistener", "eventemitter"],
    implemented: false,
  },
  // ──────────────────────────────────────────────────────────────────────
  // CODE-LEVEL FUNDAMENTALS
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "encapsulation",
    name: "Encapsulation",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "oop",
    popularity: 5,
    year: 1967,
    summary: "Bundle an object's data and the methods that operate on it into a single unit, and hide internal state behind a public interface.",
    description: "Encapsulation is one of the four pillars of object-oriented programming, first introduced in Simula (1967). It has two parts: bundling (keeping related data and behaviour in one place) and access control (deciding what the outside world can see and change).\n\nIn practice, fields are marked private or unexported, and the class exposes only what callers need through a deliberately designed public API. Callers interact with the interface — they never directly read or write internal state.\n\nThis boundary lets you change the internal implementation (swap a list for a hash map, add validation, change the storage format) without breaking any caller. It also prevents invalid state: a BankAccount that exposes its balance field can have it set to -∞ from anywhere; one that hides it behind deposit() and withdraw() can enforce invariants in a single place.",
    whyItMatters: "When internal state is publicly writable, every caller becomes a potential source of corruption. Encapsulation concentrates validation and invariant enforcement in one place — the class itself — making bugs easier to find and fix.",
    whenToUse: [
      "Any object that has state that must stay internally consistent",
      "When you want to change the internal representation without breaking callers",
      "When validation or business rules govern how state can change",
      "Effectively always — encapsulation is not optional in well-designed OO code",
    ],
    whenNotToUse: [
      "Plain data transfer objects (DTOs) with no behaviour can expose public fields",
      "Value objects with all-immutable fields need no access control",
    ],
    tradeoffs: [
      { pro: "Internal representation can change without breaking callers", con: "Extra boilerplate — getters/setters for every field can feel verbose" },
      { pro: "Invariants are enforced in one place", con: "Anemic models (data bags with no methods) suggest encapsulation was applied incorrectly" },
      { pro: "Reduces surface area for bugs — fewer ways to produce invalid state", con: "Over-encapsulation hides necessary information and forces awkward workarounds" },
    ],
    realWorld: [
      { company: "Java / Kotlin", usage: "private fields + public getters/setters is idiomatic — IDEs generate them automatically" },
      { company: "Rust", usage: "Fields are private by default — pub must be explicit; the module system enforces encapsulation at compile time" },
      { company: "Go", usage: "Unexported (lowercase) fields are package-private — the standard library uses this pervasively (sync.Mutex, http.Client)" },
    ],
    related: ["abstraction", "interface-contract", "single-responsibility", "composition-over-inheritance"],
    tags: ["oop", "access-control", "information-hiding", "invariants", "private"],
    implemented: false,
  },
  {
    slug: "abstraction",
    name: "Abstraction",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "oop",
    popularity: 4,
    year: 1967,
    summary: "Reduce complexity by modelling only the details that matter for your problem — hide everything else behind a stable interface.",
    description: "Abstraction is the practice of exposing a simplified model of something complex. In OOP, an abstraction defines what an object does without revealing how it does it. The caller only sees the interface — the method names, parameters, and return types — not the implementation behind them.\n\nAbstract classes and interfaces are the main tools. An abstract Logger says 'I can log messages'; a ConsoleLogger or FileLogger fills in the how. The caller depends on the Logger abstraction and never knows (or needs to know) which concrete implementation is running.\n\nAbstraction is not just a code technique — it's a thinking tool. Good abstractions model your domain at the right level of detail, making code read like the problem domain, not like implementation mechanics.",
    whyItMatters: "Without abstraction, callers are coupled to implementation details. Change the implementation and every caller breaks. A well-chosen abstraction lets the implementation change freely — and lets callers be written and understood in terms of the problem, not the solution.",
    whenToUse: [
      "When multiple concrete implementations share the same concept (Logger, Cache, Repository)",
      "When you want callers to be independent of implementation details",
      "Modelling domain concepts — name things after what they are, not how they're stored",
      "When testability matters — abstractions make mocking and test doubles natural",
    ],
    whenNotToUse: [
      "Premature abstraction before you have two concrete cases — YAGNI applies",
      "Leaky abstractions that expose implementation details negate the benefit",
    ],
    tradeoffs: [
      { pro: "Callers are decoupled from implementation — swapping is safe", con: "Wrong abstraction is worse than no abstraction — it misleads future developers" },
      { pro: "Code reads at domain level, not implementation level", con: "Indirection makes tracing execution harder" },
      { pro: "Enables mocking and testing without real infrastructure", con: "Too many thin abstractions add noise without adding value" },
    ],
    realWorld: [
      { company: "Node.js streams", usage: "Readable and Writable abstract over files, HTTP, sockets, and in-memory buffers behind a common interface" },
      { company: "AWS SDK", usage: "S3Client abstracts over HTTP multipart uploads, retries, and signing — callers just call putObject()" },
      { company: "React", usage: "Component abstracts over DOM manipulation — render() describes what, React handles how" },
    ],
    related: ["encapsulation", "interface-contract", "dependency-inversion", "hexagonal-architecture"],
    tags: ["oop", "interface", "information-hiding", "modelling", "indirection"],
    implemented: false,
  },
  {
    slug: "polymorphism",
    name: "Polymorphism",
    category: "architecture",
    complexity: "intermediate",
    level: "code",
    group: "oop",
    popularity: 4,
    year: 1967,
    summary: "Allow different types to be used interchangeably through a shared interface — so the calling code doesn't need to know which concrete type it's working with.",
    description: "Polymorphism (Greek: 'many forms') lets a single piece of code work with many different types, as long as they implement the expected interface. The two main forms in OOP are:\n\n**Subtype polymorphism (runtime)**: a variable typed as an interface or base class can hold any conforming implementation. The correct method is dispatched at runtime based on the actual type.\n\n**Parametric polymorphism (compile-time / generics)**: a function is written once and works with any type that satisfies a constraint (TypeScript generics, Rust traits, Go type parameters).\n\nPolymorphism is what makes Strategy, Observer, and Dependency Injection work. A PaymentProcessor variable can hold a StripeProcessor or PayPalProcessor — the checkout function doesn't care which. At runtime, the right charge() implementation is called. Adding a new payment method means adding a new class, not changing the checkout code.",
    whyItMatters: "Code that uses concrete types directly must change every time a new variant is added. Code that uses a polymorphic interface stays unchanged — only the implementation list grows. Polymorphism is the runtime expression of the Open/Closed Principle.",
    whenToUse: [
      "Multiple interchangeable implementations of a concept (renderers, payment processors, loggers)",
      "When new variants must be addable without changing existing code",
      "Eliminating type-switch or if/else chains conditioned on type",
      "Plugin architectures and extensibility points",
    ],
    whenNotToUse: [
      "When there is genuinely only one implementation and no extension is planned",
      "Simple data containers with no behaviour don't benefit from polymorphic interfaces",
    ],
    tradeoffs: [
      { pro: "New implementations can be added without changing calling code", con: "Dynamic dispatch has a small runtime cost vs direct method calls" },
      { pro: "Eliminates type-checking conditionals and switch statements", con: "Too many small interfaces add indirection without clarity" },
      { pro: "Enables substitution — the basis of testability via test doubles", con: "Abuse leads to deep hierarchies that are hard to follow" },
    ],
    realWorld: [
      { company: "Java Collections", usage: "List<T> is polymorphic — ArrayList and LinkedList are interchangeable; code written to List works with either" },
      { company: "Go io.Reader/Writer", usage: "Everything that can be read implements io.Reader — files, network connections, in-memory buffers, all interchangeable" },
      { company: "React renderers", usage: "react-dom, react-native, react-three-fiber all implement the same React component interface — same components render everywhere" },
    ],
    related: ["interface-contract", "abstraction", "strategy-pattern", "open-closed"],
    tags: ["oop", "runtime-dispatch", "interface", "generics", "substitution"],
    implemented: false,
  },
  {
    slug: "composition-over-inheritance",
    name: "Composition over Inheritance",
    category: "architecture",
    complexity: "intermediate",
    level: "code",
    group: "oop",
    popularity: 5,
    year: 1994,
    summary: "Build complex behaviour by combining small, focused objects rather than extending a class hierarchy — keeping coupling low and flexibility high.",
    description: "The GoF book (1994) coined the phrase 'favor object composition over class inheritance' after observing that deep inheritance hierarchies are one of the most common sources of fragile code.\n\nInheritance (IS-A) creates a compile-time dependency between a subclass and its parent. Any change to the base class — a new field, a changed method signature, altered behaviour — ripples to every subclass. The Fragile Base Class problem is real: a 'harmless' parent change can silently break subtypes.\n\nComposition (HAS-A) avoids this by assembling behaviour from injected collaborators. A Duck doesn't extend Animal and FlyingThing — it holds a MoveBehavior and a FlyBehavior. Behaviours are interfaces; concrete classes are injected. Swapping the fly behaviour at runtime doesn't require a new subclass.\n\nInheritance is still appropriate for true IS-A relationships with stable base classes. The advice is to reach for composition *first*, and only use inheritance when the hierarchy is genuinely stable and the IS-A relationship is real.",
    whyItMatters: "Inheritance couples a subclass to its parent's internals. As hierarchies deepen, they become rigid — changing anything near the root breaks the tree. Composition keeps each piece independent and replaceable, making systems easier to test and evolve.",
    whenToUse: [
      "When behaviour needs to vary at runtime (inject different strategies)",
      "When base classes are unstable or owned by a third party",
      "Mixing several unrelated capabilities into one class",
      "Prefer composition by default — use inheritance only when you have a genuine IS-A relationship",
    ],
    whenNotToUse: [
      "Framework classes that explicitly define an extension point (React.Component, JUnit test cases)",
      "True IS-A hierarchies with stable, well-understood base classes",
    ],
    tradeoffs: [
      { pro: "Behaviours are independently replaceable and testable", con: "More wiring code — you must assemble the collaborators explicitly" },
      { pro: "No fragile base class problem — changes stay local", con: "Too many tiny collaborators can scatter logic across many files" },
      { pro: "Enables runtime behaviour changes without new subclasses", con: "Interface explosion if every behaviour gets its own interface prematurely" },
    ],
    realWorld: [
      { company: "React (hooks)", usage: "Hooks replaced class inheritance for shared logic — compose useState, useEffect, custom hooks instead of extending Component" },
      { company: "Go (embedding)", usage: "Go has no inheritance; struct embedding plus interface composition is the idiomatic way to reuse and extend behaviour" },
      { company: "Rust (traits)", usage: "Traits composed on structs — no class hierarchy; multiple traits mix freely without diamond-inheritance problems" },
    ],
    related: ["interface-contract", "strategy-pattern", "dependency-injection", "liskov-substitution"],
    tags: ["oop", "gof", "has-a", "is-a", "fragile-base-class", "flexibility"],
    implemented: false,
  },
  {
    slug: "interface-contract",
    name: "Interface / Contract",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "oop",
    popularity: 5,
    year: 1995,
    summary: "Define what a component must do without dictating how it does it — so implementations can vary freely while callers remain stable.",
    description: "An interface (also called a contract or protocol) is a named set of method signatures. Any type that provides those methods satisfies the interface — it 'implements' the contract. The caller depends only on the interface, not on any concrete class.\n\nThis separation of 'what' from 'how' is the foundation of most software design principles. Dependency Injection works by injecting an interface. The Repository pattern exposes an interface. Hexagonal Architecture communicates through ports, which are interfaces. SOLID's Dependency Inversion Principle says high-level modules should depend on interfaces, not implementations.\n\nInterfaces are a coordination primitive: a team can agree on an interface and implement it independently (database adapter, HTTP handler, ML model) — integration works as long as both sides honour the contract. Interfaces also make testing natural: swap the real implementation for a test double that implements the same interface.",
    whyItMatters: "Code that depends on concrete classes is fragile — any change to that class ripples to all callers. Code that depends on an interface is stable — it keeps working as long as any conforming implementation exists, regardless of how many times the implementation changes internally.",
    whenToUse: [
      "Any time you want the ability to swap implementations (production vs test, v1 vs v2)",
      "Defining seams between teams or modules",
      "Third-party integrations (payment, email, storage) — hide behind an interface",
      "Effectively always — if a component has collaborators, those should be interfaces",
    ],
    whenNotToUse: [
      "Interfaces with a single implementation that will never vary add indirection for no benefit",
      "Interfaces that leak implementation details (ISP violation) are harmful, not helpful",
    ],
    tradeoffs: [
      { pro: "Caller and implementation can evolve independently", con: "Single-implementation interfaces add files and indirection with no benefit" },
      { pro: "Testing is natural — implement a test double in seconds", con: "Interfaces must be designed carefully — wrong abstraction is costly to change" },
      { pro: "Multiple implementations can coexist and be selected at runtime", con: "Interface discovery is harder in large codebases without good tooling" },
    ],
    realWorld: [
      { company: "Go standard library", usage: "io.Reader, io.Writer, http.Handler — tiny focused interfaces that compose the entire ecosystem" },
      { company: "Java/Spring", usage: "Repository<T>, Service, Component — every Spring bean is accessed through an interface in well-designed apps" },
      { company: "Rust traits", usage: "Display, Iterator, From, Into — the standard library is built on trait contracts; your types plug in by implementing them" },
    ],
    related: ["abstraction", "dependency-inversion", "dependency-injection", "interface-segregation"],
    tags: ["oop", "contract", "protocol", "loose-coupling", "testability", "seam"],
    implemented: false,
  },
  {
    slug: "single-responsibility",
    name: "Single Responsibility Principle",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "solid",
    popularity: 5,
    year: 1999,
    summary: "A class should have only one reason to change — keep each unit focused on a single job so unrelated concerns don't accidentally break each other.",
    description: "The Single Responsibility Principle (SRP) is the 'S' in SOLID, articulated by Robert C. Martin in 1999. It states that a module or class should have one, and only one, reason to change. 'Reason to change' maps to 'a stakeholder or a concern' — if two different actors or concerns could require changes to the same class, that class has two responsibilities.\n\nThe canonical violation: an OrderService that places orders, sends emails, and generates PDF invoices. Three reasons to change — every feature request from the email team, the PDF team, or the order team touches the same file, causing merge conflicts and unintended regressions.\n\nSRP is about cohesion: grouping things that change together, and separating things that change for different reasons. A class that does too much is a symptom of missing domain concepts — each missing concept is a new class waiting to be extracted.",
    whyItMatters: "Classes with multiple responsibilities become magnets for unrelated change. Every new feature from every stakeholder lands in the same file. SRP keeps classes small, focused, and stable — a change to email sending cannot break order logic if they live in separate classes.",
    whenToUse: [
      "Always — apply SRP to every class, module, and function",
      "When a class is growing too large or has too many imports",
      "When merge conflicts repeatedly happen in the same file",
      "When testing a class requires setting up unrelated infrastructure",
    ],
    whenNotToUse: [
      "Over-splitting can create too many tiny classes that are hard to navigate — use judgment",
      "In scripts and small utilities where a single file is genuinely simpler",
    ],
    tradeoffs: [
      { pro: "Changes to one concern cannot break other concerns", con: "More classes means more files to navigate and more wiring" },
      { pro: "Classes are smaller and easier to understand and test", con: "Finding which class owns a piece of logic requires knowledge of the system" },
      { pro: "Reduces merge conflicts in team settings", con: "Premature decomposition before concerns are understood wastes time" },
    ],
    realWorld: [
      { company: "Rails / ActiveRecord", usage: "Fat model / skinny controller antipattern — ActiveRecord models accumulate too many responsibilities; service objects extract them" },
      { company: "Spring Boot", usage: "@Service, @Repository, @Controller annotations enforce SRP by role — each layer has one job" },
      { company: "Unix philosophy", usage: "'Do one thing and do it well' — each Unix tool has one responsibility; pipes compose them" },
    ],
    related: ["open-closed", "interface-segregation", "hexagonal-architecture", "clean-architecture"],
    tags: ["solid", "martin", "cohesion", "separation-of-concerns", "clean-code"],
    implemented: false,
  },
  {
    slug: "open-closed",
    name: "Open/Closed Principle",
    category: "architecture",
    complexity: "intermediate",
    level: "code",
    group: "solid",
    popularity: 4,
    year: 1988,
    summary: "Software entities should be open for extension but closed for modification — add new behaviour by writing new code, not by changing existing code.",
    description: "The Open/Closed Principle (OCP) was formulated by Bertrand Meyer in 1988 and popularised by Robert C. Martin as part of SOLID. A module is 'open' when you can add new behaviour to it; it is 'closed' when existing callers are not broken by that addition.\n\nThe implementation technique is abstraction: instead of a class knowing the concrete details of all its variants, it depends on an interface. New variants are new classes that implement the interface — no existing class is touched.\n\nA classic example: a DiscountCalculator with a switch statement over discount types. Every new type requires editing the switch. With OCP, DiscountStrategy is an interface; each discount is a class. Adding a new discount is adding a new file — the calculator is untouched and its tests still pass.\n\nOCP is particularly powerful in plugin architectures, where third parties can extend behaviour without having access to (or being able to modify) the core.",
    whyItMatters: "Every time you modify an existing class to add a new variant, you risk breaking existing behaviour. OCP lets you extend the system by addition — safer, and it keeps existing tests green.",
    whenToUse: [
      "When a class has a growing switch/if-else over types or variants",
      "Plugin architectures where third parties extend behaviour",
      "When you want to add new variants without running existing test suites again",
      "Frameworks and libraries — callers extend by subclassing or implementing interfaces",
    ],
    whenNotToUse: [
      "Premature abstraction before you have two real variants — YAGNI applies",
      "Not all variation is OCP-worthy — sometimes an if statement is the right answer",
    ],
    tradeoffs: [
      { pro: "New variants are addable without touching existing, tested code", con: "Requires upfront design — the right abstraction must be chosen before extensions arrive" },
      { pro: "Reduces regression risk — closed modules don't need retesting for new extensions", con: "Too many extension points create 'shotgun surgery' when the interface itself needs changing" },
      { pro: "Natural fit for plugin and extension architectures", con: "Over-engineering risk — not every class needs to be extensible" },
    ],
    realWorld: [
      { company: "VS Code", usage: "Extension API — VS Code's core is closed; extensions add language support, themes, debuggers without modifying the editor" },
      { company: "Jest", usage: "Custom matchers and reporters extend Jest without forking it — open for extension, closed for modification" },
      { company: "Spring", usage: "BeanPostProcessor, ApplicationListener — the container is extensible without requiring source changes" },
    ],
    related: ["strategy-pattern", "polymorphism", "interface-contract", "liskov-substitution"],
    tags: ["solid", "meyer", "extension", "abstraction", "plugin"],
    implemented: false,
  },
  {
    slug: "liskov-substitution",
    name: "Liskov Substitution Principle",
    category: "architecture",
    complexity: "intermediate",
    level: "code",
    group: "solid",
    popularity: 4,
    year: 1987,
    summary: "A subtype must be fully substitutable for its parent — code that works with the base type must work correctly with any derived type, without surprises.",
    description: "Barbara Liskov introduced this principle in a 1987 conference keynote. Formally: if S is a subtype of T, then objects of type T may be replaced with objects of type S without altering any of the desirable properties of the program.\n\nIn practice: a subclass must honour the behavioural contract of its parent. It can't throw exceptions the parent doesn't throw, can't have weaker preconditions than the parent requires, and can't have stronger postconditions than the parent guarantees.\n\nThe classic violation is the Square/Rectangle problem. Mathematically, a square IS-A rectangle. But if Rectangle has setWidth and setHeight, and Square overrides both to always set both dimensions equally, then code that creates a Rectangle and changes only the width gets a wrong area calculation — LSP is violated.\n\nLSP applies to interfaces too, not just inheritance. Any implementation of an interface must behave as callers expect from the contract — not just satisfy the method signatures.",
    whyItMatters: "Violated LSP means you can't trust polymorphism. If some subclasses work but others silently behave differently, you're forced to add type checks — which defeats the purpose of polymorphism and introduces the bugs OCP was meant to prevent.",
    whenToUse: [
      "Whenever you use inheritance or implement an interface",
      "When writing a new implementation of an existing interface",
      "When overriding methods in a subclass",
      "When designing abstract base classes for others to extend",
    ],
    whenNotToUse: [
      "LSP is not optional — it's a correctness property, not a preference",
      "If you can't satisfy LSP, prefer composition over inheritance",
    ],
    tradeoffs: [
      { pro: "Polymorphism is trustworthy — any implementation can be substituted safely", con: "Some mathematical IS-A relationships (Square/Rectangle) can't be modelled with correct inheritance" },
      { pro: "Eliminates defensive type-checks in calling code", con: "Designing correct base class contracts upfront is hard — requires anticipating all subtype needs" },
      { pro: "Makes interfaces robust against new implementations", con: "Violations are often subtle and only caught through careful testing" },
    ],
    realWorld: [
      { company: "Java Collections", usage: "Any List<T> implementation (ArrayList, LinkedList, CopyOnWriteArrayList) is substitutable — collections code never checks the concrete type" },
      { company: "Rust trait objects", usage: "Trait objects (Box<dyn Trait>) rely on LSP — any type implementing the trait can be used in place of any other" },
      { company: "HTTP clients", usage: "A mock HTTP client used in tests must satisfy the same contract as the real one — same status codes, same error types" },
    ],
    related: ["polymorphism", "interface-contract", "composition-over-inheritance", "open-closed"],
    tags: ["solid", "liskov", "substitution", "inheritance", "contract", "behavioural-subtyping"],
    implemented: false,
  },
  {
    slug: "interface-segregation",
    name: "Interface Segregation Principle",
    category: "architecture",
    complexity: "intermediate",
    level: "code",
    group: "solid",
    popularity: 3,
    year: 1994,
    summary: "Prefer many small, focused interfaces over one large general-purpose one — clients should not be forced to depend on methods they don't use.",
    description: "The Interface Segregation Principle (ISP), part of SOLID (Robert C. Martin, 1994), says that no client should be forced to depend on methods it does not use. Fat interfaces force implementors to stub out methods that don't apply to them — a sign the interface models the wrong abstraction.\n\nThe canonical violation: a Worker interface with work(), eat(), and sleep(). A Robot implements Worker but must throw NotImplemented on eat() and sleep() — methods that make no sense for it.\n\nThe fix: split into Workable, Feedable, and Restable. Human implements all three. Robot implements only Workable. No stubs, no surprises.\n\nISP also applies to clients: if a caller only needs read operations, it shouldn't depend on an interface that also declares write operations — because any change to the write signature forces a recompile/retest of the reader.\n\nSmall interfaces are easier to implement, easier to mock in tests, and easier to compose. They also age better: adding a method to a small, focused interface affects fewer implementors.",
    whyItMatters: "Fat interfaces create unnecessary coupling. Classes implementing methods they don't use, test doubles mocking operations they'll never call, and callers recompiling because an unrelated method changed — all signs of ISP violation.",
    whenToUse: [
      "When an interface has methods that some implementors must stub with NotImplemented",
      "When a client imports an interface but only uses two of its ten methods",
      "When splitting an interface would let different teams evolve their parts independently",
      "When designing public library APIs — lean interfaces are more stable",
    ],
    whenNotToUse: [
      "Over-segregation creates too many tiny interfaces that must be composed manually",
      "A cohesive group of methods that always travel together belongs in one interface",
    ],
    tradeoffs: [
      { pro: "Clients depend only on what they use — changes elsewhere don't affect them", con: "Too many fine-grained interfaces become hard to discover and compose" },
      { pro: "Implementors only implement what's relevant — no forced stubs", con: "Splitting existing interfaces is a breaking change for existing implementors" },
      { pro: "Interfaces are more stable — a method change affects fewer clients", con: "Finding the right granularity requires domain knowledge and experience" },
    ],
    realWorld: [
      { company: "Go standard library", usage: "io.Reader (one method), io.Writer (one method), io.ReadWriter (both) — compose interfaces rather than one large one" },
      { company: "Spring Data", usage: "CrudRepository, PagingAndSortingRepository, JpaRepository — progressively richer interfaces; use the smallest that fits" },
      { company: "React hooks", usage: "useState, useEffect, useRef — each hook is a tiny, focused 'interface' to a single React capability" },
    ],
    related: ["interface-contract", "single-responsibility", "dependency-inversion", "abstraction"],
    tags: ["solid", "martin", "fat-interface", "role-interface", "granularity"],
    implemented: false,
  },
  {
    slug: "dependency-inversion",
    name: "Dependency Inversion Principle",
    category: "architecture",
    complexity: "intermediate",
    level: "code",
    group: "solid",
    popularity: 4,
    year: 1994,
    summary: "High-level modules should not depend on low-level modules — both should depend on abstractions, inverting the conventional dependency direction.",
    description: "The Dependency Inversion Principle (DIP) is the 'D' in SOLID (Robert C. Martin, 1994). It has two statements: (1) high-level modules should not depend on low-level modules — both should depend on abstractions; (2) abstractions should not depend on details — details should depend on abstractions.\n\nIn a conventional layered design, the OrderService (high-level) depends on PostgresDatabase (low-level) directly. If the database changes, the service must change. DIP inverts this: define an OrderRepository interface, have the service depend on the interface, and have PostgresDatabase implement it. Now the high-level module owns the interface — the low-level module depends on the high-level abstraction, not the other way around.\n\nThis is the principle that underlies Dependency Injection, Hexagonal Architecture, and the Repository pattern. DIP is about ownership of the abstraction: the interface belongs to the high-level policy layer, not the low-level detail layer.",
    whyItMatters: "High-level business logic is the most valuable code in a system. When it directly imports low-level infrastructure (databases, HTTP clients, email providers), it becomes fragile and hard to test. DIP keeps the valuable code stable by letting infrastructure adapt to it, not the other way around.",
    whenToUse: [
      "Any time a high-level module interacts with infrastructure (database, email, API, queue)",
      "When you want to unit-test business logic without spinning up infrastructure",
      "When the infrastructure provider might change (moving from AWS to GCP, MySQL to Postgres)",
      "In combination with DI containers that resolve abstractions to implementations",
    ],
    whenNotToUse: [
      "Low-level utility code (parsers, formatters) where no abstraction is needed",
      "When the dependency is stable and will never change (standard library functions)",
    ],
    tradeoffs: [
      { pro: "High-level policy is decoupled from low-level details — each changes independently", con: "Requires defining and maintaining interfaces — more files, more surface area" },
      { pro: "Business logic can be tested without real infrastructure", con: "Misapplied DIP adds interfaces where none are needed, increasing complexity" },
      { pro: "Infrastructure can be replaced transparently", con: "Requires a wiring layer (DI container or manual factory) to connect abstractions to implementations" },
    ],
    realWorld: [
      { company: "Spring Framework", usage: "Every Spring bean is accessed through an interface; the container inverts control and resolves dependencies at startup" },
      { company: "NestJS", usage: "Providers registered by interface token — @Inject() receives an abstraction; the module wires the concrete class" },
      { company: "Clean Architecture apps", usage: "Use case layer defines port interfaces; infrastructure layer implements them — dependency arrows always point inward" },
    ],
    related: ["dependency-injection", "interface-contract", "interface-segregation", "hexagonal-architecture"],
    tags: ["solid", "martin", "inversion-of-control", "abstraction", "decoupling"],
    implemented: false,
  },
  {
    slug: "pure-functions",
    name: "Pure Functions",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "functional",
    popularity: 4,
    year: 1958,
    summary: "A pure function always produces the same output for the same input and causes no side effects — making it predictable, testable, and safe to run anywhere.",
    description: "A pure function has two properties: (1) determinism — given the same inputs, it always returns the same output; (2) no side effects — it doesn't mutate external state, write to disk, call an API, log to the console, or interact with anything outside its own scope.\n\nThe concept originates from mathematical functions and lambda calculus (Alonzo Church, 1936), and became a programming primitive with Lisp (1958). Languages like Haskell enforce purity at the type level; others leave it as a discipline.\n\nPure functions are the backbone of functional programming but are broadly useful in any paradigm. A codebase where business logic is composed of pure functions is dramatically easier to test (no setup, no mocks, just input/output assertions), reason about (no hidden state), parallelize (no shared mutable state), and cache (same input = same output = safe to memoize).\n\nThe practical discipline: push side effects (database writes, API calls, logging) to the edges of your system. Keep the core logic pure.",
    whyItMatters: "Impure functions are hard to test (require setting up external state), hard to parallelize (share mutable state), and hard to reason about (output depends on invisible global state). Pure functions eliminate all three problems.",
    whenToUse: [
      "Business rule calculations, transformations, validations — keep these pure",
      "Data pipeline stages — each step is a pure transformation",
      "Anywhere the logic needs to be unit-tested without mocks",
      "Computations that benefit from memoization or caching",
    ],
    whenNotToUse: [
      "I/O is inherently impure — database reads, HTTP calls, logging cannot be pure",
      "Some operations require mutation for performance (in-place sort on large data)",
    ],
    tradeoffs: [
      { pro: "Trivially testable — no setup, no mocks, just call the function", con: "Real systems need side effects — purity must be architected in, not assumed" },
      { pro: "Safe to parallelize — no shared mutable state", con: "Threading purity through a framework designed around mutations (ActiveRecord, ORM) requires discipline" },
      { pro: "Referentially transparent — safe to memoize, cache, or inline", con: "Performance-critical code sometimes needs in-place mutation that breaks purity" },
    ],
    realWorld: [
      { company: "Redux", usage: "Reducers must be pure functions: (state, action) => newState. This makes time-travel debugging and hot-reload possible" },
      { company: "React", usage: "Functional components and hooks — same props = same output. React's concurrent renderer relies on this property" },
      { company: "Apache Spark", usage: "RDD transformations (map, filter, reduce) are pure — the engine can parallelize and recover them safely" },
    ],
    related: ["immutability", "higher-order-functions", "separation-of-concerns", "single-responsibility"],
    tags: ["functional", "determinism", "side-effects", "testability", "referential-transparency"],
    implemented: false,
  },
  {
    slug: "immutability",
    name: "Immutability",
    category: "architecture",
    complexity: "intermediate",
    level: "code",
    group: "functional",
    popularity: 4,
    year: 1958,
    summary: "Never modify existing data — create a new value instead. Immutable data is safe to share, easy to reason about, and eliminates a whole class of mutation bugs.",
    description: "An immutable value, once created, cannot change. Instead of mutating an object in place, you produce a new object with the desired changes. The original remains intact.\n\nImmutability eliminates shared-state bugs. When multiple threads or components hold a reference to an object, any one of them mutating it creates race conditions, stale views, and hard-to-reproduce bugs. With immutable data, sharing is safe by definition — no one can corrupt the value you hold.\n\nImmutability also makes change tracking trivial: if an object is different from a previous version, it's a different reference. React's performance optimisation (shallow equality checks), Redux's state diffing, and Git's object model all rely on this property.\n\nLanguages handle immutability differently: Rust makes ownership and immutability the default; Haskell enforces it everywhere; JavaScript/TypeScript require discipline (const, Object.freeze, Immer, readonly types). Go uses value semantics for structs — passing by value copies, so the original is safe.",
    whyItMatters: "Shared mutable state is the root cause of the most painful bugs: race conditions, stale cache values, unexpected side effects. Immutability solves this by making sharing safe — a value that can't change can be referenced from anywhere without coordination.",
    whenToUse: [
      "Domain model values that should not change (Money, DateRange, Address)",
      "Data shared across threads, goroutines, or async tasks",
      "Event sourcing and audit logs — events must never be modified",
      "React state, Redux store — immutable updates enable efficient diffing",
    ],
    whenNotToUse: [
      "Hot performance-critical paths where copying is the bottleneck (low-level game loops, number-crunching)",
      "Large data structures where copying is prohibitively expensive (use persistent data structures instead)",
    ],
    tradeoffs: [
      { pro: "Sharing is always safe — no coordination required", con: "Creating new objects on every change has a GC and memory cost" },
      { pro: "Change is explicit — you know when and where new values are created", con: "Updating deeply nested structures is verbose without helper libraries (Immer, Lens)" },
      { pro: "Enables cheap equality checks by reference", con: "Requires discipline in languages that don't enforce it (JS, Go, Python)" },
    ],
    realWorld: [
      { company: "Redux", usage: "Reducers return new state — never mutate the previous state. Enables time-travel debugging and DevTools replay" },
      { company: "Kafka", usage: "Log records are immutable — once appended, never changed. Consumers replay from any offset safely" },
      { company: "Git", usage: "Every commit, tree, and blob is an immutable content-addressed object. History is append-only and tamper-evident" },
    ],
    related: ["pure-functions", "higher-order-functions", "event-sourcing", "observer-pattern"],
    tags: ["functional", "value-objects", "thread-safety", "copy-on-write", "persistent-data-structures"],
    implemented: false,
  },
  {
    slug: "higher-order-functions",
    name: "Higher-Order Functions",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "functional",
    popularity: 4,
    year: 1958,
    summary: "Functions that accept other functions as arguments or return them — enabling composable, reusable abstractions without classes or inheritance.",
    description: "A higher-order function (HOF) is a function that does at least one of: takes one or more functions as arguments; returns a function as its result. The concept comes from mathematics (functors, combinators) and entered programming with Lisp (1958).\n\nThe canonical HOFs are map, filter, and reduce — they abstract over looping and let you express transformations declaratively. Instead of a for loop that iterates, checks a condition, and accumulates a result, you compose map(transform).filter(predicate).reduce(combine).\n\nHOFs also enable partial application and currying: a function that takes some arguments and returns a new function waiting for the rest. This produces reusable, composable building blocks — a logger that pre-captures the context, a validator that pre-captures the rules, a fetch that pre-captures the base URL.\n\nIn TypeScript, Go, and Rust, functions are first-class values — they can be stored in variables, passed as arguments, and returned. This is all HOFs require. No classes needed.",
    whyItMatters: "HOFs eliminate repetition at the logic level, not just the data level. Instead of copying a loop pattern three times with different bodies, you write one function and pass the varying behaviour as a parameter. The result is more expressive, shorter, and easier to test.",
    whenToUse: [
      "Data transformations (map, filter, reduce) over collections",
      "Middleware pipelines (HTTP, Redux, Express) — each step is a function",
      "Decorator / wrapping pattern — add logging, caching, retry by wrapping a function",
      "Partial application to create specialised versions of a general function",
    ],
    whenNotToUse: [
      "When the function being passed is very complex — a named class method may be more readable",
      "Deep nesting of HOFs becomes harder to debug than an equivalent imperative loop",
    ],
    tradeoffs: [
      { pro: "Eliminate boilerplate loops — express intent, not mechanics", con: "Deeply chained HOFs can be hard to debug (no named variables at each step)" },
      { pro: "Composable building blocks — combine small functions into complex pipelines", con: "Performance cost of creating many closure objects in tight loops" },
      { pro: "Functions become data — storable, passable, configurable", con: "Stack traces through HOFs and closures are harder to read" },
    ],
    realWorld: [
      { company: "React", usage: "Higher-order components (HOC) — wrap a component and return an enhanced component. Custom hooks are HOFs that return reactive values" },
      { company: "Express / Koa", usage: "Middleware is a HOF — each layer takes (req, res, next) and returns nothing, but wraps the next layer" },
      { company: "RxJS", usage: "Operators (map, filter, mergeMap, debounceTime) are HOFs over Observables — compose entire async pipelines from small functions" },
    ],
    related: ["pure-functions", "immutability", "strategy-pattern", "observer-pattern"],
    tags: ["functional", "map", "filter", "reduce", "closure", "composition", "first-class-functions"],
    implemented: false,
  },
  {
    slug: "dry-principle",
    name: "DRY — Don't Repeat Yourself",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "general",
    popularity: 5,
    year: 1999,
    summary: "Every piece of knowledge should have a single, authoritative representation — duplication forces you to keep multiple copies in sync, and they inevitably drift.",
    description: "DRY was articulated by Andrew Hunt and David Thomas in The Pragmatic Programmer (1999): 'Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.'\n\nNote what DRY is about: knowledge, not code. Two similar-looking for loops that happen to count to 10 are not a DRY violation — they represent different knowledge. Two places that encode 'a valid email must contain @' are a DRY violation — they represent the same knowledge in two places.\n\nWhen knowledge is duplicated, any change requires finding and updating all copies. Bugs happen when you find two but miss the third. Tests pass for the copy you fixed but fail against the copy you missed.\n\nDRY violations to watch: copy-pasted validation logic, magic numbers repeated across files, the same data transformation written slightly differently in three places, SQL queries that express the same business rule.\n\nDRY does not mean 'never write two functions that look similar'. It means: if two pieces of code represent the same concept, they should share a single representation.",
    whyItMatters: "Duplicated knowledge leads to inconsistency. When the rule changes — and it will — you must change every copy and hope you found them all. A single authoritative source means changing the rule once changes it everywhere.",
    whenToUse: [
      "Validation rules, business constants, calculation formulas — one place only",
      "Shared data transformations used across multiple modules",
      "Configuration values referenced in multiple places (use a constant)",
      "Any time you find yourself copying code and thinking 'I'll keep these in sync'",
    ],
    whenNotToUse: [
      "Don't DRY across wrong abstraction boundaries — coupling unrelated modules to share code is worse than duplication",
      "The 'rule of three': wait until something is duplicated three times before extracting it",
      "Test code often benefits from duplication — clear and explicit tests are better than DRY test helpers",
    ],
    tradeoffs: [
      { pro: "Change the rule once — it propagates everywhere automatically", con: "Wrong extraction couples unrelated things — coupling is often worse than duplication" },
      { pro: "Bugs fixed in the shared function are fixed everywhere", con: "Shared abstractions can become complex trying to serve too many callers" },
      { pro: "Consistent behaviour across all call sites", con: "Over-DRY can create premature abstractions that are expensive to change later" },
    ],
    realWorld: [
      { company: "Any ORM", usage: "Schema defined once (model/migration) — ORM generates queries, validations, and serialisation from the single source of truth" },
      { company: "GraphQL", usage: "Schema is the single authoritative definition of the API — codegen produces TypeScript types, resolvers, and docs from one spec" },
      { company: "Terraform modules", usage: "Infrastructure patterns defined once as modules — teams instantiate them rather than copy-paste IaC blocks" },
    ],
    related: ["separation-of-concerns", "single-responsibility", "abstraction", "kiss-principle"],
    tags: ["general", "pragmatic-programmer", "duplication", "knowledge", "maintainability"],
    implemented: false,
  },
  {
    slug: "kiss-principle",
    name: "KISS — Keep It Simple",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "general",
    popularity: 5,
    year: 1960,
    summary: "Most systems work best when kept as simple as possible — choose the straightforward solution over the clever one, and add complexity only when the problem demands it.",
    description: "KISS ('Keep It Simple, Stupid') originated in the US Navy in the early 1960s as a design principle for systems that field engineers could repair under pressure with minimal tools. Kelly Johnson, the Lockheed Skunk Works engineer, made this a guiding philosophy: design for the real constraints of the people who use it, not for the ideal conditions of the designer.\n\nIn software, KISS is a counter to the natural tendency of developers to over-engineer. The clever recursive solution, the generic framework with twelve extension points, the beautifully abstract system designed for hypothetical future requirements — these are KISS violations when a simpler solution would work.\n\nSimplicity has a cost up front (resisting the urge to abstract, suppressing the 'what if' instinct) and a compounding payoff: simple code is easier to read, debug, test, and modify. Complex code is harder to do all of those, and that cost compounds every time someone touches it.\n\nKISS doesn't mean write naive code — it means choose the simplest design that correctly solves the actual problem.",
    whyItMatters: "Complexity is the enemy of reliability and maintainability. Every additional abstraction, indirection, and moving part is a place where bugs can hide and a place that must be understood before the code can be changed. Simpler code has fewer of both.",
    whenToUse: [
      "Always start with the simplest solution that works",
      "When you notice you're designing for hypothetical future requirements",
      "When a code review reveals that understanding the code requires extensive context",
      "When debugging a system — if the fix requires adding more complexity, reconsider the design",
    ],
    whenNotToUse: [
      "Don't conflate 'simple' with 'naive' — a correct distributed consensus algorithm is necessarily complex",
      "Some domains (cryptography, networking protocols) have inherent complexity that can't be wished away",
    ],
    tradeoffs: [
      { pro: "Simple code is fast to read, understand, modify, and debug", con: "Resisting abstraction requires experience and discipline — it's psychologically hard" },
      { pro: "Fewer moving parts means fewer bugs and easier testing", con: "Oversimplification can mean revisiting the design when real complexity arrives" },
      { pro: "New developers onboard faster into simple codebases", con: "Simple today might not handle scale tomorrow — evaluate the actual growth trajectory" },
    ],
    realWorld: [
      { company: "SQLite", usage: "Single file, no server, no configuration — the simplest possible relational database, used in billions of devices" },
      { company: "Go language design", usage: "Go deliberately omits generics (originally), inheritance, and many OOP features — simplicity over expressiveness" },
      { company: "Unix tools", usage: "cat, grep, sort — each does one simple thing; complexity comes from composing them, not from each tool" },
    ],
    related: ["yagni-principle", "dry-principle", "single-responsibility", "separation-of-concerns"],
    tags: ["general", "simplicity", "over-engineering", "pragmatic", "design-philosophy"],
    implemented: false,
  },
  {
    slug: "yagni-principle",
    name: "YAGNI — You Aren't Gonna Need It",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "general",
    popularity: 4,
    year: 1999,
    summary: "Don't implement something until you actually need it — speculative features add complexity today and may never deliver value.",
    description: "YAGNI is an Extreme Programming (XP) principle, coined by Ron Jeffries around 1999. The rule: don't add functionality until it is genuinely needed for a current requirement.\n\nThe temptation to violate YAGNI is strong and feels responsible: 'I'll add a plugin system now so we're ready when we need it', 'I'll make this configurable so any team can use it', 'I'll build the abstraction now before the second use case arrives'. These all seem like good engineering. They are, in fact, speculation — you're paying a real cost today (complexity, maintenance, documentation, testing) for a hypothetical future benefit.\n\nThe problem is that the future rarely looks like you predicted. The plugin system you built handles the wrong plugin model. The configurability makes the simple case harder. The abstraction has the wrong seams for the second use case that actually arrives.\n\nXP's answer: build exactly what the current user story needs. When the second use case arrives, refactor with full knowledge of both. The result is almost always a better abstraction than the one guessed in advance — and you only pay for it when you actually need it.",
    whyItMatters: "Unused functionality is not free — it must be maintained, documented, and understood by every developer who reads the code. Speculative generality makes current code harder and provides value that may never arrive.",
    whenToUse: [
      "Any time you hear yourself say 'we might need this later'",
      "When adding configuration options that no current feature requires",
      "When building extension points before there are extensions to extend",
      "When writing code to handle edge cases that don't yet exist in production",
    ],
    whenNotToUse: [
      "Security, compliance, and privacy — design these in from the start, never retrofit",
      "Infrastructure decisions that are very expensive to change later (database choice, wire protocol)",
      "Accessibility — it's much harder to add later than to design in from day one",
    ],
    tradeoffs: [
      { pro: "Less code to write, maintain, and understand today", con: "Sometimes the cost of retrofitting really is higher than building it upfront" },
      { pro: "Abstractions built when both use cases exist are almost always better", con: "Requires trust that refactoring is cheap — only true with good tests and team discipline" },
      { pro: "Avoids dead code that clutters the codebase indefinitely", con: "Can be used to justify technical debt — 'we'll add error handling when we need it'" },
    ],
    realWorld: [
      { company: "Basecamp / DHH", usage: "37signals actively practices YAGNI — features are built for current customers, not hypothetical ones" },
      { company: "GitHub (early)", usage: "GitHub launched with no enterprise features — added them as actual enterprise customers arrived with actual requirements" },
      { company: "SQLite", usage: "No network server, no user authentication — YAGNI-driven design; use cases that need those features use a different database" },
    ],
    related: ["kiss-principle", "dry-principle", "open-closed", "separation-of-concerns"],
    tags: ["general", "xp", "extreme-programming", "speculative-generality", "simplicity"],
    implemented: false,
  },
  {
    slug: "separation-of-concerns",
    name: "Separation of Concerns",
    category: "architecture",
    complexity: "beginner",
    level: "code",
    group: "general",
    popularity: 5,
    year: 1974,
    summary: "Divide a program into distinct sections where each section addresses one concern — so changes to one area don't ripple unexpectedly into unrelated areas.",
    description: "Edsger Dijkstra coined 'Separation of Concerns' in his 1974 paper 'On the role of scientific thought'. He observed that human intellectual ability is limited — the only way to tackle complex problems is to focus on one aspect at a time, keeping other aspects 'from interfering with full attention'.\n\nIn software, a 'concern' is any dimension of a system that can be independently reasoned about: data access, business logic, presentation, authentication, logging, error handling. When multiple concerns are mixed in one module, changes to one concern disturb the others.\n\nSoC is the motivation behind nearly every major architectural pattern. Layered Architecture separates presentation from logic from persistence. MVC separates models, views, and controllers. Clean Architecture and Hexagonal Architecture separate domain from infrastructure. CSS separates style from HTML structure.\n\nAt the code level, SoC manifests in small decisions: don't embed SQL in your business logic; don't put formatting code inside your calculation function; don't handle authentication inside your order processing handler.",
    whyItMatters: "Mixed concerns create tight coupling. A change to database schema propagates into business logic. A UI redesign requires touching data access code. SoC creates boundaries that let each concern change independently — and makes it possible to understand, test, and replace any concern in isolation.",
    whenToUse: [
      "Always — SoC is a foundational principle, not an advanced technique",
      "When you find yourself putting 'just a little bit' of SQL in your service layer",
      "When UI code starts to contain business rules",
      "When authentication, logging, or caching logic is repeated throughout business code",
    ],
    whenNotToUse: [
      "Don't create so many layers that simple operations require touching dozens of files",
      "In tiny scripts, strict separation adds overhead with no benefit",
    ],
    tradeoffs: [
      { pro: "Each concern can be changed, tested, and understood independently", con: "Too many layers add indirection — simple operations span many files" },
      { pro: "Teams can own specific concerns without stepping on each other", con: "Identifying the right concerns requires domain understanding — wrong cuts create leaky boundaries" },
      { pro: "Enables specialisation — frontend, backend, data engineers each own their concern", con: "Cross-cutting concerns (logging, auth, transactions) resist clean separation" },
    ],
    realWorld: [
      { company: "MVC frameworks (Rails, Django, Laravel)", usage: "Models handle data, views handle presentation, controllers handle orchestration — three concerns, three directories" },
      { company: "CSS / HTML / JS", usage: "Structure (HTML), style (CSS), behaviour (JS) are three concerns intentionally separated in web development" },
      { company: "AWS IAM", usage: "Authentication (who you are) and authorisation (what you can do) are separate concerns with separate APIs and policies" },
    ],
    related: ["single-responsibility", "dry-principle", "layered-architecture", "hexagonal-architecture"],
    tags: ["general", "dijkstra", "modularity", "coupling", "cohesion", "layers"],
    implemented: false,
  },
  // ──────────────────────────────────────────────────────────────────────
  // CLOUD
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "cloud-native",
    name: "Cloud-Native Architecture",
    category: "cloud",
    complexity: "advanced",
    level: "infrastructure",
    popularity: 5,
    year: 2015,
    summary:
      "Design applications specifically to exploit cloud capabilities: elasticity, managed services, and pay-per-use scaling.",
    description:
      "Cloud-native is a set of principles for building applications that fully leverage cloud platforms. The CNCF defines it around: microservices, containers, dynamic orchestration, and declarative APIs.\n\nCloud-native apps are designed to be: observable (metrics, logs, traces built-in), resilient (designed for failure), elastic (scale to zero or thousands), and automated (CI/CD, infrastructure as code).\n\nThe 12-Factor App methodology provides concrete practices: one codebase, explicit dependencies, config from environment, stateless processes, disposability, and dev/prod parity.",
    whyItMatters:
      "Traditional apps designed for static infrastructure waste cloud economics. Cloud-native design enables auto-scaling, zero-downtime deployments, and significant cost reduction through elasticity.",
    whenToUse: [
      "Any new application designed for cloud deployment",
      "Migrations where re-architecting is feasible ('re-architect' vs 'lift and shift')",
    ],
    whenNotToUse: [
      "Applications that can't be containerised or have hard OS dependencies",
      "Lift-and-shift migrations with zero refactoring budget",
    ],
    tradeoffs: [
      { pro: "Full cloud economics: pay only for what you use", con: "Vendor lock-in risk with managed services" },
      { pro: "Built-in scalability and resilience", con: "Requires significant cultural and process changes" },
    ],
    realWorld: [
      { company: "Netflix", usage: "Pioneered cloud-native on AWS; Chaos Engineering tests resilience at scale" },
      { company: "Spotify", usage: "Fully cloud-native on GCP; serverless + Kubernetes for all workloads" },
    ],
    related: ["containers", "kubernetes", "serverless", "microservices"],
    tags: ["12-factor", "cncf", "elastic", "managed-services", "iac"],
    implemented: false,
  },
  {
    slug: "serverless",
    name: "Serverless Architecture",
    category: "cloud",
    complexity: "intermediate",
    level: "infrastructure",
    popularity: 4,
    year: 2014,
    summary:
      "Execute functions in response to events without managing servers — the platform handles scaling, patching, and availability.",
    description:
      "Serverless (Functions-as-a-Service / FaaS) lets developers deploy individual functions that are invoked by events (HTTP requests, queue messages, timers). AWS Lambda, Azure Functions, and Google Cloud Functions are the main providers.\n\nThe platform handles all infrastructure: spinning up containers on demand, scaling to zero when idle, and scaling to thousands of instances under load.\n\nBeyond FaaS, 'serverless' encompasses managed services (DynamoDB, S3, Firestore) where infrastructure management is fully abstracted.",
    whyItMatters:
      "Serverless eliminates server management overhead entirely and offers true pay-per-invocation pricing. For event-driven workloads, it's often 10x cheaper and faster to deploy than equivalent container-based infrastructure.",
    whenToUse: [
      "Event-driven processing: image resizing, webhooks, scheduled jobs",
      "Highly variable traffic where scale-to-zero saves cost",
      "Teams wanting to focus entirely on business logic",
    ],
    whenNotToUse: [
      "Long-running processes (functions have execution time limits)",
      "Workloads requiring persistent connections (WebSocket servers)",
      "When cold-start latency is unacceptable",
    ],
    tradeoffs: [
      { pro: "Zero server management, automatic scaling", con: "Cold starts add latency for the first request" },
      { pro: "True pay-per-invocation — scale to zero", con: "Vendor lock-in for function runtime and triggers" },
      { pro: "Fast deployment — push function code, done", con: "Stateless by design — external storage required for state" },
    ],
    realWorld: [
      { company: "Coca-Cola", usage: "Vending machine telemetry processed via AWS Lambda — 65% cost reduction" },
      { company: "iRobot", usage: "Roomba telemetry pipeline on Lambda processing millions of events/day" },
    ],
    related: ["cloud-native", "event-driven", "api-gateway"],
    tags: ["lambda", "faas", "azure-functions", "cloud-run", "scale-to-zero"],
    implemented: false,
  },
  {
    slug: "multi-cloud",
    name: "Multi-Cloud Strategy",
    category: "cloud",
    complexity: "advanced",
    level: "infrastructure",
    popularity: 3,
    year: 2018,
    summary:
      "Distribute workloads across multiple cloud providers to avoid vendor lock-in and improve resilience.",
    description:
      "Multi-cloud strategy involves using two or more cloud providers (AWS, Azure, GCP) for different workloads or as failover. Motivations include: avoiding vendor lock-in, regulatory requirements for data residency, leveraging best-in-class services from each provider, and negotiating leverage.\n\nImplementation patterns: Active-Active (traffic split across providers), Active-Passive (failover), and Workload-Specific (e.g. ML on GCP, data warehousing on Snowflake, primary on AWS).\n\nAbstraction layers like Kubernetes, Terraform, and service meshes reduce provider-specific coupling.",
    whyItMatters:
      "Cloud outages affect even the largest providers. Multi-cloud provides resilience guarantees that no single provider can match, and prevents strategic dependency on a single vendor.",
    whenToUse: [
      "Enterprise with regulatory or data-sovereignty requirements",
      "Workloads where a single cloud outage is unacceptable",
      "Best-of-breed service selection across providers",
    ],
    whenNotToUse: [
      "Early-stage companies — operational complexity far outweighs benefits",
      "Small teams without dedicated cloud engineers",
    ],
    tradeoffs: [
      { pro: "Resilience against single-provider outages", con: "Significantly higher operational complexity" },
      { pro: "Negotiation leverage with cloud providers", con: "Cannot use provider-specific services without coupling risk" },
    ],
    realWorld: [
      { company: "Dropbox", usage: "Primary on AWS with secondary DR on GCP for certain workloads" },
      { company: "Spotify", usage: "Primary GCP + Azure for specific data processing workloads" },
    ],
    related: ["cloud-native", "kubernetes", "containers"],
    tags: ["vendor-lock-in", "resilience", "aws", "gcp", "azure", "terraform"],
    implemented: false,
  },
  // ──────────────────────────────────────────────────────────────────────
  // NETWORKING
  // ──────────────────────────────────────────────────────────────────────
  {
    slug: "osi-model",
    name: "OSI Model",
    category: "networking",
    complexity: "beginner",
    level: "network",
    popularity: 5,
    year: 1984,
    summary:
      "Seven-layer conceptual model for how network communication is structured — from physical bits to application data.",
    description:
      "The Open Systems Interconnection (OSI) model provides a universal framework for how data travels across a network. Each layer adds headers/trailers (encapsulation) on the way down and strips them (decapsulation) on the way up.\n\nLayer 1 (Physical): bits on the wire.\nLayer 2 (Data Link): frames between nodes on the same network — MAC addresses.\nLayer 3 (Network): packets across networks — IP routing.\nLayer 4 (Transport): end-to-end delivery — TCP (reliable) / UDP (fast).\nLayer 5 (Session): session management.\nLayer 6 (Presentation): encoding, encryption, compression.\nLayer 7 (Application): HTTP, DNS, SMTP — what applications speak.\n\nIn practice, TCP/IP collapses OSI into 4 layers.",
    whyItMatters:
      "The OSI model is the shared vocabulary for every networking conversation. Understanding which layer a problem lives on is the first step to diagnosing it.",
    whenToUse: [
      "Diagnosing network issues — identify which layer is failing",
      "Designing network security (firewalls operate at L3/L4, WAFs at L7)",
      "Understanding where load balancers (L4 vs L7) and TLS operate",
    ],
    whenNotToUse: ["The OSI model is a reference model, not an implementation choice"],
    tradeoffs: [
      { pro: "Universal vocabulary for network communication", con: "Real-world TCP/IP doesn't cleanly map to all 7 layers" },
    ],
    realWorld: [
      { company: "Cloudflare", usage: "DDoS mitigation targets L3/L4 (volumetric) and L7 (application) attacks separately" },
      { company: "AWS VPC", usage: "Security Groups (L3/L4) and WAF (L7) map directly to OSI layers" },
    ],
    related: ["load-balancing", "cdn", "dns"],
    tags: ["tcp-ip", "network-layers", "encapsulation", "iso"],
    implemented: false,
  },
  {
    slug: "cdn",
    name: "CDN Architecture",
    category: "networking",
    complexity: "intermediate",
    level: "network",
    popularity: 5,
    year: 1998,
    summary:
      "Serve content from edge nodes geographically close to users, drastically reducing latency and origin load.",
    description:
      "A Content Delivery Network (CDN) is a globally distributed network of proxy servers (Points of Presence / PoPs) that cache and serve content closer to end users.\n\nWhen a user requests an asset, DNS routes them to the nearest PoP. If the PoP has it cached (cache HIT), it's served immediately with sub-millisecond latency. On a cache MISS, the PoP fetches from the origin, caches it, and serves it.\n\nModern CDNs (Cloudflare, Fastly, CloudFront) go beyond static assets: edge computing (Cloudflare Workers, Lambda@Edge) runs code at the PoP; dynamic acceleration optimises routing for non-cacheable requests; anycast routing distributes load globally.",
    whyItMatters:
      "Network latency is proportional to physical distance. CDNs collapse this distance for users worldwide, improving load times and absorbing traffic spikes that would overwhelm origin servers.",
    whenToUse: [
      "Any public web application with global users",
      "Static assets (JS, CSS, images, video)",
      "API responses that can be cached even briefly",
      "DDoS mitigation via edge absorption",
    ],
    whenNotToUse: [
      "Highly personalised or real-time data that can never be cached",
      "Internal applications with users only in one region",
    ],
    tradeoffs: [
      { pro: "Dramatic latency reduction for global users", con: "Cache invalidation is complex — stale content risks" },
      { pro: "Absorbs traffic spikes at the edge", con: "Costs scale with bandwidth egress" },
    ],
    realWorld: [
      { company: "Cloudflare", usage: "330+ PoPs serving 20%+ of all web traffic" },
      { company: "Netflix", usage: "Open Connect CDN delivers 99%+ of streaming traffic from ISP-embedded appliances" },
    ],
    related: ["load-balancing", "dns", "cloud-native"],
    tags: ["edge", "cache", "latency", "pop", "cloudflare", "fastly", "cloudfront"],
    implemented: true,
  },
  {
    slug: "dns",
    name: "DNS Resolution",
    category: "networking",
    complexity: "beginner",
    level: "network",
    popularity: 5,
    year: 1983,
    summary:
      "Translate human-readable domain names into IP addresses via a distributed, hierarchical lookup system.",
    description:
      "The Domain Name System (DNS) is the internet's phone book. When you type 'google.com', a recursive resolver queries a hierarchy of name servers to find the IP address.\n\nResolution path: Recursive Resolver → Root Name Server → TLD Name Server (.com) → Authoritative Name Server → IP address returned → cached for TTL.\n\nKey record types: A (domain → IPv4), AAAA (domain → IPv6), CNAME (alias to another domain), MX (mail exchange), TXT (arbitrary text — SPF, DKIM, domain verification), NS (authoritative name servers), SRV (service discovery).\n\nDNS is leveraged for: load balancing (multiple A records), health-based routing (Route 53 health checks), geo-routing (serving nearest region), and CDN edge selection.",
    whyItMatters:
      "DNS underpins all internet communication. Understanding DNS is essential for diagnosing outages, configuring services, and designing resilient global routing.",
    whenToUse: [
      "Domain configuration for any public service",
      "Global traffic routing and geo-based load balancing",
      "Service discovery in microservices via DNS SRV records",
    ],
    whenNotToUse: ["DNS is infrastructure — you always use it, but don't 'choose' it for a use case"],
    tradeoffs: [
      { pro: "Globally distributed, highly available by design", con: "TTL-based caching causes propagation delays during changes" },
      { pro: "Simple to configure, broadly understood", con: "DNS poisoning / hijacking is a real attack vector" },
    ],
    realWorld: [
      { company: "AWS Route 53", usage: "Health-check-based DNS failover routes traffic away from unhealthy regions" },
      { company: "Cloudflare", usage: "1.1.1.1 resolver processes 1 trillion+ queries/day; fastest resolver globally" },
    ],
    related: ["cdn", "load-balancing", "osi-model"],
    tags: ["a-record", "cname", "ttl", "resolver", "route53", "nameserver"],
    implemented: true,
  },
];

export const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "architecture", label: "Architecture" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "cloud", label: "Cloud" },
  { value: "networking", label: "Networking" },
] as const;

export const CATEGORY_META: Record<string, { color: string; icon: string }> = {
  architecture: { color: "bg-violet-500/15 text-violet-300 border-violet-500/30", icon: "◈" },
  infrastructure: { color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", icon: "⬡" },
  cloud: { color: "bg-sky-500/15 text-sky-300 border-sky-500/30", icon: "☁" },
  networking: { color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: "⟳" },
};

export const COMPLEXITY_META: Record<string, { color: string }> = {
  beginner: { color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  intermediate: { color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  advanced: { color: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export const LEVELS = [
  { value: "code",           label: "Code",           icon: "{ }",  desc: "Inside a codebase — classes, modules, files" },
  { value: "service",        label: "Service",        icon: "[ ]",  desc: "Service boundary — one deployed unit talking to others" },
  { value: "system",         label: "System",         icon: "◎",    desc: "System topology — how multiple services are organised" },
  { value: "infrastructure", label: "Infrastructure", icon: "⬡",    desc: "Deployment platform — Kubernetes, Docker, cloud config" },
  { value: "network",        label: "Network",        icon: "~",    desc: "Network layer — DNS, CDN, load balancers, routing" },
] as const;

export const LEVEL_META: Record<string, { color: string; bg: string; border: string; desc: string }> = {
  code:           { color: "text-amber-300",   bg: "bg-amber-500/10",  border: "border-amber-500/30",   desc: "Inside a single codebase" },
  service:        { color: "text-violet-300",  bg: "bg-violet-500/10", border: "border-violet-500/30",  desc: "At the service boundary" },
  system:         { color: "text-indigo-300",  bg: "bg-indigo-500/10", border: "border-indigo-500/30",  desc: "Across multiple services" },
  infrastructure: { color: "text-cyan-300",    bg: "bg-cyan-500/10",   border: "border-cyan-500/30",    desc: "Deployment platform" },
  network:        { color: "text-emerald-300", bg: "bg-emerald-500/10","border": "border-emerald-500/30","desc": "Network layer" },
};

export const GROUP_META: Record<string, { label: string; description: string }> = {
  "oop":             { label: "OOP Fundamentals",        description: "Core object-oriented concepts every developer must know." },
  "solid":           { label: "SOLID Principles",        description: "Five principles for writing maintainable, extensible OO code." },
  "functional":      { label: "Functional Programming",  description: "Treat computation as evaluation of pure functions and immutable data." },
  "general":         { label: "General Principles",      description: "Universal engineering principles that apply across languages and paradigms." },
  "design-patterns": { label: "Design Patterns",         description: "Reusable solutions to common software design problems." },
};

export const GROUP_ORDER = ["oop", "solid", "functional", "general", "design-patterns"] as const;
