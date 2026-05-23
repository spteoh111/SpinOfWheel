export function isYouTubeUrl(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");
    return (
      host === "youtu.be" ||
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    );
  } catch {
    return false;
  }
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id || null;
    }

    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") {
        return u.searchParams.get("v");
      }
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
      const liveIdx = parts.indexOf("live");
      if (liveIdx >= 0 && parts[liveIdx + 1]) return parts[liveIdx + 1];
    }
  } catch {
    const m = trimmed.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
  }

  const fallback = trimmed.match(/([A-Za-z0-9_-]{11})/);
  return fallback ? fallback[1] : null;
}

export function extractYouTubeStartSeconds(url: string): number {
  if (!url) return 0;
  const trimmed = url.trim();

  try {
    const u = new URL(trimmed);
    return parseTimestamp(
      u.searchParams.get("start") ??
        u.searchParams.get("t") ??
        u.hash.match(/[?&#]t=([^&]+)/)?.[1] ??
        ""
    );
  } catch {
    const match = trimmed.match(/[?&#](?:t|start)=([^&]+)/);
    return parseTimestamp(match?.[1] ?? "");
  }
}

function parseTimestamp(value: string): number {
  if (!value) return 0;
  const decoded = decodeURIComponent(value).trim().toLowerCase();
  if (!decoded) return 0;

  if (/^\d+$/.test(decoded)) {
    return Number(decoded);
  }

  let total = 0;
  const hours = decoded.match(/(\d+)h/);
  const minutes = decoded.match(/(\d+)m/);
  const seconds = decoded.match(/(\d+)s/);

  if (hours) total += Number(hours[1]) * 3600;
  if (minutes) total += Number(minutes[1]) * 60;
  if (seconds) total += Number(seconds[1]);

  return Number.isFinite(total) ? total : 0;
}

export function buildEmbedUrl(videoId: string, autoplay = true): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    rel: "0",
    modestbranding: "1",
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}
