# Adding a skill (pluggable module)

Skills are pluggable modules that can run on a schedule (e.g. “post to LinkedIn twice a day”) or on demand via the dashboard or MCP.

## 1. Create the skill folder

Under `skills/`, add a new folder with the skill id (e.g. `linkedin-engagement`):

```
skills/
  your-skill-id/
    manifest.json   # id, name, description, optional schedule
    run.ts          # default export: run(context) => Promise<SkillRunResult>
```

## 2. `manifest.json`

```json
{
  "id": "your-skill-id",
  "name": "Human-readable name",
  "description": "What this skill does.",
  "schedule": {
    "cron": "0 9,18 * * *",
    "timezone": "America/New_York"
  }
}
```

- **schedule** (optional): If present, the skill is run by the cron job at the times defined in `vercel.json` (e.g. 9:00 and 18:00 UTC). The `schedule` in the manifest is for documentation; the actual trigger is the single cron in `vercel.json`. To run at different times, add more entries to `vercel.json` → `crons` or change the single schedule.

## 3. `run.ts`

```ts
import type { SkillRunContext, SkillRunResult } from "../types";

export async function run(context: SkillRunContext): Promise<SkillRunResult> {
  const { userId, config } = context;
  // config: optional object from POST body or stored config
  try {
    // Your logic (e.g. call LinkedIn API, post content).
    return { ok: true, message: "Done.", data: {} };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Failed",
      error: String(e),
    };
  }
}
```

## 4. Register the skill

In `skills/registry.ts`:

1. Import the manifest and run function:
   ```ts
   import yourManifest from "./your-skill-id/manifest.json";
   import { run as yourRun } from "./your-skill-id/run";
   ```
2. Add to the `skills` array:
   ```ts
   {
     manifest: yourManifest as Skill["manifest"],
     run: yourRun,
   },
   ```

## 5. APIs

- **GET /api/skills** – List all skills (no auth).
- **POST /api/skills/[skillId]/run** – Run a skill. Auth: session (dashboard) or `X-API-Key` (MCP). Body: `{ "config": { ... } }` optional.

## 6. Cron (scheduled run)

Vercel Cron calls **GET /api/cron** at the schedule in `vercel.json` (e.g. twice daily). Set **CRON_SECRET** in Vercel and configure the cron to send `Authorization: Bearer <CRON_SECRET>`. The handler runs every skill that has a `schedule` in its manifest.

## 7. MCP

The MCP server exposes **list_skills** and **run_skill**. AI assistants can discover and run your skill via MCP once the server is configured with the app URL and API key.

## Example: LinkedIn twice a day

See `skills/linkedin-engagement/`: a stub that returns success. Replace the body of `run.ts` with your LinkedIn API calls (e.g. using credentials from `config` or env like `LINKEDIN_ACCESS_TOKEN`).
