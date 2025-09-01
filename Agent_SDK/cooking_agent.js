import 'dotenv/config';
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

// 🛠️ Tool 1: Current time
const getCurrentTime = tool({
  name: "get_current_time",
  description: "This tool returns the current time",
  parameters: z.object({}),
  async execute() {
    return new Date().toString();
  }
});

// 🛠️ Tool 2: Pantry items
const getPantryItems = tool({
  name: "get_pantry_items",
  description: "Returns a list of items available in the user's pantry",
  parameters: z.object({}),
  async execute() {
    return ["eggs", "bread", "tomato", "cheese"];
  }
});

// 🛠️ Tool 3: Suggest recipe by ingredients
const getRecipeByIngredients = tool({
  name: "get_recipe_by_ingredients",
  description: "Finds recipes based on a list of ingredients",
  parameters: z.object({
    ingredients: z.array(z.string())
  }),
  async execute({ ingredients }) {
    if (ingredients.includes("eggs") && ingredients.includes("bread")) {
      return "How about scrambled eggs on toast?";
    }
    if (ingredients.includes("tomato") && ingredients.includes("cheese")) {
      return "You can make a tomato-cheese sandwich.";
    }
    return "Sorry, I couldn't find a matching recipe.";
  }
});

// 🧑‍🍳 Agent setup
const CookingAgent = new Agent({
  name: 'Cooking Agent',
  model: "gpt-4.1-mini",
  tools: [getCurrentTime, getPantryItems, getRecipeByIngredients],
  instructions: `
    You're a helpful cooking assistant who is specialized in cooking food.
    You help the users with food options and recipes and help them cook food.
  `
});

// 🔎 Function to query agent
async function handleCookingQuery(query) {
  const result = await run(CookingAgent, query);

  console.log("\n=== history (Tool Calls) ===");
  console.log(result.history);

  console.log("\n=== Final Output ===");
  console.log(result.finalOutput);
}


handleCookingQuery("Check my pantry and suggest a recipe I can make.also write recipe in Tabular format.");