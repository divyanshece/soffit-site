import { after } from "next/server";

/**
 * Every download of the app goes through here: it adds one to a private tally, then sends the
 * browser, `curl` or Homebrew on to the file itself, which lives at `/files/`.
 *
 * The tally is a handful of counters in Upstash Redis, attached to the Vercel project, so the
 * numbers are visible only in the Vercel / Upstash dashboard — nothing here reads them back, and
 * nothing on the site shows them. It records how many, not who: no IPs, no user agents, no
 * cookies. Just totals per file, per day and per kind of client.
 *
 * Counting never gets in the way of the download: it runs after the redirect has been sent, and
 * if the database isn't configured or is down, the download still works and simply isn't counted.
 */

export const dynamic = "force-dynamic";

const RELEASE = /^Soffit-\d+\.\d+\.\d+\.zip$/;

// Link unfurlers and crawlers fetch the URL without anyone downloading anything.
const NOT_A_DOWNLOAD =
  /bot|crawl|spider|preview|facebookexternalhit|slack|discord|whatsapp|telegram|linkedin|embedly|skype|vercel-screenshot/i;

type Params = { params: Promise<{ file: string }> };

function clientKind(ua: string): "installer" | "homebrew" | "browser" | "other" {
  if (/homebrew/i.test(ua)) return "homebrew";
  if (/^curl\//i.test(ua)) return "installer"; // install.sh fetches with curl
  if (/mozilla/i.test(ua)) return "browser";
  return "other";
}

async function count(file: string, kind: string): Promise<void> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  const day = new Date().toISOString().slice(0, 10);
  try {
    await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", "downloads:total"],
        ["INCR", `downloads:file:${file}`],
        ["INCR", `downloads:day:${day}`],
        ["INCR", `downloads:via:${kind}`],
      ]),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // A missed count is better than a failed download.
  }
}

function forward(request: Request, file: string): Response {
  // 302, not cached: a cached redirect would let repeat downloads skip the counter.
  return new Response(null, {
    status: 302,
    headers: { Location: new URL(`/files/${file}`, request.url).toString(), "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request, { params }: Params) {
  const { file } = await params;
  if (!RELEASE.test(file)) return new Response("Not found", { status: 404 });
  const ua = request.headers.get("user-agent") ?? "";
  if (!NOT_A_DOWNLOAD.test(ua)) after(() => count(file, clientKind(ua)));
  return forward(request, file);
}

// A HEAD request checks the link; nobody downloaded anything.
export async function HEAD(request: Request, { params }: Params) {
  const { file } = await params;
  if (!RELEASE.test(file)) return new Response(null, { status: 404 });
  return forward(request, file);
}
