import { NextRequest, NextResponse } from "next/server";
import { fromPostmanCollection } from "@/lib/postman";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (body.type === "remote") {
      const key = process.env.POSTMAN_API_KEY;
      if (!key) return NextResponse.json({ error: "POSTMAN_API_KEY missing on server" }, { status: 500 });
      if (!body.collectionUid) return NextResponse.json({ error: "collectionUid missing" }, { status: 400 });

      const url = `https://api.getpostman.com/collections/${body.collectionUid}`;
      const res = await fetch(url, { headers: { "X-Api-Key": key } });

      const text = await res.text();
      if (!res.ok) {
        console.error("Postman API error:", res.status, text);
        return NextResponse.json({ error: `Postman API ${res.status}: ${text || "No body"}` }, { status: 400 });
      }

      let data: any = {};
      try { data = JSON.parse(text); } catch (e) {
        console.error("JSON parse fail from Postman:", e, text);
        return NextResponse.json({ error: "Invalid JSON from Postman" }, { status: 502 });
      }

      const doc = fromPostmanCollection(data.collection);
      return NextResponse.json({ doc }, { status: 200 });
    }

    if (body.type === "upload") {
      if (!body.json) return NextResponse.json({ error: "json missing" }, { status: 400 });
      const doc = fromPostmanCollection(body.json);
      return NextResponse.json({ doc }, { status: 200 });
    }

    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  } catch (e: any) {
    console.error("Route crash:", e);
    return NextResponse.json({ error: e?.message || "Unexpected server error" }, { status: 500 });
  }
}
