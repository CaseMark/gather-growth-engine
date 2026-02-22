#!/usr/bin/env node
/**
 * MCP server for Gather Growth Engine. Exposes tools so AI assistants can list campaigns,
 * list/run skills, and trigger prepare/send. Set GATHER_GROWTH_API_URL and MCP_API_KEY (or
 * GATHER_GROWTH_API_KEY) in env. Optional: MCP_USER_ID for workspace-scoped calls.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_URL = process.env.GATHER_GROWTH_API_URL ?? "https://growth.gatherhq.com";
const API_KEY =
  process.env.MCP_API_KEY ?? process.env.GATHER_GROWTH_API_KEY ?? "";

function apiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...(process.env.Authorization ? { Authorization: process.env.Authorization } : {}),
  };
}

async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, { headers: apiHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function apiPost(path: string, body: object): Promise<unknown> {
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

const server = new Server(
  {
    name: "gather-growth-engine",
    version: "0.2.0",
  },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_campaigns",
      description: "List all lead campaigns (batches) for the connected workspace. Returns id, name, leadCount, createdAt.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "list_skills",
      description: "List all registered pluggable skills (e.g. linkedin-engagement). Returns id, name, description, schedule.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "run_skill",
      description: "Run a skill by id. Optional config object passed to the skill.",
      inputSchema: {
        type: "object" as const,
        properties: {
          skillId: { type: "string", description: "Skill id (e.g. linkedin-engagement)" },
          config: { type: "object", description: "Optional config for the skill" },
        },
        required: ["skillId"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === "list_campaigns") {
      const data = await apiGet("/api/leads");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        isError: false,
      };
    }
    if (name === "list_skills") {
      const data = await apiGet("/api/skills");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        isError: false,
      };
    }
    if (name === "run_skill") {
      const skillId = (args?.skillId as string) ?? "";
      const config = (args?.config as object) | undefined;
      const data = await apiPost(`/api/skills/${encodeURIComponent(skillId)}/run`, { config });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        isError: false,
      };
    }
    return {
      content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: message }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Gather Growth Engine MCP server running on stdio.");
