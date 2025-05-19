import {
  VoltAgent,
  Agent,
  VectorRetriever,
  OpenAIEmbeddingProvider,
  InMemoryVectorStore,
} from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { documents } from "./data/documents.js";

// --- Vector Retriever Setup ---

// Create an embedding provider (OpenAI in this example)
const embeddingProvider = new OpenAIEmbeddingProvider({
  // Use environment variable for API key or provide directly
  // apiKey: "your-openai-api-key",
  model: "text-embedding-3-small",
});

// Create an in-memory vector store
const vectorStore = new InMemoryVectorStore({
  distanceMetric: "cosine", // Use cosine similarity
});

// Create the vector retriever
const vectorRetriever = new VectorRetriever({
  embeddingProvider,
  vectorStore,
  topK: 3, // Return top 3 results
  autoChunk: true, // Automatically chunk documents
  chunkSize: 500, // Size of each chunk
  chunkOverlap: 100, // Overlap between chunks
  resultFormat: "Relevant information for '{query}':\n\n{documents}",
  documentFormat: "[{score}] {content}\nSource: {metadata.source}, Topic: {metadata.topic}\n",
});

// --- Initialize the Vector Retriever ---
async function initializeRetriever() {
  console.log("Initializing vector retriever with sample documents...");
  
  try {
    // Add documents to the vector store
    await vectorRetriever.addDocuments(documents);
    console.log(`Successfully indexed ${documents.length} documents`);
  } catch (error) {
    console.error("Error initializing vector retriever:", error);
  }
}

// --- Agent Definition ---

// Define the agent that uses the vector retriever
const ragAgent = new Agent({
  name: "Vector RAG Agent",
  description: "An agent that uses vector-based retrieval for answering questions.",
  llm: new VercelAIProvider(), // Using Vercel AI SDK Provider
  model: openai("gpt-4o-mini"), // Using OpenAI model via Vercel
  // Attach the vector retriever
  retriever: vectorRetriever,
});

// --- VoltAgent Initialization ---

// Initialize the retriever and start the agent
async function main() {
  try {
    await initializeRetriever();
    
    // Initialize VoltAgent with our RAG agent
    new VoltAgent({
      agents: {
        // Make the agent available under the key 'ragAgent'
        ragAgent,
      },
    });
    
    console.log("Vector RAG Agent is ready! Connect to it using the VoltAgent Console.");
  } catch (error) {
    console.error("Error starting VoltAgent:", error);
  }
}

// Start the application
main();

