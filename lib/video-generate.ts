/**
 * AI video generation via Luma or Runway.
 * Both use async task-based APIs: start generation, poll for completion.
 */

const LUMA_BASE = "https://api.lumalabs.ai/dream-machine/v1";
const RUNWAY_BASE = "https://api.dev.runwayml.com/v1";

export type VideoProvider = "luma" | "runway";

export async function startLumaVideo(apiKey: string, prompt: string): Promise<{ taskId: string }> {
  const res = await fetch(`${LUMA_BASE}/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      model: "ray-2",
      aspect_ratio: "16:9",
      duration: 5,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Luma API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data?.id) throw new Error("Luma API: no generation ID");
  return { taskId: data.id };
}

export async function getLumaStatus(apiKey: string, taskId: string): Promise<{ status: string; videoUrl?: string }> {
  const res = await fetch(`${LUMA_BASE}/generations/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Luma status error: ${res.status}`);
  const data = (await res.json()) as { state?: string; assets?: { video?: string } };
  const status = data.state ?? "unknown";
  const videoUrl = data.assets?.video;
  return { status, videoUrl };
}

export async function startRunwayVideo(apiKey: string, prompt: string): Promise<{ taskId: string }> {
  // image_to_video without promptImage = text-to-video
  const res = await fetch(`${RUNWAY_BASE}/image_to_video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify({
      model: "gen4.5",
      promptText: prompt,
      ratio: "1280:720",
      duration: 5,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Runway API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data?.id) throw new Error("Runway API: no task ID");
  return { taskId: data.id };
}

export async function getRunwayStatus(apiKey: string, taskId: string): Promise<{ status: string; videoUrl?: string }> {
  const res = await fetch(`${RUNWAY_BASE}/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
    },
  });
  if (!res.ok) throw new Error(`Runway status error: ${res.status}`);
  const data = (await res.json()) as { status?: string; output?: string[] };
  const status = (data.status ?? "unknown").toLowerCase();
  const videoUrl = Array.isArray(data.output) && data.output.length > 0 ? data.output[0] : undefined;
  return { status, videoUrl };
}
