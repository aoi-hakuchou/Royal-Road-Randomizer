/* ------------------- VIDEO API ------------------- */

import { API_URL } from "./config.js";

async function fetchRandomVideo() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${API_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.video) {
      throw new Error("Invalid API response");
    }
    return data;
  } catch (err) {
    clearTimeout(timeout);
    console.error("Failed to fetch video:", err);
    return null;
  }
}

export async function fetchWithRetry(retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const video = await fetchRandomVideo();
    if (video) return video;
    console.warn(`Fetch attempt ${i + 1} failed`);
  }
  console.error("All fetch attempts failed");
  return null;
}
