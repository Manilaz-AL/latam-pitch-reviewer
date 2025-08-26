import { NextResponse } from "next/server";

// Simple in-memory counter (resets on deploy, free for now)
let uploadsToday = 0;

// Handle POST /api/upload
export async function POST(req: Request) {
  try {
    // For now, we don’t actually save the file — just pretend
    uploadsToday++;

    // Example fake review result
    const mockReview = {
      score: 74,
      stage: "Pre-seed",
      general: "> **Score:** 74/100 — Clear problem/solution, early traction.",
      detailed: "| Section | Score | Improvement |\n|---------|-------|-------------|\n| Market  | 5/10  | Add SOM by country |",
    };

    return NextResponse.json({
      ok: true,
      review: mockReview,
      uploadsToday,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
