import type { LessonLab } from "@/types/lesson";

export const messageQueueLab: LessonLab = {
  intro:
    "Run a real Kafka broker and see every concept from the slides: keyed messages landing in partitions, consumer groups splitting work, a second group getting everything (pub/sub), and offset resets replaying history.",
  prerequisites: [
    "Docker Desktop (or Docker Engine + Compose)",
    "Your language toolchain: Node 20+, Go 1.22+, or Python 3.11+",
    "Two terminal windows (the consumer-group demo needs them) and ~15 minutes",
  ],
  steps: [
    {
      id: "infra",
      title: "Spin up Kafka with Docker",
      description:
        "One container, no ZooKeeper — modern Kafka runs in **KRaft** mode and the official image works single-node out of the box.",
      shared: {
        files: [
          {
            path: "docker-compose.yml",
            lang: "yaml",
            content: `services:
  kafka:
    image: apache/kafka:3.9.0
    container_name: kafka-lab
    ports:
      - "9092:9092"
`,
          },
        ],
        commands: [
          "mkdir kafka-lab && cd kafka-lab",
          "docker compose up -d",
          "docker exec -it kafka-lab /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list",
        ],
        output: "(empty list — no topics yet, but the broker answered)",
      },
    },
    {
      id: "topic",
      title: "Create a topic with 3 partitions",
      description:
        "Three partitions so we can see keys route, ordering hold per-partition, and consumer groups split work. Then send a couple of messages straight from the console producer (`key:value` format) and read them back.",
      shared: {
        commands: [
          "docker exec -it kafka-lab /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic orders --partitions 3",
          "docker exec -it kafka-lab /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic orders --property parse.key=true --property key.separator=:",
          '  order-1:{"item":"keyboard"}     ← type these, Enter after each, Ctrl+C when done',
          '  order-2:{"item":"mouse"}',
          "docker exec -it kafka-lab /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic orders --from-beginning --property print.partition=true --property print.key=true",
        ],
        output: `Partition:2	order-1	{"item":"keyboard"}
Partition:0	order-2	{"item":"mouse"}
(Ctrl+C to stop — note each key consistently maps to one partition)`,
      },
    },
    {
      id: "project-setup",
      title: "Set up the project",
      description: "Initialise a project and install a Kafka client.",
      perLang: {
        typescript: {
          commands: ["npm init -y", "npm install kafkajs", "npm install -D tsx"],
        },
        go: {
          commands: ["go mod init kafka-lab", "go get github.com/segmentio/kafka-go"],
        },
        python: {
          commands: [
            "python3 -m venv .venv && source .venv/bin/activate",
            "pip install confluent-kafka",
          ],
        },
      },
    },
    {
      id: "producer",
      title: "Produce keyed events — watch partitioning happen",
      description:
        "Ten order events across three order IDs. The client hashes each key, so **every event for the same order lands in the same partition** — scroll the output and check.",
      perLang: {
        typescript: {
          files: [
            {
              path: "producer.ts",
              lang: "typescript",
              content: `import { Kafka } from "kafkajs";

const kafka = new Kafka({ clientId: "lab-producer", brokers: ["localhost:9092"] });
const producer = kafka.producer();

async function main() {
  await producer.connect();

  for (let i = 1; i <= 10; i++) {
    const orderId = \`order-\${(i % 3) + 1}\`; // three orders, events interleaved
    const [meta] = await producer.send({
      topic: "orders",
      messages: [
        { key: orderId, value: JSON.stringify({ orderId, seq: i, event: "updated" }) },
      ],
    });
    console.log(\`sent \${orderId} seq=\${i} → partition \${meta.partition}\`);
  }

  await producer.disconnect();
}

main();
`,
            },
          ],
          commands: ["npx tsx producer.ts"],
          output: `sent order-2 seq=1 → partition 0
sent order-3 seq=2 → partition 1
sent order-1 seq=3 → partition 2
sent order-2 seq=4 → partition 0   ← same key, same partition, every time
sent order-3 seq=5 → partition 1
...`,
        },
        go: {
          files: [
            {
              path: "producer/main.go",
              lang: "go",
              content: `package main

import (
	"context"
	"fmt"

	"github.com/segmentio/kafka-go"
)

func main() {
	w := &kafka.Writer{
		Addr:     kafka.TCP("localhost:9092"),
		Topic:    "orders",
		Balancer: &kafka.Hash{}, // same key → same partition
	}
	defer w.Close()

	for i := 1; i <= 10; i++ {
		orderID := fmt.Sprintf("order-%d", (i%3)+1) // three orders, interleaved
		msg := kafka.Message{
			Key:   []byte(orderID),
			Value: []byte(fmt.Sprintf(\`{"orderId":%q,"seq":%d,"event":"updated"}\`, orderID, i)),
		}
		if err := w.WriteMessages(context.Background(), msg); err != nil {
			panic(err)
		}
		fmt.Printf("sent %s seq=%d\\n", orderID, i)
	}
}
`,
            },
          ],
          commands: ["go run ./producer"],
          output: `sent order-2 seq=1
sent order-3 seq=2
sent order-1 seq=3
...
(the consumer in the next step shows which partition each landed in)`,
        },
        python: {
          files: [
            {
              path: "producer.py",
              lang: "python",
              content: `import json

from confluent_kafka import Producer

p = Producer({"bootstrap.servers": "localhost:9092"})


def report(err, msg):
    if err is None:
        print(f"sent {msg.key().decode()} → partition {msg.partition()}")


for i in range(1, 11):
    order_id = f"order-{(i % 3) + 1}"  # three orders, events interleaved
    p.produce(
        "orders",
        key=order_id,
        value=json.dumps({"orderId": order_id, "seq": i, "event": "updated"}),
        callback=report,
    )

p.flush()
`,
            },
          ],
          commands: ["python producer.py"],
          output: `sent order-2 → partition 0
sent order-3 → partition 1
sent order-1 → partition 2
sent order-2 → partition 0   ← same key, same partition, every time
...`,
        },
      },
    },
    {
      id: "consumer-groups",
      title: "The consumer-group demo — both patterns live",
      description:
        "This is the payoff. **Terminal 1 + 2**: run the consumer in group `billing` twice — Kafka rebalances and splits the partitions between them (work queue). **Terminal 3**: run it with group `analytics` — it receives **every** message from the beginning (pub/sub). Re-run the producer while all three are up and watch.",
      perLang: {
        typescript: {
          files: [
            {
              path: "consumer.ts",
              lang: "typescript",
              content: `import { Kafka } from "kafkajs";

const groupId = process.argv[2] ?? "billing";

const kafka = new Kafka({ clientId: "lab-consumer", brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId });

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic: "orders", fromBeginning: true });
  console.log(\`[\${groupId}] waiting for messages… (Ctrl+C to stop)\`);

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      console.log(
        \`[\${groupId}] p\${partition} off=\${message.offset} \` +
        \`key=\${message.key} \${message.value}\`
      );
    },
  });
}

main();
`,
            },
          ],
          commands: [
            "npx tsx consumer.ts billing      # terminal 1",
            "npx tsx consumer.ts billing      # terminal 2 — watch the rebalance",
            "npx tsx consumer.ts analytics    # terminal 3 — gets everything",
          ],
          output: `terminal 1: [billing] p0 …  p1 …          ← owns partitions 0,1
terminal 2: [billing] p2 …                ← owns partition 2
terminal 3: [analytics] p0 … p1 … p2 …    ← sees every message`,
        },
        go: {
          files: [
            {
              path: "consumer/main.go",
              lang: "go",
              content: `package main

import (
	"context"
	"fmt"
	"os"

	"github.com/segmentio/kafka-go"
)

func main() {
	group := "billing"
	if len(os.Args) > 1 {
		group = os.Args[1]
	}

	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     []string{"localhost:9092"},
		Topic:       "orders",
		GroupID:     group,
		StartOffset: kafka.FirstOffset,
	})
	defer r.Close()

	fmt.Printf("[%s] waiting for messages… (Ctrl+C to stop)\\n", group)
	for {
		m, err := r.ReadMessage(context.Background())
		if err != nil {
			break
		}
		fmt.Printf("[%s] p%d off=%d key=%s %s\\n", group, m.Partition, m.Offset, m.Key, m.Value)
	}
}
`,
            },
          ],
          commands: [
            "go run ./consumer billing      # terminal 1",
            "go run ./consumer billing      # terminal 2 — watch the rebalance",
            "go run ./consumer analytics    # terminal 3 — gets everything",
          ],
          output: `terminal 1: [billing] p0 …  p1 …          ← owns partitions 0,1
terminal 2: [billing] p2 …                ← owns partition 2
terminal 3: [analytics] p0 … p1 … p2 …    ← sees every message`,
        },
        python: {
          files: [
            {
              path: "consumer.py",
              lang: "python",
              content: `import sys

from confluent_kafka import Consumer

group = sys.argv[1] if len(sys.argv) > 1 else "billing"

c = Consumer({
    "bootstrap.servers": "localhost:9092",
    "group.id": group,
    "auto.offset.reset": "earliest",
})
c.subscribe(["orders"])
print(f"[{group}] waiting for messages… (Ctrl+C to stop)")

try:
    while True:
        msg = c.poll(1.0)
        if msg is None or msg.error():
            continue
        print(
            f"[{group}] p{msg.partition()} off={msg.offset()} "
            f"key={msg.key().decode()} {msg.value().decode()}"
        )
except KeyboardInterrupt:
    pass
finally:
    c.close()
`,
            },
          ],
          commands: [
            "python consumer.py billing      # terminal 1",
            "python consumer.py billing      # terminal 2 — watch the rebalance",
            "python consumer.py analytics    # terminal 3 — gets everything",
          ],
          output: `terminal 1: [billing] p0 …  p1 …          ← owns partitions 0,1
terminal 2: [billing] p2 …                ← owns partition 2
terminal 3: [analytics] p0 … p1 … p2 …    ← sees every message`,
        },
      },
    },
    {
      id: "replay",
      title: "Replay history — rewind the offset",
      description:
        "Stop your `billing` consumers (Ctrl+C), reset the group's offsets to the beginning, and start one again — it reprocesses **everything**. This is the slide-6 superpower: reads never deleted anything.",
      shared: {
        commands: [
          "docker exec -it kafka-lab /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group billing --topic orders --reset-offsets --to-earliest --execute",
        ],
        output: `GROUP    TOPIC   PARTITION  NEW-OFFSET
billing  orders  0          0
billing  orders  1          0
billing  orders  2          0
→ restart your consumer: every message comes back, replayed in order per partition`,
      },
    },
    {
      id: "cleanup",
      title: "Clean up",
      description: "Stop the broker and remove the container when you're done.",
      shared: {
        commands: ["docker compose down"],
      },
    },
  ],
};
