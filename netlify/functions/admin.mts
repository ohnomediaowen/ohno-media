import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { isAuthorized, json } from "../lib/auth.mts";

const KEY = /^[a-z0-9-]{1,80}$/;
const MAX_IMAGE = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type Content = {
  text: Record<string, string>;
  links: Record<string, string>;
  images: Record<string, string>;
};

function cleanMap(input: unknown, check: (v: string) => boolean, maxLen: number) {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (KEY.test(k) && typeof v === "string" && v.length <= maxLen && check(v)) out[k] = v;
  }
  return out;
}

const okLink = (v: string) => /^(https?:\/\/|mailto:|#)/i.test(v.trim());
const okImage = (v: string) => /^\/api\/image\/[a-z0-9-]+(\?v=\d+)?$/.test(v);

// Password-protected: check login, save edits, upload images.
export default async (req: Request, context: Context) => {
  if (!isAuthorized(req)) return json({ error: "Wrong password" }, 401);
  const url = new URL(req.url);

  if (url.pathname === "/api/auth") return json({ ok: true });

  if (url.pathname === "/api/save") {
    let body: Partial<Content>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Bad request" }, 400);
    }
    const content: Content = {
      text: cleanMap(body.text, () => true, 5000),
      links: cleanMap(body.links, okLink, 2000),
      images: cleanMap(body.images, okImage, 200),
    };
    const store = getStore({ name: "site-content", consistency: "strong" });
    // keep the previous version as a simple backup
    const prev = await store.get("content", { type: "json" });
    if (prev) await store.setJSON("content-previous", prev);
    await store.setJSON("content", { ...content, savedAt: new Date().toISOString() });
    return json({ ok: true });
  }

  if (url.pathname.startsWith("/api/upload/")) {
    const { key } = context.params;
    if (!KEY.test(key ?? "")) return json({ error: "Bad key" }, 400);
    const type = (req.headers.get("content-type") ?? "").split(";")[0];
    if (!IMAGE_TYPES.includes(type)) return json({ error: "Use a PNG, JPG, WebP or GIF" }, 415);
    const data = await req.arrayBuffer();
    if (data.byteLength > MAX_IMAGE) return json({ error: "Image must be under 4 MB" }, 413);
    const store = getStore({ name: "site-images", consistency: "strong" });
    await store.set(key, data, { metadata: { contentType: type } });
    return json({ ok: true, url: `/api/image/${key}?v=${Date.now()}` });
  }

  return json({ error: "Not found" }, 404);
};

export const config: Config = {
  path: ["/api/auth", "/api/save", "/api/upload/:key"],
  method: ["POST", "PUT"],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
