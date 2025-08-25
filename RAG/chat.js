import "dotenv/config";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings,ChatGoogleGenerativeAI  } from "@langchain/google-genai";


async function chat() {
  const userQuery = "How to Handle Express Errors";

  // ready the Google Generative AI Embeddings model
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    { url: "http://localhost:6333", collectionName: "langchain_docs" }
  );

  const vectorRetriever = await vectorStore.asRetriever({
    k: 3, // number of documents to retrieve
  });
  
  const RelevantChunks = await vectorRetriever.invoke(userQuery);
  console.log("Retrieved chunks: ", RelevantChunks);

  const SYSTEM_PROMPT = `
    You are an AI assistant who helps resolving user query based on the
    context available to you from a PDF file with the content and page number.

    Only ans based on the available context from file only.

    Context:
    ${JSON.stringify(RelevantChunks,null,2)}
  `;

  // 5. Use Gemini Chat Model via LangChain wrapper
  const chatModel = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-2.5-pro", // or gemini-pro
  });

   const response = await chatModel.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userQuery },
  ]);

  console.log("Answer: ", response.content);
  console.log("response: ", response);
}

chat().catch((error) => {
    console.error("Error occurred:", error);
    process.exit(1);
});