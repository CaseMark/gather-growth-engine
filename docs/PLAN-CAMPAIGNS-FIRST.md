# Plan: Campaigns-first dashboard & Vercel build fix

## 1. Vercel build fix (immediate)

**Problem:** Build fails with "Call retries were exceeded" and `prisma generate && prisma db push && next build` exits with 1.

**Cause:** `prisma db push` runs at build time and requires a live DB connection. On Vercel this can timeout, hit connection limits, or fail in worker environments.

**Change:**
- In `vercel.json`, set `buildCommand` to `prisma generate && next build` (remove `prisma db push`).
- Apply schema changes (e.g. `prisma db push` or migrations) outside the Vercel build: locally, or in a separate deploy step, or via Vercel’s “Deploy” hook with DB access. Document in README if needed.

**No data model or app logic changes.**

---

## 2. Campaigns-first re-architecture (UX)

**Goal:** App starts with a **Campaigns** table. Users create campaigns, then click into one to see leads, emails (sequence), prepare/send, and stats.

**Current state:**
- Dashboard: stats cards → ICP/Playbook → Leads & personalized emails (batch selector, upload, prepare, send) → Campaign performance (sent campaigns table) → Performance memory.
- “Campaign” in backend = SentCampaign (after “Send to Instantly”). A “batch” (LeadBatch) is the pre-send container (leads + name).

**Target state:**
- **Primary entry:** One **Campaigns** table at the top listing all “campaigns”. Each row = one LeadBatch (we treat batch = campaign for UX). Columns: Name, Lead count, Status (Draft | Prepared | Sent), Created. “Create campaign” = create a new batch (existing upload/import flow).
- **Drill-down:** Clicking a row selects that campaign (batch). Below the table (or in a detail panel), show **Campaign detail** for the selected campaign:
  - **Info:** Name, created, status.
  - **Leads:** Paginated leads table (existing).
  - **Sequence:** Playbook steps (read-only or link to edit in ICP section).
  - **Prepare:** Prepare-leads flow (existing: personalize, optional verify/classify).
  - **Send:** Send to Instantly (existing: campaign name, accounts, A/B).
  - **Stats:** If this batch has been sent (exists in SentCampaign), show opens/clicks/replies, Pause, replies table, “View batch leads” (existing).
- **Create campaign:** Button at top opens or focuses the “add leads” flow (CSV / Sheet / API) and creates a new batch; new batch appears in table and can be selected.

**Data model (unchanged):**
- LeadBatch = one campaign (name, leads). SentCampaign links to leadBatchId when sent.
- All existing APIs stay: batches, leads, generate, verify, classify, send, sent-campaigns, analytics, pause, performance memory, playbook, proof points.

**UI structure (concrete):**
1. **Dashboard (single page):**
   - Stats cards (optional, keep as-is).
   - **Campaigns** card (first content card):
     - Title: “Campaigns”. Subtitle: “Create a campaign or select one to view leads, sequence, and stats.”
     - “Create campaign” button → expands or scrolls to “Add leads” (upload/import); on success, new batch appears in table and is selected.
     - Table: batches (id, name, leadCount, status, createdAt). Status = “Draft” (no stepsJson on any lead), “Prepared” (has personalized leads), or “Sent” (exists in sentCampaigns for this batch).
     - Row click → set `selectedBatchId`, scroll/focus to Campaign detail.
   - **Campaign detail** card (only when a batch is selected):
     - Shows selected batch name; sections: Leads (table, paginated), Sequence (playbook summary), Prepare (button + options + progress), Send (to Instantly), Stats (if sent: analytics, Pause, replies).
   - **ICP & Playbook** card: unchanged; required before prepare/send.
   - **Performance memory** card: unchanged.

2. **Order of sections (top to bottom):**
   - Campaigns (table + create).
   - If batch selected → Campaign detail (leads, sequence, prepare, send, stats).
   - ICP & Playbook.
   - Performance memory.
   - Domains & inboxes (existing).
   - Chat (existing).

**Linking “Sent” in table:** For each batch, compute “sent” by checking if any SentCampaign.leadBatchId === batch.id. Show “Sent” in status and, in detail, show Stats (and Pause) for that SentCampaign.

**Regression checklist (preserve all of these):**
- [ ] Upload CSV / Import Sheet / Fetch API → creates batch, leads.
- [ ] Batch selector (or single selected campaign) → leads table, paginated.
- [ ] Prepare leads (modal: personalize / verify / classify) → generate, verify, classify in chunks with progress %.
- [ ] Send to Instantly (accounts, A/B) → create campaign, add leads, ramp, activate.
- [ ] Sent campaigns: list, Pause, analytics (opens, clicks, replies), reply logging, A/B comparison.
- [ ] Performance memory, strategy suggestion.
- [ ] Playbook approve/edit, proof points, chat.
- [ ] Domain chips multi-select (add/toggle).
- [ ] Job title in personalization.

---

## 3. Implementation steps (order)

1. **Fix build:** Update `vercel.json` buildCommand → `prisma generate && next build`. Commit and note that schema changes must be applied separately (e.g. `prisma db push` locally or in CI).
2. **Dashboard reorder:** Move “Campaigns” (batches table) to the first main card after stats. Add “Create campaign” that focuses add-leads; table shows all batches with columns: Name, Leads, Status (Draft/Prepared/Sent), Created; row click selects batch.
3. **Campaign detail block:** When `selectedBatchId` is set, render one “Campaign detail” card below the table with: batch name, Leads table (existing), Sequence (playbook steps summary or link), Prepare section (existing), Send section (existing), and if batch is sent (has SentCampaign): Stats (analytics, Pause, replies). Reuse existing components; no new routes for now.
4. **Status column:** For each batch, derive status: if any SentCampaign.leadBatchId === batch.id → “Sent”; else if any lead has stepsJson → “Prepared”; else “Draft”.
5. **Remove or relocate:** The old “Leads & personalized emails” card content (upload, batch dropdown, prepare, send, leads table) is merged into: (a) Campaigns table + Create campaign, (b) Campaign detail (leads, prepare, send, stats). So the former standalone “Leads & personalized emails” card is replaced by Campaigns + Campaign detail. Keep one batch selector in Campaign detail (or rely on “selected from table” only).
6. **Sent campaigns:** Keep SentCampaign list for resolving “is this batch sent?” and for Stats in campaign detail. No separate “Campaign performance” card at top; its content lives under Campaign detail when the selected campaign is sent.
7. **Testing:** Create campaign (upload leads) → select → Prepare → Send → open Stats; verify no regression (domain chips, prepare options, pause, etc.).

---

## 4. Out of scope (this iteration)

- New route `/dashboard/campaign/[id]` for deep linking (can add later).
- Renaming LeadBatch to Campaign in the database (UI only uses “Campaign” for batches).
- Changing API contracts.
