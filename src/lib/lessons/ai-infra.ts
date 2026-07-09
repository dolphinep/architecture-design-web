import type { Lesson } from "@/types/lesson";

export const aiInfraLesson: Lesson = {
  slug: "ai-infra",
  title: "AI Infrastructure Design",
  description:
    "How to architect reliable, cost-effective AI systems — model serving, inference routing, caching, GPU sizing, and observability.",
  duration: "~9 min",
  level: "intermediate",
  tags: ["ai", "infrastructure", "llm", "gpu", "devops"],
  module: "AI Architecture",
  moduleOrder: 2,
  slides: [
    {
      id: "ai-infra-api-vs-self",
      title: "API vs self-hosted inference",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "Managed API (OpenAI, Anthropic)",
              accent: "violet",
              points: [
                "No infrastructure to manage",
                "Pay per token — expensive at scale",
                "Latest models immediately available",
                "Data leaves your infrastructure",
                "Use for: prototyping, low-volume, cutting-edge models",
              ],
            },
            {
              title: "Self-hosted (Ollama, vLLM)",
              accent: "emerald",
              points: [
                "Full data privacy — nothing leaves your network",
                "High fixed cost (GPU servers), low marginal cost",
                "You manage updates, scaling, reliability",
                "Slower to access new models",
                "Use for: production at scale, sensitive data, cost optimization",
              ],
            },
          ],
        },
        {
          kind: "stats",
          items: [
            { value: "$0.002", label: "GPT-4o per 1K output tokens", accent: "zinc" },
            { value: "$0.0004", label: "self-hosted llama3 per 1K", accent: "emerald" },
            { value: "5×", label: "cost reduction self-hosted", accent: "amber" },
          ],
        },
      ],
      summary:
        "API for speed to market; self-hosted for cost at scale and data privacy — most orgs run both.",
    },
    {
      id: "ai-infra-servers",
      title: "Inference servers — the runtime layer",
      animation: "llm-inference",
      body: [
        {
          kind: "text",
          text: "An **inference server** loads a model into GPU memory and exposes an HTTP API. It handles batching, quantization, and concurrency so your application code just makes POST requests.",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "Ollama",
              accent: "violet",
              points: [
                "One-command local setup",
                "Manages model downloads automatically",
                "Great for development and private stacks",
                "`ollama run llama3.2` — that's it",
                "Open WebUI integrates natively",
              ],
            },
            {
              title: "vLLM",
              accent: "cyan",
              points: [
                "PagedAttention — highest throughput",
                "Continuous batching — no idle GPU time",
                "OpenAI-compatible API",
                "Best for high-RPS production deployments",
                "Requires Linux + CUDA",
              ],
            },
            {
              title: "llama.cpp / llama-server",
              accent: "emerald",
              points: [
                "CPU inference — no GPU required",
                "GGUF quantized models (Q4, Q8)",
                "Runs on a MacBook or Raspberry Pi",
                "Lower throughput, zero GPU cost",
                "Good for edge or budget setups",
              ],
            },
          ],
        },
      ],
      summary:
        "Ollama for developer experience, vLLM for production throughput, llama.cpp for CPU-only or edge deployments.",
    },
    {
      id: "ai-infra-gpu",
      title: "GPU sizing for inference",
      body: [
        {
          kind: "text",
          text: "Model size in parameters determines **minimum VRAM**. The rule: each billion parameters needs ~2 GB VRAM in fp16, ~1 GB in int4 (quantized).",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "Small (1B–8B)",
              accent: "emerald",
              points: [
                "llama3.2:3b → 4 GB VRAM",
                "llama3.1:8b → 8–10 GB VRAM",
                "RTX 3080/4070 (10–12 GB) sufficient",
                "~60–120 tokens/sec",
                "Best for: chat, classification, summarization",
              ],
            },
            {
              title: "Medium (13B–34B)",
              accent: "cyan",
              points: [
                "mistral:7b, codestral:22b",
                "16–24 GB VRAM needed",
                "RTX 4090 (24 GB) or A10G",
                "~20–50 tokens/sec",
                "Best for: code generation, reasoning",
              ],
            },
            {
              title: "Large (70B+)",
              accent: "violet",
              points: [
                "llama3.1:70b → 40–48 GB VRAM",
                "A100 (40/80 GB) or 2×A10G",
                "~8–15 tokens/sec",
                "Tensor parallel across GPUs",
                "Best for: complex reasoning, production flagship",
              ],
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "QUANTIZE",
              accent: "amber",
              text: "Q4 quantization halves VRAM at ~5% quality loss — almost always worth it for serving",
            },
            {
              label: "KV CACHE",
              accent: "violet",
              text: "Reserve extra VRAM for the KV cache — long contexts fill it fast",
            },
          ],
        },
      ],
      summary:
        "Start with quantized 8B models on a single GPU — upgrade to 70B only when quality benchmarks demand it.",
    },
    {
      id: "ai-infra-routing",
      title: "Model routing and fallback",
      body: [
        {
          kind: "text",
          text: "Not every request needs a 70B model. A **routing layer** classifies incoming requests by complexity and sends them to the right model — reducing cost and latency.",
        },
        {
          kind: "sequence",
          title: "Model routing",
          actors: ["Client", "Router", "Small (8B)", "Large (70B)"],
          steps: [
            {
              from: "Client",
              to: "Router",
              label: "POST /chat",
              note: "simple question detected",
            },
            {
              from: "Router",
              to: "Small (8B)",
              label: "forward request",
            },
            {
              from: "Small (8B)",
              to: "Router",
              label: "stream response",
              style: "response",
            },
            {
              from: "Router",
              to: "Client",
              label: "stream tokens",
              style: "response",
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "SIMPLE",
              accent: "emerald",
              text: "Short questions, FAQ, summarization → small model (8B), fast + cheap",
            },
            {
              label: "COMPLEX",
              accent: "violet",
              text: "Multi-step reasoning, code review, long context → large model (70B)",
            },
            {
              label: "FALLBACK",
              accent: "amber",
              text: "If small model low-confidence or error → retry on large model automatically",
            },
            {
              label: "TOOLS",
              accent: "cyan",
              text: "LiteLLM, OpenRouter, and RouteLLM provide drop-in routing layers",
            },
          ],
        },
      ],
      summary:
        "Routing 80% of traffic to small models cuts inference costs by 4–5× with minimal quality loss.",
    },
    {
      id: "ai-infra-caching",
      title: "Caching AI responses",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "Exact cache",
              accent: "zinc",
              points: [
                "Hash the prompt → cache the response",
                "100% hit rate for identical requests (FAQ bots)",
                "Very fast — bypass LLM entirely",
                "Stale immediately if context changes",
                "Redis with TTL is sufficient",
              ],
            },
            {
              title: "Semantic cache",
              accent: "violet",
              points: [
                "Embed the prompt → find similar cached queries",
                "Hit if similarity > threshold (e.g. 0.95)",
                "Handles paraphrased duplicates",
                "`GPTCache`, `Qdrant` as semantic cache backend",
                "5–40% hit rate on typical chat workloads",
              ],
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "KV PREFIX",
              accent: "cyan",
              text: "vLLM/Ollama cache the KV state of common system prompts — free latency win, enable it",
            },
            {
              label: "PROMPT CACHE",
              accent: "emerald",
              text: "Anthropic and OpenAI both offer prompt caching — repeated context billed at 0.1× cost",
            },
            {
              label: "TTL",
              accent: "amber",
              text: "Always set a TTL — factual questions may be fine cached for hours; real-time data must not be cached",
            },
          ],
        },
      ],
      summary:
        "Semantic caching cuts 10–40% of LLM calls; enable KV prefix caching for near-zero cost on repeated system prompts.",
    },
    {
      id: "ai-infra-gateway",
      title: "AI API gateway",
      body: [
        {
          kind: "text",
          text: "A dedicated **AI gateway** sits between your application and LLM providers. It handles concerns that shouldn't live in application code.",
        },
        {
          kind: "points",
          items: [
            {
              label: "RATE LIMIT",
              accent: "violet",
              text: "Per-user and per-team token budgets — prevent runaway costs from a bug or abuse",
            },
            {
              label: "FAILOVER",
              accent: "emerald",
              text: "Primary provider (OpenAI) fails → automatically retry on backup (Anthropic, self-hosted)",
            },
            {
              label: "OBSERVE",
              accent: "cyan",
              text: "Log every request: prompt, model, token count, latency, cost — essential for debugging and billing",
            },
            {
              label: "CONTENT",
              accent: "amber",
              text: "PII redaction, topic filtering, jailbreak detection before the prompt reaches the model",
            },
            {
              label: "MULTI-KEY",
              accent: "zinc",
              text: "Rotate API keys, load-balance across multiple accounts, stay under per-account rate limits",
            },
          ],
        },
        {
          kind: "text",
          text: "Popular options: **LiteLLM** (open source, self-hosted), **Portkey**, **Helicone** (observability-focused), **Kong AI Gateway**.",
        },
      ],
      summary:
        "An AI gateway gives you rate limiting, failover, and observability without touching application code.",
    },
    {
      id: "ai-infra-observability",
      title: "Observability for AI systems",
      body: [
        {
          kind: "text",
          text: "Traditional metrics (CPU, latency, error rate) are necessary but not sufficient for LLM systems. You also need to evaluate **output quality**.",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "Infrastructure metrics",
              accent: "zinc",
              points: [
                "Time to first token (TTFT)",
                "Tokens per second (throughput)",
                "GPU utilization and VRAM usage",
                "Queue depth and batch size",
                "Provider error rates and fallback frequency",
              ],
            },
            {
              title: "Quality metrics",
              accent: "violet",
              points: [
                "Faithfulness — does the response match retrieved context?",
                "Answer relevance — did it actually answer the question?",
                "Context recall — were the right chunks retrieved?",
                "Hallucination rate — LLM judge or human eval",
                "User thumbs-up/down rate as a proxy signal",
              ],
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "TRACES",
              accent: "cyan",
              text: "OpenTelemetry traces across: embed → search → augment → generate — see where latency is",
            },
            {
              label: "TOOLS",
              accent: "emerald",
              text: "Langfuse, Arize Phoenix, and Weave (W&B) provide LLM-native observability out of the box",
            },
          ],
        },
      ],
      summary:
        "Monitor TTFT and GPU utilization for infra health; monitor faithfulness and relevance for output quality — both matter.",
    },
    {
      id: "ai-infra-architecture",
      title: "Reference AI infrastructure architecture",
      body: [
        {
          kind: "sequence",
          title: "Production AI request flow",
          actors: ["App", "AI Gateway", "Router", "vLLM", "Vector DB"],
          steps: [
            {
              from: "App",
              to: "AI Gateway",
              label: "POST /chat + user_id",
              note: "rate-check + PII filter",
            },
            {
              from: "AI Gateway",
              to: "Router",
              label: "forward request",
            },
            {
              from: "Router",
              to: "Vector DB",
              label: "semantic search (RAG)",
            },
            {
              from: "Vector DB",
              to: "Router",
              label: "top-3 chunks",
              style: "response",
            },
            {
              from: "Router",
              to: "vLLM",
              label: "augmented prompt",
            },
            {
              from: "vLLM",
              to: "Router",
              label: "stream tokens",
              style: "response",
            },
            {
              from: "Router",
              to: "AI Gateway",
              label: "stream tokens",
              style: "response",
            },
            {
              from: "AI Gateway",
              to: "App",
              label: "stream + log usage",
              style: "response",
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "SCALE",
              accent: "violet",
              text: "vLLM nodes scale horizontally — add GPUs, same API",
            },
            {
              label: "COST",
              accent: "emerald",
              text: "Route simple queries to small model; gateway logs token costs per user/team",
            },
            {
              label: "RESILIENCE",
              accent: "amber",
              text: "Gateway retries on vLLM failure, falls back to OpenAI API",
            },
          ],
        },
      ],
      summary:
        "Gateway → Router → vLLM + RAG is the standard pattern — each layer has a single, clear responsibility.",
    },
  ],
};
