// chat_deep.js
import 'dotenv/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import OpenAI from 'openai';

const client = new OpenAI();

async function chat() {
  const userQuery = 'how to Validating File Uploads and how to set it up?';

  // Use the same embedding model as indexing
  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-large', // or 'text-embedding-3-small' for cheaper & faster
  });

  // Connect to the existing Qdrant collection (from indexing_deep.js)
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: 'http://localhost:6333',
      collectionName: 'qdrant_rag_collection', // ✅ matches indexing_deep.js
    }
  );

  // Create retriever for top-k relevant chunks
  const retriever = vectorStore.asRetriever({ k: 3 });

  // Search for relevant context
  const relevantChunks = await retriever.invoke(userQuery);

  // System prompt with retrieved context
  const SYSTEM_PROMPT = `
    You are an AI assistant that answers user queries based only on the provided context.
    The context comes from a PDF file and may include page numbers.
    Do not use outside knowledge. If the context does not contain the answer, say you don't know.

    Context:
    ${JSON.stringify(relevantChunks, null, 2)}
  `;

  // Call OpenAI Chat API
  const response = await client.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userQuery },
    ],
  });

  console.log(`\n🧑 User: ${userQuery}`);
  console.log(`🤖 Assistant: ${response.choices[0].message.content}\n`);
}

chat();
