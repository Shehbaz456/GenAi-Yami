// indexing_deep.js
import 'dotenv/config';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

async function init() {
  const pdfFilePath = './nodejs.pdf';
  const loader = new PDFLoader(pdfFilePath);

  // Load the PDF pages
  const docs = await loader.load();
  console.log(`✅ Loaded ${docs} pages from ${pdfFilePath}`);

  // Split the docs into smaller chunks (so each fits inside embedding limits)
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,  // characters per chunk
    chunkOverlap: 200, // overlap between chunks for context
  });
  const splitDocs = await splitter.splitDocuments(docs);

  // Prepare embeddings
  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-large',
  });

  // Index into Qdrant
  const vectorStore = await QdrantVectorStore.fromDocuments(splitDocs, embeddings, {
    url: 'http://localhost:6333',
    collectionName: 'qdrant_rag_collection',
  });

  console.log('✅ Indexing of documents done...');
}

init();
