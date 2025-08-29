// Server route: receive PDF, chunk, embed into Qdrant

import type { NextRequest } from "next/server"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { OpenAIEmbeddings } from "@langchain/openai"
// Use the web/pdf loader to work with Blob in a serverless environment
import { PDFLoader } from "@langchain/community/document_loaders/web/pdf"
import { QdrantVectorStore } from "@langchain/qdrant"

export const dynamic = "force-dynamic" // ensure server runtime

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

    const form = await req.formData()
    const file = form.get("file") as File | null
    const preferred = (form.get("collectionName") as string | null) || undefined

    if (!file) {
      return new Response("No file provided", { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const blob = new Blob([bytes], { type: "application/pdf" })

    // Load docs from PDF
    const loader = new PDFLoader(blob, { parsedItemSeparator: "\n---\n" })
    const docs = await loader.load()

    // Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    })
    const splitDocs = await splitter.splitDocuments(docs)

    // Prepare vector store and embeddings
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-large",
    })

    const collectionName = preferred || `${process.env.QDRANT_COLLECTION_PREFIX || "doctext"}_${Date.now()}`

    await QdrantVectorStore.fromDocuments(splitDocs, embeddings, {
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY, // optional
      collectionName,
    })

    return Response.json({
      ok: true,
      collectionName,
      fileName: file.name,
      appended: Boolean(preferred),
      stats: { pages: docs.length, chunks: splitDocs.length },
    })
  } catch (e: any) {
    const msg = e?.message || "Embedding failed"
    return new Response(msg, { status: 500 })
  }
}
