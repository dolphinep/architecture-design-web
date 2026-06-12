import type { Lesson } from "@/types/lesson";

export const redisCacheLesson: Lesson = {
  slug: "redis-cache",
  title: "Caching & Redis",
  description:
    "What a cache is, where it can live, and why Redis is so fast — data structures, the single-threaded event loop, and how persistence works under the hood.",
  duration: "~8 min",
  level: "beginner",
  tags: ["redis", "cache", "performance", "event-loop", "persistence"],
  slides: [
    {
      id: "the-problem",
      title: "The problem: every read hits the database",
      body: [
        {
          kind: "text",
          text: "Your app is growing. Every page load fires queries at the database — and most of them ask for **the same data, over and over**.",
        },
        {
          kind: "points",
          items: [
            { accent: "cyan", text: "Databases live on **disk** and parse every query — expensive by design" },
            { accent: "amber", text: "Under load, latency climbs from milliseconds to **seconds**" },
            { accent: "red", text: "The kicker: the answer **didn't change** between requests — you paid full price to recompute the same result" },
          ],
        },
      ],
      summary:
        "Without a cache, every request hits the database — repeated identical queries waste resources and melt the DB under load.",
      animation: "db-overload",
    },
    {
      id: "what-is-a-cache",
      title: "What is a cache?",
      body: [
        {
          kind: "text",
          text: "A cache is a small, fast store that keeps copies of frequently-read data **close to where it's needed**. The speed comes from physics:",
        },
        {
          kind: "stats",
          items: [
            { value: "~100 ns", label: "RAM access", accent: "violet" },
            { value: "~150 µs", label: "SSD read", accent: "cyan" },
            { value: "~10 ms", label: "network DB query", accent: "amber" },
          ],
        },
        {
          kind: "text",
          text: "Each layer is roughly **a thousand times slower** than the one above it. The deal: spend some memory to skip the slow path — serve repeated reads from RAM, and only do the expensive work when the answer isn't cached yet.",
        },
      ],
      summary:
        "A cache keeps hot data in RAM. RAM is nanoseconds, disk is microseconds, network is milliseconds — caching skips the slow layers.",
      animation: "speed-compare",
    },
    {
      id: "core-mechanics",
      title: "Hit, miss, TTL — the mechanics in one minute",
      body: [
        {
          kind: "points",
          items: [
            { label: "HIT", accent: "emerald", text: "the key is in the cache → returned **instantly**" },
            { label: "MISS", accent: "red", text: "not there → fetch from the DB, **store it**, return it — the next read hits" },
            { label: "TTL", accent: "amber", text: "every key expires on its own — your **staleness ceiling**" },
            { label: "LRU", accent: "cyan", text: "memory full? evict the **least recently used** key to make room" },
          ],
        },
        {
          kind: "text",
          text: "**Hit ratio** (hits ÷ total reads) is the one metric that tells you if your cache is working. At 95%+, the database barely lifts a finger.",
        },
      ],
      summary:
        "Hit = served from memory, miss = fetch and store. TTL expires stale data, LRU evicts cold data, hit ratio tells you it's working.",
      animation: "hit-miss",
    },
    {
      id: "cache-options",
      title: "Where can a cache live?",
      body: [
        {
          kind: "text",
          text: "Caching isn't one thing — it's **layers**, each trading speed against scope and control:",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "Browser / CDN",
              accent: "amber",
              points: [
                "Closest to the user",
                "**Free** for your servers",
                "Loose control — just HTTP headers",
              ],
            },
            {
              title: "In-process",
              accent: "violet",
              points: [
                "Inside your app — **fastest**",
                "Per-instance only",
                "Dies with the process",
              ],
            },
            {
              title: "Distributed (Redis)",
              accent: "emerald",
              points: [
                "**Shared** by all instances",
                "Survives deploys",
                "Costs a network hop",
              ],
            },
          ],
        },
        {
          kind: "text",
          text: "Real systems stack several layers at once — a CDN in front, a small in-process cache for the hottest keys, Redis for everything shared.",
        },
      ],
      summary:
        "Caches live in layers: browser/CDN (closest to user), in-process (fastest), distributed like Redis (shared). Real systems stack them.",
      animation: "cache-options",
    },
    {
      id: "in-process",
      title: "Option A: in-process cache",
      body: [
        {
          kind: "text",
          text: "The simplest cache is a **bounded map inside your app** — Caffeine in Java, `lru-cache` in Node, a guarded map in Go. No network hop at all.",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "✓ Why it wins",
              accent: "emerald",
              points: [
                "**~100 ns** reads — nothing is faster",
                "Zero infrastructure to run",
                "One dependency and you're done",
              ],
            },
            {
              title: "✗ Why it hurts",
              accent: "red",
              points: [
                "Dies with every **deploy, crash, or restart**",
                "10 instances = **10 separate caches**, each missing independently",
                "Each instance can hold a **different version** of the same data",
              ],
            },
          ],
        },
      ],
      summary:
        "In-process = a bounded LRU map in your app. Fastest possible (~100ns) but per-instance, inconsistent across servers, and lost on restart.",
      animation: "lru",
    },
    {
      id: "distributed",
      title: "Option B: distributed cache — enter Redis",
      body: [
        {
          kind: "text",
          text: "A distributed cache moves the data into **its own server**. Every app instance talks to the same Redis — one miss fills the cache for everyone, and it stays warm through your deploys. The classic read path is **cache-aside**:",
        },
        {
          kind: "flow",
          steps: [
            "App checks Redis for the key",
            "Miss → app queries the **database**",
            "App writes the result to Redis **with a TTL**",
            "Every instance hits from now on",
          ],
        },
        {
          kind: "text",
          text: "The price: a **~1 ms** network hop — still about 10× faster than asking the database.",
        },
      ],
      summary:
        "A distributed cache (Redis) is shared by all instances and survives deploys, at the cost of a ~1ms network hop. Cache-aside is the standard pattern.",
      animation: "cache-aside",
    },
    {
      id: "data-structures",
      title: "Inside Redis: a data-structure server, not a blob store",
      body: [
        {
          kind: "text",
          text: "Most caches store opaque blobs — to change one field you fetch **the whole value**, modify it in your app, and write it all back. Redis understands structure:",
        },
        {
          kind: "points",
          items: [
            { label: "HASH", accent: "violet", text: "object fields — update **one field** in place" },
            { label: "LIST", accent: "cyan", text: "queues and timelines — push and pop from either end" },
            { label: "SET", accent: "amber", text: "unique membership — \"has this user voted?\" in O(1)" },
            { label: "ZSET", accent: "emerald", text: "sorted sets — leaderboards ranked **in memory**" },
          ],
        },
        {
          kind: "text",
          text: "A leaderboard is one `ZADD` to update and one `ZRANGE` for the top 10 — no serialization round-trips, no shipping the whole board over the network.",
        },
      ],
      summary:
        "Redis stores real data structures — hashes, lists, sets, sorted sets — so you compute in-place instead of shipping blobs back and forth.",
      animation: "redis-structures",
    },
    {
      id: "event-loop",
      title: "Inside Redis: one thread, no locks",
      body: [
        {
          kind: "text",
          text: "Multi-threaded systems pay for concurrency with **locks, mutexes, and race conditions**. Redis sidesteps all of it: one thread executes every command.",
        },
        {
          kind: "points",
          items: [
            { label: "epoll", accent: "cyan", text: "**I/O multiplexing**: the single thread asks the OS to watch thousands of sockets and only wakes when one has data" },
            { label: "atomic", accent: "violet", text: "commands run strictly **one at a time** — `INCR` can never race with itself, no locks needed" },
            { label: "fast", accent: "emerald", text: "still **100k+ ops/sec** — in-memory work is so quick the CPU was never the bottleneck" },
          ],
        },
      ],
      summary:
        "Redis runs every command on a single thread using epoll to watch all connections — atomic by design, no locks, still 100k+ ops/sec.",
      animation: "event-loop",
    },
    {
      id: "persistence",
      title: "Inside Redis: surviving a restart",
      body: [
        {
          kind: "text",
          text: "RAM is volatile — pull the plug and everything is gone. Redis offers **two answers**:",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "RDB — snapshots",
              accent: "cyan",
              points: [
                "`fork()` a child process — **copy-on-write** shares memory pages, near-zero cost",
                "Child writes a point-in-time snapshot while the main thread **keeps serving**",
                "Fast restarts — but can lose the last few minutes",
              ],
            },
            {
              title: "AOF — command log",
              accent: "violet",
              points: [
                "Every write command **appended** to a log file",
                "Crash? **Replay the log** to rebuild the exact state",
                "Minimal loss — but files grow larger",
              ],
            },
          ],
        },
        {
          kind: "text",
          text: "Production setups typically run **both**: RDB for fast restarts, AOF for durability.",
        },
      ],
      summary:
        "RDB = fork + copy-on-write snapshots (fast restart, may lose minutes). AOF = replayable command log (minimal loss). Use both in production.",
      animation: "persistence",
    },
    {
      id: "beyond-caching",
      title: "Beyond caching — and the recap",
      body: [
        {
          kind: "text",
          text: "The same architecture that makes Redis a great cache makes it a **Swiss-army knife**:",
        },
        {
          kind: "points",
          items: [
            { label: "PUB/SUB", accent: "violet", text: "message brokering and event streams" },
            { label: "ZSET", accent: "emerald", text: "real-time leaderboards and analytics" },
            { label: "GEO", accent: "cyan", text: "\"drivers near you\" — geospatial queries built in" },
            { label: "INCR", accent: "amber", text: "atomic counters — rate limiting and distributed locks" },
          ],
        },
        {
          kind: "text",
          text: "When **not** to reach for it: data that must never be lost, complex relational queries, or datasets far bigger than RAM. For everything else — cache reads that repeat, layer your caches, and let Redis be the shared layer.",
        },
      ],
      summary:
        "Redis goes beyond caching: message broker, leaderboards, geospatial, rate limiting, locks. Skip it for strong-consistency or bigger-than-RAM data.",
    },
  ],
};
