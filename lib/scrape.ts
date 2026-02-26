/**
 * Lightweight web scraping for company context.
 * Fetches a URL, extracts text from HTML, returns truncated content for AI context.
 */

const MAX_CHARS = 3000;
const FETCH_TIMEOUT_MS = 4000;

export async function scrapeForContext(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GatherGrowth/1.0; +https://gatherhq.com)",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    // Strip HTML tags, collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text || text.length < 50) return null;
    return text.slice(0, MAX_CHARS);
  } catch {
    return null;
  }
}
