import "dotenv/config";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { QdrantVectorStore } from "@langchain/qdrant";
// import { OpenAIEmbeddings } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

console.log(`gemini api key: ${process.env.GEMINI_API_KEY}`);

async function loadAndProcessPDF() {
  const filepath = "./nodejs.pdf";
  const loader = new PDFLoader(filepath);


  // page by page load the PDF file.
  const document = await loader.load();


  // ready the Google Generative AI Embeddings model
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY, 
    model: "text-embedding-004",
  });

  const vectorStore = await QdrantVectorStore.fromDocuments(document, embeddings, {url: "http://localhost:6333", collectionName: "langchain_docs"});

  console.log("indexing of document Done...");

}

loadAndProcessPDF();