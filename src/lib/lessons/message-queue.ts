import type { Lesson } from "@/types/lesson";
import { messageQueueLab } from "./message-queue-lab";

export const messageQueueLesson: Lesson = {
  slug: "message-queue",
  title: "Message Queues & Kafka",
  description:
    "Why services shouldn't call each other directly — queues, pub/sub, delivery guarantees, and what makes Kafka the backbone of event streaming.",
  duration: "~9 min",
  level: "intermediate",
  tags: ["kafka", "message-queue", "pubsub", "event-streaming", "consumer-groups"],
  lab: messageQueueLab,
  slides: [
    {
      id: "the-problem",
      title: "The problem: your services are holding hands",
      body: [
        {
          kind: "text",
          text: "Checkout calls the email service **directly and synchronously**. That one design decision couples their fates:",
        },
        {
          kind: "points",
          items: [
            { accent: "amber", text: "Email is **slow** → checkout is slow — your revenue path waits on a marketing email" },
            { accent: "red", text: "Email is **down** → checkout is down — a non-critical service kills a critical one" },
            { accent: "cyan", text: "Traffic spikes hit **every service at once** — no buffer anywhere, everything falls together" },
          ],
        },
      ],
      summary:
        "Direct synchronous calls couple services' fates — if the downstream is slow or down, you are too.",
      animation: "sync-coupling",
    },
    {
      id: "what-is-a-queue",
      title: "What is a message queue?",
      body: [
        {
          kind: "text",
          text: "Put a **broker** between the services. The producer drops a message and moves on — ~1ms, done. The consumer picks it up **whenever it's ready**.",
        },
        {
          kind: "points",
          items: [
            { label: "TIME", accent: "violet", text: "consumer can be down, slow, or deployed mid-flight — messages **wait**" },
            { label: "LOAD", accent: "emerald", text: "spikes pile up in the queue, consumers drain at their own pace — the queue is a **shock absorber**" },
            { label: "TECH", accent: "cyan", text: "producer and consumer don't know each other — different languages, teams, deploy schedules" },
          ],
        },
      ],
      summary:
        "A queue decouples producer from consumer in time and load: enqueue in ~1ms and move on; consumers process at their own pace.",
      animation: "queue-buffer",
    },
    {
      id: "queue-vs-pubsub",
      title: "The two patterns: work queue vs pub/sub",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "Work queue",
              accent: "violet",
              points: [
                "Each message → **exactly one** worker",
                "Add workers to **scale throughput**",
                "Use for: jobs, orders, emails, image resizing",
              ],
            },
            {
              title: "Pub/Sub",
              accent: "cyan",
              points: [
                "Each message → **every** subscriber",
                "Add subscribers to **add behaviour**",
                "Use for: events — \"order placed\" → email + analytics + audit all react",
              ],
            },
          ],
        },
        {
          kind: "text",
          text: "These are the only two shapes. Every broker — RabbitMQ, Kafka, SQS, Redis — is some packaging of these two patterns. Keep them straight and everything else makes sense.",
        },
      ],
      summary:
        "Work queue = each message to one worker (distribute load). Pub/sub = each message to all subscribers (broadcast events).",
      animation: "queue-vs-pubsub",
    },
    {
      id: "delivery",
      title: "Delivery guarantees — what happens when things fail?",
      body: [
        {
          kind: "points",
          items: [
            { label: "AT-MOST", accent: "red", text: "fire and forget — fast, but a crash **loses messages**. Fine for metrics, fatal for orders" },
            { label: "AT-LEAST", accent: "emerald", text: "consumer **acks** after processing; no ack → redeliver. Nothing lost, but **duplicates happen** — the practical default" },
            { label: "EXACTLY", accent: "amber", text: "mostly a myth at the transport level — achieved in practice with at-least-once + **idempotent consumers**" },
            { label: "DLQ", accent: "violet", text: "a message that fails repeatedly goes to a **dead-letter queue** for inspection instead of blocking the line" },
          ],
        },
        {
          kind: "text",
          text: "The golden rule: design every consumer to be **idempotent** — processing the same message twice must be safe. Then at-least-once delivery becomes effectively exactly-once.",
        },
      ],
      summary:
        "At-least-once + idempotent consumers is the real-world standard. No ack → redeliver; repeated failures → dead-letter queue.",
      animation: "delivery-guarantees",
    },
    {
      id: "options",
      title: "Your options — and why Kafka won streaming",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "RabbitMQ",
              accent: "amber",
              points: [
                "**Smart broker** — routing, priorities, per-message acks",
                "Low latency, mature, great for **work queues**",
                "Messages deleted once consumed",
              ],
            },
            {
              title: "Kafka",
              accent: "violet",
              points: [
                "A **distributed log**, not a queue",
                "Messages **retained** — replay anytime",
                "Millions of msgs/sec; the event-streaming standard",
              ],
            },
            {
              title: "Cloud queues",
              accent: "cyan",
              points: [
                "SQS, Pub/Sub, Redis Streams",
                "**Zero ops** — nothing to run",
                "The right default for simple needs",
              ],
            },
          ],
        },
        {
          kind: "text",
          text: "Kafka's design is different enough — and dominant enough — that its internals are worth understanding. Let's go inside.",
        },
      ],
      summary:
        "RabbitMQ = smart routing broker for work queues. Kafka = distributed log for event streams at scale. Cloud queues = zero-ops default.",
    },
    {
      id: "kafka-log",
      title: "Inside Kafka: it's just a log",
      body: [
        {
          kind: "text",
          text: "Kafka's core abstraction is embarrassingly simple: a topic is an **append-only log**.",
        },
        {
          kind: "points",
          items: [
            { label: "APPEND", accent: "violet", text: "producers only ever **add to the end** — each message gets a sequential **offset**" },
            { label: "OFFSET", accent: "emerald", text: "each consumer holds its own bookmark — **reading doesn't delete anything**" },
            { label: "RETAIN", accent: "cyan", text: "messages live for a configured time (say, 7 days) regardless of who read them" },
            { label: "REPLAY", accent: "amber", text: "rewind your offset and **reprocess history** — new service? Feed it last month's events" },
          ],
        },
      ],
      summary:
        "A Kafka topic is an append-only log. Consumers track their own offsets, reads don't delete, and rewinding = replaying history.",
      animation: "kafka-log",
    },
    {
      id: "partitions",
      title: "Inside Kafka: partitions — the unit of scale",
      body: [
        {
          kind: "text",
          text: "One log on one machine doesn't scale. So Kafka splits every topic into **partitions** — independent logs spread across brokers.",
        },
        {
          kind: "points",
          items: [
            { label: "KEY", accent: "violet", text: "`hash(key) % partitions` — the same key **always lands in the same partition**" },
            { label: "ORDER", accent: "emerald", text: "guaranteed **within** a partition only — key all of order #42's events the same and they stay in sequence" },
            { label: "SCALE", accent: "cyan", text: "more partitions = more consumers working **in parallel**" },
          ],
        },
        {
          kind: "text",
          text: "Choosing the partition key is the most important Kafka design decision you'll make — it decides both your ordering guarantees and how evenly load spreads.",
        },
      ],
      summary:
        "Partitions are Kafka's scale unit: same key → same partition → ordered. Different partitions process in parallel.",
      animation: "kafka-partitions",
    },
    {
      id: "consumer-groups",
      title: "Inside Kafka: consumer groups — both patterns, one mechanism",
      body: [
        {
          kind: "text",
          text: "Remember the two patterns from slide 3? Kafka delivers **both** with a single concept:",
        },
        {
          kind: "points",
          items: [
            { label: "SAME", accent: "emerald", text: "consumers in the **same group** split the partitions between them — that's a **work queue**" },
            { label: "DIFF", accent: "cyan", text: "every **separate group** gets every message — that's **pub/sub**" },
            { label: "REBAL", accent: "amber", text: "a member crashes? Kafka **rebalances** — its partitions move to the survivors, nothing is lost" },
          ],
        },
        {
          kind: "text",
          text: "So billing runs 3 consumers in group `billing` (sharing the work), while analytics runs its own group and sees the full stream. Neither knows the other exists.",
        },
      ],
      summary:
        "Same group = work-sharing queue. Separate groups = pub/sub broadcast. One mechanism, both patterns, automatic rebalancing.",
      animation: "consumer-groups",
    },
    {
      id: "why-fast",
      title: "Inside Kafka: why it's so fast (on plain disks)",
      body: [
        {
          kind: "points",
          items: [
            { label: "SEQ", accent: "emerald", text: "appends are **sequential disk I/O** — no seeks, which makes spinning disks behave nearly like RAM" },
            { label: "0-COPY", accent: "violet", text: "**sendfile()** moves bytes page-cache → network socket without ever entering the application — the JVM never touches the data" },
            { label: "BATCH", accent: "cyan", text: "producers batch and compress hundreds of messages per request" },
            { label: "REPL", accent: "amber", text: "each partition has a **leader + followers** on other brokers — a broker dies, a follower is promoted, writes continue" },
          ],
        },
        {
          kind: "text",
          text: "No exotic hardware, no in-memory magic — just respecting how disks, kernels, and networks actually work. That's how a handful of brokers move millions of messages per second, durably.",
        },
      ],
      summary:
        "Sequential disk writes, zero-copy reads, batching, and leader/follower replication — millions of msgs/sec on commodity hardware.",
      animation: "kafka-internals",
    },
    {
      id: "when-to-use",
      title: "When to use what — and the recap",
      body: [
        {
          kind: "points",
          items: [
            { label: "KAFKA", accent: "violet", text: "event streams, **replayable history**, multiple independent readers, firehose throughput" },
            { label: "RABBIT", accent: "amber", text: "classic **work queues** with routing rules and per-message low latency" },
            { label: "CLOUD", accent: "cyan", text: "SQS / Pub/Sub when you'd rather **run nothing** — the right call more often than not" },
            { label: "NONE", accent: "red", text: "request/response that needs an answer **now**? Just call the API. A queue only adds latency and ops" },
          ],
        },
        {
          kind: "text",
          text: "The recap: decouple with a broker, know your two patterns, assume at-least-once and make consumers idempotent — and when the data is an **event stream**, Kafka's log + partitions + consumer groups is the architecture that scales.",
        },
      ],
      summary:
        "Kafka for event streams and replay, RabbitMQ for routed work queues, cloud queues for simplicity — and a plain API call when you need an answer now.",
    },
  ],
};
