# Gather Growth Engine – MCP Server

This MCP (Model Context Protocol) server exposes the app so AI assistants (Cursor, Claude, etc.) can call it via MCP tools.

## Setup

1. **Environment variables** (when running the server):
   - `GATHER_GROWTH_API_URL` – Base URL of your app (e.g. `https://growth.gatherhq.com`). Defaults to that if unset.
   - `MCP_API_KEY` or `GATHER_GROWTH_API_KEY` – API key for the app (set this in your app’s env as well; e.g. Vercel env vars).
   - `MCP_USER_ID` (optional) – User ID to use for API-key requests (so “list campaigns” etc. are scoped to that user’s workspace). Get this from your database (User.id) for the account you want MCP to act as.

2. **App env (Vercel / .env)**:
   - `MCP_API_KEY` or `GATHER_GROWTH_API_KEY` – Same value as above.
   - `MCP_USER_ID` – Same user ID as above (so list_campaigns returns that user’s batches).

## Running

No build required for the default server (zero dependencies):

- **Run:**  
  `node src/stdio-server.js`  
  or from repo root:  
  `node mcp-server/src/stdio-server.js`

- **With env:**  
  `GATHER_GROWTH_API_URL=... MCP_API_KEY=... node src/stdio-server.js`

The server uses **stdio** (stdin/stdout) so MCP clients spawn it as a subprocess.

## Tools exposed

| Tool            | Description |
|----------------|-------------|
| `list_campaigns` | List lead campaigns (batches) for the workspace. |
| `list_skills`    | List registered skills (e.g. linkedin-engagement). |
| `run_skill`      | Run a skill by id; optional `config` object. |

## Adding to Cursor

In Cursor MCP settings, add a server that runs this process, for example:

- **Command:** `node` (or `npx tsx src/index.ts` if you use tsx)
- **Args:** path to `mcp-server/dist/index.js` (after `npm run build`) or `mcp-server/src/index.ts` with tsx
- **Env:** `GATHER_GROWTH_API_URL`, `MCP_API_KEY`, `MCP_USER_ID` as above

Example (run from repo root; replace `/path/to` with your actual path):

```json
{
  "mcpServers": {
    "gather-growth": {
      "command": "node",
      "args": ["/path/to/gather-growth-engine/mcp-server/src/stdio-server.js"],
      "env": {
        "GATHER_GROWTH_API_URL": "https://growth.gatherhq.com",
        "MCP_API_KEY": "your-api-key",
        "MCP_USER_ID": "your-user-id-from-db"
      }
    }
  }
}
```

The default server (`stdio-server.js`) has **no npm dependencies** and works with Node 18+. An optional TypeScript version that uses `@modelcontextprotocol/sdk` is in `src/index.ts`; run `npm install` and `npm run build` then `npm run start:sdk` if you prefer that.
