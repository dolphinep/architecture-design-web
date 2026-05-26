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
