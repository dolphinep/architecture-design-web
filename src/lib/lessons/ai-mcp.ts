import type { Lesson, LessonLab } from "@/types/lesson";

const mcpLab: LessonLab = {
  intro:
    "Build a real MCP server, inspect it with the official Inspector, then connect it to a host. You will see capability negotiation on the wire, call a tool over JSON-RPC, and expose a resource — the same protocol every MCP-capable client speaks.",
  prerequisites: [
    "Node 20+ (the Inspector runs via npx) or Python 3.10+ with uv",
    "A terminal and ~15 minutes",
    "Optional: an MCP-capable host (Claude Code, Claude Desktop, or any MCP client) for the final step",
  ],
  steps: [
    {
      id: "scaffold",
      title: "Scaffold the project",
      description:
        "An MCP server is an ordinary process that speaks JSON-RPC over a transport. No framework, no server to deploy — for local use it is a subprocess the host launches.",
      perLang: {
        typescript: {
          commands: [
            "mkdir mcp-lab && cd mcp-lab",
            "npm init -y && npm pkg set type=module",
            "npm install @modelcontextprotocol/sdk zod",
          ],
        },
        python: {
          commands: [
            "uv init mcp-lab && cd mcp-lab",
            'uv add "mcp[cli]"',
          ],
        },
      },
    },
    {
      id: "server",
      title: "Write a server with one tool and one resource",
      description:
        "Two primitives, two audiences. The **tool** is model-controlled — the model decides when to call it. The **resource** is application-controlled — the host decides when to pull it into context. Note the tool declares a typed input schema: that schema is what the model sees.",
      perLang: {
        typescript: {
          files: [
            {
              path: "server.js",
              lang: "typescript",
              content: `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "arch-lab", version: "1.0.0" });

// TOOL — model-controlled. The model calls this when it decides it needs to.
server.registerTool(
  "latency_budget",
  {
    title: "Latency budget",
    description: "Split a total latency budget across N sequential hops.",
    inputSchema: { totalMs: z.number(), hops: z.number() },
  },
  async ({ totalMs, hops }) => ({
    content: [
      {
        type: "text",
        text: \`\${hops} hops, \${totalMs}ms total → \${(totalMs / hops).toFixed(1)}ms per hop\`,
      },
    ],
  })
);

// RESOURCE — application-controlled. The host pulls this into context.
server.registerResource(
  "slo",
  "config://slo",
  { title: "Service SLOs", mimeType: "application/json" },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify({ availability: "99.9%", p99LatencyMs: 250 }),
      },
    ],
  })
);

// stdio: the host spawns this process and talks over stdin/stdout.
await server.connect(new StdioServerTransport());
`,
            },
          ],
        },
        python: {
          files: [
            {
              path: "server.py",
              lang: "python",
              content: `import json
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("arch-lab")


# TOOL — model-controlled. The model calls this when it decides it needs to.
@mcp.tool()
def latency_budget(total_ms: float, hops: int) -> str:
    """Split a total latency budget across N sequential hops."""
    return f"{hops} hops, {total_ms}ms total -> {total_ms / hops:.1f}ms per hop"


# RESOURCE — application-controlled. The host pulls this into context.
@mcp.resource("config://slo", mime_type="application/json")
def slo() -> str:
    return json.dumps({"availability": "99.9%", "p99LatencyMs": 250})


if __name__ == "__main__":
    # stdio: the host spawns this process and talks over stdin/stdout.
    mcp.run()
`,
            },
          ],
        },
      },
    },
    {
      id: "inspect",
      title: "Inspect it — watch the handshake",
      description:
        "The **MCP Inspector** is a client with a UI. Connect, then open the history pane: you will see `initialize` carrying protocol version and capabilities, your `initialized` notification, then `tools/list` and `resources/list`. That handshake is the whole discovery mechanism.",
      perLang: {
        typescript: {
          commands: ["npx @modelcontextprotocol/inspector node server.js"],
          output: `MCP Inspector running at http://localhost:6274
→ open it, hit Connect, then the Tools tab
→ call latency_budget with { "totalMs": 900, "hops": 3 }`,
        },
        python: {
          commands: ["uv run mcp dev server.py"],
          output: `MCP Inspector running at http://localhost:6274
→ open it, hit Connect, then the Tools tab
→ call latency_budget with { "total_ms": 900, "hops": 3 }`,
        },
      },
      shared: {
        output: `Result: 3 hops, 900ms total -> 300.0ms per hop

The wire call the Inspector just made:
{"jsonrpc":"2.0","id":2,"method":"tools/call",
 "params":{"name":"latency_budget","arguments":{"hops":3}}}`,
      },
    },
    {
      id: "connect",
      title: "Connect it to a host",
      description:
        "Register the server with an MCP-capable host and the tool becomes available to the model. Nothing about your server changes — the host is just another client speaking the same protocol. That is the whole point of the N+M model.",
      shared: {
        commands: [
          "claude mcp add arch-lab -- node /absolute/path/to/mcp-lab/server.js",
          "# then, in a session:  \"split a 900ms budget across 3 hops\"",
        ],
        output: `The model discovers latency_budget via tools/list, decides it applies,
and calls it — you approve the call, the result comes back as context.`,
      },
    },
    {
      id: "remote",
      title: "Go remote — and mind the auth boundary",
      description:
        "stdio only works locally. For a networked server, switch to **Streamable HTTP**. The moment you do, you are exposing an authenticated endpoint: the spec puts MCP servers behind **OAuth 2.1** as protected resources, with tokens audience-bound to your server so they cannot be replayed elsewhere.",
      shared: {
        files: [
          {
            path: "auth-checklist.md",
            lang: "markdown",
            content: `# Before exposing an MCP server on a network

- [ ] Streamable HTTP transport (not the deprecated HTTP+SSE transport)
- [ ] OAuth 2.1 — server acts as an OAuth *resource server*
- [ ] Validate the token audience (RFC 8707) — reject tokens minted for anyone else
- [ ] Never forward a client's token to a third-party upstream API
- [ ] Validate Origin headers; bind local servers to 127.0.0.1, not 0.0.0.0
- [ ] Treat every tool call as untrusted input — the model can be steered
- [ ] Scope tools narrowly: a "run_sql" tool is a database breach waiting to happen
`,
          },
        ],
      },
    },
  ],
};

export const mcpLesson: Lesson = {
  slug: "ai-mcp",
  title: "Model Context Protocol (MCP)",
  description:
    "The integration layer for AI systems — how models reach tools and data through one protocol instead of N×M bespoke connectors.",
  duration: "~12 min",
  level: "intermediate",
  tags: ["ai", "mcp", "tools", "integration", "protocol"],
  module: "AI Architecture",
  moduleOrder: 4,
  slides: [
    {
      id: "mcp-problem",
      title: "The N×M integration problem",
      body: [
        {
          kind: "text",
          text: "A model on its own is a text function. Useful work needs **tools and data** — your ticket system, your database, your filesystem. Before a standard existed, every AI app wrote its own connector for every system it touched.",
        },
        {
          kind: "stats",
          items: [
            { value: "N × M", label: "connectors without a standard", accent: "red" },
            { value: "N + M", label: "connectors with one", accent: "emerald" },
            { value: "2024", label: "MCP open-sourced by Anthropic", accent: "zinc" },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "BEFORE",
              accent: "red",
              text: "5 AI apps × 20 systems = **100 bespoke integrations**, each with its own auth, schema, and bugs",
            },
            {
              label: "AFTER",
              accent: "emerald",
              text: "5 clients + 20 servers = **25 components**, any client works with any server",
            },
            {
              label: "ANALOGY",
              accent: "cyan",
              text: "MCP is to AI integrations what **LSP** is to editors and language tooling",
            },
          ],
        },
      ],
      summary:
        "MCP collapses N×M bespoke AI integrations into N+M interoperable pieces — one protocol, many clients and servers.",
    },
    {
      id: "mcp-what",
      title: "What MCP actually is",
      body: [
        {
          kind: "text",
          text: "**MCP is a wire protocol**, not a library or a framework. It is **JSON-RPC 2.0** over a transport, with a defined handshake and a fixed set of message types. Any language that can read and write JSON on a pipe can implement it.",
        },
        {
          kind: "points",
          items: [
            {
              label: "NOT",
              accent: "red",
              text: "Not an agent framework — it does not decide *when* to call anything",
            },
            {
              label: "NOT",
              accent: "red",
              text: "Not a model API — it sits beside your inference call, not instead of it",
            },
            {
              label: "IS",
              accent: "emerald",
              text: "A **capability discovery + invocation** protocol: what exists, and how to call it",
            },
          ],
        },
      ],
      summary:
        "MCP is JSON-RPC 2.0 plus a capability handshake — a transport-level standard, not a framework.",
    },
    {
      id: "mcp-topology",
      title: "Host, client, server",
      body: [
        {
          kind: "text",
          text: "Three roles, and the distinction matters. A **host** is the application the user faces. Inside it, one **client** per connection maintains a **1:1 session** with one **server**. Servers never talk to each other.",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "Host",
              accent: "violet",
              points: [
                "The user-facing app",
                "Claude Code, an IDE, your own product",
                "Owns the model call and the conversation",
                "Enforces consent — approves tool calls",
                "Spawns and supervises clients",
              ],
            },
            {
              title: "Client",
              accent: "cyan",
              points: [
                "One per server connection",
                "Lives inside the host process",
                "Handles the handshake and framing",
                "Isolates servers from each other",
                "Never shares context between servers",
              ],
            },
            {
              title: "Server",
              accent: "emerald",
              points: [
                "Exposes tools, resources, prompts",
                "A local subprocess or a remote service",
                "Stateless or stateful — your choice",
                "Knows nothing about the model",
                "Sees only what the client sends",
              ],
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "WHY 1:1",
              accent: "amber",
              text: "Isolation is a **security boundary** — a compromised server cannot read another server's context or results",
            },
          ],
        },
      ],
      summary:
        "Host contains clients; each client holds one isolated session with one server — isolation is the security model.",
    },
    {
      id: "mcp-primitives",
      title: "Server primitives — and who controls each",
      body: [
        {
          kind: "text",
          text: "A server exposes three things. The difference between them is **who decides when they are used** — get this wrong and your server misbehaves in every host.",
        },
        {
          kind: "compare",
          cards: [
            {
              title: "Tools",
              accent: "violet",
              points: [
                "**Model**-controlled",
                "Executable functions with typed input",
                "The model chooses when to call",
                "tools/list · tools/call",
                "e.g. create_ticket, run_query",
              ],
            },
            {
              title: "Resources",
              accent: "cyan",
              points: [
                "**Application**-controlled",
                "Read-only data addressed by URI",
                "The host decides what to attach",
                "resources/list · resources/read",
                "e.g. file:///log, config://slo",
              ],
            },
            {
              title: "Prompts",
              accent: "emerald",
              points: [
                "**User**-controlled",
                "Parameterised templates",
                "The user picks one deliberately",
                "prompts/list · prompts/get",
                "e.g. a /review-pr command",
              ],
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "SIDE EFFECTS",
              accent: "amber",
              text: "Only **tools** should ever mutate state. A `resources/read` that writes something will surprise every host that prefetches it.",
            },
          ],
        },
      ],
      summary:
        "Tools are model-controlled, resources application-controlled, prompts user-controlled — only tools should have side effects.",
    },
    {
      id: "mcp-client-primitives",
      title: "The reverse direction — client primitives",
      body: [
        {
          kind: "text",
          text: "MCP is **bidirectional**. A server can ask things of the client too, which is what separates it from a plain REST integration. The server borrows the host's capabilities instead of owning them.",
        },
        {
          kind: "points",
          items: [
            {
              label: "SAMPLING",
              accent: "violet",
              text: "The server asks the **client** to run a model completion — so the server needs no API key, no model, no inference bill",
            },
            {
              label: "ROOTS",
              accent: "cyan",
              text: "The client tells the server which **URI boundaries** are in scope — 'you may look here, nowhere else'",
            },
            {
              label: "ELICITATION",
              accent: "emerald",
              text: "The server asks the **user** for input mid-operation — a missing parameter, a confirmation",
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "CONSEQUENCE",
              accent: "amber",
              text: "Sampling inverts the usual cost model: an MCP server can be **intelligent without being an AI product**",
            },
          ],
        },
      ],
      summary:
        "Sampling, roots, and elicitation let a server borrow the host's model, scope, and user — bidirectionality is the differentiator.",
    },
    {
      id: "mcp-handshake",
      title: "The handshake on the wire",
      body: [
        {
          kind: "sequence",
          title: "Initialization and a tool call",
          actors: ["Host", "Client", "Server"],
          steps: [
            {
              from: "Host",
              to: "Client",
              label: "spawn / connect",
              note: "stdio subprocess or HTTP session",
            },
            {
              from: "Client",
              to: "Server",
              label: "initialize",
              note: "protocolVersion + client capabilities",
            },
            {
              from: "Server",
              to: "Client",
              label: "result",
              style: "response",
              note: "agreed version + server capabilities",
            },
            {
              from: "Client",
              to: "Server",
              label: "notifications/initialized",
              note: "handshake complete — normal operation begins",
            },
            {
              from: "Client",
              to: "Server",
              label: "tools/list",
            },
            {
              from: "Server",
              to: "Client",
              label: "[ tool schemas ]",
              style: "response",
              note: "names, descriptions, JSON Schema inputs",
            },
            {
              from: "Client",
              to: "Host",
              label: "tools available",
              style: "response",
              note: "host injects schemas into the model call",
            },
            {
              from: "Host",
              to: "Client",
              label: "model chose create_ticket",
              note: "host asks the user to approve",
            },
            {
              from: "Client",
              to: "Server",
              label: "tools/call",
              note: "name + validated arguments",
            },
            {
              from: "Server",
              to: "Client",
              label: "content blocks",
              style: "response",
              note: "text / image / resource links",
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "NEGOTIATION",
              accent: "violet",
              text: "Version and capabilities are agreed **once**, up front — neither side assumes features the other lacks",
            },
            {
              label: "DYNAMIC",
              accent: "cyan",
              text: "`notifications/tools/list_changed` lets a server change its toolset mid-session",
            },
          ],
        },
      ],
      summary:
        "initialize → capability negotiation → initialized, then list/call — capabilities are agreed once, up front.",
    },
    {
      id: "mcp-transports",
      title: "Two transports, two threat models",
      body: [
        {
          kind: "compare",
          cards: [
            {
              title: "stdio",
              accent: "emerald",
              points: [
                "Host spawns the server as a subprocess",
                "JSON-RPC over stdin/stdout",
                "No network, no ports, no auth needed",
                "Trust boundary = the local machine",
                "Use for: local files, git, dev tooling",
              ],
            },
            {
              title: "Streamable HTTP",
              accent: "cyan",
              points: [
                "Server is a networked endpoint",
                "POST for requests, SSE for streaming",
                "Requires real authorization",
                "Supersedes the old HTTP+SSE transport",
                "Use for: shared, hosted, multi-user servers",
              ],
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "AUTH",
              accent: "amber",
              text: "HTTP servers are **OAuth 2.1 resource servers** — see the [OAuth 2.0](/learning/auth-oauth2) lesson for the underlying flow",
            },
            {
              label: "AUDIENCE",
              accent: "red",
              text: "Validate the token's **audience** (RFC 8707) — a token minted for another service must be rejected",
            },
            {
              label: "PASSTHROUGH",
              accent: "red",
              text: "Never forward a client token to an upstream API — mint your own credential instead",
            },
          ],
        },
      ],
      summary:
        "stdio for local (trust the machine), Streamable HTTP for remote (OAuth 2.1, audience-bound tokens, no token passthrough).",
    },
    {
      id: "mcp-design",
      title: "Designing a server that behaves",
      body: [
        {
          kind: "text",
          text: "The protocol is the easy part. Most MCP servers fail on **tool design**: the model only knows what your schema and description tell it, and it has a finite context budget.",
        },
        {
          kind: "points",
          items: [
            {
              label: "NARROW",
              accent: "emerald",
              text: "`create_ticket(title, priority)` beats `run_sql(query)` — a broad tool is an unbounded blast radius",
            },
            {
              label: "DESCRIBE",
              accent: "violet",
              text: "The description **is** the prompt. Say when *not* to use the tool, not just what it does.",
            },
            {
              label: "BUDGET",
              accent: "amber",
              text: "40 tools with verbose schemas can eat more context than the actual task — expose the few that matter",
            },
            {
              label: "TRUNCATE",
              accent: "amber",
              text: "Cap and paginate results. A tool returning 50k tokens poisons the rest of the conversation.",
            },
            {
              label: "ERRORS",
              accent: "cyan",
              text: "Return errors as **actionable text** — the model can retry a clear message, but not a stack trace",
            },
            {
              label: "UNTRUSTED",
              accent: "red",
              text: "Tool output re-enters the prompt. Treat it as **injection-capable** input, always.",
            },
          ],
        },
      ],
      summary:
        "Narrow tools, descriptions written as prompts, bounded output — tool design matters more than protocol details.",
    },
    {
      id: "mcp-fit",
      title: "Where MCP fits — and where it does not",
      body: [
        {
          kind: "flow",
          steps: ["User asks", "Host builds prompt", "Model picks tool", "MCP call", "Result as context", "Model answers"],
        },
        {
          kind: "compare",
          cards: [
            {
              title: "Reach for MCP",
              accent: "emerald",
              points: [
                "Multiple hosts must reach the same system",
                "You are shipping an integration for others",
                "Tools change independently of the app",
                "You want local and remote parity",
                "Capability discovery must be dynamic",
              ],
            },
            {
              title: "Skip MCP",
              accent: "red",
              points: [
                "One app, one fixed set of internal tools",
                "A direct function call is simpler",
                "Bulk retrieval — use RAG, not a tool call",
                "Hard latency budget on a hot path",
                "No trust boundary worth enforcing",
              ],
            },
          ],
        },
        {
          kind: "points",
          items: [
            {
              label: "WITH RAG",
              accent: "cyan",
              text: "They compose: [RAG](/learning/ai-rag) supplies knowledge, MCP supplies **actions and live lookups**",
            },
          ],
        },
      ],
      summary:
        "Use MCP when an integration crosses a boundary — an app, a team, or a trust domain; a plain function call wins inside one.",
    },
  ],
  lab: mcpLab,
};
