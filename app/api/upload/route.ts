// app/api/upload/route.ts
// Zero-cost stub: accepts an optional file, returns a fingerprint and basic meta.
// No external DB, no AI calls. Safe for Vercel free tier.

export const runtime = "edge"; // uses Web Crypto, fast & free
export const preferredRegion = "auto";

type ApiOk = {
  ok: true;
  demo: boolean; // true when no file was sent
  meta: { name?: string; type?: string; size?: number } | null;
  fingerprint: string; // sha256 hex of content or date-seed if demo
};

function hex(buf: ArrayBuffer): string {
  const v = new Uint8Array(buf);
  return [...v].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return hex(digest);
}

// If no file is provided we still return a stable "demo" fingerprint for the day.
// This keeps the frontend flow working with zero uploads (as requested).
function dailySeedFingerprint(): string {
  const d = new Date();
  const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}-demo`;
  // Simple hash of the string using TextEncoder + SHA-256
  return awaitSha(key);
}
async function awaitSha(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  return sha256(enc.buffer);
}

export async function POST(req: Request): Promise<Response> {
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      // Allow calling without a file (demo mode)
      const res: ApiOk = {
        ok: true,
        demo: true,
        meta: null,
        fingerprint: await dailySeedFingerprint(),
      };
      return Response.json(res, { status: 200 });
    }

    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File)) {
      const res: ApiOk = {
        ok: true,
        demo: true,
        meta: null,
        fingerprint: await dailySeedFingerprint(),
      };
      return Response.json(res, { status: 200 });
    }

    const buf = await f.arrayBuffer();
    const fp = await sha256(buf);

    // NOTE: Intentionally not parsing PDF/PPTX here to keep zero-cost complexity low.
    // You can add pdf-parse/pptx parsing later; this API shape won’t change.

    const res: ApiOk = {
      ok: true,
      demo: false,
      meta: { name: f.name, type: f.type, size: f.size },
      fingerprint: fp,
    };
    return Response.json(res, { status: 200 });
  } catch (e) {
    return Response.json({ ok: false, error: "upload_failed" }, { status: 500 });
  }
}

// Optional GET for quick demo ping (no file)
export async function GET(): Promise<Response> {
  const res: ApiOk = {
    ok: true,
    demo: true,
    meta: null,
    fingerprint: await dailySeedFingerprint(),
  };
  return Response.json(res, { status: 200 });
}
