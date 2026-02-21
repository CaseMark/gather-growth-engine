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
| 7 | User | **Approves** playbook and ICP |
| 8 | User | Uploads a **CSV of leads** |
| 9 | System | Agent writes **hyper-personalized emails** per lead using playbook + job, company, industry, and benefit-to-them |
| 10 | System | Uses **Instantly** to queue emails and **ramp outbound** |
| 11 | System | **Monitors** opens, clicks, and (where possible) website visits |
| 12 | System | Uses **statistical significance** to A/B test and **auto-tweak** content to optimize deliverability and website visits |

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

### 3.3 ICP & playbook
- [ ] User defines **ICP** (e.g. company size, industry, role, pain points)
- [ ] Agent generates an **outbound email playbook** (sequence) from:
  - Product summary
  - ICP
  - Best practices (tone, length, structure)
- [ ] User can **edit and approve** playbook and ICP before going live
- [ ] Versioning of playbook (optional for v1) for rollback and A/B

### 3.4 Leads & personalization
- [ ] User uploads **CSV of leads** (columns: email, name, job title, company, industry, etc.)
- [ ] Agent writes **one hyper-personalized email per lead** using:
  - Approved playbook
  - Lead fields: job, company, industry
  - Explicit “how they benefit” from this product
- [ ] Preview / approve batch before sending (optional for v1)
- [ ] Dedupe and list hygiene (e.g. don’t email same lead twice across plays)

### 3.5 Sending & ramp
- [ ] **Instantly** integration: create campaign, add leads, queue emails
- [ ] **Ramp** logic: control daily/weekly volume to avoid spam flags
- [ ] Respect user-defined sending limits and Instantly best practices

### 3.6 Monitoring & optimization
- [ ] Ingest **opens** and **clicks** (from Instantly or other provider)
- [ ] Track **website visits** from outbound (e.g. UTM or dedicated landing)
- [ ] **A/B testing**: multiple variants (subject lines, body, CTA)
- [ ] **Statistical significance** checks before declaring a winner
- [ ] **Auto-tweak**: system adjusts content toward better deliverability and website visits
- [ ] Simple dashboard: performance by variant, trend over time

### 3.7 Extensibility (modules)
- [ ] **Module contract**: define what a “module” is (config schema, hooks, UI surface)
- [ ] **Registry**: modules register themselves (e.g. “LinkedIn”, “Twitter”)
- [ ] **Example module — LinkedIn**: daily posts that are relevant to the user’s audience (details TBD)
- [ ] Community can add modules without forking core; core stays stable and minimal

---

## 4. Technical direction (to be refined)

- **Cost model:** Users provide their own API keys (Anthropic, Instantly, etc.). All API calls use user's keys — project owner incurs zero costs. Keys stored encrypted per user/tenant; never in repo, client, or logs.
- **Secrets:** Per-user/tenant storage; encrypted at rest; never in repo or client. Each user's API keys are isolated and used only for their own operations.
- **Agent:** Orchestration for (1) crawl → product summary, (2) ICP + summary → playbook, (3) playbook + lead → email; optional (4) performance → suggest/tweak variants. All agent calls use the user's Anthropic API key.
- **A/B & stats:** Variant assignment, metric collection, significance testing (e.g. proportions, confidence intervals), and a small “experiment” abstraction.
- **Instantly:** Use their API for campaigns, leads, and sending; we own strategy and copy. All Instantly API calls use the user's Instantly API key.
- **Modules:** Plugin loader, config schema per module, and defined extension points (e.g. “add step after playbook approval”, “add channel: LinkedIn”).

---

## 5. What's next (Phase 1 — get running)

Goal: a runnable app with auth, onboarding (domain + keys), and the first agent step (crawl → product summary) so we can iterate.

| Order | Step | Description |
|-------|------|-------------|
| 1 | **Lock stack & scaffold** | Choose stack (Next.js, DB, auth), create repo structure, `npm run dev` works. |
| 2 | **Auth** | Sign up / login (start with one mechanism; expand later). |
| 3 | **Onboarding UI + storage** | Pages: domain, API keys (Anthropic, Instantly). Store in DB per user; keys encrypted at rest. |
| 4 | **Crawl + product summary** | Backend: fetch home page, run agent to summarize “what this product does,” save and display. |
| 5 | **ICP + playbook (v0)** | User enters ICP; agent generates a single playbook (e.g. 3-step sequence); user approves. |
| 6 | **Leads CSV + personalize** | Upload CSV, agent writes one email per lead; show preview (no send yet). |
| 7 | **Instantly integration** | Create campaign, add leads, queue emails, ramp. |
| 8 | **Monitor + A/B** | Ingest opens/clicks, stats, auto-tweak. |

**Immediate next:** Do step 1 (stack + scaffold) and step 2 (auth) so you have a logged-in user and can add onboarding.

---

## 7. Open questions & decisions

- [ ] Auth: email+password vs OAuth (Google, etc.) vs both?
- [ ] Multi-tenant: one account = one “workspace” or multiple workspaces per account?
- [ ] Playbook versioning: full version history in v1 or later?
- [ ] Preview before send: required or optional?
- [ ] LinkedIn (and other) module: exact scope and data (e.g. “audience” = ICP + existing leads?)?

---

## 8. Changelog

| Date | Change |
|------|--------|
| 2025-02-20 | Initial spec: user journey, capabilities, technical direction, open questions, extensibility (LinkedIn example). |
| 2025-02-20 | Added §5 What's next (Phase 1): 8-step roadmap; immediate next = stack + scaffold + auth. Renumbered §6–§8. |
| 2025-02-20 | Added cost model: users bring their own API keys (Anthropic, Instantly, etc.); project owner pays $0. Updated §1 Overview and §4 Technical direction. Future monetization via optional paid modules/features. |
| 2025-02-20 | Auth wired: NextAuth.js with email/password, Prisma + SQLite, protected routes (dashboard, onboarding). Users can sign up, log in, and access protected pages. Step 2 complete ✅. |

---

*Last updated: 2025-02-20*
