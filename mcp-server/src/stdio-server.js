#!/usr/bin/env node
/**
 * MCP server for Gather Growth Engine (no SDK dependency). Uses JSON-RPC over stdio.
 * Set GATHER_GROWTH_API_URL, MCP_API_KEY (or GATHER_GROWTH_API_KEY), and optionally MCP_USER_ID.
 */
const API_URL = process.env.GATHER_GROWTH_API_URL || "https://growth.gatherhq.com";
const API_KEY = process.env.MCP_API_KEY || process.env.GATHER_GROWTH_API_KEY || "";

function apiHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };
}

async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`, { headers: apiHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function apiPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const TOOLS = [
  {
    name: "list_campaigns",
    description: "List all lead campaigns (batches) for the connected workspace. Returns id, name, leadCount, createdAt.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_skills",
    description: "List all registered pluggable skills (e.g. linkedin-engagement). Returns id, name, description, schedule.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "run_skill",
    description: "Run a skill by id. Optional config object passed to the skill.",
    inputSchema: {
      type: "object",
      properties: {
        skillId: { type: "string", description: "Skill id (e.g. linkedin-engagement)" },
        config: { type: "object", description: "Optional config for the skill" },
      },
      required: ["skillId"],
    },
  },
];

async function handleToolCall(name, args) {
  if (name === "list_campaigns") {
    const data = await apiGet("/api/leads");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], isError: false };
  }
  if (name === "list_skills") {
    const data = await apiGet("/api/skills");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], isError: false };
  }
  if (name === "run_skill") {
    const skillId = (args && args.skillId) || "";
    const config = (args && args.config) || undefined;
    const data = await apiPost(`/api/skills/${encodeURIComponent(skillId)}/run`, { config });
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], isError: false };
  }
  return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
}

function send(msg) {
  console.log(JSON.stringify(msg));
}

async function handleMessage(msg) {
  const { id, method, params } = msg;
  if (!id && method !== "notifications/initialized") return;
  try {
    if (method === "initialize") {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "gather-growth-engine", version: "0.2.0" },
          capabilities: { tools: {} },
        },
      });
      return;
    }
    if (method === "tools/list") {
      send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
      return;
    }
    if (method === "tools/call") {
      const { name, arguments: args } = params || {};
      const result = await handleToolCall(name, args);
      send({ jsonrpc: "2.0", id, result });
      return;
    }
    if (method === "notifications/initialized") return;
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: message }], isError: true } });
  }
}

async function main() {
  process.stderr.write("Gather Growth Engine MCP server (stdio) running.\n");
  const rl = await import("readline");
  const readline = rl.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of readline) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const msg = JSON.parse(trimmed);
      await handleMessage(msg);
    } catch (e) {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    }
  }
}

main().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exit(1);
});
