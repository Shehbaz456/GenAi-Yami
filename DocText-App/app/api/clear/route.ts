// Drop a Qdrant collection (optional utility)

import type { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { collectionName } = await req.json()
    if (!process.env.QDRANT_URL) throw new Error("Missing QDRANT_URL")
    if (!collectionName) return new Response("collectionName required", { status: 400 })

    const res = await fetch(
      `${process.env.QDRANT_URL.replace(/\/$/, "")}/collections/${encodeURIComponent(collectionName)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.QDRANT_API_KEY ? { "api-key": process.env.QDRANT_API_KEY } : {}),
        },
      },
    )

    if (!res.ok) {
      const body = await res.text()
      return new Response(`Failed to delete: ${body}`, { status: res.status })
    }

    return Response.json({ ok: true })
  } catch (e: any) {
    return new Response(e?.message || "Failed", { status: 500 })
  }
}
