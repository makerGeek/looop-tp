// app/api/users/route.ts
import { NextResponse } from "next/server";
import { cache } from "react";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// `cache()` dedupes calls with identical args within one request.
const getUsers = cache(async (q: string, limit: number) => {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await fetch(`https://api.example.com/users?${params}`, {
    next: { revalidate: 60 },
  });
  return res.json();
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const users = await getUsers(parsed.data.q ?? "", parsed.data.limit);
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: crypto.randomUUID() }, { status: 201 });
}
