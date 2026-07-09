import type { Lesson, LessonLab, LabStep } from "@/types/lesson";

const openWebUILab: LessonLab = {
  intro:
    "Set up a fully local AI stack on your machine: Ollama for inference + Open WebUI for the chat interface. No GPU required — models run on CPU (slower but functional).",
  prerequisites: [
    "Docker Desktop installed and running",
    "8 GB RAM free",
    "~5 GB disk space for the model",
  ],
  steps: [
    {
      id: "owui-step-docker",
      title: "Docker Compose stack",
      description:
        "Create a `docker-compose.yml` that runs Ollama and Open WebUI as a connected pair. Open WebUI will talk to Ollama over the Docker internal network.",
      shared: {
        files: [
          {
            path: "docker-compose.yml",
            lang: "yaml",
            content: `services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    restart: unless-stopped

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    depends_on:
      - ollama
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - WEBUI_SECRET_KEY=change-me-in-production
    volumes:
      - open_webui_data:/app/backend/data
    ports:
      - "3000:8080"
    restart: unless-stopped

volumes:
  ollama_data:
  open_webui_data:
`,
          },
        ],
        commands: ["docker compose up -d", "docker compose logs -f open-webui"],
        output: "✓ open-webui | Application startup complete.",
      },
    } satisfies LabStep,
    {
      id: "owui-step-model",
      title: "Pull your first model",
      description:
        "Pull **llama3.2:3b** — a 2 GB model that runs on CPU. This step downloads the model into Ollama's volume so it persists across container restarts.",
      shared: {
        commands: [
          "docker exec ollama ollama pull llama3.2:3b",
          "docker exec ollama ollama list",
        ],
        output: `pulling manifest
pulling dde5aa3fc5ff... 100% 2.0 GB
verifying sha256 digest
writing manifest ✓

NAME              ID              SIZE    MODIFIED
llama3.2:3b       a80c4f17acd5    2.0 GB  2 seconds ago`,
      },
    } satisfies LabStep,
    {
      id: "owui-step-chat",
      title: "Open the interface and create admin",
      description:
        "Open **http://localhost:3000** in your browser. The first user to sign up automatically becomes the admin. Create your account and start a chat with llama3.2:3b.",
      shared: {
        commands: ["open http://localhost:3000"],
      },
    } satisfies LabStep,
    {
      id: "owui-step-rag",
      title: "Add a document to the knowledge base",
      description:
        "In Open WebUI, go to **Workspace → Knowledge → + New Knowledge Base**. Name it anything, then upload a PDF or paste a URL. Then start a new chat, click the `+` button, attach the knowledge base, and ask a question about its content.",
    } satisfies LabStep,
    {
      id: "owui-step-api",
      title: "Call via OpenAI-compatible API",
      description:
        "Open WebUI exposes an **OpenAI-compatible API** at `http://localhost:3000/api`. Generate an API key in Settings → Account, then use it with any OpenAI SDK.",
      shared: {
        files: [
          {
            path: "test.ts",
            lang: "typescript",
            content: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3000/api",
  apiKey: "your-open-webui-api-key",  // from Settings → Account
});

const response = await client.chat.completions.create({
  model: "llama3.2:3b",
  messages: [{ role: "user", content: "What is RAG?" }],
  stream: true,
});

for await (const chunk of response) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
`,
          },
        ],
        commands: ["npx tsx test.ts"],
      },
    } satisfies LabStep,
    {
      id: "owui-step-cleanup",
      title: "Stop and clean up",
      description:
        "Stop the containers when done. The model and chat history are stored in named Docker volumes and will persist for the next run.",
      shared: {
        commands: [
          "docker compose stop",
          "# To remove everything including models and data:",
          "docker compose down -v",
        ],
      },
    } satisfies LabStep,
  ],
};

export const openWebUILesson: Lesson = {
  slug: "ai-open-webui",
  title: "Private AI Stack with Open WebUI",
  description:
    "Run a fully self-hosted ChatGPT alternative — Ollama + Open WebUI on Docker, with built-in RAG, multi-user auth, and model management.",
  duration: "~8 min",
  level: "beginner",
  tags: ["ai", "open-webui", "ollama", "docker", "self-hosted"],
  module: "AI Architecture",
  moduleOrder: 3,
  slides: [
    {
      id: "owui-why",
      title: "Why self-host your AI?",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "Cloud AI (ChatGPT, Claude.ai)",
              accent: "zinc",
              points: [
                "Zero setup — browser and go",
                "Always latest models",
                "Your prompts and data go to their servers",
                "Per-seat cost at team scale",
                "No control over data retention policies",
              ],
            },
            {
              title: "Self-hosted (Open WebUI + Ollama)",
              accent: "violet",
              points: [
                "Data never leaves your machine or VPC",
                "One-time GPU cost — unlimited usage",
                "Customizable: system prompts, model catalog, RAG sources",
                "On-premise compliance (HIPAA, finance, legal)",
                "Works offline — no internet required",
              ],
            },
          ],
        },
        {
          kind: "stats",
          items: [
            { value: "100%", label: "data stays on-prem", accent: "violet" },
            { value: "$0", label: "per-query cost", accent: "emerald" },
            { value: "OpenAI", label: "compatible API", accent: "cyan" },
          ],
        },
      ],
      summary:
        "Self-hosted AI is the right call when data privacy, cost at scale, or air-gapped environments are requirements.",
    },
    {
      id: "owui-what",
      title: "What is Open WebUI?",
      body: [
        {
          kind: "text",
          text: "**Open WebUI** (formerly Ollama WebUI) is an open-source, self-hosted web interface for LLMs. Think ChatGPT — but you own every part of the stack.",
        },
        {
          kind: "points",
          items: [
            {
              label: "INTERFACE",
              accent: "violet",
              text: "Full chat UI with conversation history, markdown, code highlighting, and image support",
            },
            {
              label: "MODELS",
              accent: "cyan",
              text: "Pull and switch between any Ollama model (`llama3.2`, `mistral`, `deepseek-r1`, `phi3`) from the UI",
            },
            {
              label: "RAG",
              accent: "emerald",
              text: "Built-in document upload and knowledge base — attach PDFs, web URLs, or entire folders",
            },
            {
              label: "USERS",
              accent: "amber",
              text: "Multi-user with roles (admin, user), team workspaces, and API key management",
            },
            {
              label: "COMPAT",
              accent: "zinc",
              text: "Also connects to OpenAI, Anthropic, and any OpenAI-compatible API endpoint",
            },
          ],
        },
      ],
      summary:
        "Open WebUI is a complete AI workspace — not just a chat window, but model management, RAG, and user administration.",
    },
    {
      id: "owui-architecture",
      title: "Stack architecture",
      body: [
        {
          kind: "sequence",
          title: "Open WebUI request flow",
          actors: ["Browser", "Open WebUI", "Ollama", "Vector DB"],
          steps: [
            { from: "Browser", to: "Open WebUI", label: "chat message" },
            {
              from: "Open WebUI",
              to: "Vector DB",
              label: "RAG: embed + search",
              note: "if knowledge base attached",
            },
            {
              from: "Vector DB",
              to: "Open WebUI",
              label: "relevant chunks",
              style: "response",
            },
            { from: "Open WebUI", to: "Ollama", label: "augmented prompt" },
            {
              from: "Ollama",
              to: "Open WebUI",
              label: "stream tokens",
              style: "response",
            },
            {
              from: "Open WebUI",
              to: "Browser",
              label: "stream to UI",
              style: "response",
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "STORAGE",
              accent: "zinc",
              text: "Open WebUI uses SQLite by default; swap to Postgres for production multi-user",
            },
            {
              label: "VECTOR",
              accent: "violet",
              text: "Built-in ChromaDB for RAG; can point to external Qdrant for scale",
            },
            {
              label: "NETWORK",
              accent: "cyan",
              text: "Ollama and Open WebUI talk over Docker internal network — Ollama never exposed to internet",
            },
          ],
        },
      ],
      summary:
        "Open WebUI is the orchestration layer — Ollama is just the inference engine, cleanly separated.",
    },
    {
      id: "owui-rag",
      title: "Built-in RAG — knowledge bases",
      body: [
        {
          kind: "text",
          text: "Open WebUI has **RAG built in** — no extra code needed. You can attach documents to individual chats or build persistent knowledge bases shared across conversations.",
        },
        {
          kind: "flow",
          steps: [
            "Upload: drag PDFs, paste a URL, or point to a folder — Open WebUI handles chunking",
            "Embed: documents are embedded using a local model (`nomic-embed-text` via Ollama)",
            "Store: vectors stored in ChromaDB (embedded, zero config)",
            "Retrieve: on each message, top-K chunks retrieved and injected automatically",
            "Cite: the UI shows source references inline with every RAG response",
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "WORKSPACE",
              accent: "violet",
              text: 'Create named knowledge bases (e.g. "Product Docs", "Legal") and reuse them across chats',
            },
            {
              label: "WEB",
              accent: "cyan",
              text: "Paste any URL — Open WebUI fetches, chunks, and indexes the page automatically",
            },
            {
              label: "SYNC",
              accent: "emerald",
              text: "Folder watch mode re-indexes files when they change (good for internal wikis)",
            },
          ],
        },
      ],
      summary:
        "Open WebUI turns your documents into a queryable knowledge base with zero configuration — just upload and chat.",
    },
    {
      id: "owui-auth",
      title: "Users, roles, and API keys",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "Admin",
              accent: "violet",
              points: [
                "Manage users and approve signups",
                "Set default models and system prompts per user",
                "View all conversation logs",
                "Create shared knowledge bases",
                "Issue and revoke API keys",
              ],
            },
            {
              title: "User",
              accent: "cyan",
              points: [
                "Chat with allowed models",
                "Upload documents to personal or shared knowledge bases",
                "Create and share custom model configurations",
                "Generate personal API keys for programmatic access",
                "Export conversation history",
              ],
            },
          ],
        },
        {
          kind: "text",
          text: "Signup can be open (anyone can register) or **invite-only** — set `WEBUI_AUTH_TRUSTED_EMAIL_HEADER` to proxy SSO from an upstream auth provider (Authentik, Authelia, Keycloak).",
        },
      ],
      summary:
        "Open WebUI ships with basic multi-user auth out of the box — integrate your existing SSO for team deployments.",
    },
    {
      id: "owui-models",
      title: "Model management and customization",
      body: [
        {
          kind: "text",
          text: "Open WebUI's **model library** lets you pull, configure, and share models without touching the command line.",
        },
        {
          kind: "points",
          items: [
            {
              label: "PULL",
              accent: "violet",
              text: "Search and download any Ollama model from the UI — `llama3.2:3b`, `mistral`, `deepseek-r1:7b`",
            },
            {
              label: "SYSTEM PROMPT",
              accent: "cyan",
              text: 'Create named model configs with custom system prompts — e.g. "Support Bot" uses the product docs knowledge base',
            },
            {
              label: "PARAMETERS",
              accent: "emerald",
              text: "Override temperature, context length, top-p per model config — no code required",
            },
            {
              label: "SHARE",
              accent: "amber",
              text: "Publish model configs to the workspace so all users get the same tuned experience",
            },
            {
              label: "OPENAI",
              accent: "zinc",
              text: "Add OpenAI or Anthropic API keys in settings — use cloud models alongside local ones from the same UI",
            },
          ],
        },
      ],
      summary:
        "Model configs + knowledge bases = reusable AI tools your team can use without touching any code.",
    },
    {
      id: "owui-production",
      title: "Going to production",
      body: [
        {
          kind: "points",
          items: [
            {
              label: "REVERSE PROXY",
              accent: "violet",
              text: "Put Nginx or Caddy in front — TLS termination, domain name, gzip",
            },
            {
              label: "AUTH",
              accent: "cyan",
              text: "Enable SSO via header trust (`Authentik`, `Authelia`) for team-wide login with existing accounts",
            },
            {
              label: "GPU SERVER",
              accent: "emerald",
              text: "Ollama on a dedicated GPU machine; Open WebUI on a separate CPU node — `OLLAMA_BASE_URL` env var connects them",
            },
            {
              label: "BACKUP",
              accent: "amber",
              text: "Mount `/app/backend/data` as a Docker volume and back it up — contains all chats, knowledge bases, and user data",
            },
            {
              label: "UPDATES",
              accent: "zinc",
              text: "`docker pull ghcr.io/open-webui/open-webui:main` — Open WebUI ships updates frequently; pin a version tag in production",
            },
            {
              label: "MONITORING",
              accent: "violet",
              text: "Expose Ollama's `/api/tags` and `/api/ps` for health checks; add GPU metrics with `nvidia-smi` exporter",
            },
          ],
        },
      ],
      summary:
        "A GPU server running Ollama + a CPU server running Open WebUI behind Caddy is a production-grade private AI stack.",
    },
  ],
  lab: openWebUILab,
};
