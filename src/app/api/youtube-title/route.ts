import { isYouTubeUrl } from "@/lib/youtube";

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractTitle(html: string): string | null {
  const ogTitle = html.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
  )?.[1];
  if (ogTitle) return decodeHtml(ogTitle);

  const pageTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  if (!pageTitle) return null;
  return decodeHtml(pageTitle).replace(/\s*-\s*YouTube\s*$/i, "");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url") ?? "";

  if (!isYouTubeUrl(targetUrl)) {
    return Response.json({ title: null }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (compatible; SpinTheWheel/1.0; +https://github.com/spteoh111/SpinOfWheel)",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return Response.json({ title: null }, { status: response.status });
    }

    const html = await response.text();
    return Response.json(
      { title: extractTitle(html) },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch {
    return Response.json({ title: null }, { status: 502 });
  }
}
