import type { LessonLab } from "@/types/lesson";

export const redisCacheLab: LessonLab = {
  intro:
    "Run Redis on your machine and watch everything from the slides happen for real: cache misses vs hits, TTL expiry, a sorted-set leaderboard, and data surviving a restart. Pick your language — the steps are the same.",
  prerequisites: [
    "Docker Desktop (or Docker Engine + Compose)",
    "Your language toolchain: Node 20+, Go 1.22+, or Python 3.11+",
    "A terminal and ~10 minutes",
  ],
  steps: [
    {
      id: "infra",
      title: "Spin up Redis with Docker",
      description:
        "Create a project folder, drop in this compose file, and start Redis. `--appendonly yes` turns on AOF persistence — we'll prove it works in the last step.",
      shared: {
        files: [
          {
            path: "docker-compose.yml",
            lang: "yaml",
            content: `services:
  redis:
    image: redis:7-alpine
    container_name: redis-lab
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

volumes:
  redis-data:
`,
          },
        ],
        commands: ["mkdir redis-lab && cd redis-lab", "docker compose up -d", "docker exec -it redis-lab redis-cli ping"],
        output: "PONG",
      },
    },
    {
      id: "redis-cli",
      title: "Talk to Redis directly",
      description:
        "Before writing any code, poke Redis with its own CLI — set a key, give it a TTL, and watch it count down. This is the whole mental model in four commands.",
      shared: {
        commands: [
          "docker exec -it redis-lab redis-cli",
          "SET user:42 '{\"name\":\"Ada\"}' EX 30",
          "GET user:42",
          "TTL user:42",
        ],
        output: `OK
"{\\"name\\":\\"Ada\\"}"
(integer) 27   ← seconds left before this key deletes itself`,
      },
    },
    {
      id: "project-setup",
      title: "Set up the project",
      description: "Initialise a project and install the official Redis client.",
      perLang: {
        typescript: {
          commands: ["npm init -y", "npm install redis", "npm install -D tsx"],
        },
        go: {
          commands: ["go mod init redis-lab", "go get github.com/redis/go-redis/v9"],
        },
        python: {
          commands: [
            "python3 -m venv .venv && source .venv/bin/activate",
            "pip install redis",
          ],
        },
      },
    },
    {
      id: "cache-aside",
      title: "Cache-aside: see the miss, feel the hit",
      description:
        "This is the core demo. `slowDbQuery` fakes a 500ms database call. The first read **misses** and pays full price; the next reads **hit** and return in ~1ms. Then the TTL expires and the cycle repeats — exactly the flow from slide 6.",
      perLang: {
        typescript: {
          files: [
            {
              path: "cache-demo.ts",
              lang: "typescript",
              content: `import { createClient } from "redis";

const redis = createClient({ url: "redis://localhost:6379" });

// Pretend this is an expensive SQL query
async function slowDbQuery(userId: string) {
  await new Promise((r) => setTimeout(r, 500));
  return { id: userId, name: "Ada Lovelace", plan: "pro" };
}

async function getUser(userId: string) {
  const key = \`user:\${userId}\`;
  const start = performance.now();

  const cached = await redis.get(key);
  if (cached) {
    console.log(\`HIT  \${key} — \${(performance.now() - start).toFixed(1)}ms\`);
    return JSON.parse(cached);
  }

  const user = await slowDbQuery(userId);
  await redis.set(key, JSON.stringify(user), { EX: 10 }); // TTL: 10s
  console.log(\`MISS \${key} — \${(performance.now() - start).toFixed(1)}ms (cached for 10s)\`);
  return user;
}

async function main() {
  await redis.connect();

  await getUser("42"); // cold — miss
  await getUser("42"); // warm — hit
  await getUser("42"); // warm — hit

  console.log("\\nwaiting 11s for the TTL to expire…");
  await new Promise((r) => setTimeout(r, 11_000));

  await getUser("42"); // expired — miss again

  await redis.quit();
}

main();
`,
            },
          ],
          commands: ["npx tsx cache-demo.ts"],
          output: `MISS user:42 — 503.8ms (cached for 10s)
HIT  user:42 — 1.2ms
HIT  user:42 — 0.6ms

waiting 11s for the TTL to expire…
MISS user:42 — 502.1ms (cached for 10s)`,
        },
        go: {
          files: [
            {
              path: "main.go",
              lang: "go",
              content: `package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type User struct {
	ID   string \`json:"id"\`
	Name string \`json:"name"\`
	Plan string \`json:"plan"\`
}

var rdb = redis.NewClient(&redis.Options{Addr: "localhost:6379"})

// Pretend this is an expensive SQL query
func slowDbQuery(id string) User {
	time.Sleep(500 * time.Millisecond)
	return User{ID: id, Name: "Ada Lovelace", Plan: "pro"}
}

func getUser(ctx context.Context, id string) User {
	key := "user:" + id
	start := time.Now()

	if cached, err := rdb.Get(ctx, key).Result(); err == nil {
		var u User
		json.Unmarshal([]byte(cached), &u)
		fmt.Printf("HIT  %s — %v\\n", key, time.Since(start).Round(time.Millisecond))
		return u
	}

	u := slowDbQuery(id)
	b, _ := json.Marshal(u)
	rdb.Set(ctx, key, b, 10*time.Second) // TTL: 10s
	fmt.Printf("MISS %s — %v (cached for 10s)\\n", key, time.Since(start).Round(time.Millisecond))
	return u
}

func main() {
	ctx := context.Background()

	getUser(ctx, "42") // cold — miss
	getUser(ctx, "42") // warm — hit
	getUser(ctx, "42") // warm — hit

	fmt.Println("\\nwaiting 11s for the TTL to expire…")
	time.Sleep(11 * time.Second)

	getUser(ctx, "42") // expired — miss again
}
`,
            },
          ],
          commands: ["go run main.go"],
          output: `MISS user:42 — 502ms (cached for 10s)
HIT  user:42 — 1ms
HIT  user:42 — 1ms

waiting 11s for the TTL to expire…
MISS user:42 — 503ms (cached for 10s)`,
        },
        python: {
          files: [
            {
              path: "cache_demo.py",
              lang: "python",
              content: `import json
import time

import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)


def slow_db_query(user_id: str) -> dict:
    """Pretend this is an expensive SQL query."""
    time.sleep(0.5)
    return {"id": user_id, "name": "Ada Lovelace", "plan": "pro"}


def get_user(user_id: str) -> dict:
    key = f"user:{user_id}"
    start = time.perf_counter()

    cached = r.get(key)
    if cached:
        ms = (time.perf_counter() - start) * 1000
        print(f"HIT  {key} — {ms:.1f}ms")
        return json.loads(cached)

    user = slow_db_query(user_id)
    r.set(key, json.dumps(user), ex=10)  # TTL: 10s
    ms = (time.perf_counter() - start) * 1000
    print(f"MISS {key} — {ms:.1f}ms (cached for 10s)")
    return user


if __name__ == "__main__":
    get_user("42")  # cold — miss
    get_user("42")  # warm — hit
    get_user("42")  # warm — hit

    print("\\nwaiting 11s for the TTL to expire…")
    time.sleep(11)

    get_user("42")  # expired — miss again
`,
            },
          ],
          commands: ["python cache_demo.py"],
          output: `MISS user:42 — 504.2ms (cached for 10s)
HIT  user:42 — 1.1ms
HIT  user:42 — 0.8ms

waiting 11s for the TTL to expire…
MISS user:42 — 502.7ms (cached for 10s)`,
        },
      },
    },
    {
      id: "leaderboard",
      title: "Sorted sets: a leaderboard in four commands",
      description:
        "Slide 7 said Redis is a **data-structure server** — prove it. A ranked leaderboard with score updates, no SQL, no sorting in your app. `ZINCRBY` is atomic, so concurrent score updates can never race.",
      perLang: {
        typescript: {
          files: [
            {
              path: "leaderboard.ts",
              lang: "typescript",
              content: `import { createClient } from "redis";

const redis = createClient({ url: "redis://localhost:6379" });

async function main() {
  await redis.connect();

  await redis.zAdd("leaderboard", [
    { score: 980,  value: "ada" },
    { score: 1240, value: "grace" },
    { score: 870,  value: "linus" },
    { score: 1500, value: "margaret" },
  ]);

  // ada scores 600 points — atomic, no read-modify-write race
  await redis.zIncrBy("leaderboard", 600, "ada");

  const top3 = await redis.zRangeWithScores("leaderboard", 0, 2, { REV: true });
  console.log("Top 3:");
  top3.forEach((entry, i) =>
    console.log(\`  \${i + 1}. \${entry.value} — \${entry.score}\`)
  );

  await redis.quit();
}

main();
`,
            },
          ],
          commands: ["npx tsx leaderboard.ts"],
          output: `Top 3:
  1. ada — 1580
  2. margaret — 1500
  3. grace — 1240`,
        },
        go: {
          files: [
            {
              path: "leaderboard.go",
              lang: "go",
              content: `//go:build ignore

package main

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

func main() {
	ctx := context.Background()
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	rdb.ZAdd(ctx, "leaderboard",
		redis.Z{Score: 980, Member: "ada"},
		redis.Z{Score: 1240, Member: "grace"},
		redis.Z{Score: 870, Member: "linus"},
		redis.Z{Score: 1500, Member: "margaret"},
	)

	// ada scores 600 points — atomic, no read-modify-write race
	rdb.ZIncrBy(ctx, "leaderboard", 600, "ada")

	top3, _ := rdb.ZRevRangeWithScores(ctx, "leaderboard", 0, 2).Result()
	fmt.Println("Top 3:")
	for i, entry := range top3 {
		fmt.Printf("  %d. %v — %.0f\\n", i+1, entry.Member, entry.Score)
	}
}
`,
            },
          ],
          commands: ["go run leaderboard.go"],
          output: `Top 3:
  1. ada — 1580
  2. margaret — 1500
  3. grace — 1240`,
        },
        python: {
          files: [
            {
              path: "leaderboard.py",
              lang: "python",
              content: `import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

r.zadd("leaderboard", {"ada": 980, "grace": 1240, "linus": 870, "margaret": 1500})

# ada scores 600 points — atomic, no read-modify-write race
r.zincrby("leaderboard", 600, "ada")

top3 = r.zrevrange("leaderboard", 0, 2, withscores=True)
print("Top 3:")
for i, (member, score) in enumerate(top3, start=1):
    print(f"  {i}. {member} — {score:.0f}")
`,
            },
          ],
          commands: ["python leaderboard.py"],
          output: `Top 3:
  1. ada — 1580
  2. margaret — 1500
  3. grace — 1240`,
        },
      },
    },
    {
      id: "persistence",
      title: "Kill it and watch the data survive",
      description:
        "Slide 9 said AOF makes Redis durable — time to prove it. Write a key, restart the container (RAM wiped), and read the key back. Redis replayed its append-only log on boot and rebuilt the state.",
      shared: {
        commands: [
          "docker exec -it redis-lab redis-cli set durable \"i survive restarts\"",
          "docker compose restart redis",
          "docker exec -it redis-lab redis-cli get durable",
        ],
        output: `OK
"i survive restarts"   ← RAM was wiped; AOF replay restored it`,
      },
    },
    {
      id: "cleanup",
      title: "Clean up",
      description: "Stop the container and remove the data volume when you're done.",
      shared: {
        commands: ["docker compose down -v"],
      },
    },
  ],
};
