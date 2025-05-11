import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { SupabaseMemory } from "@voltagent/supabase"; // Import SupabaseMemory
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL and Key must be provided in the .env file (SUPABASE_URL, SUPABASE_KEY)",
  );
}

// Initialize SupabaseMemory
const memory = new SupabaseMemory({
  supabaseUrl,
  supabaseKey,
});

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions without using tools",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  memory: memory, // Pass the SupabaseMemory instance
});

new VoltAgent({
  agents: {
    agent,
  },
});
