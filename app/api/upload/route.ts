// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { getState } from "@/lib/runtimeState";

// Handle POST /api/upload
export async function POST(req: Request) {
  try {
    // (Future) read FormData + file; for now we only bump the counter
    const state = getState();
    state.uploadsToday += 1;

    // Example fake review result to keep the front-end flowing
    const mockReview = {
      score: 74,
      stage: "Pre-seed",
      general: "> **Score:** 74/100 — Clear problem/solution, early traction.",
      detailed:
        "| Section | Score | Improvement |\n|---------|-----:|-------------|\n| Market | 5 | Add SOM by country |",
    };

    return NextResponse.json({
      ok: true,
      review: mockReview,
      uploadsToday: state.uploadsToday,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
