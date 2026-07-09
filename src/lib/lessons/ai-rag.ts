import { Lesson } from "@/types/lesson";

export const ragLesson: Lesson = {
  slug: "ai-rag",
  title: "RAG: Retrieval-Augmented Generation",
  description:
    "Ground your LLM in real data — how retrieval-augmented generation works, from embeddings and vector search to chunking strategies and advanced patterns.",
  duration: "~10 min",
  level: "intermediate",
  tags: ["ai", "rag", "llm", "vector-db"],
  module: "AI Architecture",
  moduleOrder: 1,
  slides: [
    {
      id: "rag-problem",
      title: "The LLM knowledge problem",
      body: [
        {
          kind: "text",
          text: "LLMs are trained on a static snapshot of the world. Ask GPT-4 about your internal docs, last quarter's sales, or a bug filed yesterday — it cannot know. And when it doesn't know, it **hallucinates**.",
        },
        {
          kind: "points",
          items: [
            {
              label: "CUTOFF",
              accent: "amber",
              text: "Training data has a fixed date — the model knows nothing after it",
            },
            {
              label: "PRIVATE",
              accent: "red",
              text: "The model has never seen your internal documents, codebase, or database",
            },
            {
              label: "HALLUCINATION",
              accent: "red",
              text: "Rather than say \"I don't know\", LLMs confidently fabricate plausible answers",
            },
            {
              label: "FINE-TUNING?",
              accent: "zinc",
              text: "Fine-tuning updates behavior, not knowledge — and costs thousands of dollars to re-run",
            },
          ],
        },
      ],
      summary:
        "LLMs hallucinate because they reason from training data, not from your live information.",
    },
    {
      id: "rag-what",
      title: "What RAG is",
      animation: "rag-pipeline",
      body: [
        {
          kind: "text",
          text: "**Retrieval-Augmented Generation** gives the LLM exactly the context it needs, at query time. Instead of baking knowledge into weights, you fetch the relevant documents and inject them into the prompt.",
        },
        {
          kind: "stats",
          items: [
            { value: "2020", label: "RAG paper (Lewis et al.)", accent: "zinc" },
            { value: "~$0", label: "vs fine-tuning cost", accent: "emerald" },
            { value: "real-time", label: "knowledge freshness", accent: "violet" },
            { value: "cited", label: "verifiable sources", accent: "cyan" },
          ],
        },
      ],
      summary:
        "RAG = retrieve relevant context → inject into prompt → generate grounded response. No retraining required.",
    },
    {
      id: "rag-pipeline",
      title: "The RAG pipeline step by step",
      body: [
        {
          kind: "flow",
          steps: [
            "**Ingest**: load documents (PDFs, markdown, web pages, databases)",
            "**Chunk**: split documents into smaller passages (~200–500 tokens each)",
            "**Embed**: run each chunk through an embedding model → dense vector",
            "**Store**: write vectors + chunk text to a vector database (pgvector, Qdrant, Pinecone)",
            "**Query**: embed the user's question with the same model",
            "**Search**: find top-K most similar chunks by cosine similarity",
            "**Augment**: build prompt: system instructions + retrieved chunks + user question",
            "**Generate**: LLM produces a grounded response using the injected context",
          ],
        },
      ],
      summary:
        "The pipeline has two phases: offline ingestion (embed + store) and online retrieval (search + augment + generate).",
    },
    {
      id: "rag-embeddings",
      title: "Vector embeddings — the semantic bridge",
      animation: "vector-search",
      body: [
        {
          kind: "text",
          text: "An **embedding model** converts text into a dense vector of ~768–3072 numbers where semantic meaning is encoded as geometric position. Similar meaning = nearby vectors.",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "Same cluster",
              accent: "violet",
              points: [
                "'How do I reset my password?' and 'Forgot password steps' → nearby",
                "Captured: synonyms, paraphrases, implied meaning",
                "Language-agnostic — 'password' and 'contraseña' cluster together",
              ],
            },
            {
              title: "Different clusters",
              accent: "zinc",
              points: [
                "'invoice' vs 'authentication' → far apart",
                "Each domain has its own region of the space",
                "k-NN search finds nearest by cosine distance, not keyword match",
              ],
            },
          ],
        },
      ],
      summary:
        "Embeddings capture meaning, not words — enabling semantic search across your entire knowledge base.",
    },
    {
      id: "rag-chunking",
      title: "Chunking strategy matters",
      body: [
        {
          kind: "text",
          text: "How you split documents is one of the most impactful decisions in a RAG system. Too large → noisy context. Too small → missing context.",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "Fixed-size",
              accent: "zinc",
              points: [
                "Split every N tokens (e.g. 512)",
                "Fast and simple",
                "Cuts mid-sentence — degrades quality",
                "Use as a baseline only",
              ],
            },
            {
              title: "Recursive / semantic",
              accent: "violet",
              points: [
                "Split on paragraphs → sentences → words",
                "Respects natural document structure",
                "Most common production choice",
                "LangChain's `RecursiveCharacterTextSplitter`",
              ],
            },
            {
              title: "Document-aware",
              accent: "emerald",
              points: [
                "Markdown: split on headings",
                "Code: split on functions/classes",
                "PDFs: respect page and section boundaries",
                "Best quality, most effort",
              ],
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "OVERLAP",
              accent: "cyan",
              text: "Add 10–20% overlap between chunks to avoid splitting key sentences at boundaries",
            },
            {
              label: "METADATA",
              accent: "amber",
              text: "Store source URL, page number, section title with each chunk — LLM can cite them",
            },
          ],
        },
      ],
      summary:
        "Recursive splitting with 10% overlap is the safe default — switch to document-aware for structured content like code or Markdown docs.",
    },
    {
      id: "rag-retrieval",
      title: "Retrieval and reranking",
      body: [
        {
          kind: "text",
          text: "Fetching the **top-K** chunks by vector similarity is fast but not always the most relevant. A **reranker** adds a second pass that scores retrieved chunks against the query more precisely.",
        },
        {
          kind: "points",
          items: [
            {
              label: "k-NN",
              accent: "violet",
              text: "Retrieve top 20 by cosine similarity — fast, approximate (ANN)",
            },
            {
              label: "RERANK",
              accent: "cyan",
              text: "Run a cross-encoder model on (query, chunk) pairs — slow but precise",
            },
            {
              label: "HYBRID",
              accent: "emerald",
              text: "Combine vector search + BM25 keyword search — best recall for named entities and exact terms",
            },
            {
              label: "FILTER",
              accent: "amber",
              text: "Pre-filter by metadata before vector search — narrow the search space (e.g. only docs from the last 30 days)",
            },
          ],
        },
        {
          kind: "stats",
          items: [
            { value: "top-K", label: "typical K = 5–20", accent: "zinc" },
            { value: "~80ms", label: "ANN search latency", accent: "emerald" },
            { value: "+20%", label: "accuracy gain from reranking", accent: "violet" },
          ],
        },
      ],
      summary:
        "Retrieve broadly (top-20), rerank precisely (top-3–5) — this two-stage approach beats either alone.",
    },
    {
      id: "rag-advanced",
      title: "Advanced RAG patterns",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "HyDE — Hypothetical Document Embedding",
              accent: "violet",
              points: [
                "Ask LLM to generate a hypothetical answer to the query first",
                "Embed the hypothetical answer instead of the raw query",
                "Hypothetical answer is more similar to real docs than the question",
                "Improves recall on question-heavy queries",
              ],
            },
            {
              title: "Multi-query retrieval",
              accent: "cyan",
              points: [
                "Generate 3–5 paraphrased versions of the query",
                "Run retrieval for each version",
                "Merge and deduplicate results",
                "Catches docs that match one phrasing but not another",
              ],
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "SELF-QUERY",
              accent: "emerald",
              text: 'LLM generates metadata filters from the query — "docs from Q3 2024" → filter: {quarter: "Q3", year: 2024}',
            },
            {
              label: "PARENT DOC",
              accent: "amber",
              text: "Embed small child chunks, retrieve parent chunks for context — best of both worlds",
            },
          ],
        },
      ],
      summary:
        "HyDE and multi-query improve recall; parent-doc retrieval improves context quality — combine for production.",
    },
    {
      id: "rag-vs-finetuning",
      title: "RAG vs fine-tuning — when to use each",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "Use RAG when…",
              accent: "violet",
              points: [
                "Knowledge changes frequently (docs, pricing, policies)",
                "You need cited, verifiable answers",
                "You have a large, heterogeneous knowledge base",
                "Budget is constrained — no GPU training costs",
                "You need to add knowledge in hours, not days",
              ],
            },
            {
              title: "Use fine-tuning when…",
              accent: "amber",
              points: [
                "You need a specific response style or tone",
                "Teaching the model a new task format or domain language",
                "Latency is critical and you can't afford retrieval overhead",
                "The knowledge is stable and won't change often",
              ],
            },
          ],
        },
        {
          kind: "text",
          text: "In practice, **combine both**: fine-tune for style and format, RAG for knowledge. Most production AI assistants do this.",
        },
      ],
      summary:
        "RAG for knowledge, fine-tuning for behavior — they solve different problems and complement each other.",
    },
    {
      id: "rag-stack",
      title: "Choosing your RAG stack",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "Embedding models",
              accent: "cyan",
              points: [
                "`text-embedding-3-small` (OpenAI) — fast, cheap",
                "`nomic-embed-text` — open source, self-hostable",
                "`mxbai-embed-large` — top MTEB score open source",
                "Same model must embed both docs and queries",
              ],
            },
            {
              title: "Vector databases",
              accent: "violet",
              points: [
                "`pgvector` — add to existing Postgres, great for <10M vecs",
                "`Qdrant` — self-hosted, fast, filtering support",
                "`Pinecone` — fully managed, serverless",
                "`Weaviate` — built-in hybrid search (BM25 + vector)",
              ],
            },
            {
              title: "Orchestration",
              accent: "emerald",
              points: [
                "`LangChain` — most ecosystem, complex API",
                "`LlamaIndex` — better for document indexing",
                "`Haystack` — production pipelines",
                "Raw API calls — simplest, most control",
              ],
            },
          ],
        },
      ],
      summary:
        "pgvector + nomic-embed + direct API calls is the lowest-complexity stack that scales to millions of documents.",
    },
  ],
};
