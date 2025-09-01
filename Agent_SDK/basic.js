import 'dotenv/config';
import { Agent, run , tool } from '@openai/agents';
import { z } from 'zod';

const getCurrentTime = tool({
    name:"get_current_time",
    description: 'this tool return current time',
    parameters:z.object({}),
    async execute(){
        return new Date().toString();
    }
})

const getMenuTool = tool({
  name: 'get_menu',
  description: 'Fetches and returns the menu items',
  parameters: z.object({}),
  async execute() {
    return {
      Drinks: {
        Chai: 'INR 50',
        Coffee: 'INR 70',
      },
      Veg: {
        DalMakhni: 'INR 250',
        Panner: 'INR 400',
      },
    };
  },
});

const CookingAgent = new Agent({
  name: 'Cooking Agent',
  model:"gpt-4.1-mini",
    tools: [getCurrentTime,getMenuTool],
  instructions:
    `You're a helpful cooking assistant who is specialized in cooking food.
    You help the users with food options and recipes and help them cook food.`
});

async function handleCookingQuery(query) {
    const result = await  run(CookingAgent, query)
    console.log(`result history`,result.history);
    console.log(result.finalOutput);
}

handleCookingQuery("Depending on time, what are some good food for me, also what are the menu options?"); 