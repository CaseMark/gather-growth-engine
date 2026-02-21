# Gather Growth Engine — Product Specification

**Status:** Living document — update as we add capabilities and refine.  
**Host:** [growth.gatherhq.com](https://growth.gatherhq.com)

---

## 1. Overview

Gather Growth Engine is an automated outbound sales engine that does what SDRs do: it understands your product, builds a playbook and ICP, personalizes emails at scale, sends via Instantly, and continuously optimizes for deliverability and website visits using statistical A/B testing.

**Core value:** Turn a domain + ICP + lead list into a running, self-optimizing outbound motion with minimal manual setup.

**Secondary goals:**
- **Open source** the project so the community can use, audit, and contribute.
- **Extensible** so community members can add modules (e.g. LinkedIn auto-posting) without forking the core.

**Cost model:**
- **Project owner pays $0** — no infrastructure costs, no API usage costs.
- **Users bring their own API keys** — each user provides their own Anthropic, Instantly, and any other required API keys.
- **All API calls use user's keys** — agent calls, email sending, and any third-party integrations use the user's credentials.
- **Future monetization:** Optional paid modules (e.g. premium LinkedIn module), security features, or hosted instances (if offered) can be charged separately. Core engine remains free and open source.

---

## 2. User journey (end-to-end)

| Step | Actor | Action |
|------|--------|--------|
| 1 | User | Signs up / logs in |
| 2 | User | Enters their **domain** (e.g. `acme.com`) |
| 3 | User | Provides API keys: **Anthropic**, **Instantly**, and any others required |
| 4 | System | Agent **crawls the home page** of the domain and infers what the product does |
| 5 | User | Provides **ICP** (Ideal Customer Profile) |
| 6 | System | Agent generates an **outbound email playbook** (sequence) based on ICP + product understanding |
| 7 | User | **Approves** playbook, ICP, and **proof points** (optional) |
| 8 | System | **Pulls leads** from connected source(s): CSV upload, Google Sheet, or API |
| 9 | System | **Dedupe** → **Verify** (email) → **Classify** (persona + vertical from user-defined ICPs) |
| 10 | System | Agent writes **hyper-personalized email sequence** per lead (Claude, playbook + proof points + lead fields) |
| 11 | System | **Pushes** to sending provider (Instantly.ai or community-contributed alternative); **ramp outbound** |
| 12 | System | **Pulls analytics** (opens, clicks, visits); **classifies replies**; **updates performance memory** |
| 13 | System | **Strategy engine** feeds learnings back into generation; A/B + statistical significance; **repeat** |

---

## 3. Capabilities (feature list)

### 3.1 Authentication & onboarding
- [ ] Sign up / login (mechanism TBD: email+password, OAuth, etc.)
- [ ] New-user flow: collect **domain**
- [ ] Collect and store **API keys** per user/tenant:
  - Anthropic (required for agent)
  - Instantly (required for sending)
  - Others as needed (e.g. analytics, CRMs)
- [ ] Secure storage of keys (secrets manager / env per tenant — never in code or logs)

### 3.2 Product understanding
- [ ] Crawl user’s **home page** (single URL from domain)
- [ ] Agent summarizes what the product does (for use in playbook and email copy)
- [ ] Store this “product summary” and optionally let user edit it
- [ ] User can configure **proof points** (e.g. case studies, metrics, testimonials) used in playbook and personalized copy

### 3.3 ICP & playbook
- [ ] User defines **ICP** (e.g. company size, industry, role, pain points)
- [ ] User can add **proof points** (or reference them from product config) for use in sequences
- [ ] Agent generates an **outbound email playbook** (sequence) from:
  - Product summary
  - ICP
  - Proof points (when configured)
  - Best practices (tone, length, structure)
- [ ] User can **edit and approve** playbook and ICP before going live
- [ ] Versioning of playbook (optional for v1) for rollback and A/B

### 3.4 Lead sources & pipeline
- [ ] **Connected lead sources:** engine pulls leads from one or more of:
  - **CSV** upload (current)
  - **Google Sheet** (connect via OAuth or link; sync/refresh)
  - **API** (user-provided endpoint or community connector)
- [ ] **Lead pipeline** (before personalization):
  - **Dedupe:** don’t email same lead twice across plays; list hygiene
  - **Verify:** email verification (deliverability / bounce risk) before sending
  - **Classify:** assign **persona** and **vertical** (or similar tags) from user-defined ICPs so copy can be tailored
- [ ] **Personalization:** Agent writes **hyper-personalized email sequence** per lead using:
  - Approved playbook + proof points
  - Lead fields (job, company, industry) and classified persona/vertical
  - Explicit “how they benefit” from this product
- [ ] Preview / approve batch before sending (optional for v1)

### 3.5 Sending & ramp
- [ ] **Instantly** integration: create campaign, add leads, queue emails (primary); **community-contributed alternatives** (e.g. other ESPs) via modules
- [ ] **Domains & inboxes (Instantly):** Buy new domains and inboxes via Instantly Done-For-You (DFY) or order pre-warmed domains; list accounts; enable/disable warmup per account as needed
- [ ] **Ramp** logic: control daily/weekly volume to avoid spam flags
- [ ] Respect user-defined sending limits and Instantly best practices

### 3.6 Analytics, replies & strategy engine
- [ ] **Pull analytics:** ingest **opens**, **clicks**, and (where possible) **website visits** from sending provider
- [ ] **Classify replies:** categorize inbound replies (e.g. positive, objection, out-of-office) for learning and routing
- [ ] **Performance memory:** persistent store of what works (by persona, vertical, variant) — used to inform future generation
- [ ] **Strategy engine:** feeds learnings (analytics + reply classification + performance memory) back into:
  - Variant selection and **auto-tweak** of subject lines, body, CTA
  - **A/B testing** with **statistical significance** before declaring a winner
  - Optional refinement of playbook or ICP suggestions
- [ ] **Repeat:** continuous loop — pull leads → pipeline → personalize → send → pull analytics → update memory → strategy engine → next cycle
- [ ] Simple dashboard: performance by variant, trend over time, reply insights

### 3.7 Extensibility (modules)
- [ ] **Module contract**: define what a “module” is (config schema, hooks, UI surface)
- [ ] **Registry**: modules register themselves (e.g. “LinkedIn”, “Twitter”)
- [ ] **Example module — LinkedIn**: daily posts that are relevant to the user’s audience (details TBD)
- [ ] Community can add modules without forking core; core stays stable and minimal

---

## 4. Technical direction (to be refined)

- **Cost model:** Users provide their own API keys (Anthropic, Instantly, etc.). All API calls use user's keys — project owner incurs zero costs. Keys stored encrypted per user/tenant; never in repo, client, or logs.
- **Secrets:** Per-user/tenant storage; encrypted at rest; never in repo or client. Each user's API keys are isolated and used only for their own operations.
- **Agent:** Orchestration for (1) crawl → product summary, (2) ICP + summary + proof points → playbook, (3) playbook + proof points + lead (incl. persona/vertical) → email sequence; (4) strategy engine uses performance memory to suggest/tweak variants. All agent calls use the user's Anthropic API key.
- **Lead pipeline:** Dedupe (per-workspace/global), verify (email deliverability), classify (persona + vertical from ICP). Classification can be rule-based or agent-assisted; output feeds personalization.
- **Lead sources:** CSV (current), Google Sheet (OAuth or share link), API (user endpoint or connector). Unified “lead list” abstraction so pipeline and sending are source-agnostic.
- **Performance memory:** Store what works (by segment, variant, outcome). Strategy engine reads this to bias generation and A/B decisions; updated from analytics and reply classification.
- **Strategy engine:** Consumes analytics, reply classification, and performance memory; outputs tweaks to copy/variants and optional playbook/ICP suggestions. Loop: learn → update memory → feed next generation.
- **A/B & stats:** Variant assignment, metric collection, significance testing (e.g. proportions, confidence intervals), and a small “experiment” abstraction.
- **Instantly:** Use their API for campaigns, leads, and sending; we own strategy and copy. Domains and inboxes via Instantly DFY and warmup APIs. Community modules can add alternative sending providers.
- **Modules:** Plugin loader, config schema per module, and defined extension points (e.g. “add step after playbook approval”, “add channel: LinkedIn”, “add lead source”).

---

## 5. Plan (phased roadmap)

**Phase 1 — Core loop (done or in progress)**  
Auth, onboarding, product summary, ICP + playbook, leads (CSV) + personalize, Instantly (send + domains/inboxes).

| Order | Step | Status | Description |
|-------|------|--------|-------------|
| 1 | Lock stack & scaffold | ✅ | Next.js, DB, auth, repo structure. |
| 2 | Auth | ✅ | Sign up / login (email+password). |
| 3 | Onboarding UI + storage | ✅ | Domain, API keys (Anthropic, Instantly); encrypted at rest. |
| 4 | Crawl + product summary | ✅ | Fetch home page, agent summarizes product; save and display. |
| 5 | ICP + playbook (v0) | ✅ | User enters ICP; agent generates sequence; user edits/approves. |
| 6 | Leads CSV + personalize | ✅ | Upload CSV; agent personalizes step-1 (preview). Domains & inboxes (Instantly) in Advanced UI. |
| 7 | Instantly send | ✅ | Create campaign, add leads, ramp (slow for unwarmed mailboxes), activate. |
| 8 | Monitor + A/B (v0) | ✅ | Sent campaigns list; pull opens/clicks from Instantly; dashboard Campaign performance (stats + suggestion). |

**Phase 2 — Config, sources, pipeline**  
Proof points, multiple lead sources, lead pipeline (dedupe → verify → classify).

| Order | Step | Status | Description |
|-------|------|--------|-------------|
| 9 | **Proof points** | ✅ | User-configurable (optional title + text); used in playbook and personalized emails. |
| 10 | **Lead sources** | ✅ | Google Sheet connector; API connector (or generic “connected source”). |
| 11 | **Lead pipeline** | ✅ | **Dedupe** (per-workspace on import); **Verify** (syntax + MX); **Classify** (persona + vertical via Claude from ICP). Pipeline UI and personalization use persona/vertical. |

**Phase 3 — Learning loop**  
Analytics, reply classification, performance memory, strategy engine.

| Order | Step | Status | Description |
|-------|------|--------|-------------|
| 12 | **Analytics + reply classification** | ✅ | Pull opens/clicks (existing); log replies; classify via Claude; store in CampaignReply. |
| 13 | **Performance memory** | ✅ | Persistent store (PerformanceObservation) by persona/vertical; updated when campaign analytics are fetched and when replies are classified; GET /api/performance-memory returns aggregated learnings; dashboard shows By persona / By vertical tables. |
| 14 | **Strategy engine** | ✅ | Feed performance memory into personalization and playbook generation prompts; getStrategySuggestion() for actionable tweaks; suggestion shown in Performance memory card. (Full A/B variants + significance in a future iteration.) |

**Immediate next:** Phase 3 complete. Optional: A/B variants with statistical significance; further strategy automation.

---

## 7. Open questions & decisions

- [ ] Auth: email+password vs OAuth (Google, etc.) vs both?
- [ ] Multi-tenant: one account = one “workspace” or multiple workspaces per account?
- [ ] Playbook versioning: full version history in v1 or later?
- [ ] Preview before send: required or optional?
- [ ] Proof points: free-text list vs structured (title, metric, link)? Single list or per-ICP?
- [ ] Lead sources: Google Sheet — OAuth vs “paste sheet URL + API key”? API — webhook vs polling?
- [ ] Classify: rule-based (keywords + ICP) vs Claude-based? Schema for persona/vertical (fixed set vs user-defined)?
- [ ] Performance memory: schema (which dimensions to key on); retention and pruning.
- [ ] LinkedIn (and other) module: exact scope and data (e.g. “audience” = ICP + existing leads?)?

---

## 8. Changelog

| Date | Change |
|------|--------|
| 2025-02-20 | Initial spec: user journey, capabilities, technical direction, open questions, extensibility (LinkedIn example). |
| 2025-02-20 | Added §5 What's next (Phase 1): 8-step roadmap; immediate next = stack + scaffold + auth. Renumbered §6–§8. |
| 2025-02-20 | Added cost model: users bring their own API keys (Anthropic, Instantly, etc.); project owner pays $0. Updated §1 Overview and §4 Technical direction. Future monetization via optional paid modules/features. |
| 2025-02-20 | Auth wired: NextAuth.js with email/password, Prisma + SQLite, protected routes (dashboard, onboarding). Users can sign up, log in, and access protected pages. Step 2 complete ✅. |
| 2025-02-20 | Steps 3–6 complete: onboarding (domain + keys), crawl + product summary, ICP + playbook (edit/approve), leads CSV upload + personalized step-1 emails (preview). Chat panel for refining copy. |
| 2025-02-20 | Domains & inboxes: dashboard section to list Instantly accounts, enable/disable warmup, check domain availability, load pre-warmed domain list, and place DFY orders (new domains + inboxes or pre-warmed) with optional simulation. |
| 2025-02-20 | New requirements added: proof points (product/ICP); connected lead sources (CSV, Google Sheet, API); lead pipeline (Dedupe → Verify → Classify by persona/vertical); classify replies + performance memory; strategy engine feeding learnings back. User journey (§2), capabilities (§3), technical direction (§4) updated. Plan (§5) rewritten as phased roadmap: Phase 1 (steps 1–8), Phase 2 (proof points, lead sources, pipeline), Phase 3 (analytics, reply classification, performance memory, strategy engine). Open questions (§7) expanded. |
| 2025-02-20 | Step 8 done: Campaign performance dashboard (sent campaigns list, analytics: sent/opens/clicks/replies + rates, suggestion when open rate &lt; 15%); refetch sent campaigns after Send to Instantly. Immediate next = Step 9 (Proof points). |
| 2025-02-20 | Step 9 done: Proof points. Workspace.proofPointsJson; UI in ICP & Playbook (add/remove/edit, optional title + text); playbook generation and lead personalization prompts include proof points. Immediate next = Step 10 (Lead sources). |
| 2025-02-20 | Step 10 done: Lead sources. Google Sheet import (paste URL, sheet shared Anyone can view); API import (URL + optional API key, JSON leads). Shared createBatchWithLeads in lib/leads. Immediate next = Step 11 (Lead pipeline). |
| 2025-02-20 | Step 11 done: Lead pipeline. Dedupe on import (per-workspace + same-batch); Verify (syntax + MX) via POST /api/leads/verify; Classify (persona + vertical from ICP via Claude) via POST /api/leads/classify. Dashboard: Verify/Classify buttons, Verified/Persona/Vertical columns, pipeline message. Personalization uses persona/vertical when set. |
| 2025-02-20 | Step 12 done: Analytics + reply classification. CampaignReply model; POST/GET /api/instantly/sent-campaigns/[id]/replies to log and list replies; classify with Claude (positive, objection, ooo, not_interested, other). Campaign performance section: Replies table + Log reply form. Stored for future performance memory (Step 13). |
| 2025-02-20 | Step 13 done: Performance memory. PerformanceObservation model (workspaceId, dimensionType, dimensionValue, metric, value, sourceType, sourceId). recordCampaignObservations when analytics fetched (per persona/vertical from batch leads); recordReplyObservation when reply logged (match lead by email). GET /api/performance-memory returns aggregated byPersona/byVertical (avg rates, sum counts). Dashboard: Performance memory card with By persona / By vertical tables. |
| 2025-02-20 | Step 14 done: Strategy engine. Performance memory fed into personalization prompt (per-lead segment stats); playbook generation prompt includes "Performance so far" block. getStrategySuggestion() in lib/performance-memory (persona/vertical comparisons, low open-rate hint); GET /api/performance-memory returns suggestion; dashboard shows Strategy suggestion in Performance memory card. |

---

*Last updated: 2025-02-20*
