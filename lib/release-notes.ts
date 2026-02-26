/**
 * Release notes — human-readable, value-first.
 * ALWAYS add new features and bug fixes here when shipping.
 * Format: { title, description, author, date }
 */

export type ReleaseNote = {
  title: string;
  description: string;
  author: string;
  date: string; // YYYY-MM-DD
};

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    title: "Next.js upgrade compatibility",
    description: "Build config updated for Next.js 16 (Turbopack) so future upgrades build correctly.",
    author: "AI",
    date: "2026-02-22",
  },
  {
    title: "Clear next steps when generation fails",
    description: "When generating fails, you now see what to do next (e.g. try again) and errors are emailed to the team so we can fix issues faster.",
    author: "AI",
    date: "2026-02-22",
  },
  {
    title: "Strategy feedback loop",
    description: "Dashboard now syncs analytics from Instantly automatically and shows strategy suggestions. When generating sequences, the AI applies learnings: shorter subject lines for low-open personas, maintain style for high-open segments. Run Classify on leads so we can tailor by persona/vertical.",
    author: "Mayank",
    date: "2026-02-26",
  },
  {
    title: "Personalized subject lines & social proof",
    description: "Subject lines are now highly personalized per lead (name, company, contextual hooks). Social proof in Settings: similar companies and referral phrase for AI to weave into emails.",
    author: "Mayank",
    date: "2026-02-26",
  },
  {
    title: "Configurable sender name",
    description: "Set your sender name in Settings (e.g. 'John Smith, Gather') so emails sign off correctly. Fixes the bug where emails were signing as the recipient.",
    author: "Mayank",
    date: "2026-02-24",
  },
  {
    title: "Features section with feedback",
    description: "New Features section on home and dashboard: submit feature ideas (emailed to team) and see latest releases.",
    author: "Mayank",
    date: "2026-02-24",
  },
  {
    title: "Campaign name now saves to dashboard",
    description: "The name you enter when launching (e.g. GOE 2/24) is now saved and shown on the dashboard instead of 'New campaign'.",
    author: "Mayank",
    date: "2026-02-24",
  },
  {
    title: "Mailbox picker with search",
    description: "Choose which Instantly accounts to send from. Search, Select all, and Unselect all to quickly pick mailboxes.",
    author: "Mayank",
    date: "2026-02-24",
  },
  {
    title: "Skip failing leads & Launch",
    description: "When some leads fail the quality check, you can now exclude them and launch with only the passing leads instead of fixing every one.",
    author: "Mayank",
    date: "2026-02-24",
  },
  {
    title: "Use fast model toggle",
    description: "Checkbox to use Haiku (faster) or your workspace model (higher quality) for sequence generation.",
    author: "Mayank",
    date: "2026-02-24",
  },
  {
    title: "10x faster sequence generation",
    description: "Haiku model + parallel processing. Generate all sequences with one click and a progress bar instead of hundreds of manual clicks.",
    author: "Mayank",
    date: "2026-02-24",
  },
  {
    title: "Google Sheets import restored",
    description: "Paste a Google Sheets URL to import leads directly — no more downloading and re-uploading CSV.",
    author: "Mayank",
    date: "2026-02-24",
  },
];
