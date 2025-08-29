// Answer questions using retrieved chunks from Qdrant + AI SDK generation

import type { NextRequest } from "next/server"
import { OpenAIEmbeddings } from "@langchain/openai"
import { QdrantVectorStore } from "@langchain/qdrant"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

function ensureEnv() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.")
  }
  if (!process.env.QDRANT_URL) {
    throw new Error("Missing QDRANT_URL environment variable.")
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureEnv()
    const { message, collectionName, k = 4 } = await req.json()

    if (!message || !collectionName) {
      return new Response("message and collectionName are required", { status: 400 })
    }

    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-large",
    })

    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY || undefined,
      collectionName,
    })

    const retriever = vectorStore.asRetriever({ k })
    const chunks = await retriever.invoke(message)

    if (!chunks || chunks.length === 0) {
      return Response.json({
        answer:
          "I couldn't find relevant content in your indexed document for that question. Try rephrasing or uploading another PDF.",
        sources: [],
      })
    }

    const sources = chunks.slice(0, k).map((d) => {
      const page =
        (d.metadata?.pageNumber as number | undefined) ??
        (d.metadata?.loc?.pageNumber as number | undefined) ??
        (d.metadata?.pdf?.pageNumber as number | undefined)
      return {
        page,
        snippet: (d.pageContent || "").slice(0, 140).replace(/\s+/g, " ") + "…",
      }
    })

    const context = chunks
      .map((d, i) => {
        const page =
          (d.metadata?.pageNumber as number | undefined) ??
          (d.metadata?.loc?.pageNumber as number | undefined) ??
          (d.metadata?.pdf?.pageNumber as number | undefined)
        return `Chunk ${i + 1} [p:${page ?? "?"}]:
${d.pageContent}`
      })
      .join("\n\n---\n\n")

    const system =
      "You are DocText, a concise assistant. Answer ONLY from the provided context. " +
      "If the answer is not in the context, say you don't know. " +
      "Always include page citations like [p:X] for facts you state."

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system,
      prompt: `Context:\n${context}\n\nUser question: ${message}\n\nAnswer:`,
    })

    return Response.json({ answer: text, sources })
  } catch (e: any) {
    return new Response(`Chat failed: ${e?.message || "Unknown error"}`, { status: 500 })
  }
}
